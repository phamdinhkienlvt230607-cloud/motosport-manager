import { validateEnvironment } from './env.validation.js';

describe('validateEnvironment', () => {
  it('disables database connections by default for local development', () => {
    expect(validateEnvironment({ NODE_ENV: 'development' })).toMatchObject({
      DATABASE_ENABLED: false,
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:5173'],
    });
  });

  it('rejects wildcard origins in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        CORS_ORIGINS: '*',
      }),
    ).toThrow('CORS_ORIGINS must not contain a wildcard origin.');
  });

  it('rejects avnadmin as a production runtime database account', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_ENABLED: 'true',
        PGHOST: 'postgres.example.invalid',
        PGPORT: '5432',
        PGDATABASE: 'motosport_manager',
        PGUSER: 'avnadmin',
        PGPASSWORD: 'fake-placeholder',
        JWT_SECRET: 'test-only-secret-with-at-least-thirty-two-characters',
        CORS_ORIGINS: 'https://motosport.example',
      }),
    ).toThrow('Production database connections must not use avnadmin.');
  });

  it('requires verify-full and a CA file for production database connections', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_ENABLED: 'true',
        PGHOST: 'postgres.example.invalid',
        PGPORT: '5432',
        PGDATABASE: 'motosport_manager',
        PGUSER: 'runtime_user',
        PGPASSWORD: 'fake-placeholder',
        PGSSLMODE: 'verify-full',
        CORS_ORIGINS: 'https://motosport.example',
        JWT_SECRET: 'test-only-secret-with-at-least-thirty-two-characters',
      }),
    ).toThrow(
      'PGSSL_CA_FILE is required for production verify-full connections.',
    );
  });

  it('requires verify-full for production database connections', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_ENABLED: 'true',
        PGHOST: 'postgres.example.invalid',
        PGPORT: '5432',
        PGDATABASE: 'motosport_manager',
        PGUSER: 'runtime_user',
        PGPASSWORD: 'fake-placeholder',
        PGSSLMODE: 'require',
        PGSSL_CA_FILE: '/run/secrets/aiven-ca.pem',
        CORS_ORIGINS: 'https://motosport.example',
        JWT_SECRET: 'test-only-secret-with-at-least-thirty-two-characters',
      }),
    ).toThrow(
      'Production database connections require PGSSLMODE=verify-full.',
    );
  });

  it('validates configurable database retry limits', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        DB_RETRY_ATTEMPTS: '11',
      }),
    ).toThrow('DB_RETRY_ATTEMPTS must be an integer between 1 and 10.');
  });

  it('requires a strong JWT secret when database authentication is enabled', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        DATABASE_ENABLED: 'true',
        PGHOST: 'postgres.example.invalid',
        PGPORT: '5432',
        PGDATABASE: 'motosport_manager',
        PGUSER: 'runtime_user',
        PGPASSWORD: 'fake-placeholder',
        PGSSLMODE: 'verify-full',
        PGSSL_CA_FILE: '/run/secrets/aiven-ca.pem',
        JWT_SECRET: 'too-short',
      }),
    ).toThrow('JWT_SECRET must contain at least 32 characters.');
  });

  it.each([
    'change-me',
    '  CHANGE - ME  ',
    'Your-Secret-Key',
    ' RePlAcE_This_Secret ',
    'replace_with_a_random_secret_at_least_32_characters',
  ])('rejects JWT placeholder secrets in production', (secret) => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_ENABLED: 'false',
        JWT_SECRET: secret,
        CORS_ORIGINS: 'https://motosport.example',
      }),
    ).toThrow('JWT_SECRET must not be a placeholder value.');
  });

  it('rejects a low-diversity JWT secret in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_ENABLED: 'false',
        JWT_SECRET: 'a'.repeat(48),
        CORS_ORIGINS: 'https://motosport.example',
      }),
    ).toThrow('JWT_SECRET must contain at least 12 distinct characters.');
  });

  it('requires a JWT secret in production even when the database is disabled', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_ENABLED: 'false',
        CORS_ORIGINS: 'https://motosport.example',
      }),
    ).toThrow(
      'JWT_SECRET is required when DATABASE_ENABLED=true or NODE_ENV=production.',
    );
  });

  it('trims a valid JWT secret before returning the validated environment', () => {
    const secret = 'test-only-secret-with-at-least-thirty-two-characters';

    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_ENABLED: 'false',
        JWT_SECRET: `  ${secret}  `,
        CORS_ORIGINS: 'https://motosport.example',
      }),
    ).toMatchObject({ JWT_SECRET: secret });
  });
});
