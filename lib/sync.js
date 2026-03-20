
export const SYNC_TOLERANCE_S = 0.15;
export const SOFT_CORRECT_MAX_S = 2.0;
export const PLAYBACK_RATE_FAST = 1.06;
export const PLAYBACK_RATE_SLOW = 0.94;
export const HEARTBEAT_INTERVAL = 5_000;
export const SYNC_CHECK_INTERVAL = 500;

export function expectedTime(serverState) {
  if (!serverState.isPlaying) return serverState.currentTime;
  const elapsedSec = (Date.now() - serverState.lastUpdated) / 1000;
  return serverState.currentTime + elapsedSec * (serverState.playbackRate || 1);
}

export function computeCorrection(localTime, targetTime, isPlaying) {
  if (!isPlaying) return { action: "none", playbackRate: 1, seekTo: null };
  const drift = targetTime - localTime;
  const absDrift = Math.abs(drift);
  if (absDrift <= SYNC_TOLERANCE_S)
    return { action: "none", playbackRate: 1, seekTo: null };
  if (absDrift <= SOFT_CORRECT_MAX_S) {
    const rate = drift > 0 ? PLAYBACK_RATE_FAST : PLAYBACK_RATE_SLOW;
    return { action: "soft", playbackRate: rate, seekTo: null };
  }
  return { action: "hard", playbackRate: 1, seekTo: targetTime };
}

export function driftStatus(absDrift) {
  if (absDrift <= SYNC_TOLERANCE_S) return "synced";
  if (absDrift <= SOFT_CORRECT_MAX_S) return "soft";
  return "hard";
}
