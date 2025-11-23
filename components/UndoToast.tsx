
import React from 'react';

interface UndoToastProps {
  isVisible: boolean;
  onUndo: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ isVisible, onUndo }) => {
  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white py-3 px-5 rounded-lg shadow-xl flex items-center justify-between z-50 transition-all duration-500 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm mr-4">Entry updated.</p>
      <button
        onClick={onUndo}
        className="text-sm font-semibold text-sky-300 hover:text-sky-200 focus:outline-none focus:underline"
        aria-label="Undo last change"
      >
        Undo
      </button>
    </div>
  );
};