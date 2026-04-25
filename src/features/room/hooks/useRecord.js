import { useState, useRef, useEffect, useCallback } from "react";
import { DEBUG } from "@/constants/config";

const logError = DEBUG ? console.error : () => {};

export function useRecord(onSend, onError) {
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
  const stopRecordingRef = useRef(null);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
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

  stopRecordingRef.current = stopRecording;

  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    stopRecording();
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError?.(
          "Microphone unavailable. Use HTTPS or localhost to enable recording.",
        );
        return;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isCancelledRef.current = false;

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
        stream.getTracks().forEach((track) => track.stop());
        if (isCancelledRef.current) return;
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          onSend("", reader.result);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= 60) {
            setTimeout(() => stopRecordingRef.current?.(), 0);
            return 60;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      logError(`[record] Microphone access denied:`, err);
      onError?.(
        "Microphone access denied. Please check your browser permissions.",
      );
    }
  }, [onSend, onError]);

  useEffect(() => {
    return () => {
      clearInterval(recordingIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        isCancelledRef.current = true;
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
    analyserRef,
  };
}
