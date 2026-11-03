import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';

export default function Signup() {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/signup', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It's free and takes less than a minute."
    >
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Full name</span>
          <input name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
        </label>
        <label className="field">
          <span>Username</span>
          <input name="username" placeholder="Pick a username" value={form.username} onChange={handleChange} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" placeholder="At least 6 characters" minLength={6} value={form.password} onChange={handleChange} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit">Create account</button>
      </form>
      <p className="switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  );
}