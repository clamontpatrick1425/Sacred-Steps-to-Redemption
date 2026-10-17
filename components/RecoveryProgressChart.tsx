import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import type { SavedEntries, WeeklyTheme } from '../types';

interface MoodRecord {
  id: number;
  date: string;
  mood: 'great' | 'good' | 'okay' | 'struggling' | 'rough';
  note: string;
}

interface TriggerRecord {
  id: string;
  intensity: number;
  trigger: string;
  copingMechanism?: string;
  createdAt: string;
}

interface RecoveryProgressChartProps {
  savedEntries: SavedEntries;
  allThemes?: WeeklyTheme[];
  triggers?: TriggerRecord[];
  currentWeek?: number;
  onNavigateToWeek?: (week: number) => void;
  onShowToast?: (message: string, type: 'error' | 'info' | 'success') => void;
}

type MetricView = 'journal_words' | 'mood_trend' | 'dual_recovery';

const MOOD_SCORES: Record<string, number> = {
  great: 5,
  good: 4,
  okay: 3,
  struggling: 2,
  rough: 1
};

const MOOD_EMOJIS: Record<string, string> = {
  great: '🌟',
  good: '😊',
  okay: '😐',
  struggling: '😔',
  rough: '🌧️'
};

const MOOD_LABELS: Record<string, string> = {
  great: 'Great & Peaceful',
  good: 'Good & Steady',
  okay: 'Okay / Neutral',
  struggling: 'Struggling with Urges',
  rough: 'Rough / Heavy Day'
};

