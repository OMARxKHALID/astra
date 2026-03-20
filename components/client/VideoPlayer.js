"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { classifyUrl } from "@/lib/videoSource";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(s) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function SpeedPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Playback speed"
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15
                   border border-white/8 text-xs font-bold text-white/80 transition-all active:scale-95
                   backdrop-blur-sm min-w-[60px] justify-between"
      >
        <span className="text-[9px] text-white/30 uppercase tracking-wide">
          Speed
        </span>
        <span>{value}×</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 py-1
                        bg-[#0d1018] border border-white/12 rounded-xl shadow-2xl shadow-black/60
                        backdrop-blur-xl z-50 min-w-[76px] overflow-hidden"
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`w-full px-4 py-1.5 text-left text-xs font-mono transition-colors
                ${
                  s === value
                    ? "bg-amber-500/15 text-amber-400 font-bold"
                    : "text-white/60 hover:bg-white/8 hover:text-white/90"
                }`}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useVideoHotkeys({
  videoRef,
  handlePlayPause,
  handleFullscreen,
  onSeek,
  setMuted,
}) {
  useEffect(() => {
    const onKD = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName))
        return;
      if (e.target.isContentEditable) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          handlePlayPause?.();
          break;
        case "f":
          e.preventDefault();
          handleFullscreen?.();
          break;
        case "m":
          e.preventDefault();
          setMuted?.((m) => !m);
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          {
            const t = Math.max(0, v.currentTime - 10);
            v.currentTime = t;
            onSeek?.(t);
          }
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          {
            const t = Math.min(v.duration || Infinity, v.currentTime + 10);
            v.currentTime = t;
            onSeek?.(t);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKD);
    return () => window.removeEventListener("keydown", onKD);
  }, [videoRef, handlePlayPause, handleFullscreen, onSeek, setMuted]);
}

let ytReady = false;
let ytCbs = [];
function onYTReady(cb) {
  if (ytReady && window.YT?.Player) {
    cb();
    return;
  }
  ytCbs.push(cb);
  if (!document.getElementById("yt-iframe-api")) {
    const t = document.createElement("script");
    t.id = "yt-iframe-api";
    t.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(t);
  }
  window.onYouTubeIframeAPIReady = () => {
    ytReady = true;
    ytCbs.forEach((f) => f());
    ytCbs = [];
  };
}

let vmReady = false;
let vmCbs = [];
function onVMReady(cb) {
  if (vmReady && window.Vimeo?.Player) {
    cb();
    return;
  }
  vmCbs.push(cb);
  if (!document.getElementById("vimeo-player-api")) {
    const t = document.createElement("script");
    t.id = "vimeo-player-api";
    t.src = "https://player.vimeo.com/api/player.js";
    t.onload = () => {
      vmReady = true;
      vmCbs.forEach((f) => f());
      vmCbs = [];
    };
    document.head.appendChild(t);
  }
}

export default function VideoPlayer({
  videoRef,
  videoUrl,
  isHost,
  isPlaying,
  playbackRate = 1,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
}) {
  const source = classifyUrl(videoUrl);

  if (source.type === "mp4" || source.type === "hls")
    return (
      <NativeVideoPlayer
        videoRef={videoRef}
        videoUrl={videoUrl}
        sourceType={source.type}
        isHost={isHost}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
      />
    );

  if (source.type === "youtube")
    return (
      <YouTubePlayer
        videoRef={videoRef}
        videoId={source.videoId}
        isHost={isHost}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
      />
    );

  if (source.type === "vimeo")
    return (
      <VimeoPlayer
        videoRef={videoRef}
        videoId={source.videoId}
        isHost={isHost}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
      />
    );

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center gap-3">
      <ExclamationIcon className="w-10 h-10 text-muted/40" />
      <p className="text-sm text-dim/50 text-center px-8 max-w-xs leading-relaxed">
        {videoUrl
          ? "Unsupported URL. Paste a direct MP4, HLS stream, YouTube, or Vimeo link."
          : "No video loaded. Paste a URL above."}
      </p>
    </div>
  );
}

