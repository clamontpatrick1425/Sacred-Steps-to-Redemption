import React from 'react';

const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);


interface InteractiveParableProps {
  onStart: () => void;
}

export const InteractiveParable: React.FC<InteractiveParableProps> = ({ onStart }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-muted mb-2">Interactive Parables</h3>
      <p className="text-xs text-muted mb-3">Engage with timeless stories in a new way. Your choices will shape the narrative.</p>
      <button
        onClick={onStart}
        className="w-full flex items-center justify-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-all"
      >
        <BookIcon />
        Explore a Story
      </button>
    </div>
  );
};