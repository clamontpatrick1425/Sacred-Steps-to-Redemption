
import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-sky-600"></div>
    <h2 className="mt-6 text-2xl font-semibold text-slate-700">Crafting Your Journey...</h2>
    <p className="mt-2 text-slate-500">Please wait while we prepare your 52 weeks of reflection.</p>
  </div>
);
