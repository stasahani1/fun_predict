/**
 * Lazy migration utilities for old event schemas.
 * Maps the old 6-phase system to the new 4-phase system
 * and infers per-prediction status fields.
 */

/**
 * Map old event phases to new phases.
 * posting/betting/live -> active, others stay.
 */
export function migrateEventPhase(phase) {
  if (phase === "posting" || phase === "betting" || phase === "live") {
    return "active";
  }
  return phase;
}

/**
 * Infer prediction status and default missing fields.
 */
export function migratePrediction(pred, eventPhase) {
  const migrated = { ...pred };

  if (!migrated.status) {
    if (migrated.resolution) {
      migrated.status = "resolved";
    } else if (eventPhase === "resolving" || eventPhase === "complete") {
      migrated.status = "locked";
    } else {
      migrated.status = "open";
    }
  }

  if (migrated.blindMode === undefined) {
    migrated.blindMode = false;
  }

  if (migrated.visibleToTagged === undefined) {
    migrated.visibleToTagged = true;
  }

  return migrated;
}
