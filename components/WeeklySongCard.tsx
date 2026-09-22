import React, { useState, useRef, useEffect } from 'react';
import type { WeeklyTheme } from '../types';
import { renderDevotionalAudio, audioBufferToWavBlob, downloadSongFile } from '../utils/devotionalAudio';
import { MASTER_TRACKS, type MasterTrackInfo } from '../constants/masterTracks';
import { saveCustomSong, getCustomSong, deleteCustomSong } from '../utils/customSongDb';

interface WeeklySongCardProps {
  entry: WeeklyTheme;
  lyrics?: string;
  isGeneratingLyrics?: boolean;
  onGenerateLyrics?: (week: number, theme: WeeklyTheme) => void;
  onShowToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

export const WeeklySongCard: React.FC<WeeklySongCardProps> = ({
  entry,
  lyrics,
  isGeneratingLyrics,
  onGenerateLyrics,
  onShowToast
}) => {
  const masterTrack: MasterTrackInfo | undefined = MASTER_TRACKS[entry.week];
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(() => {
    return masterTrack ? masterTrack.audioUrl : null;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => (masterTrack ? masterTrack.duration : 240));
  const [volume, setVolume] = useState(0.85);
  const [showLyrics, setShowLyrics] = useState(false);
  const [customAudioInfo, setCustomAudioInfo] = useState<{ filename: string; objectUrl: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedBlobRef = useRef<Blob | null>(null);

  // Set audio source when week changes & check for custom uploaded song in IndexedDB
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    cachedBlobRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    let isMounted = true;

    const loadWeekAudio = async () => {
      try {
        const savedCustom = await getCustomSong(entry.week);
        if (!isMounted) return;

        if (savedCustom) {
          const objUrl = URL.createObjectURL(savedCustom.blob);
          setCustomAudioInfo({ filename: savedCustom.filename, objectUrl: objUrl });
          setAudioUrl(objUrl);
          if (audioRef.current) {
            audioRef.current.src = objUrl;
            audioRef.current.load();
          }
          return;
        }
      } catch (e) {
        console.warn('Could not check custom song DB:', e);
      }

      if (!isMounted) return;
      setCustomAudioInfo(null);
      const track = MASTER_TRACKS[entry.week];
      if (track) {
        setAudioUrl(track.audioUrl);
        setDuration(track.duration);
        if (audioRef.current) {
          audioRef.current.src = track.audioUrl;
          audioRef.current.load();
        }
      } else {
        setAudioUrl(null);
        setDuration(240);
      }
    };

    loadWeekAudio();

    return () => {
      isMounted = false;
      if (customAudioInfo?.objectUrl) {
        URL.revokeObjectURL(customAudioInfo.objectUrl);
      }
    };
  }, [entry.week]);

  const prepareAudio = async (): Promise<string> => {
    const track = MASTER_TRACKS[entry.week];
    if (track) {
      setAudioUrl(track.audioUrl);
      return track.audioUrl;
    }
    if (audioUrl) return audioUrl;
    setIsLoadingAudio(true);
    try {
      const buffer = await renderDevotionalAudio(entry.songGenre || 'Country Gospel', 24);
      const blob = audioBufferToWavBlob(buffer);
      cachedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      return url;
    } catch (err) {
      console.error('Audio generation failed:', err);
      throw err;
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        let currentUrl = audioUrl;
        const track = MASTER_TRACKS[entry.week];
        if (!currentUrl) {
          if (track) {
            currentUrl = track.audioUrl;
            setAudioUrl(currentUrl);
          } else {
            currentUrl = await prepareAudio();
          }
        }

        if (audioRef.current) {
          if (!audioRef.current.src || !audioRef.current.src.endsWith(currentUrl)) {
            audioRef.current.src = currentUrl;
            audioRef.current.load();
          }
          audioRef.current.volume = volume;
          await audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error('Audio play error:', err);
      const msg = err instanceof Error ? err.message : 'Could not play audio.';
      onShowToast(msg, 'error');
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const handleDownloadLyrics = () => {
    if (!lyrics) return;
    const content = `SACRED STEPS TO REDEMPTION - WEEK ${entry.week} THEME SONG
Title: ${entry.songTitle}
AI Artist: ${entry.songArtist || 'Worship Series'}
Genre: ${entry.songGenre || 'Gospel'}
Theme: ${entry.theme}

=== LYRICS ===
${lyrics}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const filename = `SacredSteps_W${entry.week.toString().padStart(2, '0')}_Lyrics.txt`;
    downloadSongFile(blob, filename);
    onShowToast('Lyrics downloaded successfully!', 'success');
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div id={`weekly-song-week-${entry.week}`} className="bg-card rounded-xl shadow-md border-t-4 border-primary p-6 transition-all hover:shadow-lg">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
                Worship Series &bull; Week {entry.week}
              </span>
              {entry.songGenre && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-card-secondary text-muted border border-border">
                  {entry.songGenre}
                </span>
              )}
              {customAudioInfo && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Custom Uploaded Audio
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-main mt-0.5">
              {entry.songTitle}
            </h3>
            {entry.songArtist && (
              <p className="text-sm text-muted">
                Artist: <span className="font-semibold text-main">{entry.songArtist}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Stream Player */}
      <div className="mt-4 p-4 rounded-lg bg-card-secondary border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-ping' : 'bg-primary'}`}></span>
              {customAudioInfo ? 'Custom Devotional Audio' : 'Stream Devotional Soundscape'}
            </span>
          </div>
          <span className="text-xs text-muted font-mono font-medium">
            {`${formatTime(currentTime)} / ${formatTime(duration)}`}
          </span>
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl || (masterTrack ? masterTrack.audioUrl : undefined)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              const d = audioRef.current.duration;
              if (d && !isNaN(d) && d > 0) {
                setDuration(d);
              }
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          onError={() => {
            setIsPlaying(false);
          }}
          preload="metadata"
        />

        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            id={`play-stream-btn-w${entry.week}`}
            onClick={togglePlay}
            disabled={isLoadingAudio}
            className="w-11 h-11 rounded-full bg-primary text-on-primary hover:bg-primary-hover flex items-center justify-center shadow-md transition-transform transform active:scale-95 shrink-0 disabled:opacity-50"
            aria-label={isPlaying ? 'Pause Audio' : 'Stream and Listen to Audio'}
            title={isPlaying ? 'Pause Audio' : 'Play Devotional Soundscape'}
          >
            {isLoadingAudio ? (
              <svg className="animate-spin h-5 w-5 text-on-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Scrubber Slider */}
          <div className="flex-1 flex flex-col justify-center">
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 240}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-primary h-2 bg-border rounded-lg cursor-pointer"
              aria-label="Audio scrubber"
            />
            {/* Visualizer Wave simulation */}
            <div className="flex items-center gap-1 mt-2 h-4 px-1">
              {[4, 8, 14, 9, 16, 20, 11, 6, 18, 12, 15, 8, 14, 18, 10, 5].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-200 ${
                    isPlaying ? 'bg-primary' : 'bg-muted/40'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(4, Math.sin(currentTime * 3 + i) * 16 + 8)}px` : `${h}px`
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
              {customAudioInfo ? (
                <span className="font-medium text-main truncate max-w-[280px]">
                  Custom Audio: {customAudioInfo.filename}
                </span>
              ) : masterTrack ? (
                <span className="font-medium text-main">{masterTrack.label}</span>
              ) : (
                <span className="font-medium text-main">Devotional Master Track Available</span>
              )}
            </div>
          </div>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 accent-primary h-1.5 bg-border rounded-lg cursor-pointer"
              aria-label="Volume slider"
            />
          </div>
        </div>
      </div>

      {/* Streaming Platform Outlinks */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted mr-1">Stream On:</span>
        {entry.songLinks?.spotify && (
          <a
            href={entry.songLinks.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-card-secondary hover:bg-card border border-border text-main hover:text-green-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Spotify
          </a>
        )}
        {entry.songLinks?.appleMusic && (
          <a
            href={entry.songLinks.appleMusic}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-card-secondary hover:bg-card border border-border text-main hover:text-pink-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.62 1.35-.57.65-1.07 1.71-.93 2.73 1 .08 2.01-.48 2.63-1.23z" />
            </svg>
            Apple Music
          </a>
        )}
        {entry.songLinks?.youtube && (
          <a
            href={entry.songLinks.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-card-secondary hover:bg-card border border-border text-main hover:text-red-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            YouTube Music
          </a>
        )}
        <a
          href={
            entry.songLinks?.amazonMusic ||
            `https://music.amazon.com/search/${encodeURIComponent(
              `${entry.songTitle} ${entry.songArtist || 'Sacred Steps'}`
            )}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-card-secondary hover:bg-card border border-border text-main hover:text-amber-500 transition-colors"
          title={`Listen to ${entry.songTitle} on Amazon Music`}
        >
          <svg className="w-3.5 h-3.5 mr-1.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.958 10.09c0 1.272-.062 2.33-.872 3.39-1.258 1.645-3.328 1.954-5.234 1.055-.494-.233-.85-.646-.85-1.205 0-.756.59-1.353 1.346-1.353.308 0 .584.116.804.286 1.062.822 2.457.658 3.125-.192.344-.438.452-.962.452-1.523v-.063c-.87.03-1.815.03-2.738-.073-2.176-.245-3.664-1.517-3.664-3.568 0-2.19 1.76-3.642 4.148-3.642 1.722 0 2.875.766 3.483 1.766V4.497c0-.737.593-1.332 1.33-1.332.738 0 1.33.595 1.33 1.332v5.626c0 .73-.59 1.32-1.32 1.32-.738 0-1.33-.59-1.33-1.32v-.033h-.035zm-2.229-2.528c0-1.127-.798-1.884-1.99-1.884-.972 0-1.745.69-1.745 1.674 0 1.037.765 1.65 1.93 1.71 1.038.053 1.805-.44 1.805-1.5zm8.17 11.233c-3.19 2.37-7.63 3.65-11.89 3.65-4.26 0-8.48-1.34-11.89-3.62-.51-.34-.28-.96.31-.75 3.67 1.32 7.76 2.03 11.58 2.03 3.82 0 7.91-.71 11.58-2.03.59-.21.82.41.31.72zm1.22-1.83c-.32-.4-.2-.89.28-1.13.48-.24 1.06-.06 1.38.34.42.54.78 1.13 1.07 1.74.22.46-.01.99-.48 1.16-.47.17-.99-.06-1.18-.52-.25-.52-.55-1.03-.9-1.49l-.17-.1z" />
          </svg>
          Amazon Music
        </a>
      </div>

      {/* Song Lyrics Section */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${showLyrics ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>{showLyrics ? 'Hide Devotional Lyrics' : 'View Devotional Lyrics'}</span>
          </button>

          <div className="flex items-center gap-2">
            {lyrics && (
              <button
                onClick={handleDownloadLyrics}
                className="text-xs text-muted hover:text-main flex items-center gap-1 px-2 py-1 rounded bg-card hover:bg-card-secondary border border-border transition-colors"
                title="Download lyrics file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Lyrics</span>
              </button>
            )}

            {!lyrics && onGenerateLyrics && (
              <button
                onClick={() => onGenerateLyrics(entry.week, entry)}
                disabled={isGeneratingLyrics}
                className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1 disabled:opacity-50"
              >
                {isGeneratingLyrics ? 'Generating...' : 'Generate Theme Lyrics'}
              </button>
            )}
          </div>
        </div>

        {showLyrics && (
          <div className="mt-3 p-4 rounded-lg bg-card-secondary border border-border text-sm leading-relaxed text-main whitespace-pre-line font-serif animate-fade-in">
            {lyrics ? (
              lyrics
            ) : (
              <div className="text-center py-4 text-muted font-sans text-xs">
                <p>No lyrics generated yet for "{entry.songTitle}".</p>
                {onGenerateLyrics && (
                  <button
                    onClick={() => onGenerateLyrics(entry.week, entry)}
                    disabled={isGeneratingLyrics}
                    className="mt-2 px-3 py-1.5 rounded bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover transition-colors"
                  >
                    {isGeneratingLyrics ? 'Composing Lyrics...' : 'Generate Devotional Lyrics Now'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
