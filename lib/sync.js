// lib/sync.js - Based on ref.md logic

export const SYNC_INTERVAL = 1000;
export const DRIFT_THRESHOLD_SOFT = 1.0;  // Speed up if > 1s off
export const DRIFT_THRESHOLD_MINOR = 0.3; // Show "Adjusting" if > 300ms
export const MAX_PLAYBACK_RATE = 1.1;
export const EXTREME_DRIFT_THRESHOLD = 3.0; // Hard seek threshold

/**
 * Calculates the leader time from a tsMap.
 * With 2 people: max time wins.
 * With 3+ people: median to avoid outliers.
 */
export function selectLeader(tsMap, participantCount) {
  const times = Object.values(tsMap).filter((t) => typeof t === "number");
  if (times.length === 0) return null;

  if (participantCount > 2) {
    const sorted = [...times].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  } else {
    return Math.max(...times);
  }
}

/**
 * Calculates playback rate adjustment based on drift.
 * Formula: pbr = 1.0 + (delta / 10)
 * Cap at 1.1x
 */
export function computeCorrection(
  localTime,
  targetTime,
  isPlaying,
  basePlaybackRate = 1,
) {
  if (!isPlaying) {
    return { action: "none", playbackRate: 1.0, seekTo: null };
  }

  const delta = targetTime - localTime;
  const absDelta = Math.abs(delta);

  // EXTREME drift - jump immediately
  if (absDelta > EXTREME_DRIFT_THRESHOLD) {
    return {
      action: "hard",
      playbackRate: 1.0,
      seekTo: targetTime,
    };
  }

  // Drift Correction Formula from ref.md
  // pbr = 1.0 + (delta / 10)
  
  if (delta > DRIFT_THRESHOLD_SOFT) {
    // Serious lag (> 500ms)
    let pbr = 1.0 + (delta / 10);
    pbr = Math.min(pbr, MAX_PLAYBACK_RATE);
    return { action: "soft", playbackRate: pbr, seekTo: null };
  } else if (delta > DRIFT_THRESHOLD_MINOR) {
    // Minor lag (> 100ms)
    let pbr = 1.0 + (delta / 10);
    return { action: "soft", playbackRate: pbr, seekTo: null };
  }

  // If we are ahead (delta < 0), the reference doesn't specify a speed-down formula,
  // but usually we reset to 1.0x and let them catch up. 
  // However, for symmetry, we could do 1.0 + delta/10 as well.
  if (delta < -DRIFT_THRESHOLD_MINOR) {
      let pbr = 1.0 + (delta / 10); // delta is negative, so pbr < 1.0
      pbr = Math.max(0.9, pbr); 
      return { action: "soft", playbackRate: pbr, seekTo: null };
  }

  return { action: "none", playbackRate: 1.0, seekTo: null };
}

export function driftStatus(absDelta) {
  if (absDelta <= DRIFT_THRESHOLD_MINOR) return "synced";
  if (absDelta <= EXTREME_DRIFT_THRESHOLD) return "soft";
  return "hard";
}
