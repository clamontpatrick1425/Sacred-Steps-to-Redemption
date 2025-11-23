
import React from 'react';
import type { WeeklyTheme } from '../types';

interface SearchResultsProps {
  results: WeeklyTheme[];
  searchQuery: string;
  onResultClick: (week: number) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, searchQuery, onResultClick }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-sm animate-fade-in">
      <h3 className="text-sm font-medium text-muted mb-2">
        Results for "{searchQuery}"
      </h3>
      {results.length > 0 ? (
        <ul className="max-h-60 overflow-y-auto space-y-1">
          {results.map(theme => (
            <li key={theme.week}>
              <button
                onClick={() => onResultClick(theme.week)}
                className="w-full text-left px-3 py-2 text-sm text-main rounded-md hover:bg-primary-light focus:outline-none focus:ring-2 ring-primary transition-colors"
              >
                <strong>Week {theme.week}:</strong> {theme.theme}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted px-3 py-2">No entries found.</p>
      )}
    </div>
  );
};