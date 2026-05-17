import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './SignupPage.css';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) return;
    console.log('Signup:', { firstName, lastName, email, password });
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="signup-page">
      <a className="signup-back" onClick={handleBack}>
        <ArrowLeft />
        Back
      </a>

      <div className="signup-container">
        <div className="signup-header">
          <h1 className="signup-brand">OBSIDIAN<span>.</span></h1>
          <p className="signup-title">Create your account</p>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

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
              minLength={8}
            />
          </div>

          <label className="terms-checkbox">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </span>
          </label>

          <button 
            type="submit" 
            className="signup-button"
            disabled={!acceptTerms}
          >
            <span>Create Account</span>
          </button>

          <div className="signup-divider">
            <span>or</span>
          </div>

          <div className="social-signup">
            <button type="button" className="social-button">
              Google
            </button>
            <button type="button" className="social-button">
              GitHub
            </button>
          </div>
        </form>

        <div className="signup-footer">
          <p>Already have an account? <a onClick={handleLogin}>Sign in</a></p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;