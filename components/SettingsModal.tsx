import React from 'react';
import type { AppTheme, AppFontSize } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  currentFontSize: AppFontSize;
  onFontSizeChange: (size: AppFontSize) => void;
}

const fontSizes: { id: AppFontSize; name: string }[] = [
  { id: 'sm', name: 'Small' },
  { id: 'base', name: 'Normal' },
  { id: 'lg', name: 'Large' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  currentFontSize,
  onFontSizeChange,
}) => {
  if (!isOpen) return null;

  const isDarkMode = currentTheme === 'dark';

  const handleThemeToggle = () => {
    // Toggles between 'dark' and the default light theme 'sky'
    onThemeChange(isDarkMode ? 'sky' : 'dark');
  };

  return (
    <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-card rounded-lg shadow-2xl max-w-md w-full flex flex-col animate-fade-in">
        <header className="flex items-center justify-between p-4 border-b border-default">
          <h3 className="text-2xl font-semibold text-main">Appearance Settings</h3>
          <button onClick={onClose} className="text-muted hover:text-main transition-colors" aria-label="Close settings dialog">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-6 space-y-6">
          {/* Theme Selection */}
          <div>
            <h4 className="text-sm font-medium text-muted mb-3">Color Theme</h4>
            <div className="flex items-center justify-between bg-card-secondary p-3 rounded-lg">
                <span className="text-main">Dark Mode</span>
                <label htmlFor="theme-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        id="theme-toggle"
                        className="sr-only peer"
                        checked={isDarkMode}
                        onChange={handleThemeToggle}
                        aria-label="Toggle dark mode"
                    />
                    <div className="w-11 h-6 bg-border rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 ring-primary peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-full"></div>
                </label>
            </div>
          </div>

          {/* Font Size Selection */}
          <div>
            <h4 className="text-sm font-medium text-muted mb-3">Text Size</h4>
            <div className="flex items-center bg-card-secondary p-1 rounded-lg">
              {fontSizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => onFontSizeChange(size.id)}
                  className={`w-1/3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    currentFontSize === size.id ? 'bg-card text-primary shadow-sm' : 'text-muted'
                  }`}
                >
                  {size.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <footer className="flex items-center justify-end p-4 border-t border-default bg-card-secondary rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors">
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};
