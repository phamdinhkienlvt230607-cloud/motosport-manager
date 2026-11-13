import { useState, type FormEvent } from 'react';
import { KeyRound, LockKeyhole, Pencil, Plus, ShieldCheck, UnlockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { roles, type AuthUser, type NewAccountInput, type Role } from '../auth/authTypes';
import { roleLabels } from '../auth/permissions';

type AccountDialog = { kind: 'create' } | { kind: 'edit'; account: AuthUser } | { kind: 'reset'; account: AuthUser };

export function AccountsPage() {
  const { user, accounts, createAccount, updateAccount, setAccountStatus, resetPassword } = useAuth();
  const [dialog, setDialog] = useState<AccountDialog | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || !user) return;
    const form = new FormData(event.currentTarget);
    setNotice('');
    setError('');
    try {
      if (dialog.kind === 'reset') {
        await resetPassword(dialog.account.id, String(form.get('password')));
        setNotice(`Đã đặt lại mật khẩu cho ${dialog.account.username}.`);
      } else {
        const account: NewAccountInput = {
          username: String(form.get('username')).trim(),
          name: String(form.get('name')).trim(),
          role: String(form.get('role')) as Role,
        };
        if (dialog.kind === 'create') {
          await createAccount(account, String(form.get('password')));
          setNotice(`Đã tạo tài khoản ${account.username}.`);
        } else {
          await updateAccount(dialog.account.id, account);
          setNotice(`Đã cập nhật tài khoản ${account.username}.`);
        }
      }
      setDialog(null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Không thể cập nhật tài khoản.');
    }
  }

  async function toggleStatus(account: AuthUser) {
    setError('');
    setNotice('');
    try {
      await setAccountStatus(account.id, account.status === 'active' ? 'locked' : 'active');
      setNotice(`Đã ${account.status === 'active' ? 'khóa' : 'mở khóa'} tài khoản ${account.username}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Không thể cập nhật trạng thái.');
    }
  }

  return <>
    <header className="page-heading"><div><span className="eyebrow">QUẢN TRỊ HỆ THỐNG</span><h1>Tài khoản nhân viên</h1><p>Tạo tài khoản, phân vai trò và quản lý trạng thái truy cập.</p></div><button className="button button-primary" onClick={() => { setError(''); setDialog({ kind: 'create' }); }}><Plus size={15} /> Tạo tài khoản</button></header>
    <section className="accounts-summary"><div><span className="account-summary-icon"><UserRound size={17} /></span><span>Tổng tài khoản</span><strong>{accounts.length}</strong></div><div><span className="account-summary-icon active"><ShieldCheck size={17} /></span><span>Đang hoạt động</span><strong>{accounts.filter((account) => account.status === 'active').length}</strong></div><div><span className="account-summary-icon locked"><LockKeyhole size={17} /></span><span>Đã khóa</span><strong>{accounts.filter((account) => account.status === 'locked').length}</strong></div></section>
    {(notice || error) && <div className={error ? 'account-notice error' : 'account-notice'} role={error ? 'alert' : 'status'}>{error || notice}</div>}
    <section className="panel accounts-panel"><div className="table-scroll"><table className="data-table accounts-table"><thead><tr><th>NHÂN VIÊN</th><th>TÊN ĐĂNG NHẬP</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th className="align-right">THAO TÁC</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><div className="account-person"><span className="account-avatar">{account.name.slice(0, 1)}</span><span><strong>{account.name}</strong>{account.id === user?.id && <small>Tài khoản của bạn</small>}</span></div></td><td>{account.username}</td><td><span className="role-label">{roleLabels[account.role]}</span></td><td><span className={`account-status ${account.status}`}>{account.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td><div className="account-actions"><button className="icon-button" title="Sửa thông tin" aria-label={`Sửa ${account.username}`} onClick={() => { setError(''); setDialog({ kind: 'edit', account }); }}><Pencil size={15} /></button><button className="icon-button" title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu cho ${account.username}`} onClick={() => { setError(''); setDialog({ kind: 'reset', account }); }}><KeyRound size={15} /></button><button className="icon-button" title={account.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} aria-label={`${account.status === 'active' ? 'Khóa' : 'Mở khóa'} ${account.username}`} onClick={() => void toggleStatus(account)}>{account.status === 'active' ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}</button></div></td></tr>)}</tbody></table></div></section>
    <p className="account-demo-warning">Dữ liệu mock chỉ tồn tại trong phiên chạy trình duyệt này. Quản lý tài khoản thực tế phải được xác thực và lưu bởi Backend.</p>
    {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title"><header className="modal-header"><h2 id="account-dialog-title">{dialog.kind === 'create' ? 'Tạo tài khoản' : dialog.kind === 'edit' ? 'Chỉnh sửa tài khoản' : 'Đặt lại mật khẩu'}</h2><button className="icon-button" onClick={() => setDialog(null)} aria-label="Đóng"><span aria-hidden="true">×</span></button></header><form className="form-stack" onSubmit={(event) => void submit(event)}>
      {dialog.kind === 'reset' ? <><p className="account-dialog-copy">Đặt mật khẩu mới cho <strong>{dialog.account.username}</strong>.</p><label className="form-field"><span>Mật khẩu mới</span><input name="password" type="password" minLength={8} required autoFocus autoComplete="new-password" placeholder="Ít nhất 8 ký tự" /></label><label className="form-field"><span>Xác nhận mật khẩu</span><input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" placeholder="Nhập lại mật khẩu" onChange={(event) => { const form = event.currentTarget.form; const password = form?.elements.namedItem('password') as HTMLInputElement | null; event.currentTarget.setCustomValidity(password && event.currentTarget.value !== password.value ? 'Mật khẩu không khớp.' : ''); }} /></label></> : <>
        <label className="form-field"><span>Họ và tên</span><input name="name" required defaultValue={dialog.kind === 'edit' ? dialog.account.name : ''} placeholder="Tên nhân viên" /></label>
        <label className="form-field"><span>Tên đăng nhập</span><input name="username" required minLength={3} defaultValue={dialog.kind === 'edit' ? dialog.account.username : ''} placeholder="Ví dụ: nguyen.an" autoComplete="off" /></label>
        <label className="form-field"><span>Vai trò{dialog.kind === 'edit' && dialog.account.id === user?.id ? ' · không thể tự đổi' : ''}</span><select name="role" defaultValue={dialog.kind === 'edit' ? dialog.account.role : 'sales'} disabled={dialog.kind === 'edit' && dialog.account.id === user?.id}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>{dialog.kind === 'edit' && dialog.account.id === user?.id && <input type="hidden" name="role" value={dialog.account.role} />}</label>
        {dialog.kind === 'create' && <label className="form-field"><span>Mật khẩu khởi tạo</span><input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Ít nhất 8 ký tự" /></label>}
      </>}
      <div className="account-dialog-actions"><button type="button" className="button button-outline" onClick={() => setDialog(null)}>Hủy</button><button type="submit" className="button button-primary">{dialog.kind === 'create' ? 'Tạo tài khoản' : dialog.kind === 'edit' ? 'Lưu thay đổi' : 'Đặt lại mật khẩu'}</button></div>
    </form></section></div>}
  </>;
}