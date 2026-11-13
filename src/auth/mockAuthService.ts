import type { AccountStatus, MockAccount, NewAccountInput, Role } from './authTypes';

interface StoredAccount extends MockAccount {
  passwordDigest: string;
}

const demoAccounts: Omit<StoredAccount, 'passwordDigest'>[] = [
  { id: 'user-admin', username: 'admin', name: 'Nguyễn An', role: 'admin', status: 'active' },
  { id: 'user-manager', username: 'manager', name: 'Trần Minh', role: 'manager', status: 'active' },
  { id: 'user-sales', username: 'sales', name: 'Lê Hương', role: 'sales', status: 'active' },
  { id: 'user-warehouse', username: 'warehouse', name: 'Phạm Tuấn', role: 'warehouse', status: 'active' },
  { id: 'user-accountant', username: 'accountant', name: 'Võ Linh', role: 'accountant', status: 'active' },
  { id: 'user-locked', username: 'locked', name: 'Tài khoản khóa', role: 'sales', status: 'locked' },
];

let accountStore: Promise<StoredAccount[]> | undefined;

async function digestPassword(password: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getAccountStore() {
  accountStore ??= Promise.all(demoAccounts.map(async (account) => ({
    ...account,
    passwordDigest: await digestPassword(crypto.randomUUID()),
  })));
  return accountStore;
}

function publicAccount(account: StoredAccount): MockAccount {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    status: account.status,
  };
}

export async function listMockAccounts() {
  return (await getAccountStore()).map(publicAccount);
}

export async function createMockAccount(input: NewAccountInput, password: string) {
  const accounts = await getAccountStore();
  if (accounts.some((account) => account.username.toLowerCase() === input.username.trim().toLowerCase())) {
    throw new Error('Tên đăng nhập đã tồn tại.');
  }
  accounts.push({
    id: crypto.randomUUID(),
    username: input.username.trim(),
    name: input.name.trim(),
    role: input.role,
    status: 'active',
    passwordDigest: await digestPassword(password),
  });
}

export async function updateMockAccount(id: string, input: Pick<MockAccount, 'username' | 'name' | 'role'>, actorId: string) {
  const accounts = await getAccountStore();
  const account = accounts.find((item) => item.id === id);
  if (!account) throw new Error('Không tìm thấy tài khoản.');
  if (id === actorId && input.role !== account.role) throw new Error('Bạn không thể tự thay đổi vai trò của mình.');
  if (accounts.some((item) => item.id !== id && item.username.toLowerCase() === input.username.trim().toLowerCase())) {
    throw new Error('Tên đăng nhập đã tồn tại.');
  }
  Object.assign(account, { username: input.username.trim(), name: input.name.trim(), role: input.role });
}

export async function setMockAccountStatus(id: string, status: AccountStatus) {
  const account = (await getAccountStore()).find((item) => item.id === id);
  if (!account) throw new Error('Không tìm thấy tài khoản.');
  account.status = status;
}

export async function resetMockPassword(id: string, password: string) {
  const account = (await getAccountStore()).find((item) => item.id === id);
  if (!account) throw new Error('Không tìm thấy tài khoản.');
  account.passwordDigest = await digestPassword(password);
}

export function isRole(value: string): value is Role {
  return ['admin', 'manager', 'sales', 'warehouse', 'accountant'].includes(value);
}