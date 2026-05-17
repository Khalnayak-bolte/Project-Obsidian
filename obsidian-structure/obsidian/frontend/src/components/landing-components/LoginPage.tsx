import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login:', { email, password, rememberMe });
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  return (
    <div className="login-page">
      <a className="login-back" onClick={handleBack}>
        <ArrowLeft />
        Back
      </a>

      <div className="login-container">
        <div className="login-header">
          <h1 className="login-brand">OBSIDIAN<span>.</span></h1>
          <p className="login-title">Welcome back</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="login-button">
            <span>Sign In</span>
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          <div className="social-login">
            <button type="button" className="social-button">
              Google
            </button>
            <button type="button" className="social-button">
              GitHub
            </button>
          </div>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <a onClick={handleSignup}>Sign up</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;