import React, { useEffect, useRef, useState } from 'react';
import { wrapText } from '../utils/canvasUtils';
import type { AppTheme, AppFontSize } from '../types';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  source: string;
}

type CardFont = 'serif' | 'sans-serif';

const gradients: { [key in AppTheme]: string[] } = {
    sky: ['#e0f2fe', '#dbeafe'], // sky-100, blue-100
    dark: ['#1e293b', '#334155'], // slate-800, slate-700
};

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);
const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);


export const ShareCardModal: React.FC<ShareCardModalProps> = ({ isOpen, onClose, text, source }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const showShareButton = 'share' in navigator && 'canShare' in navigator;
  
  const [font, setFont] = useState<CardFont>('serif');
  const [activeTheme, setActiveTheme] = useState<AppTheme>('sky');

  // When modal opens, get the current theme from the document
  useEffect(() => {
    if (isOpen) {
        const isDark = document.documentElement.classList.contains('dark');
        setActiveTheme(isDark ? 'dark' : 'sky');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 800;
      const height = 450;
      canvas.width = width;
      canvas.height = height;

      // Create gradient background based on current app theme
      const gradientColors = gradients[activeTheme];
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, gradientColors[0]);
      gradient.addColorStop(1, gradientColors[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      const isDark = activeTheme === 'dark';

      // Add watermark
      ctx.font = "italic 16px 'Source Sans 3', sans-serif";
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
      ctx.textAlign = 'center';
      ctx.fillText('From Sacred Steps to Redemption', width / 2, height - 25);
      
      // Draw text
      ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b'; // slate-200 for dark, slate-800 for light
      ctx.textAlign = 'center';

      // Main text
      const maxWidth = width - 120; // 60px padding on each side
      const x = width / 2;
      let y = height / 2;
      
      ctx.font = `italic 40px ${font === 'serif' ? "'Lora', serif" : "'Source Sans 3', sans-serif"}`;
      const textHeight = wrapText(ctx, `"${text}"`, x, 0, maxWidth, 50);

      // Adjust y to center the block of text
      const startY = y - (textHeight / 2) + 25;
      wrapText(ctx, `"${text}"`, x, startY, maxWidth, 50);

      // Source text
      ctx.font = `24px ${font === 'serif' ? "'Lora', serif" : "'Source Sans 3', sans-serif"}`;
      ctx.fillText(source, x, startY + textHeight + 20);

    }
  }, [isOpen, text, source, font, activeTheme]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `insight-card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    if (!canvasRef.current || !navigator.share) return;
    
    canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
            alert("Could not create image to share.");
            return;
        }
        const file = new File([blob], 'insight-card.png', { type: 'image/png' });
        const shareData = {
            title: 'An Insight from My Journey',
            text: `"${text}" - ${source}`,
            files: [file],
        };
        if (navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error("Share failed:", err);
            }
        } else {
             alert("This content cannot be shared on your device.");
        }
    }, 'image/png');
  };

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-card rounded-lg shadow-2xl max-w-2xl w-full flex flex-col animate-fade-in">
        <header className="flex items-center justify-between p-4 border-b border-default">
          <h3 className="text-2xl font-semibold text-main">Share Insight</h3>
          <button onClick={onClose} className="text-muted hover:text-main transition-colors" aria-label="Close share dialog">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div className="p-6 bg-card-secondary">
            <p className="text-center text-sm text-muted mb-4">A preview of your shareable image card:</p>
             <canvas ref={canvasRef} className="w-full rounded-lg shadow-md aspect-video"></canvas>
             <div className="mt-4 pt-4 border-t border-default">
                 <label htmlFor="font-select" className="text-sm font-medium text-muted mr-3">Font Style:</label>
                 <select 
                    id="font-select" 
                    value={font} 
                    onChange={(e) => setFont(e.target.value as CardFont)}
                    className="py-1 px-2 rounded-md border-input focus:ring-primary focus:border-primary"
                >
                    <option value="serif">Serif</option>
                    <option value="sans-serif">Sans-serif</option>
                 </select>
             </div>
        </div>
        
        <footer className="flex items-center justify-end p-4 border-t border-default space-x-4 bg-card-secondary rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors">
            Cancel
          </button>
          {showShareButton && (
            <button onClick={handleShare} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                <ShareIcon />
                Share
            </button>
          )}
          <button onClick={handleDownload} className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors">
            <DownloadIcon />
            Download
          </button>
        </footer>
      </div>
    </div>
  );
};