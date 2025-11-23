
import React from 'react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

export const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onSearchChange }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <label htmlFor="journal-search" className="block text-sm font-medium text-muted mb-2">
        Search Entries
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="search"
          id="journal-search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 text-base border-input focus:outline-none ring-primary focus:border-primary sm:text-sm rounded-md"
          placeholder="Find by keyword..."
        />
      </div>
    </div>
  );
};