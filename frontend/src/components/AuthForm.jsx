import { useState } from 'react';

export default function AuthForm({ onAuthenticate, onModeChange, isLoading, error }) {
  const [mode, setMode] = useState('login');
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!credentials.username.trim() || !credentials.password.trim()) {
      return;
    }

    await onAuthenticate({
      username: credentials.username.trim(),
      password: credentials.password,
    }, mode);
  };

  const toggleMode = () => {
    const nextMode = mode === 'login' ? 'register' : 'login';
    setMode(nextMode);
    onModeChange?.(nextMode);
  };

  return (
    <div className="auth-card">
      <h2>{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
      <p className="helper-text">
        {mode === 'login'
          ? 'Enter your credentials to access your dashboard.'
          : 'Choose a username and password to start using the dashboard.'}
      </p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label className="filter-group">
          Username
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={credentials.username}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </label>
        <label className="filter-group">
          Password
          <input
            type="password"
            name="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={credentials.password}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </label>
        {error ? (
          <p className="error-state" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="button primary" disabled={isLoading}>
          {isLoading ? 'Submitting…' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
      </form>
      <div className="auth-footer">
        <button
          type="button"
          className="button tertiary"
          onClick={toggleMode}
          disabled={isLoading}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
        </button>
      </div>
    </div>
  );
}
