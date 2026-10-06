/**
 * Generates a human-readable order reference such as `CVL-20261006-4832`.
 * A backend-issued reference will replace this in a later step.
 */
export function createOrderReference(date: Date = new Date()): string {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const sequence = Math.floor(1000 + Math.random() * 9000);
  return `CVL-${datePart}-${sequence}`;
}
