import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 48, showText = false }) => {
  return (
    <div className={`inline-flex items-center space-x-3 ${className}`}>
      {/* Official Dawn Gold & Deep Sacred Blue Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
        aria-label="Sacred Steps to Redemption Official Shield Emblem"
      >
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D77F" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#AA8010" />
          </linearGradient>
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#283E52" />
            <stop offset="100%" stopColor="#1C2A39" />
          </linearGradient>
          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#D4AF37" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer Sacred Shield Contour */}
        <path
          d="M50 8 C68 8, 86 16, 86 28 C86 58, 68 78, 50 92 C32 78, 14 58, 14 28 C14 16, 32 8, 50 8 Z"
          fill="url(#blueGradient)"
          stroke="url(#goldGradient)"
          strokeWidth="3.5"
          filter="url(#subtleGlow)"
        />

        {/* Inner Gold Shield Accent */}
        <path
          d="M50 14 C64 14, 80 20, 80 30 C80 54, 64 71, 50 84 C36 71, 20 54, 20 30 C20 20, 36 14, 50 14 Z"
          stroke="url(#goldGradient)"
          strokeWidth="1.2"
          strokeOpacity="0.6"
          fill="none"
        />

        {/* Sunburst / Divine Dawn Rays */}
        <g stroke="url(#goldGradient)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8">
          <line x1="50" y1="20" x2="50" y2="28" />
          <line x1="38" y1="24" x2="43" y2="30" />
          <line x1="62" y1="24" x2="57" y2="30" />
          <line x1="30" y1="34" x2="36" y2="37" />
          <line x1="70" y1="34" x2="64" y2="37" />
        </g>

        {/* Central Grace Cross & Sacred Path */}
        {/* The Winding Path upward to Grace */}
        <path
          d="M50 78 C44 68, 56 58, 46 48 C41 43, 44 38, 50 36 C56 38, 59 43, 54 48 C44 58, 56 68, 50 78 Z"
          fill="url(#goldGradient)"
          opacity="0.9"
        />

        {/* Radiating Heart / Flame of Hope Center */}
        <path
          d="M50 38 C48 35, 43 35, 43 39 C43 43, 50 47, 50 47 C50 47, 57 43, 57 39 C57 35, 52 35, 50 38 Z"
          fill="#D4AF37"
        />

        {/* Minimal Central Cross Motif */}
        <line x1="50" y1="23" x2="50" y2="33" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        <line x1="45" y1="27" x2="55" y2="27" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-cinzel text-lg font-bold tracking-wider text-main leading-tight">
            SACRED STEPS
          </span>
          <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            TO REDEMPTION
          </span>
        </div>
      )}
    </div>
  );
};
