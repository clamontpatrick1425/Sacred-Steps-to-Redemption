import React, { useState, useEffect, useRef } from 'react';

export const MeditationTimer: React.FC = () => {
  const [duration, setDuration] = useState(5 * 60); // Default 5 minutes
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play a gentle chime when finished
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(432, audioCtx.currentTime); // Healing frequency
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 3);
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(duration);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration);
  };

  const changeDuration = (minutes: number) => {
    const newDuration = minutes * 60;
    setDuration(newDuration);
    setTimeLeft(newDuration);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="bg-card rounded-xl shadow-md p-4 mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-main flex items-center">
          <span className="mr-2">🧘</span> Meditation Timer
        </h3>
        <span className="text-muted">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="mt-4 animate-fade-in text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-card-secondary"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * progress) / 100}
                className="text-primary transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-main font-mono">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex justify-center space-x-2 mb-4">
            {[1, 5, 10, 15].map(mins => (
              <button
                key={mins}
                onClick={() => changeDuration(mins)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  duration === mins * 60 ? 'bg-primary text-on-primary' : 'bg-card-secondary text-muted hover:bg-primary-light hover:text-primary'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={toggleTimer}
              className="px-6 py-2 bg-primary text-on-primary font-medium rounded-full hover:bg-primary-hover transition-colors shadow-sm"
            >
              {isActive ? 'Pause' : timeLeft === 0 ? 'Restart' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              className="px-6 py-2 bg-card-secondary text-main font-medium rounded-full hover:bg-primary-light transition-colors shadow-sm"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
