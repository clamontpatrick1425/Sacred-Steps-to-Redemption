
import React, { useState, useRef, useMemo } from 'react';
import type { WeeklyTheme, JournalResponses, SavedEntries } from '../types';
import { generateReflectionSummary } from '../services/geminiService';
import { BrandLogo } from './BrandLogo';
import { exportCompletedJournalToPDF, exportCurrentWeekToPDFWithCanvas } from '../utils/pdfExport';

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
    setIsExporting(true);
    try {
      if (exportMode === 'current') {
        const result = await exportCurrentWeekToPDFWithCanvas({
          entry,
          responses,
          imageUrl,
          summary,
          targetElement: printContentRef.current,
        });

        if (!result.success) {
          alert(result.error || "Failed to export current week PDF.");
        } else {
          onClose();
        }
      } else {
        // Create a merged snapshot of allResponses with current active responses for the current week
        const mergedResponses: SavedEntries = {
          ...allResponses,
          [entry.week]: {
            ...(allResponses[entry.week] || {}),
            ...responses,
          },
        };

        const result = exportCompletedJournalToPDF({
          savedEntries: mergedResponses,
          themes: allThemes,
        });

        if (!result.success) {
          alert("No completed reflection responses found to export for this selection.");
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("Failed to export to PDF", error);
      alert("An error occurred while generating the PDF document. Please try again.");
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
    <div className="no-print fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in border border-[#D4AF37]/40">
        <header className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <BrandLogo size={36} />
            <div>
              <h3 className="font-cinzel text-xl font-bold text-[#1C2A39]">Sacred Steps Print Edition</h3>
              <p className="text-xs text-slate-500">Authored by C. Lamont Patrick • Kya Daisy Publishing</p>
            </div>
            <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-lg ml-4">
              <button 
                onClick={() => setExportMode('current')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${exportMode === 'current' ? 'bg-[#1C2A39] text-[#D4AF37] shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
              >
                Week {entry.week} Only
              </button>
              <button 
                onClick={() => setExportMode('full')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${exportMode === 'full' ? 'bg-[#1C2A39] text-[#D4AF37] shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
              >
                Full Journal ({printableThemes.length} active)
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition-colors p-2" aria-label="Close print preview" disabled={isExporting}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div ref={printContentRef} className="p-8 overflow-y-auto bg-[#F9F6F0] text-[#2B2B2B]">
          {/* Header Banner on Printed Page */}
          <div className="text-center pb-6 mb-8 border-b-2 border-[#D4AF37]/50">
            <div className="inline-block border border-[#D4AF37] px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest text-[#1C2A39] font-bold mb-2">
              Version 1.0 • 2026 Edition
            </div>
            <h1 className="font-cinzel text-3xl md:text-4xl font-extrabold text-[#1C2A39] tracking-wider">
              SACRED STEPS TO REDEMPTION: THE YEAR OF GRACE
            </h1>
            <p className="font-serif italic text-lg text-slate-700 mt-1">
              A 52-Week Recovery Journal of Reflection, Gratitude &amp; Prayer
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Authored by C. Lamont Patrick • Published by Kya Daisy Publishing (Copyright © 2025)
            </p>
            <p className="text-xs text-[#D4AF37] font-serif italic mt-1 font-semibold">
              &ldquo;A Path to Recovery, A Life in Grace.&rdquo; • &ldquo;Sustained Walking, Daily Freedom.&rdquo;
            </p>
          </div>

          <div className="space-y-12">
            {printableThemes.map((t) => {
              const resp = exportMode === 'current' ? responses : (allResponses[t.week] || {});
              const img = exportMode === 'current' ? imageUrl : (allImages[t.week] || null);
              
              return (
                <div key={t.week} className="space-y-6 page-break-after-always bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <header className="text-center p-6 border-t-4 border-[#D4AF37] rounded-lg bg-slate-50/50">
                    <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-[#1C2A39]">{`Week ${t.week}: ${t.theme}`}</h2>
                    <p className="mt-2 text-slate-600 font-sans">{t.explanation}</p>
                    {img && (
                      <div className="mt-4">
                        <img src={img} alt={`Reflective art for ${t.theme}`} referrerPolicy="no-referrer" className="w-full max-w-md mx-auto rounded-lg shadow-md border border-[#D4AF37]/30" />
                      </div>
                    )}
                    {t.imagePrompt && (
                      <p className="mt-2 text-xs text-slate-500 italic max-w-xl mx-auto">
                        Visual Meditation: &ldquo;{t.imagePrompt}&rdquo;
                      </p>
                    )}
                  </header>
                  
                  {exportMode === 'current' && (
                    <div className="border border-slate-200 rounded-lg p-6 bg-amber-50/30">
                        <h3 className="font-cinzel text-lg font-semibold text-[#1C2A39] mb-3">AI Reflection Summary</h3>
                        {summary ? (
                            <p className="whitespace-pre-wrap text-slate-800 italic font-serif leading-relaxed">{summary}</p>
                        ) : (
                            <div className="no-print">
                                <p className="text-sm text-slate-600 mb-4">Generate a summary of your reflections for this week to get a condensed view of your thoughts and feelings.</p>
                                <button 
                                    onClick={handleGenerateSummary} 
                                    disabled={isGeneratingSummary} 
                                    className="flex items-center justify-center px-4 py-2 bg-[#1C2A39] text-[#D4AF37] font-semibold rounded-md hover:bg-[#1C2A39]/90 focus:outline-none focus:ring-2 ring-[#D4AF37] transition-all disabled:opacity-50"
                                >
                                    {isGeneratingSummary ? 'Generating...' : 'Generate Reflection Summary'}
                                </button>
                                {summaryError && <p className="text-red-600 text-sm mt-2">Error: {summaryError}</p>}
                            </div>
                        )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                      <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50">
                          <h3 className="font-cinzel text-base font-semibold text-[#1C2A39] mb-3">Scripture Anchor (NIV)</h3>
                          <blockquote className="border-l-4 border-[#D4AF37] pl-4">
                              <p className="font-serif italic text-lg text-slate-800">"{t.bibleVerseText}"</p>
                              <cite className="block text-right mt-2 not-italic text-slate-600 font-semibold">{t.bibleVerse}</cite>
                          </blockquote>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50">
                          <h3 className="font-cinzel text-base font-semibold text-[#1C2A39] mb-3">Inspirational Quote</h3>
                          <blockquote className="border-l-4 border-[#7A8B7B] pl-4">
                              <p className="font-serif italic text-lg text-slate-800">"{t.quote.text}"</p>
                              <cite className="block text-right mt-2 not-italic text-slate-600 font-medium">&ndash; {t.quote.author}</cite>
                          </blockquote>
                      </div>
                  </div>

                  {t.songTitle && (
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Weekly Worship Series Song</span>
                        <h4 className="font-cinzel text-base font-bold text-[#1C2A39]">{t.songTitle}</h4>
                        <p className="text-xs text-slate-600">
                          {t.songArtist ? `Artist: ${t.songArtist}` : ''} {t.songGenre ? `• Genre: ${t.songGenre}` : ''}
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded bg-[#1C2A39] text-[#D4AF37] font-semibold">
                        Week {t.week} Song
                      </span>
                    </div>
                  )}
                  
                  <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="font-cinzel text-lg font-semibold text-[#1C2A39] mb-3">Biblical Aspiration & Personal Goal</h3>
                      <p className="font-serif italic text-lg text-slate-700 mb-4">{t.biblicalAspiration}</p>
                      {resp.personalGoal && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                              <p className="text-sm font-semibold text-[#1C2A39] mb-1">Your Personal Goal:</p>
                              <p className="whitespace-pre-wrap text-slate-800 font-sans">{resp.personalGoal}</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="font-cinzel text-lg font-semibold text-[#1C2A39] mb-3">Weekly Prompt Response</h3>
                    <p className="text-base text-slate-700 mb-3 italic">{t.prompt}</p>
                    <div className="bg-[#F9F6F0] p-4 rounded-md border border-slate-200">
                      <p className="whitespace-pre-wrap text-slate-800">{resp.promptResponse || 'No response entered.'}</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-6">
                      <h3 className="font-cinzel text-lg font-semibold text-[#1C2A39] mb-3">Reflection Questions</h3>
                      <div className="space-y-4">
                          <div>
                              <p className="font-medium text-slate-800 mb-2">{t.reflectionQuestion1}</p>
                              <div className="bg-[#F9F6F0] p-4 rounded-md border border-slate-200">
                                  <p className="whitespace-pre-wrap text-slate-800">{resp.reflection1Response || 'No response entered.'}</p>
                              </div>
                          </div>
                          <div>
                              <p className="font-medium text-slate-800 mb-2">{t.reflectionQuestion2}</p>
                              <div className="bg-[#F9F6F0] p-4 rounded-md border border-slate-200">
                                  <p className="whitespace-pre-wrap text-slate-800">{resp.reflection2Response || 'No response entered.'}</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50">
                      <h3 className="font-cinzel text-lg font-semibold text-[#1C2A39] mb-3">Weekly Prayer</h3>
                      <p className="font-serif italic text-lg leading-relaxed text-slate-800 whitespace-pre-wrap">{t.prayer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex items-center justify-between p-4 border-t space-x-4 bg-slate-50 rounded-b-lg">
          <div className="text-xs text-slate-500 font-medium">
            Sacred Steps to Redemption (2026 Edition)
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={onClose} disabled={isExporting} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
              Cancel
            </button>
            <button onClick={handleExportPDF} disabled={isExporting} className="px-4 py-2 bg-[#7A8B7B] text-white rounded-md hover:bg-[#6c7d6d] flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7A8B7B] transition-colors disabled:opacity-50 disabled:cursor-wait text-sm font-semibold shadow-sm">
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
                  Export PDF
                </>
              )}
            </button>
            <button onClick={handlePrint} disabled={isExporting} className="px-5 py-2 bg-[#1C2A39] text-[#D4AF37] rounded-md hover:bg-[#1C2A39]/90 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 ring-[#D4AF37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm">
              <PrinterIcon />
              Print Entry
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
