import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { WeeklyTheme, SavedEntries, JournalResponses } from '../types';
import { BrandLogo } from './BrandLogo';
import { MASTER_TRACKS, type MasterTrackInfo } from '../constants/masterTracks';
import { AudioRecorderButton } from './AudioRecorderButton';

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

type DeviceCategory = 'phone' | 'tablet';
type DeviceModel = 'iphone15' | 'galaxy24' | 'pixel8' | 'ipadAir' | 'galaxyTab';
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
}) => {
  const [device, setDevice] = useState<DeviceModel>('ipadAir');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState<number>(0.65);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<MobileTab>('journal');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('9:41');

  // Real soundtrack audio player state (plays studio master recording, never synthetic tones)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [trackCurrentTime, setTrackCurrentTime] = useState<number>(0);
  const masterTrack: MasterTrackInfo | undefined = MASTER_TRACKS[Number(currentWeek)] || MASTER_TRACKS[currentWeek];
  const soundtrackUrl = masterTrack ? masterTrack.audioUrl : `/audio/week_${currentWeek}.mp3`;
  const [trackDuration, setTrackDuration] = useState<number>(() => (masterTrack ? masterTrack.duration : 212));
  const [trackVolume, setTrackVolume] = useState<number>(0.85);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Trigger tracker state inside preview view
  const [triggerIntensity, setTriggerIntensity] = useState<number>(5);
  const [triggerNotes, setTriggerNotes] = useState<string>('');
  const [selectedCoping, setSelectedCoping] = useState<string>('Scripture Reading');
  const [recentMobileTriggers, setRecentMobileTriggers] = useState<
    Array<{ id: string; time: string; intensity: number; trigger: string; coping: string }>
  >([]);

  // Device dimensions & profiles (realistic CSS viewports)
  const deviceSpecs: Record<DeviceModel, { name: string; category: DeviceCategory; width: number; height: number; radius: number }> = useMemo(() => ({
    iphone15: { name: 'iPhone 15 Pro', category: 'phone', width: 393, height: 852, radius: 48 },
    galaxy24: { name: 'Galaxy S24', category: 'phone', width: 360, height: 780, radius: 42 },
    pixel8: { name: 'Pixel 8', category: 'phone', width: 412, height: 890, radius: 44 },
    ipadAir: { name: 'iPad Air 11"', category: 'tablet', width: 820, height: 1060, radius: 32 },
    galaxyTab: { name: 'Galaxy Tab S9', category: 'tablet', width: 800, height: 1140, radius: 28 },
  }), []);

  const currentSpec = deviceSpecs[device];
  const isTablet = currentSpec.category === 'tablet';
  const screenWidth = orientation === 'portrait' ? currentSpec.width : currentSpec.height;
  const screenHeight = orientation === 'portrait' ? currentSpec.height : currentSpec.width;
  const bezelWidth = isTablet ? 28 : 22;
  const totalDeviceWidth = screenWidth + bezelWidth;
  const totalDeviceHeight = screenHeight + bezelWidth;

  // Auto-calculate optimal fit scale based on window size and selected device
  useEffect(() => {
    if (!isAutoFit) return;

    const updateFitScale = () => {
      // Calculate available height: innerHeight minus top simulator header (approx 75px) minus safety padding (40px)
      const availH = Math.max(window.innerHeight - 115, 340);
      const availW = Math.max(window.innerWidth - 48, 300);

      const devW = (orientation === 'portrait' ? currentSpec.width : currentSpec.height) + (isTablet ? 28 : 22);
      const devH = (orientation === 'portrait' ? currentSpec.height : currentSpec.width) + (isTablet ? 28 : 22);

      const scaleH = availH / devH;
      const scaleW = availW / devW;
      const calculated = Math.min(scaleH, scaleW, isTablet ? 0.75 : 0.95);
      const cleanScale = Math.max(Math.round(calculated * 100) / 100, 0.38);
      setScale(cleanScale);
    };

    updateFitScale();
    window.addEventListener('resize', updateFitScale);
    return () => window.removeEventListener('resize', updateFitScale);
  }, [device, orientation, isAutoFit, currentSpec, isTablet]);

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

  // Sync audio source when week changes
  useEffect(() => {
    setIsPlayingAudio(false);
    setTrackCurrentTime(0);
    const t = MASTER_TRACKS[Number(currentWeek)] || MASTER_TRACKS[currentWeek];
    setTrackDuration(t ? t.duration : 212);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = soundtrackUrl;
      audioRef.current.load();
    }
  }, [currentWeek, soundtrackUrl]);

  // Clean up audio on unmount or modal close
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  }, [isOpen]);

  const toggleSoundtrackAudio = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
        onShowToast('Devotional soundtrack paused.', 'info');
      } else {
        if (!audioRef.current.src || !audioRef.current.src.includes(soundtrackUrl)) {
          audioRef.current.src = soundtrackUrl;
          audioRef.current.load();
        }
        audioRef.current.volume = trackVolume;
        await audioRef.current.play();
        setIsPlayingAudio(true);
        const songName = currentTheme?.songTitle || 'Devotional Soundtrack';
        onShowToast(`Playing Week ${currentWeek}: "${songName}"`, 'success');
      }
    } catch (err) {
      console.error('Audio play error in simulator:', err);
      onShowToast('Could not play audio track on this device.', 'error');
      setIsPlayingAudio(false);
    }
  };

  const handleTrackSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setTrackCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const handleSkipTime = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), trackDuration);
      audioRef.current.currentTime = newTime;
      setTrackCurrentTime(newTime);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
      onShowToast('Device app URL copied to clipboard!', 'success');
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

  const handleSelectDevice = (m: DeviceModel) => {
    setDevice(m);
    setIsAutoFit(true);
  };

  const handleManualScale = (s: number) => {
    setIsAutoFit(false);
    setScale(s);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-3 overflow-hidden animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Device Preview Simulator"
    >
      {/* Top Simulator Control Bar */}
      <header className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 bg-[#111827]/95 border border-slate-800 rounded-xl px-4 py-2 text-white shadow-xl shrink-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-[#D4AF37]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="4" y="2" width="16" height="20" rx="3" strokeWidth="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-cinzel font-bold text-sm tracking-wide">
              {isTablet ? 'Sacred Steps Tablet Simulator' : 'Sacred Steps Phone Simulator'}
            </span>
          </div>
          <span className="hidden lg:inline-block text-xs text-slate-400 border-l border-slate-700 pl-3">
            {isTablet ? 'Interactive Live Tablet View' : 'Interactive Live Mobile View'}
          </span>
        </div>

        {/* Device Switcher & Scale Controls */}
        <div className="flex items-center space-x-2 flex-wrap text-xs">
          {/* Device Model Selector (Phone + Tablet) */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 overflow-x-auto">
            {/* Phone Group */}
            <button
              onClick={() => handleSelectDevice('iphone15')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                device === 'iphone15' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              iPhone 15 Pro
            </button>
            <button
              onClick={() => handleSelectDevice('galaxy24')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                device === 'galaxy24' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Galaxy S24
            </button>
            <button
              onClick={() => handleSelectDevice('pixel8')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                device === 'pixel8' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Pixel 8
            </button>

            {/* Separator */}
            <span className="h-4 w-px bg-slate-700 mx-1"></span>

            {/* Tablet Group */}
            <button
              onClick={() => handleSelectDevice('ipadAir')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 cursor-pointer ${
                device === 'ipadAir' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="Apple iPad Air 11-inch Tablet"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
              </svg>
              <span>iPad Air 11&quot;</span>
            </button>
            <button
              onClick={() => handleSelectDevice('galaxyTab')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 cursor-pointer ${
                device === 'galaxyTab' ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="Samsung Galaxy Tab S9 Tablet"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2" />
              </svg>
              <span>Galaxy Tab</span>
            </button>
          </div>

          {/* Scale Control with Auto-Fit */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setIsAutoFit(true)}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                isAutoFit ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="Automatically fit device to window height"
            >
              Fit
            </button>
            {(isTablet ? [0.55, 0.70, 0.85] : [0.75, 0.85, 1.0]).map((s) => (
              <button
                key={s}
                onClick={() => handleManualScale(s)}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  !isAutoFit && scale === s ? 'bg-slate-700 text-[#D4AF37] font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>

          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Rotate Device Orientation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden md:inline capitalize">{orientation}</span>
          </button>

          {/* QR Code / Real Device Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 rounded-lg transition-colors font-medium cursor-pointer"
            title="Scan QR Code to open on physical phone or tablet"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="hidden sm:inline">Scan on Real Phone</span>
            <span className="sm:hidden">QR</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center space-x-1 px-3 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/60 rounded-lg transition-colors font-semibold cursor-pointer"
            aria-label="Close Device Preview"
          >
            <span>✕</span>
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Main Center Canvas with Scaled Layout Wrapper (Never truncates or overflows) */}
      <main className="flex-1 w-full flex items-center justify-center overflow-auto p-1 sm:p-2">
        {/* Layout wrapper having the scaled dimensions to prevent window overflow */}
        <div
          style={{
            width: totalDeviceWidth * scale,
            height: totalDeviceHeight * scale,
          }}
          className="relative flex items-center justify-center shrink-0 transition-all duration-300"
        >
          {/* Scaled Device Container */}
          <div
            style={{
              width: totalDeviceWidth,
              height: totalDeviceHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
            className="absolute shrink-0 select-text"
          >
            {/* Outer Hardware Shell / Titanium or Aluminum Bezel */}
            <div
              style={{
                width: totalDeviceWidth,
                height: totalDeviceHeight,
                borderRadius: currentSpec.radius + 6,
                padding: bezelWidth / 2,
              }}
              className="relative bg-gradient-to-b from-[#374151] via-[#1F2937] to-[#111827] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(212,175,55,0.15)] ring-1 ring-white/20 select-none flex items-center justify-center"
            >
              {/* Side Hardware Buttons */}
              {orientation === 'portrait' ? (
                <>
                  <div className="absolute -left-[4px] top-28 w-[4px] h-12 bg-[#4B5563] rounded-l-sm"></div>
                  <div className="absolute -left-[4px] top-44 w-[4px] h-12 bg-[#4B5563] rounded-l-sm"></div>
                  <div className="absolute -right-[4px] top-36 w-[4px] h-16 bg-[#4B5563] rounded-r-sm"></div>
                </>
              ) : null}

              {/* Inner Device Screen Container */}
              <div
                style={{
                  width: screenWidth,
                  height: screenHeight,
                  borderRadius: currentSpec.radius,
                }}
                className="relative bg-[#FAFAF8] text-slate-900 overflow-hidden flex flex-col shadow-inner select-text border border-black/30"
              >
                {/* Device Status Bar */}
                <div className="w-full bg-[#1C2A39] text-white px-6 pt-2.5 pb-1 flex items-center justify-between text-xs font-semibold shrink-0 z-30 select-none">
                  <span className="tracking-tight text-[13px] font-medium">{currentTime}</span>

                  {/* Camera Cutout (Dynamic Island on Phone, subtle dot on Tablet) */}
                  {orientation === 'portrait' && (
                    isTablet ? (
                      <div className="w-3.5 h-3.5 bg-black rounded-full border border-white/20 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1C2A39]"></span>
                      </div>
                    ) : (
                      <div className="w-28 h-6 bg-black rounded-full flex items-center justify-between px-2.5 shadow-md">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1C2A39] border border-white/20"></span>
                        <span className="text-[10px] text-[#D4AF37] font-serif-quote italic">Grace</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      </div>
                    )
                  )}

                  {/* Signal, WiFi, Battery */}
                  <div className="flex items-center space-x-1.5 text-white/90">
                    <span className="text-[10px] font-bold text-slate-300 hidden sm:inline">
                      {isTablet ? 'iPad' : '5G'}
                    </span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0012 4zm0 4.5c2.95 0 5.67 1.05 7.82 2.79L12 19.16 4.18 11.29A12.38 12.38 0 0112 8.5z" />
                    </svg>
                    <div className="flex items-center space-x-0.5">
                      <div className="w-5 h-2.5 border border-white rounded-[3px] p-[1px] flex items-center">
                        <div className="w-full h-full bg-emerald-400 rounded-[1.5px]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile / Tablet App Header Bar */}
                <div className="bg-[#1C2A39] text-white px-5 py-2.5 border-b border-[#D4AF37]/30 flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center space-x-3">
                    <BrandLogo size={isTablet ? 34 : 26} />
                    <div>
                      <h3 className={`font-cinzel font-bold tracking-wider text-[#F5D77F] leading-tight ${isTablet ? 'text-sm' : 'text-xs'}`}>
                        Sacred Steps Daily Grace
                      </h3>
                      <p className={`uppercase tracking-widest text-slate-300 font-medium ${isTablet ? 'text-[10px]' : 'text-[9px]'}`}>
                        Sanctuary for Recovery
                      </p>
                    </div>
                  </div>

                  {/* Hidden Device Audio Element */}
                  <audio
                    ref={audioRef}
                    src={soundtrackUrl}
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        setTrackCurrentTime(audioRef.current.currentTime);
                        if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
                          setTrackDuration(audioRef.current.duration);
                        }
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (audioRef.current?.duration && !isNaN(audioRef.current.duration)) {
                        setTrackDuration(audioRef.current.duration);
                      }
                    }}
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    onEnded={() => {
                      setIsPlayingAudio(false);
                      setTrackCurrentTime(0);
                    }}
                    onError={() => setIsPlayingAudio(false)}
                    preload="metadata"
                  />

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleSoundtrackAudio}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isPlayingAudio ? 'bg-[#D4AF37] text-slate-950 shadow-xs ring-2 ring-[#D4AF37]/50' : 'bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                      title={isPlayingAudio ? 'Pause Soundtrack' : `Play Week ${currentWeek} Soundtrack`}
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
                      className="flex items-center space-x-1 px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-full text-[10px] font-bold tracking-wide uppercase cursor-pointer"
                    >
                      <span>🚨</span>
                      <span>SOS Crisis</span>
                    </button>
                  </div>
                </div>

                {/* Week Selector Carousel (Clean scrollbar-free touch styling) */}
                <div className="bg-[#FAF8F5] border-b border-stone-200 px-4 py-1.5 flex items-center justify-between shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {themes.slice(0, isTablet ? 30 : 12).map((t) => {
                      const isSelected = t.week === currentWeek;
                      const hasData = !!savedEntries[t.week]?.promptResponse?.trim();
                      return (
                        <button
                          key={t.week}
                          onClick={() => onWeekChange(t.week)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 flex items-center space-x-1 cursor-pointer ${
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
                      +{themes.length - (isTablet ? 30 : 12)} more
                    </span>
                  </div>
                </div>

                {/* Scrollable Viewport Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF8F5] text-stone-800 text-xs leading-relaxed">
                  {/* TAB 1: 12-STEP JOURNAL VIEW */}
                  {activeTab === 'journal' && (
                    <div className={isTablet ? 'grid grid-cols-12 gap-4' : 'space-y-3 animate-fade-in'}>
                      {/* Left Column on Tablet / Top on Phone */}
                      <div className={isTablet ? 'col-span-5 space-y-3' : 'space-y-3'}>
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

                        {/* S.T.E.P. Guidance Card */}
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

                        {/* Tablet Extra Feature: Devotional Audio & Anthem Card */}
                        {isTablet && (
                          <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 text-[#1C2A39]">
                                <span className="text-base">🎵</span>
                                <span className="font-cinzel text-xs font-bold">Weekly Devotional Soundtrack</span>
                              </div>
                              <span className="text-[9px] font-semibold bg-[#FAF6EC] text-[#AA8010] border border-[#E9DFCA] px-2 py-0.5 rounded-full">
                                {currentTheme.songGenre || 'Devotional'}
                              </span>
                            </div>
                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-xs text-stone-900 truncate">{currentTheme.songTitle}</h5>
                                  <p className="text-[10px] text-stone-500 truncate">Artist: {currentTheme.songArtist || 'Sacred Steps Collective'}</p>
                                </div>
                                <button
                                  onClick={toggleSoundtrackAudio}
                                  className="px-3 py-1.5 bg-[#1C2A39] text-[#F5D77F] hover:bg-[#283E52] rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors shrink-0"
                                  title={isPlayingAudio ? 'Pause Soundtrack' : 'Play Devotional Soundtrack'}
                                >
                                  <span>{isPlayingAudio ? '⏸ Pause' : '▶ Play Soundtrack'}</span>
                                </button>
                              </div>

                              {/* Interactive Scrubber & Timeline */}
                              <div className="space-y-1 pt-1">
                                <input
                                  type="range"
                                  min={0}
                                  max={trackDuration > 0 ? trackDuration : 200}
                                  step={0.5}
                                  value={trackCurrentTime}
                                  onChange={handleTrackSeek}
                                  className="w-full accent-[#D4AF37] h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                                  aria-label="Soundtrack timeline scrubber"
                                />
                                <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                                  <span>{formatAudioTime(trackCurrentTime)}</span>
                                  <div className="flex items-center gap-1">
                                    {[4, 10, 6, 14, 8, 12, 5].map((bar, i) => (
                                      <div
                                        key={i}
                                        className={`w-1 rounded-full transition-all duration-150 ${isPlayingAudio ? 'bg-[#D4AF37]' : 'bg-stone-300'}`}
                                        style={{
                                          height: isPlayingAudio ? `${Math.max(4, Math.sin(trackCurrentTime * 3 + i) * 10 + 6)}px` : `${bar}px`
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span>{formatAudioTime(trackDuration)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tablet Extra Feature: Biblical Aspiration Card */}
                        {isTablet && currentTheme.biblicalAspiration && (
                          <div className="bg-[#FAF6EC] border border-[#E9DFCA] rounded-xl p-3 space-y-1">
                            <span className="text-[10px] font-bold text-[#AA8010] uppercase tracking-wider">
                              Spiritual Aspiration
                            </span>
                            <p className="text-[11px] text-stone-700 font-serif-quote italic">
                              &ldquo;{currentTheme.biblicalAspiration}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right Column on Tablet: Interactive Reflections & Prayer */}
                      <div className={isTablet ? 'col-span-7 space-y-3' : 'space-y-3'}>
                        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3.5">
                          {/* Reflection 1 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-stone-900">
                                1. Heart Reflection
                              </label>
                              <AudioRecorderButton
                                variant="compact"
                                fieldLabel="heart reflection"
                                onTranscription={(text) => {
                                  const existing = currentEntry.reflection1Response || '';
                                  const endsWithPunct = /[.!?]$/.test(existing.trim());
                                  const updated = existing.trim() ? `${existing.trim()}${endsWithPunct ? ' ' : '. '}${text.trim()}` : text.trim();
                                  onResponseChange(currentWeek, 'reflection1Response', updated);
                                }}
                                onShowToast={onShowToast}
                              />
                            </div>
                            <p className="text-[10px] text-stone-500 mb-1.5">
                              {refl1Text}
                            </p>
                            <textarea
                              rows={isTablet ? 3 : 3}
                              value={currentEntry.reflection1Response || ''}
                              onChange={(e) => onResponseChange(currentWeek, 'reflection1Response', e.target.value)}
                              placeholder="Write your heart reflection here or use microphone..."
                              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:bg-white resize-none"
                            />
                          </div>

                          {/* Reflection 2 */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-stone-900">
                                2. Tangible Gratitude &amp; Grace Note
                              </label>
                              <AudioRecorderButton
                                variant="compact"
                                fieldLabel="gratitude reflection"
                                onTranscription={(text) => {
                                  const existing = currentEntry.reflection2Response || '';
                                  const endsWithPunct = /[.!?]$/.test(existing.trim());
                                  const updated = existing.trim() ? `${existing.trim()}${endsWithPunct ? ' ' : '. '}${text.trim()}` : text.trim();
                                  onResponseChange(currentWeek, 'reflection2Response', updated);
                                }}
                                onShowToast={onShowToast}
                              />
                            </div>
                            <p className="text-[10px] text-stone-500 mb-1.5">
                              {refl2Text}
                            </p>
                            <textarea
                              rows={isTablet ? 2 : 2}
                              value={currentEntry.reflection2Response || ''}
                              onChange={(e) => onResponseChange(currentWeek, 'reflection2Response', e.target.value)}
                              placeholder="What are you grateful for today? Speak or write..."
                              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:bg-white resize-none"
                            />
                          </div>

                          {/* Tablet Extra Feature: Deep Prompt & Micro-Step */}
                          {isTablet && currentTheme.prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold text-stone-900">
                                  3. Micro-Step for Sustained Freedom
                                </label>
                                <AudioRecorderButton
                                  variant="compact"
                                  fieldLabel="micro-step"
                                  onTranscription={(text) => {
                                    const existing = currentEntry.promptResponse || '';
                                    const endsWithPunct = /[.!?]$/.test(existing.trim());
                                    const updated = existing.trim() ? `${existing.trim()}${endsWithPunct ? ' ' : '. '}${text.trim()}` : text.trim();
                                    onResponseChange(currentWeek, 'promptResponse', updated);
                                  }}
                                  onShowToast={onShowToast}
                                />
                              </div>
                              <p className="text-[10px] text-stone-500 mb-1.5">
                                {currentTheme.prompt}
                              </p>
                              <textarea
                                rows={2}
                                value={currentEntry.promptResponse || ''}
                                onChange={(e) => onResponseChange(currentWeek, 'promptResponse', e.target.value)}
                                placeholder="Write or record your micro-commitment for today..."
                                className="w-full text-xs p-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:bg-white resize-none"
                              />
                            </div>
                          )}

                          {/* Tablet Extra Feature: Sacred Benediction Prayer */}
                          {isTablet && currentTheme.prayer && (
                            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                                Weekly Closing Prayer
                              </span>
                              <p className="text-[11px] text-stone-700 italic font-serif-quote">
                                {currentTheme.prayer}
                              </p>
                              {currentTheme.quote?.text && (
                                <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200">
                                  &ldquo;{currentTheme.quote.text}&rdquo; &bull; <span className="font-semibold">{currentTheme.quote.author}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action & Live Save Indicator */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Live auto-saved to cloud &amp; storage
                            </span>
                            <button
                              onClick={() => onShowToast(`Week ${currentWeek} reflections saved!`, 'success')}
                              className="px-4 py-1.5 bg-[#1C2A39] hover:bg-[#283E52] text-[#F5D77F] rounded-lg font-bold text-[11px] transition-colors shadow-2xs cursor-pointer"
                            >
                              Save Reflection
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TRIGGER LOGGING VIEW */}
                  {activeTab === 'triggers' && (
                    <div className={isTablet ? 'grid grid-cols-12 gap-4' : 'space-y-3 animate-fade-in'}>
                      <div className={isTablet ? 'col-span-7 bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3' : 'bg-white rounded-xl p-3.5 border border-stone-200 shadow-xs space-y-3'}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-cinzel text-xs font-bold text-stone-900">
                            {isTablet ? 'Tablet Craving & Trigger Logger' : 'Mobile Craving & Trigger Tracker'}
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
                                  className={`p-1.5 rounded border text-left transition-colors cursor-pointer ${
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
                          className="w-full py-2 bg-[#7A8B7B] hover:bg-[#6c7d6d] text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                        >
                          Log Trigger
                        </button>
                      </div>

                      {/* Recent Logged Triggers in Preview */}
                      <div className={isTablet ? 'col-span-5 space-y-2' : 'space-y-2'}>
                        <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Recently Logged Today
                          </span>
                          {recentMobileTriggers.length === 0 ? (
                            <p className="text-[11px] text-stone-400 italic">No triggers logged yet today.</p>
                          ) : (
                            recentMobileTriggers.map((t) => (
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
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: AUDIO & SOUNDTRACK PLAYER */}
                  {activeTab === 'audio' && (
                    <div className={isTablet ? 'max-w-xl mx-auto space-y-4' : 'space-y-3 animate-fade-in'}>
                      {/* Studio Master Soundtrack Player Card */}
                      <div className="bg-[#1C2A39] text-white rounded-xl p-5 border border-[#D4AF37]/30 text-center space-y-4 shadow-md">
                        {/* Spinning Vinyl Album Art */}
                        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                          <div
                            className={`w-28 h-28 rounded-full bg-stone-900 border-4 border-[#D4AF37] shadow-xl flex items-center justify-center transition-all ${
                              isPlayingAudio ? 'animate-spin [animation-duration:8s] ring-4 ring-[#D4AF37]/30' : ''
                            }`}
                          >
                            {/* Inner Vinyl Grooves */}
                            <div className="w-20 h-20 rounded-full border border-stone-800 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-[#1C2A39] border-2 border-[#D4AF37] flex flex-col items-center justify-center text-[#F5D77F]">
                                <span className="text-[9px] font-cinzel font-bold">WEEK</span>
                                <span className="text-xs font-bold font-mono">{currentWeek}</span>
                              </div>
                            </div>
                          </div>
                          {isPlayingAudio && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D4AF37]"></span>
                            </span>
                          )}
                        </div>

                        {/* Track Info */}
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5D77F] text-[10px] font-semibold">
                            <span>🎵</span>
                            <span>{currentTheme.songGenre || 'Devotional Soundtrack'}</span>
                          </div>
                          <h4 className="font-cinzel text-base sm:text-lg font-bold text-[#F5D77F] tracking-wide mt-1">
                            {currentTheme.songTitle}
                          </h4>
                          <p className="text-xs text-stone-300 font-medium">
                            {currentTheme.songArtist || 'Sacred Steps Collective'}
                          </p>
                          <p className="text-[11px] text-stone-400">
                            Theme: {currentTheme.theme}
                          </p>
                        </div>

                        {/* Interactive Timeline Scrubber */}
                        <div className="space-y-1.5 px-2">
                          <input
                            type="range"
                            min={0}
                            max={trackDuration > 0 ? trackDuration : 200}
                            step={0.5}
                            value={trackCurrentTime}
                            onChange={handleTrackSeek}
                            className="w-full accent-[#D4AF37] h-2 bg-slate-800 rounded-lg cursor-pointer"
                            aria-label="Audio scrubber"
                          />
                          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                            <span>{formatAudioTime(trackCurrentTime)}</span>
                            {/* Animated Visualizer Bars */}
                            <div className="flex items-center gap-1">
                              {[4, 12, 6, 16, 9, 14, 8, 12, 5].map((bar, i) => (
                                <div
                                  key={i}
                                  className={`w-1 rounded-full transition-all duration-150 ${
                                    isPlayingAudio ? 'bg-[#D4AF37]' : 'bg-slate-700'
                                  }`}
                                  style={{
                                    height: isPlayingAudio
                                      ? `${Math.max(4, Math.sin(trackCurrentTime * 3 + i) * 12 + 6)}px`
                                      : `${bar}px`
                                  }}
                                />
                              ))}
                            </div>
                            <span>{formatAudioTime(trackDuration)}</span>
                          </div>
                        </div>

                        {/* Playback Transport Controls */}
                        <div className="flex items-center justify-center space-x-4 pt-1">
                          <button
                            onClick={() => handleSkipTime(-15)}
                            className="p-2 text-stone-300 hover:text-white rounded-full hover:bg-slate-800/60 transition-colors text-xs font-mono cursor-pointer"
                            title="Rewind 15 seconds"
                          >
                            ⏪ -15s
                          </button>

                          <button
                            onClick={toggleSoundtrackAudio}
                            className="w-12 h-12 rounded-full bg-[#D4AF37] hover:bg-[#AA8010] text-slate-950 font-bold flex items-center justify-center shadow-lg transition-transform transform active:scale-95 cursor-pointer"
                            title={isPlayingAudio ? 'Pause Soundtrack' : 'Play Devotional Soundtrack'}
                          >
                            {isPlayingAudio ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>

                          <button
                            onClick={() => handleSkipTime(15)}
                            className="p-2 text-stone-300 hover:text-white rounded-full hover:bg-slate-800/60 transition-colors text-xs font-mono cursor-pointer"
                            title="Fast forward 15 seconds"
                          >
                            +15s ⏩
                          </button>
                        </div>

                        {/* Volume Control */}
                        <div className="flex items-center justify-center space-x-2 pt-2 text-stone-400 text-xs">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
                          </svg>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={trackVolume}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTrackVolume(val);
                              if (audioRef.current) {
                                audioRef.current.volume = val;
                              }
                            }}
                            className="w-24 accent-[#D4AF37] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            aria-label="Volume slider"
                          />
                        </div>

                        {/* Stream On Outlinks */}
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                          {currentTheme.songLinks?.spotify && (
                            <a
                              href={currentTheme.songLinks.spotify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-green-400 rounded-md border border-slate-700 flex items-center space-x-1"
                            >
                              <span>🟢</span>
                              <span>Spotify</span>
                            </a>
                          )}
                          {currentTheme.songLinks?.appleMusic && (
                            <a
                              href={currentTheme.songLinks.appleMusic}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-pink-400 rounded-md border border-slate-700 flex items-center space-x-1"
                            >
                              <span>🍎</span>
                              <span>Apple Music</span>
                            </a>
                          )}
                          {currentTheme.songLinks?.youtube && (
                            <a
                              href={currentTheme.songLinks.youtube}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-md border border-slate-700 flex items-center space-x-1"
                            >
                              <span>▶️</span>
                              <span>YouTube</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Spiritual Meditation Breathing Exercise */}
                      <div className="bg-white rounded-xl p-4 border border-stone-200 text-stone-700 space-y-2 shadow-xs">
                        <div className="flex items-center space-x-2 text-stone-900 font-bold text-xs">
                          <span>🕊️</span>
                          <h5>Sacred Recovery Breath Meditation (4-7-8):</h5>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-[11px] text-stone-600">
                          <li><strong>Inhale Grace (4s):</strong> Breathe in Christ&apos;s peace and unconditional love.</li>
                          <li><strong>Hold Peace (7s):</strong> Rest in the stillness of His presence and protection.</li>
                          <li><strong>Exhale Burden (8s):</strong> Release fear, craving, tension, and shame.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: SOS CRISIS SUPPORT */}
                  {activeTab === 'sos' && (
                    <div className={isTablet ? 'max-w-xl mx-auto space-y-4' : 'space-y-3 animate-fade-in'}>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center space-x-2 text-red-700">
                          <span className="text-xl">🚨</span>
                          <h4 className="font-bold text-sm uppercase tracking-wide">
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

                      <div className="bg-white rounded-xl p-4 border border-stone-200 space-y-2">
                        <h5 className="font-bold text-xs text-stone-900">Grace Sanctuary Promise:</h5>
                        <p className="font-serif-quote italic text-stone-700 text-xs">
                          &ldquo;God is our refuge and strength, an ever-present help in trouble.&rdquo; &bull; Psalm 46:1
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: STATS & ACCOUNT */}
                  {activeTab === 'stats' && (
                    <div className={isTablet ? 'max-w-xl mx-auto space-y-4' : 'space-y-3 animate-fade-in'}>
                      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-[#1C2A39] text-[#F5D77F] flex items-center justify-center font-bold text-sm">
                            {user ? user.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-stone-900">
                              {user ? user.name : 'Grace Pilgrim'}
                            </h4>
                            <p className="text-[11px] text-stone-500">
                              {user ? user.email : 'Local Storage Mode Active'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                          <div className="bg-stone-50 p-2.5 rounded-lg text-center border border-stone-200">
                            <span className="block text-lg font-bold text-[#AA8010]">
                              {currentWeek} / 52
                            </span>
                            <span className="text-[10px] text-stone-500">Current Week</span>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-lg text-center border border-stone-200">
                            <span className="block text-lg font-bold text-emerald-600">
                              100%
                            </span>
                            <span className="text-[10px] text-stone-500">Grace Guarantee</span>
                          </div>
                        </div>

                        <button
                          onClick={handleCopyUrl}
                          className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-[11px] transition-colors border border-stone-300 cursor-pointer"
                        >
                          {copiedUrl ? '✓ Link Copied!' : 'Copy Device App Link'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Bar */}
                <div className="bg-white border-t border-stone-200 px-4 py-1.5 flex items-center justify-around shrink-0 z-30 shadow-lg">
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
                        className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
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

                {/* Home Indicator Bar */}
                <div className="w-full bg-white pb-1.5 pt-0.5 flex justify-center shrink-0">
                  <div className="w-32 h-1 bg-stone-400/80 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Real Phone / Tablet QR Code Modal Drawer */}
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
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center text-emerald-300 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="2" width="16" height="20" rx="3" strokeWidth="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
              </svg>
            </div>

            <h4 className="font-cinzel text-lg font-bold text-[#F5D77F]">
              Open on Your Physical Device
            </h4>
            <p className="text-xs text-slate-300 mt-1.5 mb-4">
              Scan this QR code with your iPhone, iPad, or Android camera to open Sacred Steps natively on your device.
            </p>

            <div className="p-4 bg-white rounded-xl mx-auto w-48 h-48 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
                <rect x="10" y="10" width="24" height="24" rx="3" fill="#1C2A39" />
                <rect x="14" y="14" width="16" height="16" fill="white" />
                <rect x="18" y="18" width="8" height="8" fill="#1C2A39" />

                <rect x="66" y="10" width="24" height="24" rx="3" fill="#1C2A39" />
                <rect x="70" y="14" width="16" height="16" fill="white" />
                <rect x="74" y="18" width="8" height="8" fill="#1C2A39" />

                <rect x="10" y="66" width="24" height="24" rx="3" fill="#1C2A39" />
                <rect x="14" y="70" width="16" height="16" fill="white" />
                <rect x="18" y="74" width="8" height="8" fill="#1C2A39" />

                <rect x="46" y="40" width="8" height="20" rx="2" fill="#D4AF37" />
                <rect x="40" y="46" width="20" height="8" rx="2" fill="#D4AF37" />

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
                className="w-full py-2 bg-[#D4AF37] hover:bg-[#AA8010] text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>📋</span>
                <span>{copiedUrl ? 'Copied to Clipboard!' : 'Copy Direct Device Link'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
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
