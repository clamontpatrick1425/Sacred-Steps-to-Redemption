import React from 'react';

interface HeaderProps {
    onOpenSettings: () => void;
    user: { name: string; email: string } | null;
    onLoginClick: () => void;
    onLogoutClick: () => void;
    onSOSClick: () => void;
    onTriggerClick: () => void;
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

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, user, onLoginClick, onLogoutClick, onSOSClick, onTriggerClick }) => {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  return (
    <header className="relative pt-4 pb-6 px-4 sm:px-6 bg-card border-b border-default shadow-sm text-center">
      {/* Top Navigation & Utility Bar */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Critical Crisis & Trigger Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onSOSClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600/10 text-red-700 dark:text-red-400 hover:bg-red-600/20 border border-red-300 dark:border-red-900/50 rounded-full font-semibold transition-all focus:outline-none focus:ring-2 ring-red-500 text-xs tracking-wide uppercase"
            aria-label="SOS Crisis Support Suite"
          >
            <SOSIcon />
            <span>SOS Support</span>
          </button>
          <button
            onClick={onTriggerClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-card-secondary text-main hover:border-[#7A8B7B] rounded-full font-medium transition-all focus:outline-none focus:ring-2 ring-[#7A8B7B] border border-default text-xs tracking-wide"
            aria-label="Trigger Tracker"
          >
            <TriggerIcon />
            <span>Daily Triggers</span>
          </button>
        </div>

        {/* Right Side: Account & Settings */}
        <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2 bg-card-secondary px-3 py-1.5 rounded-full border border-default text-xs">
                <span className="font-medium text-main hidden sm:inline-block">
                  {greeting}, {user.name}
                </span>
                <button 
                  onClick={onLogoutClick} 
                  className="text-muted hover:text-red-500 transition-colors focus:outline-none font-medium ml-1"
                  aria-label="Log out"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick} 
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-main bg-card-secondary hover:bg-primary-light border border-default rounded-full transition-all focus:outline-none focus:ring-2 ring-primary"
                aria-label="Log in or Register"
              >
                <LoginIcon />
                <span>Log In</span>
              </button>
            )}
            <button 
              onClick={onOpenSettings} 
              className="p-2 text-muted hover:text-[#D4AF37] rounded-full hover:bg-card-secondary transition-colors focus:outline-none focus:ring-2 ring-[#D4AF37]"
              aria-label="Open appearance and audio settings"
              title="Appearance & Audio Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>

      {/* Main Editorial Header Typography */}
      <div className="mt-6 pt-5 border-t border-default/40 max-w-3xl mx-auto flex flex-col items-center text-center">
        <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-extrabold text-main tracking-wider leading-tight">
          Sacred Steps to Redemption: The Year of Grace
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted font-sans font-medium tracking-wide">
          A 52-Week Recovery Journal of Reflection, Gratitude &amp; Prayer
        </p>
        <p className="mt-3 text-xs sm:text-sm text-primary font-serif-quote italic font-medium">
          &ldquo;A Path to Recovery, A Life in Grace.&rdquo; &bull; &ldquo;Sustained Walking, Daily Freedom.&rdquo;
        </p>
      </div>
    </header>
  );
};
