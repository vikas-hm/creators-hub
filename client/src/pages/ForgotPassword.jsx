import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setInfo(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password !== confirm) {
      setError('The two passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword: password });
      navigate('/login', {
        state: { message: 'Password changed. Log in with your new password.' },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        step === 1
          ? 'Enter your email and we will send you a 6-digit code.'
          : 'Enter the code from your email and choose a new password.'
      }
    >
      {step === 1 && (
        <form className="form" onSubmit={sendCode}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send code'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="form" onSubmit={resetPassword}>
          {info && <p className="success" role="status">{info}</p>}

          <label className="field">
            <span>6-digit code</span>
            <input
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="------"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
          </label>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              placeholder="At least 6 characters"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input
              type="password"
              placeholder="Type it again"
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button className="btn" type="submit" disabled={busy || otp.length !== 6}>
            {busy ? 'Saving...' : 'Change password'}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setStep(1);
              setError('');
              setInfo('');
            }}
          >
            Send the code again
          </button>
        </form>
      )}

      <p className="switch"><Link to="/login">Back to log in</Link></p>
    </AuthLayout>
  );
}