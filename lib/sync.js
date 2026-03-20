
export const SYNC_TOLERANCE_S = 0.50;
export const SOFT_CORRECT_MAX_S = 3.0;
export const SYNC_CHECK_INTERVAL = 500;



export const HARD_SEEK_THRESHOLD = SOFT_CORRECT_MAX_S;

export function expectedTime(serverState, clockOffset = 0) {
  if (!serverState || !serverState.isPlaying) return serverState?.currentTime ?? 0;
  const now = Date.now() + clockOffset;
  const elapsedSec = (now - serverState.lastUpdated) / 1000;
  return serverState.currentTime + elapsedSec * (serverState.playbackRate || 1);
}

export function computeCorrection(localTime, targetTime, isPlaying, basePlaybackRate = 1) {
  if (!isPlaying) return { action: "none", playbackRate: basePlaybackRate, seekTo: null };
  const drift = targetTime - localTime;
  const absDrift = Math.abs(drift);
  if (absDrift <= SYNC_TOLERANCE_S)
    return { action: "none", playbackRate: basePlaybackRate, seekTo: null };



  if (absDrift <= SOFT_CORRECT_MAX_S) {
    const magnitude = absDrift > 1.5 ? 0.05 : 0.02;
    const factor = drift > 0 ? (1 + magnitude) : (1 - magnitude);
    const targetRate = Math.max(0.06, basePlaybackRate * factor);
    return { action: "soft", playbackRate: targetRate, seekTo: null };
  }

  return { action: "hard", playbackRate: basePlaybackRate, seekTo: targetTime };
}

export function driftStatus(absDrift) {

  if (absDrift <= 1.5) return "synced";
  if (absDrift <= SOFT_CORRECT_MAX_S) return "soft";
  return "hard";
}
