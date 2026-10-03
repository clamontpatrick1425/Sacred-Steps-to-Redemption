import React, { useState, useRef, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
    onOpenSettings: () => void;
    user: { name: string; email: string } | null;
    onLoginClick: () => void;
    onLogoutClick: () => void;
    onSOSClick: () => void;
    onTriggerClick: () => void;
    onOpenPhonePreview?: () => void;
    onOpenPrivacy?: () => void;
    onOpenTerms?: () => void;
    currentWeek?: number;
    activeSongTitle?: string;
}

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
);

const SOSIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const TriggerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const ShieldPrivacyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#7A8B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const ScalesTermsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#AA8010]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
);

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" />
    </svg>
);

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  user,
  onLoginClick,
  onLogoutClick,
  onSOSClick,
  onTriggerClick,
  onOpenPhonePreview,
  onOpenPrivacy,
  onOpenTerms,
  currentWeek = 1,
  activeSongTitle,
}) => {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundtrackSrc = `/audio/week_${currentWeek}.mp3`;

  useEffect(() => {
    setIsPlayingSound(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = soundtrackSrc;
      audioRef.current.load();
    }
  }, [currentWeek, soundtrackSrc]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleSound = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlayingSound) {
        audioRef.current.pause();
        setIsPlayingSound(false);
      } else {
        if (!audioRef.current.src || !audioRef.current.src.includes(soundtrackSrc)) {
          audioRef.current.src = soundtrackSrc;
          audioRef.current.load();
        }
        audioRef.current.volume = 0.75;
        await audioRef.current.play();
        setIsPlayingSound(true);
      }
    } catch (e) {
      console.warn('Devotional soundtrack play error in header:', e);
      setIsPlayingSound(false);
    }
  };

  return (
    <header className="relative pt-3 pb-5 px-4 sm:px-6 bg-card border-b border-default shadow-xs text-center">
      {/* Top Brand & Utility Navigation Bar */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Brand Logo & Title from reference design */}
        <div className="flex items-center space-x-3 text-left">
          <BrandLogo size={36} />
          <div className="flex flex-col">
            <span className="font-cinzel text-base sm:text-lg font-bold text-main tracking-wider leading-tight">
              Steps Daily Grace
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">
              SANCTUARY FOR RECOVERY
            </span>
          </div>
        </div>

        {/* Center/Actions: SOS & Daily Triggers */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={onSOSClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600/10 text-red-700 dark:text-red-400 hover:bg-red-600/20 border border-red-300 dark:border-red-900/50 rounded-full font-semibold transition-all focus:outline-none focus:ring-2 ring-red-500 text-xs tracking-wide uppercase cursor-pointer"
            aria-label="SOS Crisis Support Suite"
          >
            <SOSIcon />
            <span>SOS Support</span>
          </button>
          <button
            onClick={onTriggerClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-card-secondary text-main hover:border-[#7A8B7B] rounded-full font-medium transition-all focus:outline-none focus:ring-2 ring-[#7A8B7B] border border-default text-xs tracking-wide cursor-pointer"
            aria-label="Trigger Tracker"
          >
            <TriggerIcon />
            <span>Daily Triggers</span>
          </button>
        </div>

        {/* Right Side: Privacy, Terms, Sound, and PHONE PREVIEW button */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
          {/* Privacy Link */}
          {onOpenPrivacy && (
            <button
              onClick={onOpenPrivacy}
              className="flex items-center space-x-1.5 text-xs text-muted hover:text-main font-medium py-1 px-2 rounded-md hover:bg-card-secondary transition-colors cursor-pointer"
              title="View Confidentiality & Privacy Policy"
            >
              <ShieldPrivacyIcon />
              <span>Privacy</span>
            </button>
          )}

          {/* Terms Link */}
          {onOpenTerms && (
            <button
              onClick={onOpenTerms}
              className="flex items-center space-x-1.5 text-xs text-muted hover:text-main font-medium py-1 px-2 rounded-md hover:bg-card-secondary transition-colors cursor-pointer"
              title="View Terms &amp; Conditions"
            >
              <ScalesTermsIcon />
              <span>Terms</span>
            </button>
          )}

          {/* Devotional Soundtrack Audio Engine */}
          <audio
            ref={audioRef}
            src={soundtrackSrc}
            onPlay={() => setIsPlayingSound(true)}
            onPause={() => setIsPlayingSound(false)}
            onEnded={() => setIsPlayingSound(false)}
            onError={() => setIsPlayingSound(false)}
            preload="none"
          />

          {/* Sound / Ambient Soundtrack Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 ring-primary cursor-pointer ${
              isPlayingSound
                ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 shadow-2xs'
                : 'text-muted hover:text-main hover:bg-card-secondary'
            }`}
            aria-label={isPlayingSound ? 'Pause Devotional Soundtrack' : 'Play Week Devotional Soundtrack'}
            title={isPlayingSound ? 'Pause Devotional Soundtrack' : `Play Week ${currentWeek} Devotional Soundtrack${activeSongTitle ? `: "${activeSongTitle}"` : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isPlayingSound ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z m4.5 4a3 3 0 010 6m2.5-9a7 7 0 010 12" />
              )}
            </svg>
          </button>

          {/* [ 📱 Phone Preview ] Button matching user's design image */}
          {onOpenPhonePreview && (
            <button
              id="header-phone-preview-btn"
              onClick={onOpenPhonePreview}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-card-secondary hover:bg-card text-main border border-default hover:border-[#D4AF37] rounded-full text-xs font-semibold shadow-2xs transition-all focus:outline-none focus:ring-2 ring-[#D4AF37] cursor-pointer hover:shadow-xs group"
              aria-label="Open Phone Preview Simulator"
              title="Preview Sacred Steps in Mobile Phone View"
            >
              <PhoneIcon />
              <span className="group-hover:text-[#AA8010] transition-colors">Phone Preview</span>
            </button>
          )}

          {/* User Account / Login */}
          {user ? (
            <div className="flex items-center space-x-2 bg-card-secondary px-2.5 py-1 rounded-full border border-default text-xs">
              <span className="font-medium text-main hidden lg:inline-block">
                {greeting}, {user.name}
              </span>
              <button 
                onClick={onLogoutClick} 
                className="text-muted hover:text-red-500 transition-colors focus:outline-none font-medium ml-1 cursor-pointer"
                aria-label="Log out"
              >
                Log out
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick} 
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-main bg-card-secondary hover:bg-primary-light border border-default rounded-full transition-all focus:outline-none focus:ring-2 ring-primary cursor-pointer"
              aria-label="Log in or Register"
            >
              <LoginIcon />
              <span>Log In</span>
            </button>
          )}

          {/* Settings */}
          <button 
            onClick={onOpenSettings} 
            className="p-1.5 text-muted hover:text-[#D4AF37] rounded-full hover:bg-card-secondary transition-colors focus:outline-none focus:ring-2 ring-[#D4AF37] cursor-pointer"
            aria-label="Open appearance and audio settings"
            title="Appearance & Audio Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {/* Main Editorial Header Typography */}
      <div className="mt-5 pt-4 border-t border-default/40 max-w-3xl mx-auto flex flex-col items-center text-center">
        <h1 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-extrabold text-main tracking-wider leading-tight">
          Sacred Steps to Redemption: The Year of Grace
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted font-sans font-medium tracking-wide">
          A 52-Week Recovery Journal of Reflection, Gratitude &amp; Prayer
        </p>
        <p className="mt-2 text-xs sm:text-sm text-primary font-serif-quote italic font-medium">
          &ldquo;A Path to Recovery, A Life in Grace.&rdquo; &bull; &ldquo;Sustained Walking, Daily Freedom.&rdquo;
        </p>
      </div>
    </header>
  );
};
