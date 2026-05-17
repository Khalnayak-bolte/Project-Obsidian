import React, { useState, useEffect } from 'react';
import './PageLoader.css';

interface PageLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

const PageLoader: React.FC<PageLoaderProps> = ({ onComplete, duration = 2500 }) => {
  const [morphing, setMorphing] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMorphing(true);
      setTimeout(() => {
        setComplete(true);
        onComplete?.();
      }, 1000);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (complete) return null;

  return (
    <div className={`page-loader ${morphing ? 'morphing' : ''}`}>
      <h1 className="loader-brand">
        OBSIDIAN<span>.</span>
      </h1>
      <div className="loader-line" />
      <div className="loader-dots">
        <div className="loader-dot" />
        <div className="loader-dot" />
        <div className="loader-dot" />
      </div>
    </div>
  );
};

export default PageLoader;