import React, { useState, useRef } from 'react';
import type { WeeklyTheme, JournalResponses } from '../types';
import { generateReflectionSummary } from '../services/geminiService';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: WeeklyTheme;
  responses: Partial<JournalResponses>;
  imageUrl: string | null;
}

const PrinterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);


export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, entry, responses, imageUrl }) => {
  const [isExporting, setIsExporting] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handlePrint = () => {
    window.print();
    onClose();
  };

  const handleExportPDF = async () => {
    const jspdf = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;

    if (!printContentRef.current || !jspdf || !html2canvas) {
        alert("PDF generation library is not loaded. Please try again.");
        return;
    }
    
    setIsExporting(true);
    try {
        const canvas = await html2canvas(printContentRef.current, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = -heightLeft;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`Sacred-Steps-Week-${entry.week}.pdf`);
    } catch (error) {
        console.error("Failed to export to PDF", error);
        alert("An error occurred while exporting to PDF. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleGenerateSummary = async () => {
      setIsGeneratingSummary(true);
      setSummaryError(null);
      try {
        const result = await generateReflectionSummary(entry, responses);
        setSummary(result);
      } catch (err) {
        setSummaryError(err instanceof Error ? err.message : "Unknown error occurred.");
      } finally {
        setIsGeneratingSummary(false);
      }
  };


  return (
    <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in">
        <header className="flex items-center justify-between p-4 border-b">
          <h3 className="text-2xl font-semibold text-slate-800">Print Preview</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition-colors" aria-label="Close print preview" disabled={isExporting}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div ref={printContentRef} className="p-6 overflow-y-auto">
          <div className="space-y-6">
            <header className="text-center p-6 border border-slate-200 rounded-lg">
              <h2 className="text-3xl font-bold text-slate-800">{`Week ${entry.week}: ${entry.theme}`}</h2>
              <p className="mt-2 text-slate-600">{entry.explanation}</p>
              {imageUrl && (
                <div className="mt-4">
                  <img src={imageUrl} alt={`Reflective art for ${entry.theme}`} className="w-full max-w-md mx-auto rounded-lg shadow-md" />
                </div>
              )}
            </header>
            
            <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-3">AI Reflection Summary</h3>
                {summary ? (
                    <p className="whitespace-pre-wrap text-slate-700 italic">{summary}</p>
                ) : (
                    <>
                        <p className="text-sm text-slate-600 mb-4">Generate a summary of your reflections for this week to get a condensed view of your thoughts and feelings.</p>
                        <button 
                            onClick={handleGenerateSummary} 
                            disabled={isGeneratingSummary} 
                            className="flex items-center justify-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                             {isGeneratingSummary ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                             ) : (
                                'Generate Summary'
                             )}
                        </button>
                        {summaryError && <p className="text-red-600 text-sm mt-2">Error: {summaryError}</p>}
                    </>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                 <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">Bible Verse</h3>
                    <blockquote className="border-l-4 border-slate-300 pl-4">
                        <p className="font-serif italic text-lg text-slate-600">"{entry.bibleVerseText}"</p>
                        <cite className="block text-right mt-2 not-italic text-slate-500">{entry.bibleVerse}</cite>
                    </blockquote>
                 </div>
                 <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">Inspirational Quote</h3>
                    <blockquote className="border-l-4 border-slate-300 pl-4">
                        <p className="font-serif italic text-slate-600">"{entry.quote.text}"</p>
                        <cite className="block text-right mt-2 not-italic text-slate-500">&ndash; {entry.quote.author}</cite>
                    </blockquote>
                </div>
            </div>
            
             <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-3">Biblical Aspiration & Personal Goal</h3>
                <p className="font-serif italic text-lg text-slate-600 mb-4">{entry.biblicalAspiration}</p>
                {responses.personalGoal && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-500 mb-2">Your Personal Goal:</p>
                        <p className="whitespace-pre-wrap text-slate-800">{responses.personalGoal}</p>
                    </div>
                )}
                {responses.goalReflection && (
                     <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-500 mb-2">Your Reflection on this Goal:</p>
                        <p className="whitespace-pre-wrap text-slate-800">{responses.goalReflection}</p>
                    </div>
                )}
            </div>
            
            <div className="border border-slate-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Weekly Prompt</h3>
              <p className="text-lg text-slate-700">{entry.prompt}</p>
              <div className="mt-4 bg-slate-50 p-4 rounded-md">
                <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                <p className="whitespace-pre-wrap text-slate-800">{responses.promptResponse || 'No response entered.'}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-3">Reflection Questions</h3>
                <div className="space-y-4">
                    <div>
                        <p className="font-medium text-slate-700 mb-2">{entry.reflectionQuestion1}</p>
                        <div className="bg-slate-50 p-4 rounded-md">
                            <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                            <p className="whitespace-pre-wrap text-slate-800">{responses.reflection1Response || 'No response entered.'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="font-medium text-slate-700 mb-2">{entry.reflectionQuestion2}</p>
                         <div className="bg-slate-50 p-4 rounded-md">
                            <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                            <p className="whitespace-pre-wrap text-slate-800">{responses.reflection2Response || 'No response entered.'}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {responses.deeperReflectionResponse && (
                 <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">Deeper Reflection</h3>
                    <div className="mt-4 bg-slate-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                        <p className="whitespace-pre-wrap text-slate-800">{responses.deeperReflectionResponse}</p>
                    </div>
                </div>
            )}


            <div className="grid md:grid-cols-2 gap-6">
                 <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">Weekly Prayer</h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-600">{entry.prayer}</p>
                </div>

                 <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">Song for the Soul</h3>
                    <p className="text-slate-700">
                        <strong>Title:</strong> "{entry.songTitle}"
                    </p>
                    <div className="mt-2 text-sm text-slate-500">
                        <p>Spotify: <span className="underline break-all">{entry.songLinks.spotify}</span></p>
                        <p>Apple Music: <span className="underline break-all">{entry.songLinks.appleMusic}</span></p>
                    </div>
                </div>
            </div>


            <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-3">Suggested Resources</h3>
                <ul className="space-y-3 list-disc list-inside">
                    {entry.suggestedResources && entry.suggestedResources.map((resource, index) => (
                        <li key={index} className="text-slate-700 break-words">
                            <strong>{resource.title}</strong> ({resource.type}): <span className="text-sm text-slate-500 underline">{resource.url}</span>
                        </li>
                    ))}
                    {(!entry.suggestedResources || entry.suggestedResources.length === 0) && (
                        <p className="text-sm text-slate-400">No additional resources suggested for this week.</p>
                    )}
                </ul>
            </div>
          </div>
        </div>
        
        <footer className="flex items-center justify-end p-4 border-t space-x-4 bg-slate-50 rounded-b-lg">
          <button onClick={onClose} disabled={isExporting} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Cancel
          </button>
          <button onClick={handleExportPDF} disabled={isExporting} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-wait w-36 justify-center">
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <DownloadIcon />
                Export to PDF
              </>
            )}
          </button>
          <button onClick={handlePrint} disabled={isExporting} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <PrinterIcon />
            Confirm Print
          </button>
        </footer>
      </div>
    </div>
  );
};
