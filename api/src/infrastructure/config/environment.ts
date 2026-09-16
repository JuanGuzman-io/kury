export interface Environment {
  port: number;
  databaseUrl: string;
  throttleTtlMs: number;
  throttleIngestLimit: number;
  throttleReadLimit: number;
}

function numberValue(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function loadEnvironment(): Environment {
  const user = process.env.DATABASE_USER ?? 'kuri';
  const password = process.env.DATABASE_PASSWORD ?? 'kuri';
  const host = process.env.DATABASE_HOST ?? 'localhost';
  const port = process.env.DATABASE_PORT ?? '5432';
  const database = process.env.DATABASE_NAME ?? 'kuri';
  return {
    port: numberValue('PORT', 3001),
    databaseUrl:
      process.env.DATABASE_URL ??
      `postgres://${user}:${password}@${host}:${port}/${database}`,
    throttleTtlMs: numberValue('THROTTLE_TTL_MS', 60_000),
    throttleIngestLimit: numberValue('THROTTLE_INGEST_LIMIT', 120),
    throttleReadLimit: numberValue('THROTTLE_READ_LIMIT', 60),
  };
}
