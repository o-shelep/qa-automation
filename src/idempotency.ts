// ---------- Варіант 9: POST /orders із заголовком Idempotency-Key ----------

/** Ключ: 8–64 символи, латинські літери, цифри, дефіс і підкреслення (UUID підходить) */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidIdempotencyKey(key: string): boolean {
  return IDEMPOTENCY_KEY_PATTERN.test(key);
}

/** Канонічний JSON: ключі об'єктів відсортовано, тож порядок полів у тілі не важливий */
export function fingerprint(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((k) => [k, canonical((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/** Збережений результат першого успішного запиту з ключем */
export interface IdempotentEntry<T> {
  fingerprint: string;
  status: number;
  location: string;
  body: T;
}
