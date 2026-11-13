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
});
