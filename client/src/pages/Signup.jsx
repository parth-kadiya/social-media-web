import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [form, setForm] = useState({ firstName:'', lastName:'', mobile:'', email:'', username:'', password:'', confirmPassword:'' });
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const handle = e => setForm({...form, [e.target.name]: e.target.value});

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', form);
      localStorage.setItem('token', res.data.token);
      // store basic user info so Home can show name/username immediately
      if (res.data.user) {
        try {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (e) { }
      }
      nav('/home');
    } catch (err) { setErr(err.response?.data?.message || 'Error'); }
  };

  return (
    <form onSubmit={submit}>
      {err && <div>{err}</div>}
      <input name="firstName" placeholder="First name" onChange={handle} />
      <input name="lastName" placeholder="Last name" onChange={handle} />
      <input name="mobile" placeholder="Mobile" onChange={handle} />
      <input name="email" placeholder="Email" onChange={handle} />
      <input name="username" placeholder="username (lowercase only)" onChange={handle} />
      <input name="password" type="password" placeholder="Create Password" onChange={handle} />
      <input name="confirmPassword" type="password" placeholder="Confirm Password" onChange={handle} />
      <button type="submit">Sign up</button>
    </form>
  );
}
