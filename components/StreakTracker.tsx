import React from 'react';

const FlameIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.C14.05 1 16.957 1.226 18.657 3c1.7 1.774 1.947 4.697.5 6.143C17.5 10.5 15 11 15 13c2 1 5 .5 6.143 2.986C22.774 18.043 22.9 20.94 21 22.657c-1.7 1.7-4.614 1.947-6.143.5C13.5 22.5 13 20 15 19c-2 0-5 .5-7.014-2.986" />
    </svg>
);


interface StreakTrackerProps {
  streak: number;
}

export const StreakTracker: React.FC<StreakTrackerProps> = ({ streak }) => {
  const getMessage = () => {
    if (streak <= 1) {
      return "Complete this week to build your streak!";
    }
    return `You're on a roll. Keep up the great work!`;
  };

  return (
    <div className="p-4 bg-card rounded-lg shadow-sm flex items-center space-x-4">
      <div className={`p-3 rounded-full transition-colors ${streak > 0 ? 'bg-accent-light text-accent' : 'bg-card-secondary text-muted'}`}>
        <FlameIcon />
      </div>
      <div>
        <p className="text-lg font-bold text-main">{streak} Week Streak</p>
        <p className="text-sm text-muted">{getMessage()}</p>
      </div>
    </div>
  );
};