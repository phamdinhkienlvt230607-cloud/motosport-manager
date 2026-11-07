import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Gauge, LockKeyhole, UserRound } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { roleLabels } from '../auth/permissions';

interface LoginLocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { login, user, ready } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (ready && user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const result = await login(username, password);
      if (!result.ok) {
        setError(result.reason === 'account-locked'
          ? 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'
          : 'Tên đăng nhập hoặc mật khẩu không chính xác.');
        return;
      }
      const from = (location.state as LoginLocationState | null)?.from?.pathname;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch {
      setError('Không thể kết nối dịch vụ xác thực. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return <main className="login-page">
    <section className="login-brand-panel" aria-label="MotoSport Manager">
      <div className="login-brand-lockup"><span className="brand-mark"><Gauge size={21} /></span><span className="brand-name">MOTO<span>SPORT</span><small>MANAGER</small></span></div>
      <div className="login-brand-copy">
        <span className="login-kicker">HỆ THỐNG NỘI BỘ</span>
        <h1>Vận hành<br />trên mọi cung đường.</h1>
        <p>Một không gian làm việc thống nhất cho đội ngũ MotoSport.</p>
      </div>
      <div className="login-brand-detail"><span>MSM</span><i /><span>OPERATIONS · 2026</span></div>
      <div className="login-grid-mark" aria-hidden="true" />
    </section>
    <section className="login-form-panel">
      <div className="login-form-wrap">
        <div className="login-mobile-brand"><span className="brand-mark"><Gauge size={20} /></span><strong>MOTO<span>SPORT</span></strong></div>
        <span className="login-kicker">CHÀO MỪNG TRỞ LẠI</span>
        <h2>Đăng nhập</h2>
        <p className="login-intro">Sử dụng tài khoản nhân viên để tiếp tục.</p>
        <form className="login-form" onSubmit={submit}>
          <label className="login-field"><span>Tên đăng nhập</span><span className="login-input-wrap"><UserRound size={17} /><input autoComplete="username" autoFocus required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" /></span></label>
          <label className="login-field"><span>Mật khẩu</span><span className="login-input-wrap"><LockKeyhole size={17} /><input autoComplete="current-password" required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" /><button className="password-toggle" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={pending || !ready}>{pending ? <><span className="login-spinner" /> Đang xác thực...</> : <>Đăng nhập <ArrowRight size={17} /></>}</button>
        </form>
        <div className="demo-login-note"><strong>Tài khoản demo</strong><span>admin, manager, sales, warehouse, accountant</span><small>Mật khẩu: Moto@2026 · Mock frontend, không dùng dữ liệu thật</small></div>
        <div className="login-footer"><span>Phiên làm việc an toàn</span><span>{roleLabels.admin} · MotoSport Manager</span></div>
      </div>
    </section>
  </main>;
}

export function UnauthorizedPage() {
  return <section className="access-denied"><span className="login-kicker">KHÔNG ĐỦ QUYỀN</span><h1>Trang này chưa được cấp quyền.</h1><p>Liên hệ quản trị viên nếu bạn cần truy cập chức năng này.</p><a className="button button-primary" href="/">Về tổng quan</a></section>;
}