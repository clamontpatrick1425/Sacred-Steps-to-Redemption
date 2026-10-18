import React, { useState, useEffect, useMemo } from 'react';

interface DaysSoberCounterProps {
  onShowToast?: (message: string, type: 'error' | 'info' | 'success') => void;
}

interface Milestone {
  days: number;
  label: string;
  badge: string;
  chipColor: string;
}

const MILESTONES: Milestone[] = [
  { days: 1, label: '24 Hours', badge: '🌱', chipColor: 'from-emerald-500 to-teal-700' },
  { days: 7, label: '1 Week', badge: '🕊️', chipColor: 'from-sky-500 to-blue-700' },
  { days: 14, label: '2 Weeks', badge: '💧', chipColor: 'from-cyan-500 to-blue-800' },
  { days: 30, label: '30 Days (1 Month)', badge: '🥉', chipColor: 'from-amber-600 to-amber-800' },
  { days: 60, label: '60 Days (2 Months)', badge: '🥈', chipColor: 'from-slate-400 to-slate-600' },
  { days: 90, label: '90 Days (3 Months)', badge: '🥇', chipColor: 'from-yellow-400 to-amber-600' },
  { days: 180, label: '6 Months', badge: '💎', chipColor: 'from-indigo-500 to-purple-700' },
  { days: 270, label: '9 Months', badge: '🛡️', chipColor: 'from-emerald-600 to-emerald-900' },
  { days: 365, label: '1 Year (365 Days)', badge: '👑', chipColor: 'from-[#D4AF37] to-[#8C6D1F]' },
  { days: 548, label: '18 Months', badge: '⭐', chipColor: 'from-amber-500 to-rose-700' },
  { days: 730, label: '2 Years', badge: '🌟', chipColor: 'from-purple-600 to-indigo-900' },
  { days: 1825, label: '5 Years', badge: '🏆', chipColor: 'from-[#D4AF37] to-amber-950' }
];

