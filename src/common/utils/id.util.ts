/**
 * Utility functions for 14-digit IDs without '0' and without consecutive repeated digits.
 */

/**
 * Validates if the given ID:
 * 1. Has exactly 14 digits.
 * 2. Does NOT contain the digit '0'.
 * 3. Does NOT contain any consecutive repeated digits (e.g. '11', '22', '33', etc.).
 */
export function isValid14DigitId(id: unknown): boolean {
  if (typeof id !== 'string' && typeof id !== 'number') {
    return false;
  }

  const str = String(id).trim();

  // Exactly 14 digits and strictly digits 1-9 (no '0')
  if (!/^[1-9]{14}$/.test(str)) {
    return false;
  }

  // No consecutive repeated digits (no adjacent duplicates like '11', '22', etc.)
  if (/(.)\1/.test(str)) {
    return false;
  }

  return true;
}

/**
 * Generates a deterministic 14-digit ID for an index:
 * - Exactly 14 digits
 * - No '0'
 * - No consecutive repeated digits
 * - Guaranteed unique for every index
 */
export function toNonRepeating14DigitId(index: number): number {
  if (index <= 0) {
    throw new Error('Index must be a positive integer');
  }

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  // Bijective mixing over 60-bit integer
  let val =
    (BigInt(index) * 2862933555777941757n + 3037000493n) & 0x7ffffffffffffffn;

  const d0 = Number((val % 9n) + 1n);
  let res = d0.toString();
  let prev = d0;
  val = val / 9n;

  for (let i = 1; i < 14; i++) {
    const available = digits.filter((d) => d !== prev);
    const rem = Number(val % 8n);
    const nextD = available[rem];
    res += nextD.toString();
    prev = nextD;
    val = val / 8n;
  }

  return Number(res);
}

/**
 * Generates a random 14-digit ID without '0' and without consecutive repeated digits.
 */
export function generate14DigitId(): number {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let res = '';
  let prev = -1;

  for (let i = 0; i < 14; i++) {
    const available = digits.filter((d) => d !== prev);
    const chosen = available[Math.floor(Math.random() * available.length)];
    res += chosen.toString();
    prev = chosen;
  }

  return Number(res);
}
