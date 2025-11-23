import React, { useEffect, useRef, useMemo } from 'react';
import type { GratitudeEntry } from '../types';

// Declare WordCloud for TypeScript since it's loaded from a script tag
declare const WordCloud: any;

interface GratitudeWordCloudProps {
  entries: GratitudeEntry[];
}

// Common English stop words, plus some context-specific ones.
const stopWords = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'im',
  'am', 'for', 'grateful'
]);

const isColorDark = (rgbString: string) => {
    if (!rgbString) return false;
    const [r, g, b] = rgbString.split(',').map(s => parseInt(s.trim(), 10));
    // Formula for perceived brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
};


export const GratitudeWordCloud: React.FC<GratitudeWordCloudProps> = ({ entries }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const wordData = useMemo(() => {
    const wordCounts: { [key: string]: number } = {};
    
    entries.forEach(entry => {
      // Basic word tokenization: split by spaces and punctuation, convert to lowercase
      const words = entry.text.toLowerCase().split(/[\s,.;:!?()]+/).filter(Boolean);
      
      words.forEach(word => {
        if (!stopWords.has(word) && word.length > 2) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    // Convert to the format expected by wordcloud2.js: [word, count]
    return Object.entries(wordCounts).map(([text, value]) => [text, value * 5]); // Multiply to make less frequent words more visible
  }, [entries]);

  useEffect(() => {
    if (canvasRef.current && wordData.length > 5 && typeof WordCloud !== 'undefined') {
      const computedStyle = getComputedStyle(document.documentElement);
      const cardBackgroundColor = computedStyle.getPropertyValue('--color-card-background').trim();
      const isDarkTheme = isColorDark(cardBackgroundColor);

      WordCloud(canvasRef.current, {
        list: wordData,
        gridSize: 8,
        weightFactor: (size: number) => size * 2.5,
        fontFamily: 'Lora, serif',
        color: isDarkTheme ? 'random-light' : 'random-dark',
        backgroundColor: `rgb(${cardBackgroundColor})`,
        rotateRatio: 0.5,
        minSize: 8,
        shrinkToFit: true,
      });
    }
  }, [wordData]);

  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-muted mb-2">Your Gratitude Landscape</h3>
        {wordData.length > 5 ? (
          <div className="relative aspect-video min-h-[150px]">
            <canvas ref={canvasRef} className="w-full h-full"></canvas>
          </div>
        ) : (
          <div className="relative flex items-center justify-center min-h-[150px]">
            <p className="text-xs text-subtle text-center px-4">
              Add more gratitude entries to see your personal word cloud appear here!
            </p>
          </div>
        )}
    </div>
  );
};