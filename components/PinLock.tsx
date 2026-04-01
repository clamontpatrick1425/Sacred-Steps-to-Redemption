import React, { useState, useEffect } from 'react';

interface PinLockProps {
  onUnlock: () => void;
  isSettingPin?: boolean;
  onSetPin?: (pin: string) => void;
  onCancel?: () => void;
}

export const PinLock: React.FC<PinLockProps> = ({ onUnlock, isSettingPin, onSetPin, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (isSettingPin && onSetPin) {
        onSetPin(pin);
      } else {
        const savedPin = localStorage.getItem('privacyPin');
        if (pin === savedPin) {
          onUnlock();
        } else {
          setError('Incorrect PIN');
          setTimeout(() => {
            setPin('');
            setError('');
          }, 1000);
        }
      }
    }
  }, [pin, isSettingPin, onSetPin, onUnlock]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100]">
      <div className="bg-card p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold text-main mb-2">
          {isSettingPin ? 'Set Privacy PIN' : 'Enter PIN'}
        </h2>
        <p className="text-muted mb-8">
          {isSettingPin ? 'Choose a 4-digit PIN to secure your journal.' : 'Please enter your 4-digit PIN to access your journal.'}
        </p>

        <div className="flex justify-center space-x-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                i < pin.length ? 'bg-primary border-primary' : 'border-default'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-red-500 mb-4 animate-pulse">{error}</p>}

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-16 rounded-full bg-card-secondary text-main text-2xl font-semibold hover:bg-primary-light transition-colors mx-auto flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-card-secondary text-main text-2xl font-semibold hover:bg-primary-light transition-colors mx-auto flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full text-muted hover:text-main transition-colors mx-auto flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>

        {onCancel && (
          <button onClick={onCancel} className="text-muted hover:text-main">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
