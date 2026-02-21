/**
 * Section Diff Utility
 * --------------------
 * Compares two resume JSON payloads and returns which top-level
 * sections have changed. Uses deep equality comparison.
 */

/**
 * Compare two resume data objects and return the list of changed section keys.
 * Only checks top-level keys (basics, work, skills, education, projects, meta, etc.)
 */
export function diffSections(
  oldData: Record<string, any> | null,
  newData: Record<string, any>
): string[] {
  if (!oldData) {
    // First version — everything is "new"
    return Object.keys(newData);
  }

  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const changed: string[] = [];

  for (const key of allKeys) {
    const oldVal = oldData[key];
    const newVal = newData[key];

    if (!deepEqual(oldVal, newVal)) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Generate a human-readable change summary.
 */
export function generateChangeSummary(changedSections: string[]): string {
  if (changedSections.length === 0) return 'No changes detected';
  if (changedSections.length === 1) return `Updated ${changedSections[0]}`;
  if (changedSections.length <= 3) return `Updated ${changedSections.join(', ')}`;
  return `Updated ${changedSections.length} sections`;
}

/**
 * Simple deep equality check for JSON-serializable objects.
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}
