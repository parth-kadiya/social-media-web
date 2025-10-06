import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { identifier, password });
      localStorage.setItem('token', res.data.token);
      // store basic user info so Home can show name/username immediately
      if (res.data.user) {
        try {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (e) {
          // ignore storage error
        }
      }
      nav('/home');
    } catch (err) { setErr(err.response?.data?.message || 'Error'); }
  };

  return (
    <form onSubmit={submit}>
      {err && <div>{err}</div>}
      <input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Mobile or Email" />
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}
