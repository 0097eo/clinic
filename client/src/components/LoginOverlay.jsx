import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginOverlay() {
  const { login, loading, error, clearError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login(form.email, form.password);
    } catch {
      // error is handled via context state
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-overlay__card">
        <div className="login-overlay__branding">
          <span className="sidebar__logo">CM</span>
          <div>
            <p className="sidebar__title">ClinicMate</p>
            <p className="sidebar__subtitle">Health Management</p>
          </div>
        </div>

        <h1 className="login-overlay__title">Sign in to your dashboard</h1>
        <p className="login-overlay__subtitle">Use your clinic staff credentials to continue.</p>

        <form className="login-overlay__form" onSubmit={handleSubmit}>
          <label className="login-overlay__label">
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jane.doe@clinic.com"
              required
            />
          </label>

          <label className="login-overlay__label">
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <p className="login-overlay__error">{error}</p> : null}

          <button type="submit" className="login-overlay__submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