export const DaysSoberCounter: React.FC<DaysSoberCounterProps> = ({ onShowToast }) => {
  const [soberStartDate, setSoberStartDate] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('soberStartDate');
      if (stored) return stored;
    } catch (e) {
      console.error(e);
    }
    // Default to 14 days ago so new users see a warm, encouraging starting baseline
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });

  const [dailySavings, setDailySavings] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('soberDailySavings');
      return saved ? parseFloat(saved) : 15;
    } catch {
      return 15;
    }
  });

  const [isEditingDate, setIsEditingDate] = useState<boolean>(false);
  const [tempDate, setTempDate] = useState<string>(soberStartDate);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showGraceDialog, setShowGraceDialog] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());

  // Live timer update
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save changes
  const handleSaveDate = (newDateStr: string) => {
    setSoberStartDate(newDateStr);
    setIsEditingDate(false);
    try {
      localStorage.setItem('soberStartDate', newDateStr);
    } catch (e) {
      console.error(e);
    }
    if (onShowToast) {
      onShowToast(`Clean start date updated: ${newDateStr}`, 'success');
    }
  };

  const handleGraceReset = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSoberStartDate(todayStr);
    setShowGraceDialog(false);
    try {
      localStorage.setItem('soberStartDate', todayStr);
    } catch (e) {
      console.error(e);
    }
    if (onShowToast) {
      onShowToast('God’s mercies are new this morning. Day 1 starts with grace!', 'info');
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const start = new Date(soberStartDate + 'T00:00:00');
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    // Approximate months & years
    const months = Math.floor(totalDays / 30.4375);
    const remainingDays = Math.floor(totalDays % 30.4375);

    // Find current milestone earned & next milestone target
    let currentMilestone: Milestone | null = null;
    let nextMilestone: Milestone = MILESTONES[0];

    for (const m of MILESTONES) {
      if (totalDays >= m.days) {
        currentMilestone = m;
      } else {
        nextMilestone = m;
        break;
      }
    }

    // Progress toward next milestone
    const prevDays = currentMilestone ? currentMilestone.days : 0;
    const daysNeeded = nextMilestone.days - prevDays;
    const daysAchieved = totalDays - prevDays;
    const progressPercent = Math.min(100, Math.max(0, Math.round((daysAchieved / daysNeeded) * 100)));

    // Financial & Time reclaimed
    const moneySaved = Math.round(totalDays * dailySavings);
    const hoursReclaimed = totalDays * 24 + hours;

    return {
      totalDays,
      hours,
      minutes,
      seconds,
      months,
      remainingDays,
      currentMilestone,
      nextMilestone,
      progressPercent,
      daysToNext: Math.max(0, nextMilestone.days - totalDays),
      moneySaved,
      hoursReclaimed
    };
  }, [soberStartDate, now, dailySavings]);

  return (
    <>
      {/* Compact Sidebar Card */}
      <div id="days-sober-counter-card" className="bg-card rounded-xl p-4 shadow-sm border border-default space-y-3 relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all">
        {/* Subtle Gold Ambient Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted">
                Days in Grace &amp; Freedom
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-[11px] text-[#AA8010] hover:text-[#8C6D1F] dark:text-[#F5D77F] font-semibold cursor-pointer hover:underline"
            title="Open Detailed Sobriety Clock & Milestone Chips"
          >
            Details ↗
          </button>
        </div>

        {/* Counter Display */}
        <div className="flex items-baseline justify-between pt-0.5">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-cinzel text-3xl font-extrabold text-[#D4AF37] tracking-tight leading-none">
                {stats.totalDays}
              </span>
              <span className="text-xs font-bold text-main uppercase tracking-wide">
                {stats.totalDays === 1 ? 'Day Sober' : 'Days Sober'}
              </span>
            </div>
            <p className="text-[11px] text-muted font-mono mt-1">
              {stats.hours}h {stats.minutes}m {stats.seconds}s continuous
            </p>
          </div>

          {/* Current Milestone Coin Badge */}
          {stats.currentMilestone && (
            <div
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${stats.currentMilestone.chipColor} text-white shadow-md flex flex-col items-center justify-center p-1 border-2 border-white/40 transform transition-transform group-hover:scale-105 shrink-0`}
              title={`Earned Milestone: ${stats.currentMilestone.label}`}
            >
              <span className="text-xs">{stats.currentMilestone.badge}</span>
              <span className="text-[7px] font-bold font-mono tracking-tighter uppercase leading-none">
                {stats.currentMilestone.days}D
              </span>
            </div>
          )}
        </div>

        {/* Next Milestone Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] text-muted">
            <span>Next: <strong>{stats.nextMilestone.label}</strong></span>
            <span>{stats.daysToNext} days left</span>
          </div>
          <div className="w-full bg-card-secondary h-2 rounded-full overflow-hidden border border-default/50">
            <div
              className="bg-gradient-to-r from-[#D4AF37] to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-default/60 text-[11px]">
          <span className="text-stone-500 dark:text-stone-400 italic font-serif-quote">
            &ldquo;One day at a time.&rdquo;
          </span>
          <button
            type="button"
            onClick={() => {
              setTempDate(soberStartDate);
              setIsEditingDate(true);
            }}
            className="text-muted hover:text-main text-[10px] cursor-pointer"
          >
            Edit Date
          </button>
        </div>
      </div>

      {/* Edit Date Popover */}
      {isEditingDate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-default text-main rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-main">Set Your Sobriety Start Date</h4>
              <button
                type="button"
                onClick={() => setIsEditingDate(false)}
                className="text-muted hover:text-main text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted">
              Choose the day your clean journey in grace began. Every 24 hours counts.
            </p>
            <div>
              <label className="block text-xs font-semibold mb-1 text-muted">Start Date:</label>
              <input
                type="date"
                value={tempDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTempDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-default bg-card-secondary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingDate(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-default hover:bg-card-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveDate(tempDate)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary-hover cursor-pointer shadow-xs"
              >
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sacred Freedom & Clean Clock Pop-up Window (By Itself) */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-card border border-[#D4AF37]/50 text-main rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-default pb-3.5">
              <div className="flex items-center space-x-3">
                <span className="w-10 h-10 rounded-full bg-[#1C2A39] border border-[#D4AF37]/40 text-[#F5D77F] flex items-center justify-center text-xl font-bold shadow-xs">
                  🕊️
                </span>
                <div>
                  <h3 className="font-cinzel text-lg sm:text-xl font-bold text-main">
                    Sacred Freedom &amp; Clean Clock
                  </h3>
                  <p className="text-[11px] text-muted font-mono">
                    Clean since {new Date(soberStartDate).toLocaleDateString(undefined, { dateStyle: 'full' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-card-secondary hover:bg-card border border-default flex items-center justify-center text-muted hover:text-main text-base font-bold cursor-pointer transition-colors"
                aria-label="Close Clean Clock"
              >
                ✕
              </button>
            </div>

            {/* Sacred Freedom & Clean Clock Centerpiece */}
            <div className="bg-gradient-to-b from-[#1C2A39] via-[#162330] to-[#0F1722] text-white rounded-2xl p-6 sm:p-7 text-center shadow-xl border border-[#D4AF37]/40 relative overflow-hidden space-y-4">
              {/* Gold ambient badge */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D77F] text-[11px] font-bold uppercase tracking-widest shadow-xs">
                <span>✨</span>
                <span>Unbroken Grace &bull; Standing in the Light</span>
              </div>

              {/* Big Clean Days Display */}
              <div>
                <span className="font-cinzel text-6xl sm:text-7xl font-extrabold text-[#F5D77F] tracking-tight block leading-none py-1">
                  {stats.totalDays}
                </span>
                <span className="text-xs sm:text-sm uppercase tracking-widest text-slate-200 font-bold block mt-1">
                  {stats.totalDays === 1 ? 'Day Living Clean & Free' : 'Days Living Clean & Free'}
                </span>
              </div>

              {/* Live Precision Clock Grid (Months, Days, Hours, Minutes, Seconds) */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-3 border-t border-slate-700/70 text-center font-mono">
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 shadow-xs">
                  <span className="block text-base sm:text-lg font-bold text-[#F5D77F]">{stats.months}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-sans tracking-wide">Mos</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 shadow-xs">
                  <span className="block text-base sm:text-lg font-bold text-[#F5D77F]">{stats.remainingDays}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-sans tracking-wide">Days</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 shadow-xs">
                  <span className="block text-base sm:text-lg font-bold text-[#F5D77F]">
                    {String(stats.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-sans tracking-wide">Hrs</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 shadow-xs">
                  <span className="block text-base sm:text-lg font-bold text-[#F5D77F]">
                    {String(stats.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-sans tracking-wide">Mins</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/20">
                  <span className="block text-base sm:text-lg font-bold text-emerald-400 animate-pulse">
                    {String(stats.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] text-emerald-400 uppercase font-sans tracking-wide">Secs</span>
                </div>
              </div>

              {/* Continuous Precision Line */}
              <p className="text-[11px] text-slate-300 font-mono">
                {stats.hoursReclaimed.toLocaleString()} continuous hours reclaimed in Christ
              </p>
            </div>

            {/* Spiritual Scripture Anchor */}
            <div className="p-4 bg-primary/5 rounded-2xl border border-[#D4AF37]/30 text-center space-y-1.5">
              <p className="font-serif-quote italic text-xs sm:text-sm text-main leading-relaxed">
                &ldquo;It is for freedom that Christ has set us free. Stand firm, then, and do not let yourselves be burdened again by a yoke of slavery.&rdquo;
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#AA8010] dark:text-[#F5D77F] block">
                Galatians 5:1 &bull; One Day At A Time
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setTempDate(soberStartDate);
                  setIsEditingDate(true);
                }}
                className="text-muted hover:text-main text-xs font-semibold cursor-pointer underline underline-offset-2"
              >
                Adjust Clean Date
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-hover font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Radical Grace Reset Confirmation */}
      {showGraceDialog && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-default text-main rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
              🕊️
            </div>
            <h4 className="font-cinzel text-lg font-bold text-main">
              A Stumble Is Not the End
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              &ldquo;The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.&rdquo; (Lamentations 3:22–23)
            </p>
            <p className="text-xs text-main font-medium">
              You are not starting from scratch; you are starting from experience and grace. Ready to begin Day 1 with fresh resolve?
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGraceDialog(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-default hover:bg-card-secondary cursor-pointer"
              >
                Keep Current Date
              </button>
              <button
                type="button"
                onClick={handleGraceReset}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#D4AF37] hover:bg-[#AA8010] text-slate-950 cursor-pointer shadow-xs"
              >
                Start Day 1 in Grace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
