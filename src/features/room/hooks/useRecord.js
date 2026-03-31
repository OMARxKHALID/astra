import { useState, useRef, useEffect, useCallback } from "react";

export function useRecord(onSend) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const isCancelledRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      if (window.__astra_mic_pump) {
        window.__astra_mic_pump.pause();
        window.__astra_mic_pump.srcObject = null;
        window.__astra_mic_pump = null;
      }
    }
    setIsRecording(false);
    setRecordingTime(0);
    setAudioLevel(0);
  }, []);

  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    stopRecording();
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone access is blocked by your browser on insecure HTTP connections. Please test this feature from your PC (localhost) or use a secure HTTPS tunnel like Ngrok.");
        return;
      }

      // Set up AudioContext synchronously on click to bypass mobile gesture limits
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isCancelledRef.current = false;

      // [Bugfix] Android Chrome Web Audio API Pump Hack
      const pumpAudio = new Audio();
      pumpAudio.muted = true;
      pumpAudio.srcObject = stream;
      pumpAudio.play().catch(() => {});
      window.__astra_mic_pump = pumpAudio;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Force Chrome to actually process the audio by terminating to a dummy stream destination
      const dummyDestination = audioCtx.createMediaStreamDestination();
      analyser.connect(dummyDestination);
      analyser.fftSize = 256;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const peak = dataArray.reduce((max, val) => Math.max(max, val), 0);
        setAudioLevel(Math.min(255, peak * 1.5));
        animFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (isCancelledRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          onSend("", reader.result);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [onSend, stopRecording]);

  useEffect(() => {
    return () => {
      clearInterval(recordingIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    recordingTime,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
