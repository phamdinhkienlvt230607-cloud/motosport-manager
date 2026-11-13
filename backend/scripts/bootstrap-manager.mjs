import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';
import { Client } from 'pg';

class BootstrapError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const safeErrorCodes = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '25001',
  '25P02',
  '23503',
  '23505',
  '23514',
  '28000',
  '28P01',
  '3D000',
  '40001',
  '40P01',
  '42501',
  '42703',
  '42P01',
  '53300',
  '57P01',
  '57P02',
  '57P03',
  'XX000',
  'EAI_AGAIN',
  'EADDRNOTAVAIL',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'ETIMEDOUT',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_OSSL_ASN1_HEADER_TOO_LONG',
  'ERR_OSSL_PEM_NO_START_LINE',
  'ERR_SSL_WRONG_VERSION_NUMBER',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'INPUT_CANCELLED',
  'INTERACTIVE_TTY_REQUIRED',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

const dnsErrorCodes = new Set(['EAI_AGAIN', 'ENOTFOUND']);
const tcpErrorCodes = new Set([
  'EADDRNOTAVAIL',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'ETIMEDOUT',
]);
const postgresConnectionCodes = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
]);
const postgresAuthenticationCodes = new Set(['28000', '28P01']);
const transactionSqlStates = new Set(['25001', '25P02', '40001', '40P01']);
const transactionStages = new Set([
  'advisory_lock',
  'begin_transaction',
  'set_transaction_isolation',
]);
const tlsErrorCodes = new Set([
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_OSSL_ASN1_HEADER_TOO_LONG',
  'ERR_OSSL_PEM_NO_START_LINE',
  'ERR_SSL_WRONG_VERSION_NUMBER',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

function getErrorChain(error) {
  const chain = [];
  const seen = new Set();
  let current = error;

  while (
    current &&
    typeof current === 'object' &&
    chain.length < 4 &&
    !seen.has(current)
  ) {
    seen.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}

function getSafeErrorCode(error) {
  for (const item of getErrorChain(error)) {
    if (typeof item.code === 'string' && safeErrorCodes.has(item.code)) {
      return item.code;
    }
  }
  return 'UNCLASSIFIED';
}

function classifyError(error, stage) {
  const codes = getErrorChain(error)
    .map((item) => item.code)
    .filter((code) => typeof code === 'string');

  const tlsCode = codes.find(
    (code) =>
      tlsErrorCodes.has(code) ||
      code.startsWith('ERR_SSL_') ||
      code.startsWith('ERR_TLS_'),
  );
  if (tlsCode) {
    return {
      category: 'tls',
      code: safeErrorCodes.has(tlsCode) ? tlsCode : 'TLS_ERROR',
    };
  }

  const dnsCode = codes.find((code) => dnsErrorCodes.has(code));
  if (dnsCode) return { category: 'dns', code: dnsCode };

  const tcpCode = codes.find((code) => tcpErrorCodes.has(code));
  if (tcpCode) return { category: 'tcp', code: tcpCode };

  const postgresConnectionCode = codes.find((code) =>
    postgresConnectionCodes.has(code),
  );
  if (postgresConnectionCode) {
    return {
      category: 'postgres_connection',
      code: postgresConnectionCode,
    };
  }

  const authCode = codes.find((code) =>
    postgresAuthenticationCodes.has(code),
  );
  if (authCode) return { category: 'postgres_auth', code: authCode };

  const transactionCode = codes.find((code) =>
    transactionSqlStates.has(code),
  );
  if (transactionCode || transactionStages.has(stage)) {
    return {
      category: 'transaction',
      code: transactionCode ?? getSafeErrorCode(error),
    };
  }

  if (stage === 'load_ca') {
    return { category: 'tls_setup', code: getSafeErrorCode(error) };
  }

  return {
    category: stage === 'client_connect' ? 'connection_other' : 'database_other',
    code: getSafeErrorCode(error),
  };
}

export function assertInteractiveInput(input = stdin) {
  if (input.isTTY !== true || typeof input.setRawMode !== 'function') {
    throw new BootstrapError(
      'Run this command in an interactive terminal that supports hidden input.',
      'INTERACTIVE_TTY_REQUIRED',
    );
  }
}

export function readLine(prompt, { hidden = false, input = stdin, output = stdout } = {}) {
  assertInteractiveInput(input);

  return new Promise((resolveLine, reject) => {
    let value = '';
    let finished = false;
    let escapeSequenceState = 0;

    const finish = (error) => {
      if (finished) return;
      finished = true;
      input.removeListener('data', onData);

      try {
        input.setRawMode(false);
        input.pause();
        output.write('\n');
      } catch (restoreError) {
        if (!error) error = restoreError;
      }

      if (error) reject(error);
      else resolveLine(value);
    };

    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (escapeSequenceState === 1) {
          escapeSequenceState = 0;
          if (character === '[' || character === 'O') {
            escapeSequenceState = 2;
          }
          continue;
        }
        if (escapeSequenceState === 2) {
          if (character >= '@' && character <= '~') {
            escapeSequenceState = 0;
          }
          continue;
        }
        if (character === '\u001b') {
          escapeSequenceState = 1;
          continue;
        }
        if (character === '\u0003') {
          finish(new BootstrapError('Input cancelled.', 'INPUT_CANCELLED'));
          return;
        }
        if (character === '\u0004') {
          finish(new BootstrapError('Input ended.', 'INPUT_CANCELLED'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u007f' || character === '\b') {
          const characters = Array.from(value);
          if (characters.length > 0) {
            characters.pop();
            value = characters.join('');
            if (!hidden) output.write('\b \b');
          }
          continue;
        }
        if (character.charCodeAt(0) < 0x20) continue;
        value += character;
        if (!hidden) output.write(character);
      }
    };

    try {
      input.setEncoding('utf8');
      input.setRawMode(true);
      output.write(prompt);
      input.on('data', onData);
      input.resume();
    } catch (error) {
      finish(error);
    }
  });
}

function readHidden(prompt) {
  return readLine(prompt, { hidden: true });
}

async function askVisible(question) {
  return (await readLine(question)).trim();
}

async function collectConnectionInfo() {
  const runtimeUsername = await askVisible(
    'Runtime PostgreSQL username (separation check): ',
  );
  const host = await askVisible('Bootstrap PostgreSQL host: ');
  const portInput = await askVisible('Bootstrap PostgreSQL port [5432]: ');
  const database = await askVisible('Bootstrap database name: ');
  const username = await askVisible('Bootstrap database username: ');

  if (!runtimeUsername || !host || !database || !username) {
    throw new BootstrapError('Connection fields must not be empty.');
  }
  if (username.toLowerCase() === runtimeUsername.toLowerCase()) {
    throw new BootstrapError(
      'Use a bootstrap database account separate from the runtime account.',
    );
  }
  if (/[\s/:]/.test(host)) {
    throw new BootstrapError(
      'Host must not contain whitespace, a protocol, path, or port.',
    );
  }

  const port = portInput ? Number(portInput) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new BootstrapError('Port must be an integer between 1 and 65535.');
  }

  const password = await readHidden('Bootstrap database password (hidden): ');
  if (!password) {
    throw new BootstrapError('Bootstrap database password must not be empty.');
  }

  const caFile =
    (await askVisible('CA certificate path [cert/ca.pem]: ')) ||
    'cert/ca.pem';
  return { host, port, database, username, password, caFile };
}

function createClient(connection) {
  const ca = readFileSync(connection.caFile, 'utf8');
  if (!new X509Certificate(ca).ca) {
    throw new BootstrapError('PGSSL_CA_FILE must be a CA certificate.');
  }

  return new Client({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    ssl: {
      ca,
      rejectUnauthorized: true,
    },
    connectionTimeoutMillis: 5000,
  });
}

async function main() {
  let stage = 'input';
  let client;
  let transactionOpen = false;
  let failure;

  try {
    assertInteractiveInput();
    const connection = await collectConnectionInfo();
    const username = await askVisible('Manager username: ');
    const displayName = await askVisible('Manager display name: ');
    const password = await readHidden('New password (hidden): ');
    const passwordConfirmation = await readHidden(
      'Confirm password (hidden): ',
    );

    if (!username || username.length > 80) {
      throw new BootstrapError('Invalid manager username.');
    }
    if (!displayName || displayName.length > 160) {
      throw new BootstrapError('Invalid manager display name.');
    }
    if (password !== passwordConfirmation) {
      throw new BootstrapError('Manager passwords do not match.');
    }
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new BootstrapError('Manager password does not meet requirements.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    stage = 'load_ca';
    client = createClient(connection);

    stage = 'client_connect';
    await client.connect();

    stage = 'advisory_lock';
    await client.query(
      'SELECT pg_advisory_lock($1::bigint)',
      ['740182601'],
    );

    stage = 'begin_transaction';
    await client.query('BEGIN');
    transactionOpen = true;

    stage = 'set_transaction_isolation';
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    stage = 'check_privileges';
    const privileges = await client.query(`
      SELECT
        has_schema_privilege(current_user, 'public', 'USAGE') AS schema_usage,
        has_table_privilege(current_user, 'public.users', 'SELECT') AS users_select,
        has_table_privilege(current_user, 'public.users', 'INSERT') AS users_insert,
        has_table_privilege(current_user, 'public.roles', 'SELECT') AS roles_select,
        has_table_privilege(current_user, 'public.user_roles', 'INSERT') AS user_roles_insert
    `);
    if (!Object.values(privileges.rows[0]).every(Boolean)) {
      throw new BootstrapError(
        'Bootstrap account lacks the required schema/table privileges.',
      );
    }

    stage = 'check_users';
    const existingUsers = await client.query(
      'SELECT EXISTS (SELECT 1 FROM public.users LIMIT 1) AS exists',
    );
    if (existingUsers.rows[0].exists) {
      throw new BootstrapError(
        'Bootstrap refused because a user already exists; no account was created.',
      );
    }

    stage = 'check_manager_role';
    const managerRole = await client.query(
      'SELECT id FROM public.roles WHERE code = $1',
      ['manager'],
    );
    if (managerRole.rowCount !== 1) {
      throw new BootstrapError(
        'The existing manager role was not found; no role will be created.',
      );
    }

    stage = 'insert';
    const createdUser = await client.query(
      `
        INSERT INTO public.users (username, password_hash, display_name, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING id
      `,
      [username, passwordHash, displayName],
    );
    await client.query(
      `
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES ($1, $2)
      `,
      [createdUser.rows[0].id, managerRole.rows[0].id],
    );
    await client.query('COMMIT');
    transactionOpen = false;
  } catch (error) {
    failure = { stage, error, cleanupErrors: [] };
  } finally {
    if (transactionOpen && client) {
      try {
        await client.query('ROLLBACK');
      } catch (error) {
        if (!failure) {
          failure = { stage: 'cleanup', error, cleanupErrors: [] };
        } else {
          failure.cleanupErrors.push({ stage: 'rollback', error });
        }
      }
    }

    if (client) {
      try {
        await client.end();
      } catch (error) {
        if (!failure) {
          failure = { stage: 'cleanup', error, cleanupErrors: [] };
        } else {
          failure.cleanupErrors.push({ stage: 'client_end', error });
        }
      }
    }
  }

  if (failure) {
    const diagnostic = classifyError(failure.error, failure.stage);
    console.error(
      `Manager bootstrap stopped: stage=${failure.stage} category=${diagnostic.category} code=${diagnostic.code}`,
    );
    for (const cleanupError of failure.cleanupErrors) {
      const cleanupDiagnostic = classifyError(
        cleanupError.error,
        cleanupError.stage,
      );
      console.error(
        `Manager bootstrap cleanup failed: stage=${cleanupError.stage} category=${cleanupDiagnostic.category} code=${cleanupDiagnostic.code}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log('Manager account created with the existing manager role.');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    const code = getSafeErrorCode(error);
    if (code === 'INTERACTIVE_TTY_REQUIRED') {
      console.error(
        'Manager bootstrap stopped: stage=input code=INTERACTIVE_TTY_REQUIRED. Run it from a Codespaces Terminal with interactive input enabled.',
      );
    } else {
      console.error(`Manager bootstrap stopped: stage=input code=${code}`);
    }
    process.exitCode = 1;
  });
}
