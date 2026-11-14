import { useEffect, useState, type ReactNode } from 'react';
import type {
  AccountStatus,
  AuthUser,
  MockAccount,
  NewAccountInput,
} from './authTypes';
import { AuthContext } from './authContext';
import type { LoginResult } from './authContext';
import {
  AuthApiError,
  getCurrentUser,
  loginWithApi,
  logoutFromApi,
} from './authApi';
import {
  createMockAccount,
  listMockAccounts,
  resetMockPassword,
  setMockAccountStatus,
  updateMockAccount,
} from './mockAuthService';

const SESSION_STORAGE_KEY = 'motosport-manager-auth-session';

interface StoredSession {
  accessToken: string;
  expiresAt: number;
}

function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    console.warn('Could not clear the stored authentication session.');
  }
}

function readStoredSession(): StoredSession | null {
  let serialized: string | null;
  try {
    serialized = sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    console.warn('Could not read the stored authentication session.');
    return null;
  }
  if (!serialized) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('accessToken' in value) ||
      typeof value.accessToken !== 'string' ||
      !value.accessToken ||
      !('expiresAt' in value) ||
      typeof value.expiresAt !== 'number' ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= Date.now()
    ) {
      clearStoredSession();
      return null;
    }

    return {
      accessToken: value.accessToken,
      expiresAt: value.expiresAt,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

function persistSession(session: StoredSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    throw new Error('Không thể lưu phiên đăng nhập trên trình duyệt này.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accounts, setAccounts] = useState<MockAccount[]>([]);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const mockAccounts = await listMockAccounts();
        if (active) setAccounts(mockAccounts);
      } catch {
        console.warn('Mock account management could not be initialized.');
      }

      const savedSession = readStoredSession();
      if (savedSession) {
        try {
          const currentUser = await getCurrentUser(savedSession.accessToken);
          if (active) {
            setUser(currentUser);
            setSession(savedSession);
          }
        } catch (error) {
          if (
            error instanceof AuthApiError &&
            (error.status === 401 ||
              error.status === 403 ||
              error.kind === 'invalid-response')
          ) {
            clearStoredSession();
          } else {
            console.warn(
              'Could not verify the saved session; it will be retried later.',
            );
          }
        }
      }

      if (active) setReady(true);
    }

    void initialize().catch(() => {
      console.warn('Authentication initialization could not be completed.');
      if (active) setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    const timeout = window.setTimeout(() => {
      clearStoredSession();
      setSession(null);
      setUser(null);
    }, Math.max(remaining, 0));
    return () => window.clearTimeout(timeout);
  }, [session]);

  async function refreshAccounts() {
    setAccounts(await listMockAccounts());
  }

  async function login(
    username: string,
    password: string,
  ): Promise<LoginResult> {
    try {
      const result = await loginWithApi(username, password);
      const nextSession = {
        accessToken: result.accessToken,
        expiresAt: Date.now() + result.expiresIn * 1000,
      };
      persistSession(nextSession);
      setSession(nextSession);
      setUser(result.user);
      return { ok: true, user: result.user };
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        return { ok: false, reason: 'invalid-credentials' };
      }
      throw error;
    }
  }

  async function createAccount(input: NewAccountInput, password: string) {
    await createMockAccount(input, password);
    await refreshAccounts();
  }

  async function updateAccount(
    id: string,
    input: Pick<MockAccount, 'username' | 'name' | 'role'>,
  ) {
    if (!user) throw new Error('Phiên đăng nhập đã kết thúc.');
    await updateMockAccount(id, input, user.id);
    await refreshAccounts();
  }

  async function changeAccountStatus(id: string, status: AccountStatus) {
    await setMockAccountStatus(id, status);
    await refreshAccounts();
  }

  async function changePassword(id: string, password: string) {
    await resetMockPassword(id, password);
  }

  async function logout(): Promise<void> {
    const currentSession = session ?? readStoredSession();
    try {
      if (currentSession && currentSession.expiresAt > Date.now()) {
        await logoutFromApi(currentSession.accessToken);
      }
    } catch {
      console.warn(
        'Remote logout failed; the local session was cleared. The server token expires on its configured schedule.',
      );
    } finally {
      clearStoredSession();
      setSession(null);
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{
    user, accessToken: session?.accessToken ?? null, accounts, ready, login, logout,
    createAccount, updateAccount,
    setAccountStatus: changeAccountStatus,
    resetPassword: changePassword,
  }}>{children}</AuthContext.Provider>;
}