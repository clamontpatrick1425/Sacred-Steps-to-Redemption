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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
);

const SOSIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const TriggerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, user, onLoginClick, onLogoutClick, onSOSClick, onTriggerClick }) => {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  return (
  <header className="relative text-center py-8 px-4 bg-card shadow-md">
    <div className="absolute top-4 left-4 flex items-center space-x-2">
        <button
            onClick={onSOSClick}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-full font-bold transition-colors focus:outline-none focus:ring-2 ring-red-500 text-sm"
            aria-label="SOS Crisis Mode"
        >
            <SOSIcon />
            <span className="hidden sm:inline">SOS</span>
        </button>
        <button
            onClick={onTriggerClick}
            className="flex items-center space-x-1 px-3 py-1.5 bg-card-secondary text-main hover:bg-primary-light rounded-full font-medium transition-colors focus:outline-none focus:ring-2 ring-primary border border-default text-sm"
            aria-label="Trigger Tracker"
        >
            <TriggerIcon />
            <span className="hidden sm:inline">Triggers</span>
        </button>
    </div>
    <div className="absolute top-4 right-4 flex items-center space-x-3">
        {user ? (
            <div className="flex items-center space-x-3 mr-1 bg-card-secondary px-3 py-1.5 rounded-full border border-default">
                <span className="text-sm font-medium text-main hidden sm:inline-block">{greeting}, {user.name}</span>
                 <button 
                    onClick={onLogoutClick} 
                    className="text-sm text-muted hover:text-red-500 transition-colors focus:outline-none font-medium"
                    aria-label="Log out"
                >
                    Log out
                </button>
            </div>
        ) : (
             <button 
                onClick={onLoginClick} 
                className="flex items-center space-x-2 px-3 py-2 text-primary hover:text-primary-hover bg-card-secondary hover:bg-primary-light rounded-md transition-colors focus:outline-none focus:ring-2 ring-primary mr-1"
                aria-label="Log in or Register"
            >
                <LoginIcon />
                <span className="font-medium hidden sm:inline">Log In</span>
            </button>
        )}
        <button 
            onClick={onOpenSettings} 
            className="p-3 text-muted hover:text-primary rounded-full hover:bg-card-secondary transition-colors focus:outline-none focus:ring-2 ring-offset-2 ring-primary"
            aria-label="Open appearance settings"
        >
            <SettingsIcon />
        </button>
    </div>
    
    <div className="mt-8 md:mt-0">
        <h1 className="text-4xl md:text-5xl font-bold text-main">Sacred Steps to Redemption</h1>
        <p className="mt-2 text-lg text-muted">A 52-Week Journey of Reflection and Gratitude</p>
    </div>
  </header>
  );
};