export type PgSslMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';

export type PgSslOptions =
  | false
  | {
      rejectUnauthorized: boolean;
      ca?: string;
      checkServerIdentity?: () => undefined;
    };

export function createPostgresSslOptions(
  mode: PgSslMode,
  caCertificate?: string,
): PgSslOptions {
  if (mode === 'disable') {
    return false;
  }

  return {
    rejectUnauthorized: mode !== 'require' || Boolean(caCertificate),
    ...(caCertificate ? { ca: caCertificate } : {}),
    ...(mode === 'verify-ca'
      ? { checkServerIdentity: () => undefined }
      : {}),
  };
}
