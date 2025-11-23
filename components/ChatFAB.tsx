
import React from 'react';

interface ChatFABProps {
  onOpen: () => void;
}

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);


export const ChatFAB: React.FC<ChatFABProps> = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="no-print fixed bottom-6 right-6 bg-primary text-on-primary w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transform hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary z-40"
      aria-label="Open spiritual guide chat"
      title="Chat with Kairos"
    >
      <ChatIcon />
    </button>
  );
};
