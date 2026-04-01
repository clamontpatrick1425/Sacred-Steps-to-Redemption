import React from 'react';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-500">
        <div className="bg-red-600 p-6 text-white text-center">
          <h2 className="text-3xl font-bold mb-2 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            SOS Crisis Mode
          </h2>
          <p className="text-red-100">You are not alone. Breathe.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <h3 className="font-bold text-red-800 mb-2">Grounding Exercise (5-4-3-2-1)</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li><strong>5</strong> things you can see</li>
              <li><strong>4</strong> things you can touch</li>
              <li><strong>3</strong> things you can hear</li>
              <li><strong>2</strong> things you can smell</li>
              <li><strong>1</strong> thing you can taste</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2">Emergency Scripture</h3>
            <p className="text-sm text-blue-700 italic">
              "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear. But when you are tempted, he will also provide a way out so that you can endure it." - 1 Corinthians 10:13
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-main">Emergency Contacts</h3>
            <a href="tel:988" className="flex items-center justify-between bg-card-secondary p-3 rounded-lg hover:bg-red-50 transition-colors border border-default">
              <span className="font-medium text-main">Suicide & Crisis Lifeline</span>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">988</span>
            </a>
            <a href="tel:1-800-662-4357" className="flex items-center justify-between bg-card-secondary p-3 rounded-lg hover:bg-red-50 transition-colors border border-default">
              <span className="font-medium text-main">SAMHSA National Helpline</span>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">1-800-662-HELP</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-card-secondary text-main font-bold rounded-xl hover:bg-primary-light transition-colors border border-default"
          >
            I am safe now. Close SOS.
          </button>
        </div>
      </div>
    </div>
  );
};
