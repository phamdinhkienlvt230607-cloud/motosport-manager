import { createContext } from 'react';
import type { AccountStatus, AuthUser, NewAccountInput } from './authTypes';
import type { signInMock } from './mockAuthService';

export interface AuthContextValue {
  user: AuthUser | null;
  accounts: AuthUser[];
  ready: boolean;
  login: (username: string, password: string) => ReturnType<typeof signInMock>;
  logout: () => void;
  createAccount: (input: NewAccountInput, password: string) => Promise<void>;
  updateAccount: (id: string, input: Pick<AuthUser, 'username' | 'name' | 'role'>) => Promise<void>;
  setAccountStatus: (id: string, status: AccountStatus) => Promise<void>;
  resetPassword: (id: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);