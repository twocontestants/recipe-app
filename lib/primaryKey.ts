/** True when both lists name the same columns, ignoring table vs constraint order. */
export function primaryKeyMatches(current: string[], expected: string[]): boolean {
  if (current.length !== expected.length) return false;
  const a = [...current].sort();
  const b = [...expected].sort();
  return a.every((name, i) => name === b[i]);
}
