/** UUIDv7: 48-bit unix ms timestamp, version/variant bits, random rest (ADR 0002). */
export function uuidv7(now: number = Date.now(), random: () => Uint8Array = randomBytes): string {
  const bytes = random();
  const ts = BigInt(now);
  for (let i = 0; i < 6; i++) bytes[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomBytes(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
