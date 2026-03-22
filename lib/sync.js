// ─── Sync constants ───────────────────────────────────────────────────────────

// How often the client sync loop fires (ms).
// Analysis finding: watchparty fires every frame (~16ms); 500ms was too slow
// to catch short drift spikes. 200ms is a good balance — 2.5x faster drift
// detection with negligible CPU cost (~0.1% on a modern device).
export const SYNC_CHECK_INTERVAL = 200;

// Ignore drift below this threshold — normal network jitter is ±50–200ms.
// 0.5s is the same value watchparty uses. Tighter = more rate flutter.
export const SYNC_TOLERANCE_S = 0.5;

/**
 * Compute where the video should currently be based on the server's last
 * known state and elapsed wall-clock time, adjusted for any clock offset.
 *
 * clockOffset compensates for client-server clock skew.  It is measured
 * periodically via a round-trip ping and stored in SyncEngine.clockOffset.
 * Without it, a client whose system clock is 200ms fast would always "lead"
 * the room by 200ms and never converge.
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
 * Leader time — the canonical position all clients should converge toward.
 *
 * Uses the TRUE statistical median of all reported timestamps. This is more
 * robust than Math.max() (watchparty's approach), which is biased toward the
 * fastest/furthest-ahead client — meaning all others must constantly chase
 * the outlier. With median:
 *
 *   [10.0, 10.1, 20.0] → median 10.1  (outlier at 20.0 ignored)
 *   [10.0, 10.2]       → median 10.1  (average of two; fair in 2-person rooms)
 *
 * We filter out negative timestamps (live-stream positions) since their
 * numeric value doesn't represent a meaningful VOD position.
 */
export function getLeaderTime(tsMap) {
  const times = Object.values(tsMap)
    .filter((t) => typeof t === "number" && t >= 0)
    .sort((a, b) => a - b);

  if (times.length === 0) return 0;

  const mid = Math.floor(times.length / 2);
  return times.length % 2 !== 0
    ? times[mid]
    : (times[mid - 1] + times[mid]) / 2;
}

/**
 * Compute the playback-rate correction needed to bring a lagging client
 * back in sync with the leader.
 *
 * Design rules (same as watchparty):
 *
 *  1. NEVER slow clients below 1.0x.  Slowing down causes audible pitch
 *     distortion. A client that is slightly AHEAD simply plays at 1.0x
 *     and the median naturally re-balances as others catch up.
 *
 *  2. Proportional acceleration: rate = 1 + drift/10, capped at 1.1x.
 *     - 0.5s behind → 1.05x  (barely perceptible)
 *     - 1.0s behind → 1.1x   (imperceptible at normal listening volumes)
 *     - 5.0s behind → 1.1x   (still capped — catches up in ~50 seconds)
 *
 *  3. Hard seek is ONLY user-triggered ("Sync now" button).  Auto hard-seek
 *     at 2s drift was jarring; soft correction at 1.1x is always preferable.
 */
export function computeCorrection(localTime, targetTime, isPlaying) {
  if (!isPlaying) return { action: "none", playbackRate: 1 };

  const drift = targetTime - localTime;

  if (Math.abs(drift) <= SYNC_TOLERANCE_S) {
    return { action: "none", playbackRate: 1 };
  }

  if (drift > 0) {
    const rate = parseFloat(Math.min(1 + drift / 10, 1.1).toFixed(3));
    return { action: "soft", playbackRate: rate };
  }

  // Client is ahead — coast at 1.0x; median rebalances naturally
  return { action: "none", playbackRate: 1 };
}
