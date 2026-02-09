import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state';

export function LoginPage() {
  const { signIn } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const message = await signIn(email.trim(), password);
    setLoading(false);
    if (message) {
      setError(message);
      return;
    }
    navigate('/');
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
        <div className="page-hero" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>欢迎回来</h2>
          <p className="muted" style={{ marginTop: 6 }}>登录以继续使用训练系统</p>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <input
            className="input"
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <div className="notice">{error}</div>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div style={{ marginTop: 16 }} className="muted">
          还没有账号？ <Link className="text-button" to="/register">注册</Link>
        </div>
      </div>
    </div>
  );
}
