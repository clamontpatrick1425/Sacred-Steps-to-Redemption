
import React from 'react';

export const ImageSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full bg-card-secondary">
      <div className="animate-pulse w-full h-full bg-slate-300/50"></div>
    </div>
  );
};