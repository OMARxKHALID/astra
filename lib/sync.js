import { SYNC_CHECK_INTERVAL, SYNC_TOLERANCE_S } from "./constants.js";
export { SYNC_CHECK_INTERVAL, SYNC_TOLERANCE_S };

/** Project video position forward from last known server state + elapsed time. */
export function expectedTime(serverState, clockOffset = 0) {
  if (!serverState?.isPlaying) return serverState?.currentTime ?? 0;
  const elapsed = (Date.now() + clockOffset - serverState.lastUpdated) / 1000;
  return serverState.currentTime + elapsed * (serverState.playbackRate || 1);
}

/**
 * Median of all tsMap values — robust to outliers vs Math.max().
 * [10.0, 10.1, 20.0] → 10.1 (outlier ignored)
 */
export function getLeaderTime(tsMap) {
  const times = Object.values(tsMap)
    .filter((t) => typeof t === "number" && t >= 0)
    .sort((a, b) => a - b);
  if (!times.length) return 0;
  const mid = Math.floor(times.length / 2);
  return times.length % 2 !== 0
    ? times[mid]
    : (times[mid - 1] + times[mid]) / 2;
}

/**
 * Proportional playback-rate correction (never slows below 1.0x).
 * 0.5s behind → 1.05×  |  1s+ → capped at 1.1×
 */
export function computeCorrection(localTime, targetTime, isPlaying) {
  if (!isPlaying) return { action: "none", playbackRate: 1 };
  const drift = targetTime - localTime;
  if (Math.abs(drift) <= SYNC_TOLERANCE_S)
    return { action: "none", playbackRate: 1 };
  if (drift > 0) {
    const rate = parseFloat(Math.min(1 + drift / 10, 1.1).toFixed(3));
    return { action: "soft", playbackRate: rate };
  }
  return { action: "none", playbackRate: 1 };
}
