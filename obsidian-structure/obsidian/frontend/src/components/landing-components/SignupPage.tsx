import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiPost } from '../../lib/axios';
import './SignupPage.css';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLANS = [
  { name: 'Starter',      price: 2900,   label: 'Starter — $29/mo'      },
  { name: 'Professional', price: 7900,   label: 'Professional — $79/mo' },
  { name: 'Enterprise',   price: 19900,  label: 'Enterprise — $199/mo'  },
];

type Step = 'details' | 'paying' | 'success';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ─── Form state ──────────────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('Starter');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // ─── UI state ────────────────────────────────────────────────────────────────
  const [step,       setStep]       = useState<Step>('details');
  const [loading,    setLoading]    = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');

  // Pre-select plan from query param
  useEffect(() => {
    const planParam = searchParams.get('plan');
    const matched   = PLANS.find(p => p.name.toLowerCase() === planParam?.toLowerCase());
    if (matched) setSelectedPlan(matched.name);
  }, [searchParams]);

  const selectedPlanObj = PLANS.find(p => p.name === selectedPlan)!;

  // ─── Razorpay flow ───────────────────────────────────────────────────────────
  const launchRazorpay = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Create order on backend
      const res = await apiPost<{
        success: boolean;
        data: { order_id: string; amount: number; currency: string };
      }>('/api/v1/payments/create-order', {
        amount:   selectedPlanObj.price * 100,   // paise
        currency: 'INR',
      });

      if (!res.success || !res.data?.order_id) throw new Error('Failed to create order');

      const { order_id, amount, currency } = res.data;

      // 2. Open Razorpay modal
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name:        'Obsidian OS',
        description: `${selectedPlan} Plan Subscription`,
        order_id,
        prefill: {
          name:  `${firstName} ${lastName}`.trim(),
          email,
        },
        handler: async (response: any) => {
          try {
            // 3. Verify signature
            const verifyRes = await apiPost<{ success: boolean; message: string }>(
              '/api/v1/payments/verify-payment',
              {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }
            );

            if (verifyRes.success) {
              setStep('success');
            } else {
              setErrorMsg('Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            setErrorMsg(
              err.response?.data?.error?.message ||
              err.message ||
              'Payment verification failed'
            );
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setStep('details');
            setLoading(false);
          },
        },
        theme: { color: '#C9A227' },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response: any) => {
        setErrorMsg(response.error.description || 'Payment failed');
        setStep('details');
        setLoading(false);
      });

      setStep('paying');
      rzp.open();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
        err.message ||
        'Error initialising payment'
      );
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) return;
    launchRazorpay();
  };

  const handleBack  = () => navigate('/');
  const handleLogin = () => navigate('/login');

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="signup-page">
        <div className="signup-container signup-success-container">
          <div className="signup-success-icon">✓</div>
          <h1 className="signup-brand">OBSIDIAN<span>.</span></h1>
          <p className="signup-success-title">You're in.</p>
          <p className="signup-success-body">
            Welcome to the <strong>{selectedPlan}</strong> plan. Your subscription is active.
          </p>
          <button className="signup-button" onClick={() => navigate('/login')}>
            <span>Go to Login</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Main form ───────────────────────────────────────────────────────────────
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
          <p className="signup-subtitle">Choose a plan, then pay to activate</p>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>

          {/* Name row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
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
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {/* Plan selector */}
          <div className="form-group">
            <label className="form-label">Choose Plan</label>
            <div className="select-wrapper">
              <select
                className="form-input form-select"
                value={selectedPlan}
                onChange={e => setSelectedPlan(e.target.value)}
                required
              >
                {PLANS.map(p => (
                  <option key={p.name} value={p.name}>{p.label}</option>
                ))}
              </select>
              <span className="select-arrow">▾</span>
            </div>
          </div>

          {/* Terms */}
          <label className="terms-checkbox">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
            />
            <span>
              I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </span>
          </label>

          {/* Error */}
          {errorMsg && (
            <p className="signup-error">{errorMsg}</p>
          )}

          {/* CTA — triggers Razorpay after submit */}
          <button
            type="submit"
            className="signup-button"
            disabled={!acceptTerms || loading}
          >
            <span>
              {loading
                ? 'Processing…'
                : `Create Account & Pay $${(selectedPlanObj.price / 100).toFixed(0)}`}
            </span>
          </button>
        </form>

        <div className="signup-footer">
          <p>Already have an account? <a onClick={handleLogin}>Sign in</a></p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;