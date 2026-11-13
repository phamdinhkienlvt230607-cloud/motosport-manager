import { createContext } from 'react';
import type {
  AccountStatus,
  AuthUser,
  MockAccount,
  NewAccountInput,
} from './authTypes';

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'invalid-credentials' };

export interface AuthContextValue {
  user: AuthUser | null;
  accounts: MockAccount[];
  ready: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  createAccount: (input: NewAccountInput, password: string) => Promise<void>;
  updateAccount: (id: string, input: Pick<MockAccount, 'username' | 'name' | 'role'>) => Promise<void>;
  setAccountStatus: (id: string, status: AccountStatus) => Promise<void>;
  resetPassword: (id: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);