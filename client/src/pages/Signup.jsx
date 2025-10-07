import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [form, setForm] = useState({ firstName: '', lastName: '', mobile: '', email: '', username: '', password: '', confirmPassword: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const res = await api.post('/auth/register', form);
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        try {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (e) { }
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
      <div className="input-group-row">
        <div className="input-group">
          <label htmlFor="firstName">First Name</label>
          <input id="firstName" name="firstName" placeholder="John" onChange={handle} required />
        </div>
        <div className="input-group">
          <label htmlFor="lastName">Last Name</label>
          <input id="lastName" name="lastName" placeholder="Doe" onChange={handle} required />
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="mobile">Mobile</label>
        <input id="mobile" name="mobile" placeholder="Your mobile number" onChange={handle} required />
      </div>
      <div className="input-group">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="your@email.com" onChange={handle} required />
      </div>
      <div className="input-group">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" placeholder="john.doe (lowercase)" onChange={handle} required />
      </div>
      <div className="input-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="Create a strong password" onChange={handle} required />
      </div>
      <div className="input-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm your password" onChange={handle} required />
      </div>
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}