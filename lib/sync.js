export const SYNC_TOLERANCE_S = 0.15;
export const SOFT_CORRECT_MAX_S = 2.0;
export const PLAYBACK_RATE_FAST = 1.06;
export const PLAYBACK_RATE_SLOW = 0.94;
export const HEARTBEAT_INTERVAL = 5000;
export const SYNC_CHECK_INTERVAL = 500;
export const EXTREME_DRIFT_THRESHOLD = 3.0;

export function expectedTime(serverState, clockOffset = 0) {
  if (!serverState || !serverState.isPlaying) {
    return serverState?.currentTime ?? 0;
  }
  const now = Date.now() + clockOffset;
  const elapsed = (now - serverState.lastUpdated) / 1000;
  return serverState.currentTime + elapsed * (serverState.playbackRate || 1);
}

export function getLeaderTime(tsMap, participantCount) {
  const times = Object.values(tsMap)
    .filter((t) => typeof t === "number" && t >= 0)
    .sort((a, b) => a - b);
  if (times.length === 0) return 0;
  if (participantCount <= 2) {
    return Math.max(...times);
  }
  if (times.length % 2 !== 0) {
    return times[Math.floor(times.length / 2)];
  }
  const mid = times.length / 2;
  return (times[mid - 1] + times[mid]) / 2;
}

export function computeCorrection(localTime, targetTime, isPlaying) {
  if (!isPlaying) return { action: "none", playbackRate: 1, seekTo: null };
  const drift = targetTime - localTime;
  const absDrift = Math.abs(drift);
  if (absDrift <= SYNC_TOLERANCE_S) {
    return { action: "none", playbackRate: 1, seekTo: null };
  }
  if (absDrift <= SOFT_CORRECT_MAX_S) {
    const rate = drift > 0 ? PLAYBACK_RATE_FAST : PLAYBACK_RATE_SLOW;
    return { action: "soft", playbackRate: rate, seekTo: null };
  }
  return { action: "hard", playbackRate: 1, seekTo: targetTime };
}
