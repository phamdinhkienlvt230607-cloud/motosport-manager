import { useEffect, useState, type ReactNode } from 'react';
import type { AccountStatus, AuthUser, NewAccountInput } from './authTypes';
import { AuthContext } from './authContext';
import {
  createMockAccount,
  listMockAccounts,
  resetMockPassword,
  setMockAccountStatus,
  signInMock,
  updateMockAccount,
} from './mockAuthService';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void listMockAccounts().then(setAccounts).finally(() => setReady(true));
  }, []);

  async function refreshAccounts() {
    setAccounts(await listMockAccounts());
  }

  async function login(username: string, password: string) {
    const result = await signInMock(username, password);
    if (result.ok) setUser(result.user);
    return result;
  }

  async function createAccount(input: NewAccountInput, password: string) {
    await createMockAccount(input, password);
    await refreshAccounts();
  }

  async function updateAccount(id: string, input: Pick<AuthUser, 'username' | 'name' | 'role'>) {
    if (!user) throw new Error('Phiên đăng nhập đã kết thúc.');
    await updateMockAccount(id, input, user.id);
    await refreshAccounts();
    if (id === user.id) setUser((current) => current ? { ...current, ...input } : current);
  }

  async function changeAccountStatus(id: string, status: AccountStatus) {
    await setMockAccountStatus(id, status);
    await refreshAccounts();
  }

  async function changePassword(id: string, password: string) {
    await resetMockPassword(id, password);
  }

  function logout() {
    setUser(null);
  }

  return <AuthContext.Provider value={{
    user, accounts, ready, login, logout,
    createAccount, updateAccount,
    setAccountStatus: changeAccountStatus,
    resetPassword: changePassword,
  }}>{children}</AuthContext.Provider>;
}