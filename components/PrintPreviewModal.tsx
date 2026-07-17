
import React, { useState, useRef, useMemo } from 'react';
import type { WeeklyTheme, JournalResponses, SavedEntries } from '../types';
import { generateReflectionSummary } from '../services/geminiService';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: WeeklyTheme;
  responses: Partial<JournalResponses>;
  imageUrl: string | null;
  allThemes: WeeklyTheme[];
  allResponses: SavedEntries;
  allImages: { [week: number]: string };
}

type ExportMode = 'current' | 'full';

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


export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, entry, responses, imageUrl, allThemes, allResponses, allImages }) => {
  const [isExporting, setIsExporting] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>('current');

  const printableThemes = useMemo(() => {
    if (exportMode === 'current') return [entry];
    // Filter only weeks with some input
    return allThemes.filter(t => {
      const resp = allResponses[t.week];
      return resp && (
        (resp.promptResponse && resp.promptResponse.trim() !== '') ||
        (resp.reflection1Response && resp.reflection1Response.trim() !== '') ||
        (resp.reflection2Response && resp.reflection2Response.trim() !== '') ||
        (resp.personalGoal && resp.personalGoal.trim() !== '')
      );
    });
  }, [exportMode, entry, allThemes, allResponses]);

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
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 1024,
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

        const fileName = exportMode === 'current' 
            ? `Sacred-Steps-Week-${entry.week}.pdf` 
            : `Sacred-Steps-Full-Journal.pdf`;
        pdf.save(fileName);
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
          <div className="flex flex-col">
            <h3 className="text-2xl font-semibold text-slate-800">Print Preview</h3>
            <div className="mt-2 flex items-center p-1 bg-slate-100 rounded-lg self-start">
              <button 
                onClick={() => setExportMode('current')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${exportMode === 'current' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
              >
                Week {entry.week} Only
              </button>
              <button 
                onClick={() => setExportMode('full')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${exportMode === 'full' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
              >
                Full Journal ({printableThemes.length} weeks)
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition-colors" aria-label="Close print preview" disabled={isExporting}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div ref={printContentRef} className="p-6 overflow-y-auto bg-white">
          <div className="space-y-12">
            {printableThemes.map((t) => {
              const resp = exportMode === 'current' ? responses : (allResponses[t.week] || {});
              const img = exportMode === 'current' ? imageUrl : (allImages[t.week] || null);
              
              return (
                <div key={t.week} className="space-y-6 page-break-after-always">
                  <header className="text-center p-6 border border-slate-200 rounded-lg">
                    <h2 className="text-3xl font-bold text-slate-800">{`Week ${t.week}: ${t.theme}`}</h2>
                    <p className="mt-2 text-slate-600">{t.explanation}</p>
                    {img && (
                      <div className="mt-4">
                        <img src={img} alt={`Reflective art for ${t.theme}`} referrerPolicy="no-referrer" className="w-full max-w-md mx-auto rounded-lg shadow-md" />
                      </div>
                    )}
                  </header>
                  
                  {exportMode === 'current' && (
                    <div className="border border-slate-200 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-slate-800 mb-3">AI Reflection Summary</h3>
                        {summary ? (
                            <p className="whitespace-pre-wrap text-slate-700 italic">{summary}</p>
                        ) : (
                            <div className="no-print">
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
                            </div>
                        )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                      <div className="border border-slate-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-slate-800 mb-3">Bible Verse</h3>
                          <blockquote className="border-l-4 border-slate-300 pl-4">
                              <p className="font-serif italic text-lg text-slate-600">"{t.bibleVerseText}"</p>
                              <cite className="block text-right mt-2 not-italic text-slate-500">{t.bibleVerse}</cite>
                          </blockquote>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-slate-800 mb-3">Inspirational Quote</h3>
                          <blockquote className="border-l-4 border-slate-300 pl-4">
                              <p className="font-serif italic text-slate-600">"{t.quote.text}"</p>
                              <cite className="block text-right mt-2 not-italic text-slate-500">&ndash; {t.quote.author}</cite>
                          </blockquote>
                      </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-slate-800 mb-3">Biblical Aspiration & Personal Goal</h3>
                      <p className="font-serif italic text-lg text-slate-600 mb-4">{t.biblicalAspiration}</p>
                      {resp.personalGoal && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                              <p className="text-sm font-medium text-slate-500 mb-2">Your Personal Goal:</p>
                              <p className="whitespace-pre-wrap text-slate-800">{resp.personalGoal}</p>
                          </div>
                      )}
                      {resp.goalReflection && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                              <p className="text-sm font-medium text-slate-500 mb-2">Your Reflection on this Goal:</p>
                              <p className="whitespace-pre-wrap text-slate-800">{resp.goalReflection}</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">Weekly Prompt</h3>
                    <p className="text-lg text-slate-700">{t.prompt}</p>
                    <div className="mt-4 bg-slate-50 p-4 rounded-md">
                      <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                      <p className="whitespace-pre-wrap text-slate-800">{resp.promptResponse || 'No response entered.'}</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-slate-800 mb-3">Reflection Questions</h3>
                      <div className="space-y-4">
                          <div>
                              <p className="font-medium text-slate-700 mb-2">{t.reflectionQuestion1}</p>
                              <div className="bg-slate-50 p-4 rounded-md">
                                  <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                                  <p className="whitespace-pre-wrap text-slate-800">{resp.reflection1Response || 'No response entered.'}</p>
                              </div>
                          </div>
                          <div>
                              <p className="font-medium text-slate-700 mb-2">{t.reflectionQuestion2}</p>
                              <div className="bg-slate-50 p-4 rounded-md">
                                  <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                                  <p className="whitespace-pre-wrap text-slate-800">{resp.reflection2Response || 'No response entered.'}</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {resp.deeperReflectionResponse && (
                      <div className="border border-slate-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-slate-800 mb-3">Deeper Reflection</h3>
                          <div className="mt-4 bg-slate-50 p-4 rounded-md">
                              <p className="text-sm font-medium text-slate-500 mb-2">Your Response:</p>
                              <p className="whitespace-pre-wrap text-slate-800">{resp.deeperReflectionResponse}</p>
                          </div>
                      </div>
                  )}

                  <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-slate-800 mb-3">Weekly Prayer</h3>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-600 italic">{t.prayer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <footer className="flex items-center justify-end p-4 border-t space-x-4 bg-slate-50 rounded-b-lg">
          <button onClick={onClose} disabled={isExporting} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Cancel
          </button>
          <button onClick={handleExportPDF} disabled={isExporting} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-wait w-48 justify-center">
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting PDF...
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
