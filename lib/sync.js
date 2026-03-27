import { SYNC_CHECK_INTERVAL, SYNC_TOLERANCE_S } from "./constants.js";
export { SYNC_CHECK_INTERVAL, SYNC_TOLERANCE_S };

/** Project video position forward from last known server state + elapsed time. */
export function expectedTime(serverState, clockOffset = 0) {
  if (!serverState?.isPlaying) return serverState?.currentTime ?? 0;
  const elapsed = (Date.now() + clockOffset - serverState.lastUpdated) / 1000;
  return serverState.currentTime + elapsed * (serverState.playbackRate || 1);
}

let _cachedLeader = 0;
let _cacheTs = 0;

/**
 * Median of all tsMap values — robust to outliers.
 * Cached for 100ms to reduce O(n log n) sort cost at the 5Hz sync rate.
 */
export function getLeaderTime(tsMap) {
  const now = Date.now();
  if (now - _cacheTs < 100) return _cachedLeader;

  const times = Object.values(tsMap)
    .filter((t) => typeof t === "number" && t >= 0)
    .sort((a, b) => a - b);

  if (!times.length) {
    _cachedLeader = 0;
    _cacheTs = now;
    return 0;
  }

  const mid = Math.floor(times.length / 2);
  _cachedLeader =
    times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  _cacheTs = now;
  return _cachedLeader;
}

/**
 * Proportional playback-rate correction — bidirectional.
 *   Behind : speed up,  max 1.1×
 *   Ahead  : slow down, min 0.9×
 *   ±0.5s  : no change
 */
export function computeCorrection(localTime, targetTime, isPlaying) {
  if (!isPlaying) return { action: "none", playbackRate: 1 };
  const drift = targetTime - localTime;
  if (Math.abs(drift) <= SYNC_TOLERANCE_S)
    return { action: "none", playbackRate: 1 };

  if (drift > 0) {
    // drift/15 ramp: gentler slope → fewer distinct rate values written → less audio resampler noise
    const rate = parseFloat(Math.min(1 + drift / 15, 1.1).toFixed(2));
    return { action: "soft", playbackRate: rate };
  }

  // Client is ahead — slow down gently
  const rate = parseFloat(Math.max(1 + drift / 15, 0.9).toFixed(2));
  return { action: "soft", playbackRate: rate };
}