function NativeVideoPlayer({
  videoRef,
  videoUrl,
  sourceType,
  isHost,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
}) {
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [ctrlVis, setCtrlVis] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const seekingRef = useRef(false);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
  }, []);

  useEffect(() => {
    showCtrl();
    return () => clearTimeout(hideTimer.current);
  }, [showCtrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || sourceType !== "hls") return;
    let hls;
    (async () => {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        v.src = videoUrl;
        return;
      }
      hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) setVideoError(true);
      });
    })();
    return () => hls?.destroy();
  }, [videoUrl, sourceType, videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (sourceType === "mp4") v.src = videoUrl;
    const onTime = () => {
      if (!seekingRef.current) setLocalTime(v.currentTime);
    };
    const onMeta = () => {
      setDuration(v.duration);
      setVideoError(false);
    };
    const onWait = () => setBuffering(true);
    const onCan = () => setBuffering(false);
    const onErr = () => setVideoError(true);
    const onFS = () => setFullscreen(Boolean(document.fullscreenElement));
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("canplaythrough", onCan);
    v.addEventListener("error", onErr);
    document.addEventListener("fullscreenchange", onFS);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCan);
      v.removeEventListener("canplaythrough", onCan);
      v.removeEventListener("error", onErr);
      document.removeEventListener("fullscreenchange", onFS);
    };
  }, [videoRef, videoUrl, sourceType]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, videoRef]);

  function handlePlayPause() {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) onPause?.(v.currentTime);
    else onPlay?.(v.currentTime);
  }
  function handleSeekChange(e) {
    seekingRef.current = true;
    setLocalTime(Number(e.target.value));
  }
  function handleSeekCommit(e) {
    seekingRef.current = false;
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    onSeek?.(t);
  }
  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(v === 0);
  }
  function handleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }
  function handleSpeedChange(rate) {
    onSpeed?.(rate);
  }
  function handleRetry() {
    setVideoError(false);
    videoRef.current?.load();
  }

  useVideoHotkeys({
    videoRef,
    handlePlayPause,
    handleFullscreen,
    onSeek,
    setMuted,
  });

  const progressPct = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
        aria-label="Video player"
        style={{ cursor: ctrlVis ? "pointer" : "none" }}
      />

      {buffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-14 h-14 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}

      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/90 backdrop-blur-xl gap-5 text-center">
          <div className="w-14 h-14 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
            <ExclamationIcon className="w-7 h-7 text-danger" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text">
              Playback Error
            </h3>
            <p className="text-sm text-muted mt-1">
              Could not load this video source.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="h-10 px-6 rounded-full bg-surface border border-border hover:border-amber-500/40 text-xs font-bold transition-all active:scale-95"
          >
            Try Again
          </button>
        </div>
      )}

      {}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-400
        ${ctrlVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
        <div className="relative px-4 pb-4 pt-8 space-y-2">
          <div className="relative h-1.5 bg-white/15 rounded-full hover:h-2 transition-all duration-150 cursor-pointer">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={localTime}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              aria-label="Seek position"
              className="absolute inset-0 w-full opacity-0 cursor-pointer py-3"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/18 border border-white/8 text-white transition-all active:scale-90 backdrop-blur-sm"
            >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <div className="flex items-center group/vol">
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/60 hover:text-white transition-colors"
              >
                {muted || volume === 0 ? (
                  <MuteIcon className="w-4 h-4" />
                ) : (
                  <VolumeIcon className="w-4 h-4" />
                )}
              </button>
              <div className="w-0 group-hover/vol:w-20 transition-all duration-300 overflow-hidden">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                  className="w-18 ml-2"
                />
              </div>
            </div>

            <span className="text-[11px] font-mono text-white/80 tabular-nums bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              {formatTime(localTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <SpeedPicker value={playbackRate} onChange={handleSpeedChange} />

            <button
              onClick={handleFullscreen}
              aria-label="Toggle fullscreen"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/18 border border-white/8 text-white transition-all active:scale-90 backdrop-blur-sm"
            >
              {fullscreen ? (
                <CompressIcon className="w-4 h-4" />
              ) : (
                <ExpandIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubePlayer({
  videoRef,
  videoId,
  isHost,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ctrlVis, setCtrlVis] = useState(true);
  const [muted, setMuted] = useState(false);
  const hideTimer = useRef(null);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
  }, []);

  useEffect(() => {
    if (!videoRef) return;
    videoRef.current = {
      get currentTime() {
        try {
          return playerRef.current?.getCurrentTime?.() ?? 0;
        } catch {
          return 0;
        }
      },
      set currentTime(t) {
        try {
          playerRef.current?.seekTo?.(t, true);
        } catch {}
      },
      get paused() {
        try {
          return (
            playerRef.current?.getPlayerState?.() !==
            window.YT?.PlayerState?.PLAYING
          );
        } catch {
          return true;
        }
      },
      get readyState() {
        return ready ? 4 : 0;
      },
      get playbackRate() {
        try {
          return playerRef.current?.getPlaybackRate?.() ?? 1;
        } catch {
          return 1;
        }
      },
      set playbackRate(r) {
        try {
          playerRef.current?.setPlaybackRate?.(r);
        } catch {}
      },
      play() {
        try {
          playerRef.current?.playVideo?.();
        } catch {}
        return Promise.resolve();
      },
      pause() {
        try {
          playerRef.current?.pauseVideo?.();
        } catch {}
      },
    };
  }, [videoRef, ready]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!playerRef.current) return;
      try {
        setLocalTime(playerRef.current.getCurrentTime?.() ?? 0);
        setDuration(playerRef.current.getDuration?.() ?? 0);
      } catch {}
    }, 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!videoId) return;
    const divId = `yt-${videoId}-${Math.random().toString(36).slice(2, 6)}`;
    const div = document.createElement("div");
    div.id = divId;
    containerRef.current?.appendChild(div);
    onYTReady(() => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(divId, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
        },
        events: { onReady: () => setReady(true) },
      });
    });
    return () => {
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      div.remove();
      setReady(false);
    };
  }, [videoId]);

  function handlePlayPause() {
    if (!ready) return;
    const t = playerRef.current?.getCurrentTime?.() ?? 0;
    if (isPlaying) onPause?.(t);
    else onPlay?.(t);
  }
  function handleSeekCommit(e) {
    if (!ready) return;
    const t = Number(e.target.value);
    playerRef.current?.seekTo?.(t, true);
    onSeek?.(t);
  }
  function handleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }
  useVideoHotkeys({
    videoRef,
    handlePlayPause,
    handleFullscreen,
    onSeek,
    setMuted,
  });

  return (
    <div
      className="relative w-full h-full bg-black"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <div
        ref={containerRef}
        className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
      />
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}
      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-red-600/80 text-[10px] font-bold text-white backdrop-blur-sm z-20">
        YouTube
      </div>
      <EmbedControls
        visible={ctrlVis}
        isPlaying={isPlaying}
        localTime={localTime}
        duration={duration}
        progressPct={duration > 0 ? (localTime / duration) * 100 : 0}
        playbackRate={playbackRate}
        onPlayPause={handlePlayPause}
        onSeekCommit={handleSeekCommit}
        onSpeedChange={onSpeed}
        showSpeed
      />
    </div>
  );
}

