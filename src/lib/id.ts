/** Entity id generator matching the legacy format: `${Date.now()}-${hex}`. */
export function createId(): string {
  const rand = Math.random().toString(16).slice(2, 16).padEnd(14, "0");
  return `${Date.now()}-${rand}`;
}
