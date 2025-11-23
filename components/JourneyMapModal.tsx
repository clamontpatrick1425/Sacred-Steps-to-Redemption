import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SavedEntries, WeeklyTheme, EmotionDataPoint, MomentOfGrace } from '../types';
import { analyzeEmotionalArc, extractMomentsOfGrace } from '../services/geminiService';

// Since Chart.js and WordCloud are loaded from CDN, declare them for TypeScript
declare const Chart: any;
declare const WordCloud: any;

interface JourneyMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedEntries: SavedEntries;
  themes: WeeklyTheme[];
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

type JourneyMapView = 'arc' | 'cloud' | 'moments';

const stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'im', 'am']);

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-primary"></div>
        <h3 className="mt-6 text-xl font-semibold text-main">Analyzing Your Journey...</h3>
        <p className="mt-2 text-muted">{message}</p>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="text-center p-8 text-muted">
        <h3 className="text-xl font-semibold text-main">Your Journey Map Awaits</h3>
        <p className="mt-2">As you fill out your weekly journal entries, this dashboard will come to life with beautiful visualizations of your progress.</p>
        <p className="mt-1">Complete at least one entry to begin.</p>
    </div>
);

const isColorDark = (rgbString: string) => {
    if (!rgbString) return false;
    const [r, g, b] = rgbString.split(',').map(s => parseInt(s.trim(), 10));
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
};

const EmotionalArcChart: React.FC<{ data: EmotionDataPoint[], themes: WeeklyTheme[] }> = ({ data, themes }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        
        const sortedData = [...data].sort((a,b) => a.week - b.week);

        const labels = sortedData.map(d => themes.find(t => t.week === d.week)?.theme || `Week ${d.week}`);
        const datasets = [
            { label: 'Hope', data: sortedData.map(d => d.emotions.hope), borderColor: '#34d399', tension: 0.3 },
            { label: 'Gratitude', data: sortedData.map(d => d.emotions.gratitude), borderColor: '#f59e0b', tension: 0.3 },
            { label: 'Peace', data: sortedData.map(d => d.emotions.peace), borderColor: '#60a5fa', tension: 0.3 },
            { label: 'Struggle', data: sortedData.map(d => d.emotions.struggle), borderColor: '#f87171', tension: 0.3 },
        ];
        
        const computedStyle = getComputedStyle(document.documentElement);
        const textColor = `rgb(${computedStyle.getPropertyValue('--color-text-muted').trim()})`;
        const gridColor = `rgb(${computedStyle.getPropertyValue('--color-border').trim()})`;

        chartInstanceRef.current = new Chart(chartRef.current, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true, max: 10,
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: 'transparent' },
                    }
                },
                plugins: {
                    legend: { labels: { color: textColor } },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems: any) => `Week ${sortedData[tooltipItems[0].dataIndex].week}: ${tooltipItems[0].label}`
                        }
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };

    }, [data, themes]);

    return <div className="h-96 w-full p-4"><canvas ref={chartRef}></canvas></div>
};

