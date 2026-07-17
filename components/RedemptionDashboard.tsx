import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateRedemptionReport } from '../services/geminiService';
import type { SavedEntries, WeeklyTheme } from '../types';

interface RedemptionDashboardProps {
  user: { name: string; email: string; uid?: string } | null;
  savedEntries: SavedEntries;
  completedWeeksCount: number;
  reflectionStreak: number;
  completedMilestones: number[];
  gratitudeCount: number;
  totalWeeks: number;
  onClose: () => void;
}

interface TriggerRecord {
  id: string;
  intensity: number;
  trigger: string;
  copingMechanism?: string;
  createdAt: string;
}

export const RedemptionDashboard: React.FC<RedemptionDashboardProps> = ({
  user,
  savedEntries,
  completedWeeksCount,
  reflectionStreak,
  completedMilestones,
  gratitudeCount,
  totalWeeks,
  onClose
}) => {
  const [triggers, setTriggers] = useState<TriggerRecord[]>([]);
  const [isLoadingTriggers, setIsLoadingTriggers] = useState(false);
  
  // AI Compilation report state
  const [reportText, setReportText] = useState<string | null>(null);
  const [isCompilingReport, setIsCompilingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchTriggers = async () => {
      setIsLoadingTriggers(true);
      try {
        const q = query(
          collection(db, 'triggers'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedTriggers: TriggerRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedTriggers.push({
            id: docSnap.id,
            ...docSnap.data()
          } as TriggerRecord);
        });
        setTriggers(fetchedTriggers);
      } catch (err) {
        console.error("Error fetching dashboard triggers:", err);
      } finally {
        setIsLoadingTriggers(false);
      }
    };

    fetchTriggers();
  }, [user]);

  const handleCompileReport = async () => {
    if (!user) return;
    setIsCompilingReport(true);
    setReportError(null);
    setReportText(null);

    try {
      const generatedReport = await generateRedemptionReport(
        user.name,
        savedEntries,
        triggers,
        gratitudeCount
      );
      setReportText(generatedReport);
    } catch (err: any) {
      console.error(err);
      setReportError("The system couldn't compile your redemption report at this time. Please check your network and API key.");
    } finally {
      setIsCompilingReport(false);
    }
  };

  const completedPercentage = totalWeeks > 0 ? Math.round((completedWeeksCount / totalWeeks) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl shadow-xl border border-default overflow-hidden animate-fade-in mb-8 no-print">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary to-accent p-6 text-on-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="bg-white/20 text-xs text-white border border-white/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Account Integration Live
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-1">
              Your Redemption & Progress Compilation
            </h2>
            <p className="text-sm opacity-90 font-medium mt-1">
              Analyzing the steps of {user?.name || 'Pilgrim'} • Sync State: Active
            </p>
          </div>
          <button 
            onClick={onClose}
            className="self-center bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-medium py-2 px-5 rounded-full border border-white/20 transition-all text-sm cursor-pointer"
          >
            Back to Journal
          </button>
        </div>
      </div>

      {/* Stats Matrix Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-default text-center">
        <div className="p-6 border-r border-default">
          <p className="text-xs text-muted uppercase font-bold tracking-wider">Weeks Complete</p>
          <p className="text-4xl font-extrabold text-primary mt-1">{completedWeeksCount} <span className="text-sm text-subtle font-normal">/ {totalWeeks}</span></p>
          <div className="w-full bg-card-secondary h-1.5 rounded-full mt-2.5 max-w-[120px] mx-auto overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${completedPercentage}%` }} />
          </div>
        </div>
        <div className="p-6 border-r border-default">
          <p className="text-xs text-muted uppercase font-bold tracking-wider">Success Streak</p>
          <p className="text-4xl font-extrabold text-accent mt-1">{reflectionStreak} <span className="text-sm text-subtle font-normal">weeks</span></p>
          <p className="text-[11px] text-muted italic mt-2">Active reflection loop</p>
        </div>
        <div className="p-6 border-r border-default">
          <p className="text-xs text-muted uppercase font-bold tracking-wider">Thanksgiving Logs</p>
          <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{gratitudeCount}</p>
          <p className="text-[11px] text-muted italic mt-2">Items compiled in Gratitude Jar</p>
        </div>
        <div className="p-6">
          <p className="text-xs text-muted uppercase font-bold tracking-wider">Trigger Controls</p>
          <p className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{triggers.length}</p>
          <p className="text-[11px] text-muted italic mt-2">Total cravings reported</p>
        </div>
      </div>

      {/* Main Compilation Dashboard Content */}
      <div className="p-6 md:p-8 space-y-8">
        <div className="grid md:grid-cols-12 gap-8">
          
          {/* Left Column: Data Gathered (Journals & Triggers) */}
          <div className="md:col-span-6 space-y-6">
            
            {/* Journal Completion Details */}
            <div className="bg-card-secondary p-6 rounded-xl border border-default">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-main">Journaling Log Entries</h3>
                <span className="text-xs bg-primary/10 text-primary-hover px-2.5 py-1 rounded-full font-bold">
                  {completedPercentage}% Completed
                </span>
              </div>
              
              {completedWeeksCount === 0 ? (
                <p className="text-sm text-muted">You haven't written any weekly journal responses yet. Your entries will compile here once filled.</p>
              ) : (
                <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                  {Object.entries(savedEntries).map(([weekNum, entry]) => {
                    const keysResponseCount = Object.values(entry).filter(v => v && v.trim()).length;
                    if (keysResponseCount === 0) return null;
                    return (
                      <div key={weekNum} className="flex items-center justify-between bg-card hover:bg-primary-light transition-colors p-3 rounded-lg border border-default">
                        <div>
                          <p className="text-sm font-semibold text-main">Week {weekNum} Reflection Log</p>
                          <p className="text-xs text-muted">Compiled: {keysResponseCount} active response fields answered</p>
                        </div>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-md">
                          Uploaded & Saved
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Triggers & Cravings Compilation Details */}
            <div className="bg-card-secondary p-6 rounded-xl border border-default">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-main">Craving & Trigger Vulnerability Logs</h3>
                <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full font-bold">
                  {triggers.length} logs
                </span>
              </div>

              {isLoadingTriggers ? (
                <p className="text-sm text-muted">Loading cloud-secured trigger points...</p>
              ) : triggers.length === 0 ? (
                <p className="text-sm text-muted">No trigger logs compiled yet. Track cravings when triggers happen to isolate your pain points and compile strategies.</p>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  {triggers.slice(0, 5).map((t) => (
                    <div key={t.id} className="bg-card p-3 rounded-lg border border-default text-sm">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-semibold text-main">Trigger: {t.trigger}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                          t.intensity >= 8 ? 'bg-red-100 text-red-800' : t.intensity >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          Intensity: {t.intensity}/10
                        </span>
                      </div>
                      {t.copingMechanism && (
                        <p className="text-xs text-muted mt-1"><strong className="text-neutral-500">Coping Applied:</strong> {t.copingMechanism}</p>
                      )}
                      <p className="text-[10px] text-neutral-400 mt-1 hover:text-neutral-500 transition-colors">
                        Logged on: {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {triggers.length > 5 && (
                    <p className="text-right text-[11px] text-muted">+ {triggers.length - 5} more history logs safe in cloud storage</p>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: AI Insights Compilation & Mentor Report */}
          <div className="md:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="bg-card-secondary p-6 rounded-xl border border-default flex-grow flex flex-col h-full">
              <div className="flex items-center space-x-2.5 mb-3.5">
                <span className="p-2 rounded-lg bg-primary-light text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold text-lg text-main">AI Redemption Insights Report</h3>
                  <p className="text-xs text-muted">Consolidating spiritual progression and vulnerability patterns</p>
                </div>
              </div>

              {/* Action Screen */}
              <div className="bg-card p-5 rounded-lg border border-default flex-grow flex flex-col justify-center min-h-[300px]">
                {isCompilingReport ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm font-semibold text-main animate-pulse">
                      Analyzing journal responses & triggers...
                    </p>
                    <p className="text-xs text-muted">
                      Synthesizing personalized Christian spiritual encouragement
                    </p>
                  </div>
                ) : reportText ? (
                  <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 text-left">
                    <div className="border-b border-default pb-3 flex justify-between items-center text-xs text-muted">
                      <span>Generated for {user?.name} on {new Date().toLocaleDateString()}</span>
                      <button 
                        onClick={() => {
                          setReportText(null);
                        }} 
                        className="text-primary hover:underline font-semibold font-mono"
                      >
                        [Reset]
                      </button>
                    </div>
                    <div className="text-sm text-main whitespace-pre-line leading-relaxed scrollbar-thin">
                      {reportText}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4 my-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary/40 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-main">Compile Spiritual Insights</h4>
                      <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                        Synthesizes your weekly logs, goals, triggers, and thanksgiving points into a personalized Christian counseling report.
                      </p>
                    </div>
                    {reportError && (
                      <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-2.5 rounded border border-red-200">{reportError}</p>
                    )}
                    <button
                      onClick={handleCompileReport}
                      className="inline-flex items-center justify-center py-2.5 px-6 bg-primary hover:bg-primary-hover text-on-primary font-semibold rounded-lg transition-colors shadow-sm text-sm cursor-pointer"
                    >
                      Generate Redemption Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Milestone Badges Compilation */}
        <div className="bg-card-secondary p-6 rounded-xl border border-default">
          <h3 className="font-bold text-lg text-main mb-4">Milestones Unlocked</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[4, 13, 26, 52].map((milestoneValue) => {
              const isUnlocked = completedWeeksCount >= milestoneValue;
              return (
                <div 
                  key={milestoneValue} 
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    isUnlocked 
                      ? 'bg-card border-primary/30 text-main shadow-sm' 
                      : 'bg-card opacity-50 border-default text-muted'
                  }`}
                >
                  <span className={`p-2 rounded-full mb-2 ${isUnlocked ? 'bg-primary-light text-primary' : 'bg-card-secondary text-subtle'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  <p className="text-sm font-bold">{milestoneValue} Weeks</p>
                  <p className="text-[10px] text-muted text-center mt-1">
                    {isUnlocked ? 'Completed & Saved' : `${completedWeeksCount}/${milestoneValue} Weeks`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
