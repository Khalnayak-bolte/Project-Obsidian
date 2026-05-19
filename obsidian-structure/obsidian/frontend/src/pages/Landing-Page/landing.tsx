import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../../components/landing-components/TopNav';
import PageLoader from '../../components/landing-components/PageLoader';
import './LandingPage.css';

const packages = [
  {
    name: 'Starter',
    title: 'Essential',
    price: '$29',
    period: '/month',
    features: [
      'Up to 10 devices',
      'Basic analytics',
      'Email support',
      'Standard updates',
    ],
  },
  {
    name: 'Professional',
    title: 'Growth',
    price: '$79',
    period: '/month',
    features: [
      'Up to 50 devices',
      'Advanced analytics',
      'Priority support',
      'API access',
      'Custom integrations',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    title: 'Scale',
    price: '$199',
    period: '/month',
    features: [
      'Unlimited devices',
      'Real-time analytics',
      '24/7 dedicated support',
      'Full API access',
      'Custom integrations',
      'White-label options',
    ],
  },
];

const features = [
  {
    title: 'Real-time Analytics',
    description: 'Monitor your operations with live dashboards and instant insights.',
  },
  {
    title: 'Seamless Integration',
    description: 'Connect with your existing tools through our robust API ecosystem.',
  },
  {
    title: 'Enterprise Security',
    description: 'Bank-grade encryption and compliance with industry standards.',
  },
  {
    title: '24/7 Support',
    description: 'Dedicated support team available around the clock for any issues.',
  },
];

const faqs = [
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and bank transfers for enterprise clients.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time with no penalties.',
  },
  {
    question: 'Is there a free trial available?',
    answer: 'We offer a 14-day free trial for all new users to explore our features.',
  },
  {
    question: 'Do you offer custom enterprise solutions?',
    answer: 'Yes, contact our sales team for customized enterprise pricing and features.',
  },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGetStarted = (planName: string) => {
    navigate(`/signup?plan=${encodeURIComponent(planName)}`);
  };

  return (
    <div className="landing-container">
      {/* Page Loader */}
      <PageLoader onComplete={() => setLoading(false)} duration={2500} />

      {/* Top Navigation (appears on scroll) */}
      <TopNav />

      {/* Navigation */}
      <nav className={`nav ${!loading ? 'revealed' : ''}`}>
        <div className="nav-brand">
          OBSIDIAN<span>.</span>
        </div>
        <button className="nav-login" onClick={handleLogin}>
          <span>Login</span>
        </button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className={`hero-content ${!loading ? 'revealed' : ''}`}>
          <h1 className="hero-title">Obsidian</h1>
          <p className="hero-subtitle">Premium Digital Solutions</p>
          
          <div className="scroll-indicator" onClick={() => scrollToSection('features')}>
            <span>Explore</span>
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <p className="section-label">Features</p>
          <h2 className="section-title">Why Choose Obsidian</h2>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="packages-section">
        <div className="section-header">
          <p className="section-label">Pricing</p>
          <h2 className="section-title">Choose Your Plan</h2>
        </div>

        <div className="packages-grid">
          {packages.map((pkg, index) => (
            <div 
              key={index} 
              className={`package-card ${pkg.featured ? 'featured' : ''}`}
            >
              {pkg.featured && <span className="package-tag">Popular</span>}
              <p className="package-name">{pkg.name}</p>
              <h3 className="package-title">{pkg.title}</h3>
              <p className="package-price">
                {pkg.price}
                <span>{pkg.period}</span>
              </p>
              <ul className="package-features">
                {pkg.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
              <button
                className="package-button"
                onClick={() => handleGetStarted(pkg.name)}
              >
                <span>Get Started</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-header">
          <p className="section-label">FAQ</p>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>

        <div className="faq-grid">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-card">
              <h3 className="faq-question">{faq.question}</h3>
              <p className="faq-answer">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p className="footer-brand">OBSIDIAN<span>.</span></p>
        <p className="footer-copy">&copy; 2026 Obsidian. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;