import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const res = await api.post('/auth/login', { identifier, password });
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        try {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (e) {
          // ignore storage error
        }
      }
      nav('/home');
    } catch (err) {
      setErr(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
      {err && <div className="auth-error">{err}</div>}
      <div className="input-group">
        <label htmlFor="login-identifier">Mobile or Email</label>
        <input
          id="login-identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Enter your mobile or email"
          required
        />
      </div>
      <div className="input-group">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Enter your password"
          required
        />
      </div>
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}