function VimeoPlayer({
  videoRef,
  videoId,
  isHost,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ctrlVis, setCtrlVis] = useState(true);
  const [muted, setMuted] = useState(false);
  const hideTimer = useRef(null);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
  }, []);

  useEffect(() => {
    if (!videoRef) return;
    let _t = 0,
      _p = true;
    videoRef.current = {
      get currentTime() {
        return _t;
      },
      set currentTime(t) {
        _t = t;
        playerRef.current?.setCurrentTime(t).catch(() => {});
      },
      get paused() {
        return _p;
      },
      get readyState() {
        return ready ? 4 : 0;
      },
      get playbackRate() {
        return 1;
      },
      set playbackRate(_) {},
      play() {
        _p = false;
        return playerRef.current?.play().catch(() => {}) ?? Promise.resolve();
      },
      pause() {
        _p = true;
        playerRef.current?.pause().catch(() => {});
      },
    };
  }, [videoRef, ready]);

  useEffect(() => {
    if (!videoId) return;
    onVMReady(() => {
      if (!iframeRef.current) return;
      const player = new window.Vimeo.Player(iframeRef.current, {
        id: videoId,
        controls: false,
        responsive: true,
        dnt: true,
      });
      playerRef.current = player;
      player
        .ready()
        .then(() => {
          player.getDuration().then((d) => setDuration(d));
          player.on("timeupdate", ({ seconds }) => setLocalTime(seconds));
          setReady(true);
        })
        .catch(() => {});
    });
    return () => {
      playerRef.current?.destroy?.().catch(() => {});
      playerRef.current = null;
      setReady(false);
    };
  }, [videoId]);

  function handlePlayPause() {
    if (!ready) return;
    if (isPlaying) onPause?.(localTime);
    else onPlay?.(localTime);
  }
  function handleSeekCommit(e) {
    if (!ready) return;
    const t = Number(e.target.value);
    playerRef.current?.setCurrentTime(t).catch(() => {});
    onSeek?.(t);
  }
  function handleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }
  useVideoHotkeys({
    videoRef,
    handlePlayPause,
    handleFullscreen,
    onSeek,
    setMuted,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?controls=0&dnt=1`}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}
      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-[#1ab7ea]/80 text-[10px] font-bold text-white backdrop-blur-sm z-20">
        Vimeo
      </div>
      <EmbedControls
        visible={ctrlVis}
        isPlaying={isPlaying}
        localTime={localTime}
        duration={duration}
        progressPct={duration > 0 ? (localTime / duration) * 100 : 0}
        playbackRate={1}
        onPlayPause={handlePlayPause}
        onSeekCommit={handleSeekCommit}
        showSpeed={false}
      />
    </div>
  );
}

function EmbedControls({
  visible,
  isPlaying,
  localTime,
  duration,
  progressPct,
  playbackRate,
  onPlayPause,
  onSeekCommit,
  onSpeedChange,
  showSpeed,
}) {
  const [tmp, setTmp] = useState(0);
  const [seeking, setSeeking] = useState(false);
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-400 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
      <div className="relative px-4 pb-4 pt-8 space-y-2">
        <div className="relative h-1.5 bg-white/15 rounded-full hover:h-2 transition-all duration-150 cursor-pointer">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={seeking ? tmp : localTime}
            onChange={(e) => {
              setSeeking(true);
              setTmp(Number(e.target.value));
            }}
            onMouseUp={(e) => {
              setSeeking(false);
              onSeekCommit(e);
            }}
            onTouchEnd={(e) => {
              setSeeking(false);
              onSeekCommit(e);
            }}
            aria-label="Seek"
            className="absolute inset-0 w-full opacity-0 cursor-pointer py-3"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/18 border border-white/8 text-white transition-all active:scale-90 backdrop-blur-sm"
          >
            {isPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5 ml-0.5" />
            )}
          </button>
          <span className="text-[11px] font-mono text-white/80 tabular-nums bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            {formatTime(localTime)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />
          {showSpeed && onSpeedChange && (
            <SpeedPicker value={playbackRate} onChange={onSpeedChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
function VolumeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}
function MuteIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
}
function ExpandIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
}
function CompressIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  );
}
function ExclamationIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  );
}
