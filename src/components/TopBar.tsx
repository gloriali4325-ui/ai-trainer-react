
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../state';

export function TopBar() {
  const { profile, signOut } = useApp();
  const location = useLocation();

  const showBack = location.pathname !== '/';

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-badge">AI</div>
          <div>
            <div style={{ fontWeight: 700, letterSpacing: 0.3 }}>AI Trainer Exam Prep</div>
            <div className="muted" style={{ fontSize: 12 }}>
              三级职业技能等级证书
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showBack && (
            <Link className="button secondary" to="/">
              返回首页
            </Link>
          )}
          {profile && (
            <button className="button ghost" onClick={() => signOut()}>
              退出登录 · {profile.name}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
