import React from 'react';

const MapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 10l6-3m0 0V7" />
    </svg>
);


interface JourneyMapProps {
  onOpen: () => void;
}

export const JourneyMap: React.FC<JourneyMapProps> = ({ onOpen }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-muted mb-2">My Journey Map</h3>
      <p className="text-xs text-muted mb-3">Visualize your progress with an AI-powered analysis of your reflections over time.</p>
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all"
      >
        <MapIcon />
        View Dashboard
      </button>
    </div>
  );
};