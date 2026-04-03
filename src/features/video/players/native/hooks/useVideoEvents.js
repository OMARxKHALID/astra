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
          title: "Video Not Supported",
          detail: "This URL format isn't supported. Try a direct MP4, M3U8 stream, or YouTube link.",
        });
        return;
      }

      const errorMsg = v.error.message || "";
      const isCORS = errorMsg.includes("CORS") || errorMsg.includes("cross-origin") || errorMsg.includes("net::ERR_FAILED");
      const isNetwork = v.error.code === 2 || errorMsg.includes("network") || errorMsg.includes("fetch");
      const is404 = errorMsg.includes("404") || errorMsg.includes("Not Found");
      const is403 = errorMsg.includes("403") || errorMsg.includes("Forbidden");
      const isAborted = v.error.code === 1 || errorMsg.includes("aborted");

      if (isAborted) {
        return;
      }

      if (isCORS) {
        setVideoError({
          title: "Video Blocked by Browser",
          detail: "This video can't be loaded due to browser security restrictions. Try a different video source or use a proxy/CORS-enabled URL.",
        });
        return;
      }

      if (is404) {
        setVideoError({
          title: "Video Not Found",
          detail: "The video URL no longer exists or is broken. Please check the link and try again.",
        });
        return;
      }

      if (is403) {
        setVideoError({
          title: "Access Denied",
          detail: "This video is not publicly available. Try a different video URL.",
        });
        return;
      }

      if (isNetwork) {
        setVideoError({
          title: "Network Error",
          detail: "Unable to connect to the video. Check your internet connection and try again.",
        });
        return;
      }

      const MAP = {
        3: [
          "Video Format Error",
          "The file format isn't supported by your browser. Try a different video.",
        ],
        4: [
          "Cannot Play Video",
          "This video can't be played directly. Try a direct MP4 link.",
        ],
      };
      const [title, detail] = MAP[v.error.code] || [
        "Playback Failed",
        "Something went wrong playing this video. Try a different URL.",
      ];
      setVideoError({
        title,
        detail,
      });
      addToast?.(`${title}: ${detail}`, "error");
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
