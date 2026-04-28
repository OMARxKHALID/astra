import { SYNC_CHECK_INTERVAL, SYNC_TOLERANCE_S } from "@/constants/config";
export { SYNC_CHECK_INTERVAL, SYNC_TOLERANCE_S };

const DBG = false;

// [Note] project video position forward via server state + wall-clock elapsed
export function expectedTime(serverState, clockOffset = 0) {
  if (!serverState?.isPlaying) return serverState?.currentTime ?? 0;
  const elapsed = (Date.now() + clockOffset - serverState.lastUpdated) / 1000;
  const result = serverState.currentTime + elapsed * (serverState.playbackRate || 1);
  return result;
}

let _cachedLeader = 0;
let _cacheTs = 0;

// [Note] Median for 3+ robust to outliers. Max for 1-2 prevents both oscillating to an average.
export function getLeaderTime(tsMap) {
  if (!tsMap) return 0;
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

  if (times.length > 2) {
    const mid = Math.floor(times.length / 2);
    _cachedLeader =
      times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  } else if (times.length === 2) {
    // [Note] Max (fastest user) for 1-2 users ensures zero-latency feel for pairs
    _cachedLeader = Math.max(times[0], times[1]);
  } else {
    _cachedLeader = times[0];
  }

  _cacheTs = now;
  return _cachedLeader;
}

// [Note] Proportional rate correction: gentle ramp + high precision (toFixed 4)
// to prevent audio resampler 'popping' during micro-adjustments.
export function computeCorrection(localTime, targetTime, isPlaying) {
  if (!isPlaying) return { action: "none", playbackRate: 1 };
  const drift = targetTime - localTime;
  
  // [Note] Correction deadzone: Specified 0.5s tolerance to avoid jitter
  if (Math.abs(drift) <= 0.5) return { action: "none", playbackRate: 1 };

  // [Note] Correction ramp: Clamped to 0.9x - 1.1x as per performance rules
  if (drift > 0) {
    const rate = parseFloat(Math.min(1 + drift / 40, 1.1).toFixed(4));
    return { action: "soft", playbackRate: rate };
  }

  const rate = parseFloat(Math.max(1 + drift / 40, 0.9).toFixed(4));
  return { action: "soft", playbackRate: rate };
}
