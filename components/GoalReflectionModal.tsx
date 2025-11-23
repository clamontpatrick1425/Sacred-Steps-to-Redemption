import React, { useState } from 'react';

interface GoalReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (week: number, reflection: string) => void;
  week: number;
  goal: string;
}

export const GoalReflectionModal: React.FC<GoalReflectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  week,
  goal,
}) => {
  const [reflection, setReflection] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(week, reflection);
  };

  return (
    <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-card rounded-lg shadow-2xl max-w-lg w-full flex flex-col animate-fade-in">
        <header className="flex items-center justify-between p-4 border-b border-default">
          <h3 className="text-xl font-semibold text-main">Reflect on Your Goal</h3>
        </header>
        
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
                <p className="text-muted">Before moving on, take a moment to reflect on your goal from last week:</p>
                <blockquote className="border-l-4 border-primary-light pl-4 py-2 bg-card-secondary rounded-r-md">
                    <p className="font-serif italic text-main">"{goal}"</p>
                </blockquote>
                <div>
                    <label htmlFor="goal-reflection" className="block text-sm font-medium text-muted mb-2">
                        How did it go? What did you learn?
                    </label>
                    <textarea
                        id="goal-reflection"
                        rows={5}
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        className="w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary transition-colors duration-200 ease-in-out bg-card-secondary hover:bg-card"
                        placeholder="Write a brief reflection..."
                        required
                    />
                </div>
            </div>
            
            <footer className="flex items-center justify-end p-4 border-t border-default space-x-4 bg-card-secondary rounded-b-lg">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors">
                Skip for Now
              </button>
              <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors">
                Save Reflection
              </button>
            </footer>
        </form>
      </div>
    </div>
  );
};