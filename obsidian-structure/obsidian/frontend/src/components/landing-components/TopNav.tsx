import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TopNav.css';

const TopNav: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleBrandClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className={`topnav ${visible ? 'visible' : ''}`}>
      <div className="topnav-brand" onClick={handleBrandClick}>
        OBSIDIAN<span>.</span>
      </div>

      <div className="topnav-links">
        <a className="topnav-link" onClick={() => scrollToSection('features')}>
          Features
        </a>
        <a className="topnav-link" onClick={() => scrollToSection('pricing')}>
          Pricing
        </a>
        <a className="topnav-link" onClick={() => scrollToSection('faq')}>
          FAQ's
        </a>
      </div>

      <button className="topnav-cta" onClick={handleLogin}>
        <span>Get Started</span>
      </button>
    </nav>
  );
};

export default TopNav;