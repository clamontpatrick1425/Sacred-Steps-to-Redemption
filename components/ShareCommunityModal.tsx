import React, { useState, useMemo, useEffect } from 'react';
import type { WeeklyTheme, JournalResponses } from '../types';
import {
  canUseWebShare,
  buildSharePayload,
  executeWebShare,
  getSocialShareLinks,
  copyShareTextToClipboard,
  ShareContentType,
} from '../utils/shareUtils';

interface ShareCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: WeeklyTheme;
  responses: Partial<JournalResponses>;
  initialContentType?: ShareContentType;
  user?: { name?: string; email?: string } | null;
  customPrayer?: string | null;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

// Visual Icons
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XSocialIcon = () => (
  <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.301-.15-1.778-.877-2.054-.977-.275-.1-.476-.15-.676.15-.201.3-.777.977-.952 1.177-.176.201-.351.226-.652.075-.3-.15-1.267-.467-2.414-1.489-.893-.796-1.496-1.78-1.672-2.08-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.201-.301.301-.501.101-.2.05-.376-.025-.526-.075-.15-.677-1.632-.927-2.234-.244-.587-.492-.507-.677-.517-.175-.01-.376-.01-.577-.01-.201 0-.527.075-.802.376-.276.301-1.054 1.03-1.054 2.511 0 1.482 1.079 2.912 1.23 3.113.15.201 2.122 3.24 5.141 4.543.719.31 1.28.496 1.718.636.723.23 1.381.197 1.901.12.58-.087 1.778-.727 2.029-1.43.25-.702.25-1.304.175-1.43-.075-.126-.276-.201-.577-.351zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.662 1.438 5.176L2 22l4.982-1.408A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.635 0-3.15-.494-4.417-1.344l-.317-.214-2.957.835.845-2.883-.235-.337A8.125 8.125 0 013.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.6a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export const ShareCommunityModal: React.FC<ShareCommunityModalProps> = ({
  isOpen,
  onClose,
  entry,
  responses,
  initialContentType = 'summary',
  user,
  customPrayer,
  onShowToast,
}) => {
  const [selectedType, setSelectedType] = useState<ShareContentType>(initialContentType);
  const [includeScripture, setIncludeScripture] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeAppUrl, setIncludeAppUrl] = useState(true);
  const [authorName, setAuthorName] = useState<string>(user?.name || '');
  const [includeAuthor, setIncludeAuthor] = useState<boolean>(!!user?.name);
  const [customText, setCustomText] = useState<string>('');
  const [isEditingManually, setIsEditingManually] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync initialContentType when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType(initialContentType);
      setIsEditingManually(false);
      setCopied(false);
    }
  }, [isOpen, initialContentType]);

  // Compute generated payload
  const autoPayload = useMemo(() => {
    return buildSharePayload({
      contentType: selectedType,
      entry,
      responses,
      includeScripture,
      includeHashtags,
      includeAppUrl,
      authorName: includeAuthor ? authorName : null,
      customPrayer,
    });
  }, [
    selectedType,
    entry,
    responses,
    includeScripture,
    includeHashtags,
    includeAppUrl,
    includeAuthor,
    authorName,
    customPrayer,
  ]);

  // If not manually editing, keep customText in sync with autoPayload
  useEffect(() => {
    if (!isEditingManually) {
      setCustomText(autoPayload.text);
    }
  }, [autoPayload.text, isEditingManually]);

  const activeText = isEditingManually ? customText : autoPayload.text;
  const activePayload = useMemo(() => ({
    title: autoPayload.title,
    text: activeText,
    url: autoPayload.url,
  }), [autoPayload.title, autoPayload.url, activeText]);

  const socialLinks = useMemo(() => getSocialShareLinks(activePayload), [activePayload]);
  const webShareSupported = canUseWebShare();

  if (!isOpen) return null;

  // Handle native Web Share API
  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      const res = await executeWebShare(activePayload);
      if (res.success) {
        onShowToast('Shared successfully to your selected app!', 'success');
        onClose();
      } else if (res.cancelled) {
        // User closed the share sheet without selecting an app - benign
      } else {
        onShowToast(res.error || 'Failed to open device share dialog.', 'error');
      }
    } catch (err) {
      console.error('Web share execution error:', err);
      onShowToast('Failed to trigger native share.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    const success = await copyShareTextToClipboard(activeText);
    if (success) {
      setCopied(true);
      onShowToast('Reflection copied to clipboard! Ready to paste.', 'success');
      setTimeout(() => setCopied(false), 3000);
    } else {
      onShowToast('Could not copy to clipboard. Please copy manually.', 'error');
    }
  };

  const charCount = activeText.length;
  const isXFriendly = charCount <= 280;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-card text-main rounded-2xl shadow-2xl border border-default w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-default flex items-center justify-between bg-card-secondary/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#1C2A39] text-[#D4AF37] rounded-xl shadow-sm">
              <ShareIcon />
            </div>
            <div>
              <h3 id="share-modal-title" className="text-lg font-bold text-main">
                Share to Community & Socials
              </h3>
              <p className="text-xs text-muted">
                Week {entry.week}: {entry.theme}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-subtle hover:text-main p-2 rounded-lg hover:bg-card-secondary transition-colors"
            aria-label="Close share dialog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Content Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Choose What to Share
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setSelectedType('summary'); setIsEditingManually(false); }}
                className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                  selectedType === 'summary'
                    ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                    : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                }`}
              >
                <span className="font-semibold text-xs">🌿 Full Summary</span>
                <span className="text-[10px] opacity-75 truncate">Theme & response</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedType('prompt'); setIsEditingManually(false); }}
                className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                  selectedType === 'prompt'
                    ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                    : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                }`}
              >
                <span className="font-semibold text-xs">📌 Weekly Prompt</span>
                <span className="text-[10px] opacity-75 truncate">Main reflection</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedType('reflection1'); setIsEditingManually(false); }}
                className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                  selectedType === 'reflection1'
                    ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                    : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                }`}
              >
                <span className="font-semibold text-xs">❓ Reflection 1</span>
                <span className="text-[10px] opacity-75 truncate">Question & answer</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedType('reflection2'); setIsEditingManually(false); }}
                className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                  selectedType === 'reflection2'
                    ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                    : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                }`}
              >
                <span className="font-semibold text-xs">❓ Reflection 2</span>
                <span className="text-[10px] opacity-75 truncate">Question & answer</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedType('prayer'); setIsEditingManually(false); }}
                className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                  selectedType === 'prayer'
                    ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                    : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                }`}
              >
                <span className="font-semibold text-xs">🙏 Weekly Prayer</span>
                <span className="text-[10px] opacity-75 truncate">Spiritual petition</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedType('scripture'); setIsEditingManually(false); }}
                className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                  selectedType === 'scripture'
                    ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                    : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                }`}
              >
                <span className="font-semibold text-xs">📖 Scripture Verse</span>
                <span className="text-[10px] opacity-75 truncate">{entry.bibleVerse}</span>
              </button>

              {responses.personalGoal && responses.personalGoal.trim() && (
                <button
                  type="button"
                  onClick={() => { setSelectedType('goal'); setIsEditingManually(false); }}
                  className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                    selectedType === 'goal'
                      ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                      : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                  }`}
                >
                  <span className="font-semibold text-xs">🎯 Personal Goal</span>
                  <span className="text-[10px] opacity-75 truncate">Commitment</span>
                </button>
              )}

              {responses.deeperReflectionResponse && responses.deeperReflectionResponse.trim() && (
                <button
                  type="button"
                  onClick={() => { setSelectedType('deeper'); setIsEditingManually(false); }}
                  className={`px-3 py-2 rounded-lg border font-medium transition-all text-left flex flex-col justify-center ${
                    selectedType === 'deeper'
                      ? 'bg-[#1C2A39] text-[#D4AF37] border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]'
                      : 'bg-card border-default text-muted hover:border-primary hover:text-main'
                  }`}
                >
                  <span className="font-semibold text-xs">🌊 Deeper Insight</span>
                  <span className="text-[10px] opacity-75 truncate">Deep reflection</span>
                </button>
              )}
            </div>
          </div>

          {/* Customization Options */}
          <div className="bg-card-secondary/60 rounded-xl p-3.5 border border-default/60 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-semibold text-main">Share Options:</span>

              <div className="flex items-center space-x-4 flex-wrap gap-y-1.5">
                {selectedType !== 'scripture' && (
                  <label className="flex items-center space-x-1.5 cursor-pointer text-muted hover:text-main select-none">
                    <input
                      type="checkbox"
                      checked={includeScripture}
                      onChange={(e) => { setIncludeScripture(e.target.checked); setIsEditingManually(false); }}
                      className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>Bible Verse</span>
                  </label>
                )}

                <label className="flex items-center space-x-1.5 cursor-pointer text-muted hover:text-main select-none">
                  <input
                    type="checkbox"
                    checked={includeHashtags}
                    onChange={(e) => { setIncludeHashtags(e.target.checked); setIsEditingManually(false); }}
                    className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Hashtags</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-muted hover:text-main select-none">
                  <input
                    type="checkbox"
                    checked={includeAppUrl}
                    onChange={(e) => { setIncludeAppUrl(e.target.checked); setIsEditingManually(false); }}
                    className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>App Link</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-muted hover:text-main select-none">
                  <input
                    type="checkbox"
                    checked={includeAuthor}
                    onChange={(e) => { setIncludeAuthor(e.target.checked); setIsEditingManually(false); }}
                    className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Include Name</span>
                </label>
              </div>
            </div>

            {includeAuthor && (
              <div className="pt-2 border-t border-default/40 flex items-center gap-2">
                <span className="text-xs text-muted whitespace-nowrap">Your Name/Handle:</span>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => { setAuthorName(e.target.value); setIsEditingManually(false); }}
                  placeholder="e.g. Lamont P. or Fellow Pilgrim"
                  className="flex-1 px-2.5 py-1 text-xs border border-input rounded-md bg-card text-main focus:ring-primary focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Formatted Preview and Editing */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <label htmlFor="share-preview-textarea" className="text-xs font-bold uppercase tracking-wider text-muted">
                  Share Preview (Editable)
                </label>
                {isEditingManually && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                    Modified
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    isXFriendly
                      ? 'bg-emerald-500/10 text-emerald-600 font-medium'
                      : 'bg-muted/10 text-muted'
                  }`}
                  title={isXFriendly ? 'Within X (Twitter) 280-char limit' : `${charCount} characters`}
                >
                  {charCount} chars {isXFriendly ? '✓ X-ready' : ''}
                </span>

                {isEditingManually && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingManually(false);
                      setCustomText(autoPayload.text);
                    }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <textarea
              id="share-preview-textarea"
              rows={6}
              value={activeText}
              onChange={(e) => {
                setIsEditingManually(true);
                setCustomText(e.target.value);
              }}
              className="w-full p-3 font-sans text-xs sm:text-sm leading-relaxed border border-input rounded-xl shadow-inner focus:ring-2 focus:ring-primary focus:border-primary bg-card-secondary hover:bg-card transition-colors text-main resize-y"
              placeholder="Your share message will appear here..."
            />
          </div>

          {/* Community Uplift Message */}
          <div className="p-3 bg-[#FDFBF7] dark:bg-[#1A222C] rounded-xl border border-[#F1E5D1] dark:border-[#2D3B4A] flex items-start space-x-3 text-xs text-muted">
            <span className="text-base leading-none mt-0.5">🕊️</span>
            <div>
              <span className="font-semibold text-main">Community Encouragement:</span>{' '}
              Sharing your weekly reflections and authentic recovery steps encourages fellow pilgrims walking this path.
            </div>
          </div>
        </div>

        {/* Footer with Primary Web Share API and Fallbacks */}
        <div className="p-4 sm:p-5 border-t border-default bg-card-secondary/60 flex flex-col gap-3">
          {/* Native Web Share API (Primary Action) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={handleNativeShare}
              disabled={isSharing}
              className="flex-1 py-2.5 px-4 bg-[#1C2A39] text-[#D4AF37] hover:bg-[#16222e] rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 border border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-50"
              title={webShareSupported ? "Open device native share dialog (Apps, Messages, Socials)" : "Share directly to your device"}
            >
              {isSharing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#D4AF37]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <ShareIcon />
                  <span>{webShareSupported ? 'Share to Device (Native Share Sheet)' : 'Share via Device Sheet'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="py-2.5 px-4 bg-card text-main hover:bg-card-secondary rounded-xl font-semibold text-sm border border-default shadow-sm transition-all flex items-center justify-center"
              title="Copy formatted text to clipboard"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>

          {/* Social Platforms Direct Fallback */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-default/40">
            <span className="text-[11px] font-medium text-subtle">Or export directly to:</span>
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-black text-white hover:bg-zinc-800 transition-colors"
                title="Post to X (Twitter)"
              >
                <XSocialIcon />
                <span>X</span>
              </a>

              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#25D366] text-white hover:bg-[#1EBE5D] transition-colors"
                title="Share on WhatsApp"
              >
                <WhatsAppIcon />
                <span>WhatsApp</span>
              </a>

              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1877F2] text-white hover:bg-[#166fe5] transition-colors"
                title="Share on Facebook"
              >
                <FacebookIcon />
                <span>Facebook</span>
              </a>

              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#0A66C2] text-white hover:bg-[#095196] transition-colors"
                title="Share on LinkedIn"
              >
                <LinkedInIcon />
                <span>LinkedIn</span>
              </a>

              <a
                href={socialLinks.email}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card text-muted hover:text-main hover:bg-card-secondary border border-default transition-colors"
                title="Share via Email"
              >
                <MailIcon />
                <span>Email</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
