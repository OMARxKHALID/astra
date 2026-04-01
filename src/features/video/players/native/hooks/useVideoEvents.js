import { useEffect } from "react";

export default function useVideoEvents({
  videoRef,
  videoUrl,
  sourceType,
  setDuration,
  setLocalTime,
  setBufferedPct,
  setBuffering,
  setVideoError,
  setPosterVisible,
  setFullscreen,
  onPause,
  onPlay,
  seekingRef,
  playbackRate,
  addToast,
}) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (sourceType === "mp4" && v.src !== videoUrl) {
      v.src = videoUrl;
    }

    const onTime = () => {
      if (!seekingRef.current) {
        setLocalTime(v.currentTime);
      }
    };

    const onMeta = () => {
      setDuration(v.duration);
      setVideoError(false);
      setPosterVisible(false);
    };

    const onWait = () => setBuffering(true);
    const onCan = () => setBuffering(false);
    
    const onNativeEnded = () => {
      onPause?.(v.duration);
    };

    const onProg = () => {
      if (v.buffered?.length > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBufferedPct(v.duration > 0 ? (end / v.duration) * 100 : 0);
      }
    };

    const onNativePlay = () => {
      // Logic for internal controls or server sync integration
      if (!seekingRef.current && !v._suppressNative) {
        onPlay?.(v.currentTime);
      }
    };

    const onNativePause = () => {
      if (!seekingRef.current && !v._suppressNative) {
        onPause?.(v.currentTime);
      }
    };

    const onFS = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };

    const onErr = () => {
      if (!v.error) {
        setVideoError({
          title: "Playback Error",
          detail:
            "URL is not a direct video. Paste an .mp4, .m3u8, or player URL.",
        });
        return;
      }
      const MAP = {
        1: ["Loading Cancelled", "Video loading aborted."],
        2: ["Network Error", "A network error stopped the download."],
        3: [
          "Decoding Error",
          "The file appears corrupt or uses an unsupported codec.",
        ],
        4: ["Format Not Supported", "This URL cannot be played directly."],
      };
      const [title, detail] = MAP[v.error.code] || [
        "Unknown Error",
        `Code ${v.error.code}`,
      ];
      const errorMsg = detail + (v.error.message ? ` (${v.error.message})` : "");
      setVideoError({
        title,
        detail: errorMsg,
      });
      addToast?.(`${title}: ${errorMsg}`, "error");
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("canplaythrough", onCan);
    v.addEventListener("error", onErr);
    v.addEventListener("progress", onProg);
    v.addEventListener("ended", onNativeEnded);
    v.addEventListener("play", onNativePlay);
    v.addEventListener("pause", onNativePause);
    document.addEventListener("fullscreenchange", onFS);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCan);
      v.removeEventListener("canplaythrough", onCan);
      v.removeEventListener("error", onErr);
      v.removeEventListener("progress", onProg);
      v.removeEventListener("ended", onNativeEnded);
      v.removeEventListener("play", onNativePlay);
      v.removeEventListener("pause", onNativePause);
      document.removeEventListener("fullscreenchange", onFS);
    };
  }, [
    videoRef,
    videoUrl,
    sourceType,
    onPlay,
    onPause,
    seekingRef,
    setDuration,
    setLocalTime,
    setBufferedPct,
    setBuffering,
    setVideoError,
    setPosterVisible,
    setFullscreen,
    addToast,
  ]);

  // Handle Playback Rate
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Math.abs(v.playbackRate - playbackRate) > 0.01) {
      v.playbackRate = playbackRate;
    }
  }, [playbackRate, videoRef]);
}
