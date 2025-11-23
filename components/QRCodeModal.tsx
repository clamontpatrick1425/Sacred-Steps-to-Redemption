
import React from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) {
    return null;
  }

  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(url)}`;

  return (
    <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-card rounded-lg shadow-2xl max-w-sm w-full flex flex-col animate-fade-in">
        <header className="flex items-center justify-between p-4 border-b border-default">
          <h3 className="text-xl font-semibold text-main">Scan QR Code</h3>
          <button onClick={onClose} className="text-muted hover:text-main transition-colors" aria-label="Close QR Code modal">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div className="p-6 text-center">
            <div className="bg-white p-4 inline-block rounded-lg shadow-inner">
                 <img src={qrCodeApiUrl} alt={`QR Code for ${title}`} width="256" height="256" />
            </div>
            <p className="mt-4 font-semibold text-main">"{title}"</p>
            <p className="mt-1 text-sm text-muted">Scan this code with your mobile device to open the song link.</p>
        </div>
        
        <footer className="flex items-center justify-end p-4 border-t border-default bg-card-secondary rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors">
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};
