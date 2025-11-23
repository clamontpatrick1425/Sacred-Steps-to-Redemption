
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md" role="alert">
    <p className="font-bold text-xl">An Error Occurred</p>
    <p className="mt-2">{message}</p>
    <p className="mt-4 text-sm">Please check your network connection and API key configuration, then refresh the page.</p>
  </div>
);
