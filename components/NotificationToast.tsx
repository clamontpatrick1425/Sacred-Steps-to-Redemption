
import React from 'react';
import type { ToastMessage } from '../types';

interface NotificationToastProps {
  toast: ToastMessage | null;
}

const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast }) => {
  const styleConfig = {
    error: {
      bg: 'bg-red-600',
      icon: <ErrorIcon />,
    },
    info: {
      bg: 'bg-primary',
      icon: null,
    },
    success: {
      bg: 'bg-green-600',
      icon: null,
    },
  };

  const config = toast ? styleConfig[toast.type] : styleConfig.info;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 text-white py-3 px-5 rounded-lg shadow-xl flex items-center z-50 transition-all duration-500 ease-out ${
        toast
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      } ${config.bg}`}
      role="alert"
      aria-live="assertive"
    >
      {config.icon}
      <p className="text-sm">{toast?.message}</p>
    </div>
  );
};