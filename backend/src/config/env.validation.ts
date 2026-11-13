type Environment = Record<string, unknown>;

const allowedSslModes = new Set([
  'disable',
  'require',
  'verify-ca',
  'verify-full',
]);

const jwtSecretPlaceholders = new Set([
  'changeme',
  'yoursecretkey',
  'replacethissecret',
  'replacewitharandomsecretatleast32characters',
  'yoursecrethere',
  'secret',
  'password',
]);

function assertStrongJwtSecret(secret: string): void {
  const placeholderKey = secret.toLowerCase().replace(/[\s_-]+/g, '');
  if (jwtSecretPlaceholders.has(placeholderKey)) {
    throw new Error('JWT_SECRET must not be a placeholder value.');
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  if (new Set(Array.from(secret)).size < 12) {
    throw new Error('JWT_SECRET must contain at least 12 distinct characters.');
  }
}

function parseBoolean(
  value: unknown,
  name: string,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${name} must be "true" or "false".`);
}

function parseInteger(
  value: unknown,
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  if ((value === undefined || value === '') && defaultValue !== undefined) {
    return defaultValue;
  }

  const parsedValue = Number(value);
  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`,
    );
  }

  return parsedValue;
}

function parseOptionalPort(value: unknown): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return parseInteger(value, 'PGPORT', 5432, 1, 65535);
}

function parseOrigins(value: unknown, nodeEnv: string): string[] {
  const rawOrigins =
    typeof value === 'string'
      ? value
      : nodeEnv === 'production'
        ? ''
        : 'http://localhost:5173';
  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.includes('*')) {
    throw new Error('CORS_ORIGINS must not contain a wildcard origin.');
  }

  for (const origin of origins) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must contain valid origins.');
    }

    if (
      parsedOrigin.origin !== origin ||
      (nodeEnv === 'production' && parsedOrigin.protocol !== 'https:')
    ) {
      throw new Error(
        'CORS_ORIGINS must be bare origins; production origins must use HTTPS.',
      );
    }
  }

  if (nodeEnv === 'production' && origins.length === 0) {
    throw new Error('CORS_ORIGINS must be set in production.');
  }

  return origins;
}

export function validateEnvironment(environment: Environment): Environment {
  const nodeEnv = String(environment.NODE_ENV ?? 'development');
  const corsOrigins = parseOrigins(environment.CORS_ORIGINS, nodeEnv);
  const databaseEnabled = parseBoolean(
    environment.DATABASE_ENABLED,
    'DATABASE_ENABLED',
    false,
  );
  const sslMode = String(environment.PGSSLMODE ?? 'require');
  const port = parseInteger(environment.PORT, 'PORT', 3000, 1, 65535);
  const databasePort = parseOptionalPort(environment.PGPORT);
  if (
    environment.PGSSL_CA_FILE !== undefined &&
    typeof environment.PGSSL_CA_FILE !== 'string'
  ) {
    throw new Error('PGSSL_CA_FILE must be a file path.');
  }

  const caFile =
    typeof environment.PGSSL_CA_FILE === 'string' &&
    environment.PGSSL_CA_FILE.trim() !== ''
      ? environment.PGSSL_CA_FILE.trim()
      : undefined;
  const retryAttempts = parseInteger(
    environment.DB_RETRY_ATTEMPTS,
    'DB_RETRY_ATTEMPTS',
    5,
    1,
    10,
  );
  const retryDelay = parseInteger(
    environment.DB_RETRY_DELAY_MS,
    'DB_RETRY_DELAY_MS',
    2000,
    100,
    10000,
  );
  const jwtSecret =
    typeof environment.JWT_SECRET === 'string'
      ? environment.JWT_SECRET.trim()
      : undefined;
  const jwtExpiresInSeconds = parseInteger(
    environment.JWT_EXPIRES_IN_SECONDS,
    'JWT_EXPIRES_IN_SECONDS',
    900,
    60,
    86400,
  );

  if (!allowedSslModes.has(sslMode)) {
    throw new Error(
      'PGSSLMODE must be one of disable, require, verify-ca, or verify-full.',
    );
  }

  if (caFile && sslMode === 'disable') {
    throw new Error('PGSSL_CA_FILE cannot be used when PGSSLMODE=disable.');
  }

  if (databaseEnabled) {
    for (const name of [
      'PGHOST',
      'PGDATABASE',
      'PGUSER',
      'PGPASSWORD',
    ]) {
      if (typeof environment[name] !== 'string' || environment[name] === '') {
        throw new Error(`${name} is required when DATABASE_ENABLED=true.`);
      }
    }

    if (databasePort === undefined) {
      throw new Error('PGPORT is required when DATABASE_ENABLED=true.');
    }

    if (nodeEnv === 'production') {
      if (environment.PGUSER === 'avnadmin') {
        throw new Error(
          'Production database connections must not use avnadmin.',
        );
      }

      if (sslMode !== 'verify-full') {
        throw new Error(
          'Production database connections require PGSSLMODE=verify-full.',
        );
      }

      if (!caFile) {
        throw new Error(
          'PGSSL_CA_FILE is required for production verify-full connections.',
        );
      }
    }
  }

  if (databaseEnabled || nodeEnv === 'production') {
    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET is required when DATABASE_ENABLED=true or NODE_ENV=production.',
      );
    }
    assertStrongJwtSecret(jwtSecret);
  }

  return {
    ...environment,
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_ENABLED: databaseEnabled,
    PGPORT: databasePort,
    PGSSLMODE: sslMode,
    PGSSL_CA_FILE: caFile,
    DB_RETRY_ATTEMPTS: retryAttempts,
    DB_RETRY_DELAY_MS: retryDelay,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN_SECONDS: jwtExpiresInSeconds,
    CORS_ORIGINS: corsOrigins,
  };
}
