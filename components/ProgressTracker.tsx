
import React from 'react';

interface ProgressTrackerProps {
  completedWeeks: number;
  totalWeeks: number;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ completedWeeks, totalWeeks }) => {
  const percentage = totalWeeks > 0 ? (completedWeeks / totalWeeks) * 100 : 0;

  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-muted mb-2">Your Progress</h3>
      <div className="w-full bg-card-secondary rounded-full h-2.5" role="progressbar" aria-valuenow={completedWeeks} aria-valuemin={0} aria-valuemax={totalWeeks}>
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-right text-sm text-muted mt-2">
        <span className="font-semibold">{completedWeeks}</span> / {totalWeeks} Weeks Completed
      </p>
    </div>
  );
};