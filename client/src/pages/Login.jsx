import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const success = location.state?.message;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see what other editors posted today."
    >
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" placeholder="Your password" value={form.password} onChange={handleChange} required />
        </label>
        <Link className="forgot" to="/forgot-password">Forgot password?</Link>
        {success && <p className="success" role="status">{success}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit">Log in</button>
      </form>
      <p className="switch">New here? <Link to="/signup">Create an account</Link></p>
    </AuthLayout>
  );
}