const PersonalThemeCloud: React.FC<{ entries: SavedEntries }> = ({ entries }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const wordData = useMemo(() => {
        const fullText = Object.values(entries).flatMap(entry => Object.values(entry)).join(' ');
        const wordCounts: { [key: string]: number } = {};
        const words = fullText.toLowerCase().split(/[\s,.;:!?()]+/).filter(Boolean);

        words.forEach(word => {
            if (!stopWords.has(word) && word.length > 3) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
        return Object.entries(wordCounts).map(([text, value]) => [text, value * 2]);
    }, [entries]);

    useEffect(() => {
        if (canvasRef.current && wordData.length > 5 && typeof WordCloud !== 'undefined') {
             const computedStyle = getComputedStyle(document.documentElement);
             const cardBackgroundColor = computedStyle.getPropertyValue('--color-card-secondary-background').trim();
             const isDarkTheme = isColorDark(cardBackgroundColor);
            
            WordCloud(canvasRef.current, {
                list: wordData,
                gridSize: 8,
                weightFactor: (size: number) => size * 2,
                fontFamily: 'Lora, serif',
                color: isDarkTheme ? 'random-light' : 'random-dark',
                backgroundColor: `rgb(${cardBackgroundColor})`,
                rotateRatio: 0.3,
                minSize: 10,
                shrinkToFit: true,
            });
        }
    }, [wordData]);
    
    return (
        <div className="p-4">
             {wordData.length > 5 ? (
                <div className="relative aspect-video min-h-[400px]">
                    <canvas ref={canvasRef} className="w-full h-full"></canvas>
                </div>
            ) : (
                <div className="flex items-center justify-center min-h-[400px] text-center text-muted">
                    <p>Your theme cloud will appear here as you write more journal entries.</p>
                </div>
            )}
        </div>
    );
};

const MomentsOfGraceTimeline: React.FC<{ moments: MomentOfGrace[], themes: WeeklyTheme[] }> = ({ moments, themes }) => (
    <div className="p-6 space-y-6">
        {moments.map((moment, index) => (
            <div key={index} className="relative pl-8 animate-fade-in border-l-2 border-primary-light">
                <div className="absolute -left-3 top-1 h-5 w-5 bg-primary rounded-full border-4 border-card"></div>
                <p className="font-serif italic text-lg text-main">"{moment.moment}"</p>
                <p className="mt-2 text-sm text-muted">
                    From your reflection on Week {moment.week}: {themes.find(t => t.week === moment.week)?.theme}
                </p>
            </div>
        ))}
    </div>
);


export const JourneyMapModal: React.FC<JourneyMapModalProps> = ({ isOpen, onClose, savedEntries, themes }) => {
    const [view, setView] = useState<JourneyMapView>('arc');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emotionalArcData, setEmotionalArcData] = useState<EmotionDataPoint[] | null>(null);
    const [momentsOfGrace, setMomentsOfGrace] = useState<MomentOfGrace[] | null>(null);
    
    const hasEntries = useMemo(() => Object.keys(savedEntries).length > 0, [savedEntries]);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!hasEntries || !isOpen) return;

            setIsLoading(true);
            setError(null);
            
            try {
                // Fetch data in parallel
                const [arcData, graceData] = await Promise.all([
                    analyzeEmotionalArc(savedEntries),
                    extractMomentsOfGrace(savedEntries)
                ]);
                setEmotionalArcData(arcData);
                setMomentsOfGrace(graceData);
            } catch (err) {
                 const message = err instanceof Error ? err.message : "An unknown error occurred.";
                 setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen, hasEntries, savedEntries]);

    if (!isOpen) return null;

    const renderView = () => {
        if (isLoading) return <LoadingState message="This may take a moment..." />;
        if (error) return <div className="p-6 text-red-600"><strong>Error:</strong> {error}</div>;
        if (!hasEntries) return <EmptyState />;
        
        switch (view) {
            case 'arc':
                return emotionalArcData ? <EmotionalArcChart data={emotionalArcData} themes={themes} /> : null;
            case 'cloud':
                return <PersonalThemeCloud entries={savedEntries} />;
            case 'moments':
                return momentsOfGrace ? <MomentsOfGraceTimeline moments={momentsOfGrace} themes={themes} /> : null;
            default:
                return null;
        }
    };
    
    const tabs: {id: JourneyMapView, label: string}[] = [
        {id: 'arc', label: 'Emotional Arc'},
        {id: 'cloud', label: 'Theme Cloud'},
        {id: 'moments', label: 'Moments of Grace'},
    ];

    return (
        <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-in">
                <header className="flex items-center justify-between p-4 border-b border-default">
                    <h3 className="text-xl font-semibold text-main">My Journey Map</h3>
                    <button onClick={onClose} className="text-muted hover:text-main transition-colors" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                
                 <div className="p-2 border-b border-default bg-card-secondary">
                    <div className="flex items-center p-1 bg-card rounded-lg">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={`w-1/3 py-1.5 text-sm font-medium rounded-md transition-all ${view === tab.id ? 'bg-primary-light text-primary shadow-sm' : 'text-muted'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {renderView()}
                </div>
            </div>
        </div>
    );
};