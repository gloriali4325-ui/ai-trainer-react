import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state';

export function RegisterPage() {
  const { signUp } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) {
      setError('请输入有效邮箱');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setError(null);
    setLoading(true);
    const displayName = nickname.trim() || username.trim() || email.trim();
    const message = await signUp(email.trim(), password, displayName);
    setLoading(false);
    if (message) {
      setError(message);
      return;
    }
    navigate('/login');
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}>
        <div className="page-hero" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>创建新账号</h2>
          <p className="muted" style={{ marginTop: 6 }}>填写信息后即可开始练习</p>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <input
            className="input"
            placeholder="用户名"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
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
            placeholder="昵称（可选）"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="确认密码"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          {error && <div className="notice">{error}</div>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <div style={{ marginTop: 16 }} className="muted">
          已有账号？ <Link className="text-button" to="/login">登录</Link>
        </div>
      </div>
    </div>
  );
}