export const RecoveryProgressChart: React.FC<RecoveryProgressChartProps> = ({
  savedEntries,
  allThemes = [],
  triggers = [],
  currentWeek = 1,
  onNavigateToWeek,
  onShowToast
}) => {
  const [metricView, setMetricView] = useState<MetricView>('journal_words');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [filterRange, setFilterRange] = useState<'all' | 'active' | 'quarter1'>('active');

  // Load mood entries from localStorage with safety fallback
  const [moodEntries, setMoodEntries] = useState<MoodRecord[]>(() => {
    try {
      const stored = localStorage.getItem('moodEntries');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse mood entries for chart', e);
    }
    // Default starter recovery checkpoints if none logged yet
    const today = new Date();
    return [
      {
        id: 1,
        date: new Date(today.getTime() - 14 * 86400000).toISOString().split('T')[0],
        mood: 'rough',
        note: 'Starting the 12-Step journey. Surrendering pride.'
      },
      {
        id: 2,
        date: new Date(today.getTime() - 10 * 86400000).toISOString().split('T')[0],
        mood: 'struggling',
        note: 'Craving surfaced in the evening. Read Psalm 46:1.'
      },
      {
        id: 3,
        date: new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0],
        mood: 'okay',
        note: 'Checked in with sponsor. Feeling hopeful.'
      },
      {
        id: 4,
        date: new Date(today.getTime() - 4 * 86400000).toISOString().split('T')[0],
        mood: 'good',
        note: 'Scripture anchor brought deep clarity.'
      },
      {
        id: 5,
        date: new Date(today.getTime() - 1 * 86400000).toISOString().split('T')[0],
        mood: 'great',
        note: 'Grace is sufficient. Wrote gratitude reflections.'
      }
    ];
  });

  // Calculate journal word counts for all 52 weeks
  const journalData = useMemo(() => {
    const data: Array<{
      week: number;
      weekLabel: string;
      theme: string;
      promptWords: number;
      reflection1Words: number;
      reflection2Words: number;
      deepWords: number;
      goalWords: number;
      totalWords: number;
      charCount: number;
      fieldsAnswered: number;
      hasContent: boolean;
      moodScore?: number;
    }> = [];

    const countWords = (text?: string): number => {
      if (!text || typeof text !== 'string') return 0;
      const trimmed = text.trim();
      return trimmed ? trimmed.split(/\s+/).length : 0;
    };

    for (let w = 1; w <= 52; w++) {
      const entry = savedEntries[w];
      const themeObj = allThemes.find((t) => t.week === w);
      const themeTitle = themeObj ? themeObj.theme : `Week ${w}`;

      const pWords = countWords(entry?.promptResponse);
      const r1Words = countWords(entry?.reflection1Response);
      const r2Words = countWords(entry?.reflection2Response);
      const dWords = countWords(entry?.deeperReflectionResponse);
      const gWords = countWords(entry?.personalGoal) + countWords(entry?.goalReflection);
      const total = pWords + r1Words + r2Words + dWords + gWords;

      let chars = 0;
      let fields = 0;
      if (entry) {
        if (entry.promptResponse?.trim()) {
          chars += entry.promptResponse.trim().length;
          fields++;
        }
        if (entry.reflection1Response?.trim()) {
          chars += entry.reflection1Response.trim().length;
          fields++;
        }
        if (entry.reflection2Response?.trim()) {
          chars += entry.reflection2Response.trim().length;
          fields++;
        }
        if (entry.deeperReflectionResponse?.trim()) {
          chars += entry.deeperReflectionResponse.trim().length;
          fields++;
        }
        if (entry.personalGoal?.trim()) {
          chars += entry.personalGoal.trim().length;
          fields++;
        }
      }

      // If user hasn't written anything yet in early weeks, provide gentle placeholder baseline
      const hasContent = total > 0;

      data.push({
        week: w,
        weekLabel: `Wk ${w}`,
        theme: themeTitle,
        promptWords: pWords,
        reflection1Words: r1Words,
        reflection2Words: r2Words,
        deepWords: dWords,
        goalWords: gWords,
        totalWords: total,
        charCount: chars,
        fieldsAnswered: fields,
        hasContent
      });
    }

    return data;
  }, [savedEntries, allThemes]);

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    const activeWeeks = journalData.filter((d) => d.hasContent);
    const totalWords = activeWeeks.reduce((acc, curr) => acc + curr.totalWords, 0);
    const avgWords = activeWeeks.length > 0 ? Math.round(totalWords / activeWeeks.length) : 0;
    const peakWeek = [...activeWeeks].sort((a, b) => b.totalWords - a.totalWords)[0] || null;

    const recentMoods = [...moodEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const avgMoodScore =
      recentMoods.length > 0
        ? (
            recentMoods.reduce((acc, m) => acc + (MOOD_SCORES[m.mood] || 3), 0) /
            recentMoods.length
          ).toFixed(1)
        : '4.0';

    const latestMood = recentMoods[0]?.mood || 'good';

    return {
      activeCount: activeWeeks.length,
      totalWords,
      avgWords,
      peakWeek,
      avgMoodScore,
      latestMood
    };
  }, [journalData, moodEntries]);

  // Prepared filtered data for Recharts
  const chartDisplayData = useMemo(() => {
    let source = [...journalData];

    if (filterRange === 'active') {
      const activeOnly = source.filter((d) => d.hasContent);
      if (activeOnly.length >= 2) {
        source = activeOnly;
      } else {
        // Show up to current week + 3 to encourage writing
        source = source.slice(0, Math.max(currentWeek + 2, 6));
      }
    } else if (filterRange === 'quarter1') {
      source = source.slice(0, 13);
    }

    // Attach mood score estimate if in dual recovery view
    const sortedMoods = [...moodEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return source.map((item, idx) => {
      // Map mood approximate checkpoint per week
      let moodVal: number = 3.5;
      if (sortedMoods.length > 0) {
        const moodIdx = Math.min(idx, sortedMoods.length - 1);
        moodVal = MOOD_SCORES[sortedMoods[moodIdx].mood] || 3.5;
      } else {
        moodVal = Math.min(5, 2.5 + idx * 0.4);
      }

      return {
        ...item,
        moodScore: moodVal,
        // Baseline projection if user has 0 words in this slot
        displayTotal: item.totalWords > 0 ? item.totalWords : 0
      };
    });
  }, [journalData, filterRange, currentWeek, moodEntries]);

  // Chronological Mood Chart Data
  const moodChartData = useMemo(() => {
    const sorted = [...moodEntries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 logs for clean visibility

    return sorted.map((entry, idx, arr) => {
      const score = MOOD_SCORES[entry.mood] || 3;
      // Calculate 3-point rolling moving average
      const windowStart = Math.max(0, idx - 2);
      const windowSlice = arr.slice(windowStart, idx + 1);
      const rollingAvg =
        windowSlice.reduce((sum, item) => sum + (MOOD_SCORES[item.mood] || 3), 0) /
        windowSlice.length;

      const dateObj = new Date(entry.date);
      const dateLabel = isNaN(dateObj.getTime())
        ? entry.date
        : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      return {
        id: entry.id,
        rawDate: entry.date,
        dateLabel,
        score,
        rollingAvg: Number(rollingAvg.toFixed(2)),
        mood: entry.mood,
        emoji: MOOD_EMOJIS[entry.mood] || '🌿',
        label: MOOD_LABELS[entry.mood] || entry.mood,
        note: entry.note || 'Reflection logged'
      };
    });
  }, [moodEntries]);

  // Quick Mood Logger inside the Dashboard Chart
  const handleQuickMood = (mood: MoodRecord['mood']) => {
    const today = new Date().toISOString().split('T')[0];
    const newRecord: MoodRecord = {
      id: Date.now(),
      date: today,
      mood,
      note: `Logged in Redemption Dashboard (${MOOD_LABELS[mood]})`
    };

    const updated = [newRecord, ...moodEntries.filter((m) => m.date !== today)];
    setMoodEntries(updated);
    try {
      localStorage.setItem('moodEntries', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    if (onShowToast) {
      onShowToast(`Today's state of mind recorded: ${MOOD_EMOJIS[mood]} ${MOOD_LABELS[mood]}`, 'success');
    }
  };

  return (
    <div className="bg-card-secondary p-6 rounded-2xl border border-default shadow-sm space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </span>
            <h3 className="font-cinzel text-xl font-bold text-main tracking-tight">
              Recovery Progress &amp; Reflection Growth
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
              Recharts Analytics
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Visualizing your spiritual writing depth, emotional stability, and surrender milestones across time.
          </p>
        </div>

        {/* View Toggle Pill */}
        <div className="flex items-center gap-1.5 bg-card p-1 rounded-xl border border-default self-start lg:self-auto flex-wrap text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMetricView('journal_words')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metricView === 'journal_words'
                ? 'bg-primary text-on-primary shadow-xs font-bold'
                : 'text-muted hover:text-main'
            }`}
          >
            ✍️ Journal Length
          </button>
          <button
            type="button"
            onClick={() => setMetricView('mood_trend')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metricView === 'mood_trend'
                ? 'bg-primary text-on-primary shadow-xs font-bold'
                : 'text-muted hover:text-main'
            }`}
          >
            🕊️ Mood &amp; Spirit
          </button>
          <button
            type="button"
            onClick={() => setMetricView('dual_recovery')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metricView === 'dual_recovery'
                ? 'bg-primary text-on-primary shadow-xs font-bold'
                : 'text-muted hover:text-main'
            }`}
          >
            📊 Dual Recovery Index
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card p-3.5 rounded-xl border border-default">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Total Words Penned</span>
          <p className="text-2xl font-extrabold text-primary mt-0.5">
            {stats.totalWords.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">Across {stats.activeCount} completed weeks</span>
        </div>

        <div className="bg-card p-3.5 rounded-xl border border-default">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Avg Words per Week</span>
          <p className="text-2xl font-extrabold text-accent mt-0.5">
            {stats.avgWords} <span className="text-xs font-normal text-muted">words</span>
          </p>
          <span className="text-[11px] text-muted">Deep, honest disclosure</span>
        </div>

        <div className="bg-card p-3.5 rounded-xl border border-default">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Peak Writing Week</span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats.peakWeek ? `Wk ${stats.peakWeek.week}` : '—'}
          </p>
          <span className="text-[11px] text-muted">
            {stats.peakWeek ? `${stats.peakWeek.totalWords} words written` : 'Write in journal'}
          </span>
        </div>

        <div className="bg-card p-3.5 rounded-xl border border-default">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Spiritual Peace Index</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xl">{MOOD_EMOJIS[stats.latestMood] || '🕊️'}</span>
            <p className="text-2xl font-extrabold text-main">
              {stats.avgMoodScore} <span className="text-xs text-muted font-normal">/ 5.0</span>
            </p>
          </div>
          <span className="text-[11px] text-muted">Steady grace trajectory</span>
        </div>
      </div>

      {/* Secondary Controls (Chart Style & Scope) */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-default/60 text-xs">
        <div className="flex items-center gap-2">
          {metricView === 'journal_words' && (
            <div className="inline-flex rounded-lg border border-default p-0.5 bg-card">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartType === 'area' ? 'bg-primary text-on-primary font-bold' : 'text-muted hover:text-main'
                }`}
              >
                Area Fill
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartType === 'bar' ? 'bg-primary text-on-primary font-bold' : 'text-muted hover:text-main'
                }`}
              >
                Bar Breakdown
              </button>
            </div>
          )}

          {metricView !== 'mood_trend' && (
            <div className="inline-flex rounded-lg border border-default p-0.5 bg-card">
              <button
                type="button"
                onClick={() => setFilterRange('active')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filterRange === 'active' ? 'bg-primary text-on-primary font-bold' : 'text-muted hover:text-main'
                }`}
                title="Focus on weeks with journal content"
              >
                Active Weeks
              </button>
              <button
                type="button"
                onClick={() => setFilterRange('quarter1')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filterRange === 'quarter1' ? 'bg-primary text-on-primary font-bold' : 'text-muted hover:text-main'
                }`}
                title="First 13 weeks of 12-Step recovery"
              >
                Weeks 1–13
              </button>
              <button
                type="button"
                onClick={() => setFilterRange('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filterRange === 'all' ? 'bg-primary text-on-primary font-bold' : 'text-muted hover:text-main'
                }`}
                title="All 52 weeks roadmap"
              >
                Full 52 Weeks
              </button>
            </div>
          )}
        </div>

        {/* Quick Mood Log Prompt */}
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="font-medium hidden sm:inline">Log today's mindset:</span>
          {(['rough', 'struggling', 'okay', 'good', 'great'] as MoodRecord['mood'][]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleQuickMood(m)}
              className="p-1 hover:scale-125 transition-transform cursor-pointer rounded-full hover:bg-card"
              title={`Quick Log: ${MOOD_LABELS[m]}`}
            >
              {MOOD_EMOJIS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Responsive Recharts Viewport */}
      <div className="bg-card rounded-xl border border-default p-4 shadow-inner">
        {metricView === 'journal_words' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted mb-2 px-1">
              <span className="font-semibold text-main">
                {chartType === 'area' ? 'Total Reflection Length (Words Penned)' : 'Layered Word Count Breakdown by Section'}
              </span>
              <span>Units: Word count per weekly entry</span>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <ComposedChart data={chartDisplayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.65} />
                        <stop offset="95%" stopColor="#1C2A39" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis
                      dataKey="weekLabel"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl border border-[#D4AF37]/50 shadow-xl text-xs max-w-xs space-y-1.5">
                              <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                                <span className="font-cinzel font-bold text-[#F5D77F]">
                                  Week {data.week}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                                  {data.totalWords > 0 ? `${data.totalWords} words` : 'Empty entry'}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-200">{data.theme}</p>
                              <div className="space-y-0.5 text-[11px] text-slate-300 pt-1">
                                <div className="flex justify-between">
                                  <span>Prompt &amp; Anchor:</span>
                                  <span className="font-mono">{data.promptWords} words</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Heart Reflection:</span>
                                  <span className="font-mono">{data.reflection1Words} words</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Gratitude &amp; Grace:</span>
                                  <span className="font-mono">{data.reflection2Words} words</span>
                                </div>
                                {data.deepWords > 0 && (
                                  <div className="flex justify-between">
                                    <span>Deep Prompt:</span>
                                    <span className="font-mono">{data.deepWords} words</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-[#D4AF37] italic pt-1 border-t border-slate-800">
                                Total characters: {data.charCount.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <ReferenceLine
                      y={stats.avgWords > 0 ? stats.avgWords : 50}
                      label={{
                        value: `Avg (${stats.avgWords}w)`,
                        position: 'insideTopRight',
                        fill: '#D4AF37',
                        fontSize: 10
                      }}
                      stroke="#D4AF37"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalWords"
                      name="Total Words Written"
                      stroke="#D4AF37"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#primaryGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="reflection1Words"
                      name="Heart Reflection (Words)"
                      stroke="#3B82F6"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                    />
                  </ComposedChart>
                ) : (
                  <ComposedChart data={chartDisplayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="weekLabel" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
                              <p className="font-bold text-[#F5D77F]">Week {data.week}: {data.theme}</p>
                              <p className="text-emerald-400 font-semibold">{data.totalWords} Total Words</p>
                              <div className="text-[11px] text-slate-300 space-y-0.5">
                                <p>• Prompt: {data.promptWords} words</p>
                                <p>• Heart: {data.reflection1Words} words</p>
                                <p>• Gratitude: {data.reflection2Words} words</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="promptWords" stackId="a" name="Prompt Word Count" fill="#1C2A39" />
                    <Bar dataKey="reflection1Words" stackId="a" name="Heart Reflection" fill="#D4AF37" />
                    <Bar dataKey="reflection2Words" stackId="a" name="Gratitude Note" fill="#10B981" />
                    <Bar dataKey="deepWords" stackId="a" name="Deep Prompt" fill="#6366F1" />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {metricView === 'mood_trend' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted mb-2 px-1">
              <span className="font-semibold text-main">
                Emotional &amp; Spiritual Stability Trend (Chronological Check-Ins)
              </span>
              <span>Scale: 1 (Rough 🌧️) to 5 (Great 🌟)</span>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={moodChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dateLabel" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={(v) => {
                      if (v === 5) return '5 🌟';
                      if (v === 4) return '4 😊';
                      if (v === 3) return '3 😐';
                      if (v === 2) return '2 😔';
                      return '1 🌧️';
                    }}
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 max-w-xs">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <span className="text-base">{data.emoji}</span>
                                <span>{data.label}</span>
                              </span>
                              <span className="text-[10px] text-slate-400">{data.rawDate}</span>
                            </div>
                            <p className="text-slate-300 italic text-[11px]">&ldquo;{data.note}&rdquo;</p>
                            <p className="text-[10px] text-amber-300">
                              3-Day Moving Average: <strong>{data.rollingAvg} / 5.0</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <ReferenceLine
                    y={3}
                    stroke="#888888"
                    strokeDasharray="3 3"
                    label={{ value: 'Neutral Baseline', position: 'insideBottomRight', fontSize: 10, fill: '#888' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Daily Mood Level"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#moodGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    name="Rolling 3-Entry Average"
                    stroke="#D4AF37"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#D4AF37' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {metricView === 'dual_recovery' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted mb-2 px-1">
              <span className="font-semibold text-main">
                Dual Recovery Correlation: Journal Word Depth vs Spiritual Peace Score
              </span>
              <span>Left Axis: Words | Right Axis: Mood (1-5)</span>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDisplayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="weekLabel" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="#D4AF37"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 'auto']}
                    label={{ value: 'Words', angle: -90, position: 'insideLeft', fill: '#D4AF37', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#10B981"
                    fontSize={11}
                    tickLine={false}
                    domain={[1, 5]}
                    label={{ value: 'Mood', angle: 90, position: 'insideRight', fill: '#10B981', fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-[#D4AF37]/50 shadow-xl text-xs space-y-1">
                            <p className="font-cinzel font-bold text-[#F5D77F]">Week {data.week}: {data.theme}</p>
                            <p className="text-amber-300 font-mono">Words Penned: {data.totalWords}</p>
                            <p className="text-emerald-400 font-mono">Spiritual Peace: {data.moodScore?.toFixed(1)} / 5.0</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {data.totalWords > 80
                                ? '✨ High reflective investment correlates with resilience.'
                                : '🌱 Keep building daily writing consistency.'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="totalWords"
                    name="Journal Words Penned"
                    fill="#D4AF37"
                    radius={[4, 4, 0, 0]}
                    opacity={0.85}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="moodScore"
                    name="Spiritual Peace Score"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10B981' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Insight Footer */}
      <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-default flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Scripture Correlation:</span>
          <span>&ldquo;He who began a good work in you will carry it on to completion.&rdquo; (Philippians 1:6)</span>
        </div>
        {stats.activeCount === 0 && (
          <span className="text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
            Preview mode: Start writing your Week {currentWeek} reflections to chart your live path!
          </span>
        )}
      </div>
    </div>
  );
};
