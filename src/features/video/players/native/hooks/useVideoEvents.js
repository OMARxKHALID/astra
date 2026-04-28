import { useEffect } from "react";

export function useVideoEvents({
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
  onEnded,
  seekingRef,
  playbackRate,
  addToast,
}) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (
      videoUrl &&
      (sourceType === "mp4" || sourceType === "direct") &&
      v.src !== videoUrl
    ) {
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
      onEnded?.();
      onPause?.(v.duration);
    };

    const onProg = () => {
      if (v.buffered?.length > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBufferedPct(v.duration > 0 ? (end / v.duration) * 100 : 0);
      }
    };

    const onNativePlay = () => {
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
      if (!v.currentSrc || v.currentSrc === "") return;
      if (!videoUrl && !v.currentSrc) return;

      // Sometimes a video tag errors before currentSrc is set (e.g., CORS preflight fail on the src attribute itself)
      // We shouldn't hide these errors if the browser natively threw an error event.

      // [Note] blob: URLs are tab-local and die on refresh. Show a clear message instead of the
      // generic MEDIA_ERR_SRC_NOT_SUPPORTED error that would otherwise appear.
      if (videoUrl.startsWith("blob:")) {
        setVideoError({
          title: "Local File Unavailable",
          detail: "This was a local file that only exists in your browser's memory. Please re-upload the file using the upload button in the URL bar.",
        });
        return;
      }

      const isDirectSource = sourceType === "direct";

      if (!v.error) {
        setVideoError({
          title: isDirectSource ? "Custom URL Failed" : "Video Not Supported",
          detail: isDirectSource
            ? "This URL could not be played. The server may be blocking direct playback or the content is not a video stream."
            : "This URL format isn't supported. Try a direct MP4, M3U8 stream, or YouTube link.",
        });
        return;
      }

      const errorMsg = v.error.message || "";
      const isCORS =
        errorMsg.includes("CORS") ||
        errorMsg.includes("cross-origin") ||
        errorMsg.includes("net::ERR_FAILED");
      const isNetwork =
        v.error.code === 2 ||
        errorMsg.includes("network") ||
        errorMsg.includes("fetch");
      const is404 = errorMsg.includes("404") || errorMsg.includes("Not Found");
      const is403 = errorMsg.includes("403") || errorMsg.includes("Forbidden");
      const isAborted = v.error.code === 1 || errorMsg.includes("aborted");

      if (isAborted) return;

      if (isCORS) {
        setVideoError({
          title: "Video Blocked by Browser",
          detail: isDirectSource
            ? "This URL is blocked by browser security (CORS). The server must send Access-Control-Allow-Origin headers to allow playback."
            : "This video can't be loaded due to browser security restrictions. Try a different video source or use a proxy/CORS-enabled URL.",
        });
        return;
      }

      if (is404) {
        setVideoError({
          title: "Video Not Found",
          detail:
            "The video URL no longer exists or is broken. Please check the link and try again.",
        });
        return;
      }

      if (is403) {
        setVideoError({
          title: "Access Denied",
          detail:
            "This video is not publicly available. Try a different video URL.",
        });
        return;
      }

      if (isNetwork) {
        setVideoError({
          title: "Network Error",
          detail:
            "Unable to connect to the video. Check your internet connection and try again.",
        });
        return;
      }

      const MAP = {
        3: [
          "Video Format Error",
          isDirectSource
            ? "The server returned content your browser can't decode. Try a .mp4 or .m3u8 URL instead."
            : "The file format isn't supported by your browser. Try a different video.",
        ],
        4: [
          "Cannot Play Video",
          isDirectSource
            ? "The browser refused to play this URL. It may require authentication or a specific player. Try an embed URL instead."
            : "This video can't be played directly. Try a direct MP4 link.",
        ],
      };

       const [title, detail] = MAP[v.error.code] || [
         "Playback Failed",
         isDirectSource
           ? "This custom URL could not be played. Try a direct .mp4, .m3u8, YouTube, or embed URL."
           : "Something went wrong playing this video. Try a different URL.",
       ];

setVideoError({ title, detail });
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
    onEnded,
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
