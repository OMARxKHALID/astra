// How often the client sync loop fires (ms)
export const SYNC_CHECK_INTERVAL = 500;

// Ignore drift below this threshold — normal network jitter is ±50–200ms.
// The reference uses 0.5s. The old 0.15s was too tight and caused
// the engine to react to noise, making playback rate flutter constantly.
export const SYNC_TOLERANCE_S = 0.5;

/**
 * Compute where the video should currently be based on the server's last
 * known state and elapsed wall-clock time, adjusted for any clock offset.
 */
export function expectedTime(serverState, clockOffset = 0) {
  if (!serverState || !serverState.isPlaying) {
    return serverState?.currentTime ?? 0;
  }
  const now = Date.now() + clockOffset;
  const elapsed = (now - serverState.lastUpdated) / 1000;
  return serverState.currentTime + elapsed * (serverState.playbackRate || 1);
}

/**
 * Compute the "leader time" — the canonical position all clients should
 * converge toward. Always uses the true statistical median, which is robust
 * to outliers (e.g. one client with a frozen tab or bad network).
 *
 * The old code used Math.max() for rooms with ≤2 participants, which biased
 * the slower client to always chase the faster one even if the faster one
 * was abnormally ahead. Median is always fairer.
 */
export function getLeaderTime(tsMap) {
  const times = Object.values(tsMap)
    .filter((t) => typeof t === "number" && t >= 0)
    .sort((a, b) => a - b);

  if (times.length === 0) return 0;

  const mid = Math.floor(times.length / 2);
  if (times.length % 2 !== 0) return times[mid];
  return (times[mid - 1] + times[mid]) / 2;
}

/**
 * Determine the playback rate correction needed to bring a lagging client
 * back in sync with the leader.
 *
 * Key design decisions from the reference architecture:
 *
 * 1. NEVER slow clients down (no rate < 1.0). Slowing causes audible
 *    distortion. If a client is slightly ahead, play at 1.0x and let the
 *    median re-balance naturally.
 *
 * 2. Proportional acceleration: rate = 1 + drift/10, capped at 1.1x.
 *    At 0.5s behind → 1.05x. At 1s behind → 1.1x. Imperceptible.
 *
 * 3. NO automatic hard-seek. Hard-seeking at 2s drift was jarring.
 *    Hard-seeking is strictly user-triggered (a "Sync" button).
 *    Soft correction at 1.1x will catch up over time.
 */
export function computeCorrection(localTime, targetTime, isPlaying) {
  if (!isPlaying) return { action: "none", playbackRate: 1 };

  const drift = targetTime - localTime;

  // Within tolerance — no correction needed
  if (Math.abs(drift) <= SYNC_TOLERANCE_S) {
    return { action: "none", playbackRate: 1 };
  }

  // Client is behind (positive drift): accelerate proportionally, cap at 1.1x
  if (drift > 0) {
    const rate = parseFloat(Math.min(1 + drift / 10, 1.1).toFixed(3));
    return { action: "soft", playbackRate: rate };
  }

  // Client is slightly ahead: return to 1.0x — median re-balances over time
  return { action: "none", playbackRate: 1 };
}
