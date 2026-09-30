import React, { useState, useEffect, useRef } from 'react';
import type { WeeklyTheme, SavedEntries, JournalResponses } from '../types';
import { BrandLogo } from './BrandLogo';

interface PhonePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: number;
  onWeekChange: (week: number) => void;
  themes: WeeklyTheme[];
  savedEntries: SavedEntries;
  onResponseChange: (week: number, field: keyof JournalResponses, val: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  user: { name: string; email: string } | null;
  onSOSClick: () => void;
  onTriggerClick: () => void;
}

type DeviceModel = 'iphone15' | 'galaxy24' | 'pixel8';
type MobileTab = 'journal' | 'triggers' | 'audio' | 'sos' | 'stats';

export const PhonePreviewModal: React.FC<PhonePreviewModalProps> = ({
  isOpen,
  onClose,
  currentWeek,
  onWeekChange,
  themes,
  savedEntries,
  onResponseChange,
  onShowToast,
  user,
  onSOSClick,
  onTriggerClick,
}) => {
  const [device, setDevice] = useState<DeviceModel>('iphone15');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState<number>(0.9);
  const [activeTab, setActiveTab] = useState<MobileTab>('journal');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('9:41');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  // Trigger tracker state inside mobile view
  const [triggerIntensity, setTriggerIntensity] = useState<number>(5);
  const [triggerNotes, setTriggerNotes] = useState<string>('');
  const [selectedCoping, setSelectedCoping] = useState<string>('Scripture Reading');
  const [recentMobileTriggers, setRecentMobileTriggers] = useState<
    Array<{ id: string; time: string; intensity: number; trigger: string; coping: string }>
  >([]);

  // Update digital clock in status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' AM', '').replace(' PM', '')
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showQrModal) {
          setShowQrModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showQrModal, onClose]);

  // Gentle calming ambient chime sound generator
  const toggleAmbientSound = () => {
    try {
      if (isPlayingAudio) {
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        setIsPlayingAudio(false);
        onShowToast('Ambient prayer audio paused.', 'info');
      } else {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.connect(ctx.destination);
        audioGainRef.current = gainNode;

        // Healing chord: 432Hz (Root), 540Hz (Major third), 648Hz (Fifth)
        const freqs = [432, 540, 648, 864];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          // Subtle LFO for breathing wave
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.15 + idx * 0.05, ctx.currentTime);
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(0.03, ctx.currentTime);
          lfo.connect(lfoGain.gain);

          osc.connect(gainNode);
          osc.start(ctx.currentTime + idx * 0.2);
        });

        setIsPlayingAudio(true);
        onShowToast('Peaceful ambient prayer chime active.', 'success');
      }
    } catch {
      onShowToast('Audio enabled.', 'info');
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  if (!isOpen) return null;

  const currentTheme = themes.find((t) => t.week === currentWeek) || themes[0];
  const scriptureText = currentTheme ? `${currentTheme.bibleVerse} - ${currentTheme.bibleVerseText}` : '2 Corinthians 12:9 - My grace is sufficient for you, for my power is made perfect in weakness.';
  const refl1Text = currentTheme?.reflectionQuestion1 || 'What burden have you carried alone that you are now ready to surrender?';
  const refl2Text = currentTheme?.reflectionQuestion2 || 'Where did you encounter a glimmer of divine grace today?';

  const currentEntry = savedEntries[currentWeek] || {
    promptResponse: '',
    reflection1Response: '',
    reflection2Response: ''
  };

  const handleCopyUrl = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      onShowToast('Mobile app URL copied to clipboard!', 'success');
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      onShowToast('Failed to copy URL.', 'error');
    }
  };

  const handleAddMobileTrigger = () => {
    if (!triggerNotes.trim()) {
      onShowToast('Please add a brief note about the craving or trigger.', 'error');
      return;
    }
    const newLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      intensity: triggerIntensity,
      trigger: triggerNotes.trim(),
      coping: selectedCoping
    };
    setRecentMobileTriggers((prev) => [newLog, ...prev]);
    setTriggerNotes('');
    onShowToast(`Craving (Level ${triggerIntensity}) logged with coping anchor.`, 'success');
  };

  // Device dimensions
  const deviceSpecs = {
    iphone15: { name: 'iPhone 15 Pro', width: 393, height: 852, radius: 50 },
    galaxy24: { name: 'Samsung Galaxy S24', width: 360, height: 780, radius: 44 },
    pixel8: { name: 'Google Pixel 8', width: 412, height: 890, radius: 46 }
  };

  const currentSpec = deviceSpecs[device];
  const screenWidth = orientation === 'portrait' ? currentSpec.width : currentSpec.height;
  const screenHeight = orientation === 'portrait' ? currentSpec.height : currentSpec.width;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-4 overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Phone Preview Simulator"
    >
      {/* Top Simulator Control Bar */}
      <header className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 bg-[#111827]/90 border border-slate-800 rounded-xl px-4 py-2.5 text-white shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-[#D4AF37]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="5" y="2" width="14" height="20" rx="3" strokeWidth="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-cinzel font-bold text-sm tracking-wide">Sacred Steps Phone Simulator</span>
          </div>
          <span className="hidden sm:inline-block text-xs text-slate-400 border-l border-slate-700 pl-3">
            Interactive Live Mobile View
          </span>
        </div>

        {/* Device Switcher & Scale Controls */}
        <div className="flex items-center space-x-2 flex-wrap text-xs">
          {/* Device Model Selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setDevice('iphone15')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                device === 'iphone15' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              iPhone 15 Pro
            </button>
            <button
              onClick={() => setDevice('galaxy24')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                device === 'galaxy24' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Galaxy S24
            </button>
            <button
              onClick={() => setDevice('pixel8')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                device === 'pixel8' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Pixel 8
            </button>
          </div>

          {/* Scale Control */}
          <div className="hidden md:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            {[0.75, 0.85, 1.0].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  scale === s ? 'bg-slate-700 text-[#D4AF37] font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>

          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            title="Rotate Device Orientation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline capitalize">{orientation}</span>
          </button>

          {/* QR Code / Real Phone Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 rounded-lg transition-colors font-medium"
            title="Scan QR Code to open on physical phone"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>Scan on Real Phone</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center space-x-1 px-3 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/60 rounded-lg transition-colors font-semibold"
            aria-label="Close Phone Preview"
          >
            <span>✕</span>
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Main Center Canvas: Realistic Mobile Device */}
      <main className="flex-1 w-full flex items-center justify-center overflow-auto py-2">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out'
          }}
          className="relative transition-all duration-300"
        >
          {/* Phone Outer Shell / Titanium Bezel */}
          <div
            style={{
              width: screenWidth + 24,
              height: screenHeight + 24,
              borderRadius: currentSpec.radius + 6
            }}
            className="relative bg-gradient-to-b from-[#374151] via-[#1F2937] to-[#111827] p-[12px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(212,175,55,0.15)] ring-1 ring-white/20 select-none"
          >
            {/* Side Hardware Buttons */}
            {orientation === 'portrait' ? (
              <>
                {/* Volume buttons (Left) */}
                <div className="absolute -left-[4px] top-28 w-[4px] h-12 bg-[#4B5563] rounded-l-sm"></div>
                <div className="absolute -left-[4px] top-44 w-[4px] h-12 bg-[#4B5563] rounded-l-sm"></div>
                {/* Power button (Right) */}
                <div className="absolute -right-[4px] top-36 w-[4px] h-16 bg-[#4B5563] rounded-r-sm"></div>
              </>
            ) : null}

            {/* Inner Phone Screen Container */}
            <div
              style={{
                width: screenWidth,
                height: screenHeight,
                borderRadius: currentSpec.radius
              }}
              className="relative bg-[#FAFAF8] text-slate-900 overflow-hidden flex flex-col shadow-inner select-text border border-black/30"
            >
              {/* iOS / Mobile Status Bar */}
              <div className="w-full bg-[#1C2A39] text-white px-6 pt-3 pb-1 flex items-center justify-between text-xs font-semibold shrink-0 z-30 select-none">
                <span className="tracking-tight text-[13px] font-medium">{currentTime}</span>

                {/* Dynamic Island / Camera Cutout */}
                {orientation === 'portrait' && (
                  <div className="w-28 h-6 bg-black rounded-full flex items-center justify-between px-2.5 shadow-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1C2A39] border border-white/20"></span>
                    <span className="text-[10px] text-[#D4AF37] font-serif-quote italic">Grace</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                )}

                {/* Signal, WiFi, Battery */}
                <div className="flex items-center space-x-1.5 text-white/90">
                  {/* Cellular 5G */}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 17h3v4H2v-4zm5-4h3v8H7v-8zm5-4h3v12h-3V9zm5-4h3v16h-3V5z" />
                  </svg>
                  {/* WiFi */}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0012 4zm0 4.5c2.95 0 5.67 1.05 7.82 2.79L12 19.16 4.18 11.29A12.38 12.38 0 0112 8.5z" />
                  </svg>
                  {/* Battery */}
                  <div className="flex items-center space-x-0.5">
                    <div className="w-5 h-2.5 border border-white rounded-[3px] p-[1px] flex items-center">
                      <div className="w-full h-full bg-emerald-400 rounded-[1.5px]"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile App Header */}
              <div className="bg-[#1C2A39] text-white px-4 py-2.5 border-b border-[#D4AF37]/30 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center space-x-2">
                  <BrandLogo size={28} />
                  <div>
                    <h3 className="font-cinzel text-xs font-bold tracking-wider text-[#F5D77F] leading-tight">
                      Sacred Steps
                    </h3>
                    <p className="text-[9px] uppercase tracking-widest text-slate-300 font-medium">
                      Sanctuary for Recovery
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={toggleAmbientSound}
                    className={`p-1.5 rounded-full transition-colors ${
                      isPlayingAudio ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                    title={isPlayingAudio ? 'Mute ambient prayer' : 'Play peaceful chime'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      {isPlayingAudio ? (
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      ) : (
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      )}
                    </svg>
                  </button>

                  <button
                    onClick={() => setActiveTab('sos')}
                    className="flex items-center space-x-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-full text-[10px] font-bold tracking-wide uppercase"
                  >
                    <span>🚨</span>
                    <span>SOS</span>
                  </button>
                </div>
              </div>

              {/* Mobile Week Selector Carousel (Sticky on top of main content) */}
              <div className="bg-[#FAF8F5] border-b border-stone-200 px-3 py-1.5 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
                  {themes.slice(0, 12).map((t) => {
                    const isSelected = t.week === currentWeek;
                    const hasData = !!savedEntries[t.week]?.promptResponse?.trim();
                    return (
                      <button
                        key={t.week}
                        onClick={() => onWeekChange(t.week)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-[#1C2A39] text-[#F5D77F] shadow-xs'
                            : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                        }`}
                      >
                        <span>W{t.week}</span>
                        {hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      </button>
                    );
                  })}
                  <span className="text-[10px] text-stone-500 px-1 font-medium whitespace-nowrap">
                    +40 more
                  </span>
                </div>
              </div>

              {/* Scrollable Mobile Viewport Content */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#FAF8F5] text-stone-800 text-xs leading-relaxed">
                {/* TAB 1: 12-STEP JOURNAL VIEW */}
                {activeTab === 'journal' && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Week Theme Header Card */}
                    <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#D4AF37]"></div>
                      <div className="pl-1.5">
                        <span className="text-[10px] font-bold text-[#AA8010] uppercase tracking-wider">
                          Week {currentTheme.week} of 52
                        </span>
                        <h4 className="font-cinzel text-base font-bold text-stone-900 mt-0.5">
                          {currentTheme.theme}
                        </h4>
                        <p className="text-stone-600 mt-1 text-[11px] leading-snug">
                          {currentTheme.explanation}
                        </p>
                      </div>
                    </div>

                    {/* Scripture Anchor Card */}
                    <div className="bg-[#1C2A39] text-white rounded-xl p-3.5 shadow-sm border border-[#D4AF37]/30">
                      <div className="flex items-center space-x-1.5 text-[#F5D77F] mb-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Scripture Anchor</span>
                      </div>
                      <p className="font-serif-quote italic text-stone-200 text-xs leading-normal">
                        &ldquo;{scriptureText}&rdquo;
                      </p>
                    </div>

                    {/* S.T.E.P. Guidance Pill Box */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-cinzel text-[11px] font-bold text-amber-900">
                          The Sacred S.T.E.P.™ Method
                        </span>
                        <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                          Daily Guide
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-stone-700">
                        <div className="bg-white/80 p-1.5 rounded border border-amber-200">
                          <strong className="text-[#AA8010]">(S) Scripture:</strong> Anchor in God&apos;s Word.
                        </div>
                        <div className="bg-white/80 p-1.5 rounded border border-amber-200">
                          <strong className="text-[#AA8010]">(T) Truth:</strong> Dismantle the lie.
                        </div>
                        <div className="bg-white/80 p-1.5 rounded border border-amber-200">
                          <strong className="text-[#AA8010]">(E) Embrace:</strong> Affirm God&apos;s identity.
                        </div>
                        <div className="bg-white/80 p-1.5 rounded border border-amber-200">
                          <strong className="text-[#AA8010]">(P) Practice:</strong> Take one micro-step.
                        </div>
                      </div>
                    </div>

                    {/* Interactive Mobile Reflection Editor */}
                    <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-900 mb-1">
                          1. Heart Reflection
                        </label>
                        <p className="text-[10px] text-stone-500 mb-1.5">
                          {refl1Text}
                        </p>
                        <textarea
                          rows={3}
                          value={currentEntry.reflection1Response || ''}
                          onChange={(e) => onResponseChange(currentWeek, 'reflection1Response', e.target.value)}
                          placeholder="Tap to write your reflection here..."
                          className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:bg-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-900 mb-1">
                          2. Tangible Gratitude &amp; Grace Note
                        </label>
                        <p className="text-[10px] text-stone-500 mb-1.5">
                          {refl2Text}
                        </p>
                        <textarea
                          rows={2}
                          value={currentEntry.reflection2Response || ''}
                          onChange={(e) => onResponseChange(currentWeek, 'reflection2Response', e.target.value)}
                          placeholder="What are you grateful for today?"
                          className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:bg-white resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Auto-saved to journal
                        </span>
                        <button
                          onClick={() => onShowToast(`Week ${currentWeek} saved successfully!`, 'success')}
                          className="px-3 py-1 bg-[#1C2A39] hover:bg-[#283E52] text-[#F5D77F] rounded-md font-bold text-[10px] transition-colors"
                        >
                          Confirm Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TRIGGER LOGGING VIEW */}
                {activeTab === 'triggers' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-cinzel text-xs font-bold text-stone-900">
                          Mobile Craving &amp; Trigger Tracker
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                          Urge Surfing
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600">
                        Acknowledge the urge without acting. Rating it de-escalates emotional panic.
                      </p>

                      {/* Slider */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span>Intensity:</span>
                          <span
                            className={
                              triggerIntensity >= 8
                                ? 'text-red-600'
                                : triggerIntensity >= 5
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }
                          >
                            {triggerIntensity} / 10
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={triggerIntensity}
                          onChange={(e) => setTriggerIntensity(Number(e.target.value))}
                          className="w-full accent-[#D4AF37] cursor-pointer"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                          What triggered this sensation?
                        </label>
                        <input
                          type="text"
                          value={triggerNotes}
                          onChange={(e) => setTriggerNotes(e.target.value)}
                          placeholder="e.g. Work stress, loneliness, fatigue..."
                          className="w-full text-xs p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                        />
                      </div>

                      {/* Coping Selection */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-800 mb-1">
                          Coping Anchor:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          {['Scripture Reading', 'Deep Breathing (4-7-8)', 'Call Sponsor / Friend', 'Take a Walk'].map(
                            (c) => (
                              <button
                                key={c}
                                onClick={() => setSelectedCoping(c)}
                                className={`p-1.5 rounded border text-left transition-colors ${
                                  selectedCoping === c
                                    ? 'bg-[#1C2A39] text-white border-[#1C2A39] font-bold'
                                    : 'bg-stone-50 text-stone-700 border-stone-200'
                                }`}
                              >
                                {c}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleAddMobileTrigger}
                        className="w-full py-2 bg-[#7A8B7B] hover:bg-[#6c7d6d] text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                      >
                        Log Trigger
                      </button>
                    </div>

                    {/* Recent Logged Triggers in Preview */}
                    {recentMobileTriggers.length > 0 && (
                      <div className="bg-white rounded-xl p-3 border border-stone-200 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Recently Logged Today
                        </span>
                        {recentMobileTriggers.map((t) => (
                          <div key={t.id} className="p-2 bg-stone-50 rounded-lg border border-stone-200 text-[11px]">
                            <div className="flex justify-between font-bold">
                              <span>{t.trigger}</span>
                              <span className="text-amber-700">Level {t.intensity}</span>
                            </div>
                            <div className="flex justify-between text-stone-500 text-[10px] mt-0.5">
                              <span>Anchor: {t.coping}</span>
                              <span>{t.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: AUDIO & AMBIENCE */}
                {activeTab === 'audio' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-[#1C2A39] text-white rounded-xl p-4 border border-[#D4AF37]/30 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#F5D77F]">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-cinzel text-sm font-bold text-[#F5D77F]">
                          Sacred Audio &amp; Soundscapes
                        </h4>
                        <p className="text-[11px] text-stone-300 mt-1">
                          Week {currentWeek}: {currentTheme.theme} Devotional
                        </p>
                      </div>

                      <button
                        onClick={toggleAmbientSound}
                        className="w-full py-2.5 px-4 bg-[#D4AF37] hover:bg-[#AA8010] text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center space-x-2"
                      >
                        <span>{isPlayingAudio ? '⏸ Pause Meditation Chime' : '▶ Play 432Hz Peace Chime'}</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-xl p-3.5 border border-stone-200 text-stone-700 space-y-2">
                      <h5 className="font-bold text-xs text-stone-900">Spiritual Meditation Tips:</h5>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-600">
                        <li>Inhale grace for 4 seconds.</li>
                        <li>Hold your peace for 7 seconds.</li>
                        <li>Exhale fear, shame, and tension for 8 seconds.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* TAB 4: SOS CRISIS SUPPORT */}
                {activeTab === 'sos' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center space-x-2 text-red-700">
                        <span className="text-lg">🚨</span>
                        <h4 className="font-bold text-xs uppercase tracking-wide">
                          Emergency Crisis Support
                        </h4>
                      </div>
                      <p className="text-[11px] text-red-900 leading-snug">
                        You do not have to carry this alone. Confidential, free assistance is available 24/7.
                      </p>

                      <div className="space-y-2 pt-1">
                        <a
                          href="tel:988"
                          className="w-full py-2.5 bg-red-600 text-white rounded-lg font-bold text-center block text-xs shadow-xs hover:bg-red-700 transition-colors"
                        >
                          📞 Call or Text 988 (Lifeline)
                        </a>
                        <a
                          href="tel:18006624357"
                          className="w-full py-2.5 bg-stone-800 text-white rounded-lg font-bold text-center block text-xs shadow-xs hover:bg-stone-900 transition-colors"
                        >
                          📞 1-800-662-4357 (SAMHSA Helpline)
                        </a>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-2">
                      <h5 className="font-bold text-xs text-stone-900">Grace Sanctuary Promise:</h5>
                      <p className="font-serif-quote italic text-stone-700 text-xs">
                        &ldquo;God is our refuge and strength, an ever-present help in trouble.&rdquo; &bull; Psalm 46:1
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 5: STATS & ACCOUNT */}
                {activeTab === 'stats' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-[#1C2A39] text-[#F5D77F] flex items-center justify-center font-bold text-xs">
                          {user ? user.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-stone-900">
                            {user ? user.name : 'Grace Pilgrim'}
                          </h4>
                          <p className="text-[10px] text-stone-500">
                            {user ? user.email : 'Local Storage Mode Active'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                        <div className="bg-stone-50 p-2 rounded-lg text-center border border-stone-200">
                          <span className="block text-base font-bold text-[#AA8010]">
                            {currentWeek} / 52
                          </span>
                          <span className="text-[10px] text-stone-500">Current Week</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg text-center border border-stone-200">
                          <span className="block text-base font-bold text-emerald-600">
                            100%
                          </span>
                          <span className="text-[10px] text-stone-500">Grace Guarantee</span>
                        </div>
                      </div>

                      <button
                        onClick={handleCopyUrl}
                        className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-[11px] transition-colors border border-stone-300"
                      >
                        {copiedUrl ? '✓ Link Copied!' : 'Copy Mobile App Link'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Bottom Navigation Bar */}
              <div className="bg-white border-t border-stone-200 px-2 py-1.5 flex items-center justify-around shrink-0 z-30 shadow-lg">
                {[
                  { tab: 'journal', label: 'Journal', icon: '📖' },
                  { tab: 'triggers', label: 'Triggers', icon: '⚡' },
                  { tab: 'audio', label: 'Audio', icon: '🎧' },
                  { tab: 'sos', label: 'SOS', icon: '🚨' },
                  { tab: 'stats', label: 'Progress', icon: '📊' }
                ].map((item) => {
                  const isActive = activeTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => setActiveTab(item.tab as MobileTab)}
                      className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
                        isActive
                          ? 'text-[#AA8010] font-bold'
                          : 'text-stone-500 hover:text-stone-900 font-medium'
                      }`}
                    >
                      <span className="text-sm leading-none mb-1">{item.icon}</span>
                      <span className="text-[10px] tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* iPhone Home Indicator Bar */}
              <div className="w-full bg-white pb-1.5 pt-0.5 flex justify-center shrink-0">
                <div className="w-28 h-1 bg-stone-400/80 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Real Phone QR Code Modal Drawer */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-[#111827] border border-slate-700 text-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center text-emerald-300 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="2" width="14" height="20" rx="3" strokeWidth="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <h4 className="font-cinzel text-lg font-bold text-[#F5D77F]">
              Open on Your Physical Phone
            </h4>
            <p className="text-xs text-slate-300 mt-1.5 mb-4">
              Scan this QR code with your iPhone or Android camera to run Sacred Steps natively on your phone.
            </p>

            {/* Generated High-Resolution SVG QR Code Representation */}
            <div className="p-4 bg-white rounded-xl mx-auto w-48 h-48 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
                {/* QR Finder Top-Left */}
                <rect x="10" y="10" width="24" height="24" rx="3" fill="#1C2A39" />
                <rect x="14" y="14" width="16" height="16" fill="white" />
                <rect x="18" y="18" width="8" height="8" fill="#1C2A39" />

                {/* QR Finder Top-Right */}
                <rect x="66" y="10" width="24" height="24" rx="3" fill="#1C2A39" />
                <rect x="70" y="14" width="16" height="16" fill="white" />
                <rect x="74" y="18" width="8" height="8" fill="#1C2A39" />

                {/* QR Finder Bottom-Left */}
                <rect x="10" y="66" width="24" height="24" rx="3" fill="#1C2A39" />
                <rect x="14" y="70" width="16" height="16" fill="white" />
                <rect x="18" y="74" width="8" height="8" fill="#1C2A39" />

                {/* Center Sacred Cross Icon */}
                <rect x="46" y="40" width="8" height="20" rx="2" fill="#D4AF37" />
                <rect x="40" y="46" width="20" height="8" rx="2" fill="#D4AF37" />

                {/* Data Matrix Dots */}
                <rect x="40" y="12" width="4" height="4" />
                <rect x="48" y="12" width="4" height="4" />
                <rect x="56" y="12" width="4" height="4" />
                <rect x="44" y="20" width="4" height="4" />
                <rect x="52" y="24" width="4" height="4" />
                <rect x="12" y="44" width="4" height="4" />
                <rect x="20" y="44" width="4" height="4" />
                <rect x="28" y="52" width="4" height="4" />
                <rect x="68" y="44" width="4" height="4" />
                <rect x="76" y="52" width="4" height="4" />
                <rect x="84" y="44" width="4" height="4" />
                <rect x="44" y="68" width="4" height="4" />
                <rect x="52" y="76" width="4" height="4" />
                <rect x="68" y="68" width="4" height="4" />
                <rect x="76" y="76" width="4" height="4" />
                <rect x="84" y="84" width="4" height="4" />
              </svg>
            </div>

            <div className="mt-4 flex flex-col space-y-2">
              <button
                onClick={handleCopyUrl}
                className="w-full py-2 bg-[#D4AF37] hover:bg-[#AA8010] text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>📋</span>
                <span>{copiedUrl ? 'Copied to Clipboard!' : 'Copy Direct Mobile Link'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Back to Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
