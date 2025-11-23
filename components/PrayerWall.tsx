
import React from 'react';

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);


interface PrayerWallProps {
  onOpen: () => void;
}

export const PrayerWall: React.FC<PrayerWallProps> = ({ onOpen }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-muted mb-2">Community Prayer Wall</h3>
      <p className="text-xs text-muted mb-3">Share a prayer or gratitude note anonymously with the community.</p>
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all"
      >
        <UsersIcon />
        Open Prayer Wall
      </button>
    </div>
  );
};
