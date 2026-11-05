import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Volume2,
  Drum,
  Sparkles,
  Award,
  Flame,
  Sliders,
  Hand,
  ChevronRight,
  Music,
  CheckCircle,
} from 'lucide-react';
import { STRING_INFO, getNoteForStringFret } from '../data/musicData';
import { audioEngine } from '../utils/audioEngine';

export default function TabHighway({
  lang,
  t,
  allSongs,
  selectedSong,
  onSelectSong,
  guitarTone,
  setGuitarTone,
  isMicActive,
  onToggleMic,
  userProgress,
  onCompleteSong,
}) {
  const [filterStyle, setFilterStyle] = useState('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tempoScale, setTempoScale] = useState(1.0); // 0.5x to 1.25x
  const [practiceWaitMode, setPracticeWaitMode] = useState(false);
  const [autoSynthGuide, setAutoSynthGuide] = useState(true);
  const [drumBacking, setDrumBacking] = useState(true);

  // Scoring & Real-Time Feedback State
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitStatuses, setHitStatuses] = useState({}); // { [noteId]: 'hit' | 'missed' }
  const [lastFeedback, setLastFeedback] = useState(null); // { text, type, key }
  const [detectedPitch, setDetectedPitch] = useState(null);
  const [waitingNote, setWaitingNote] = useState(null);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [activeNeckFlash, setActiveNeckFlash] = useState(null); // { string, fret }

  // Refs for animation loop precision
  const rafRef = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const currentBeatRef = useRef(0);
  const hitStatusesRef = useRef({});
  const autoPlayedRef = useRef({});
  const lastDrumBeatRef = useRef(-1);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef = useRef(0);

  const filteredSongs = useMemo(() => {
    if (filterStyle === 'all') return allSongs;
    if (filterStyle === 'custom') return allSongs.filter((s) => s.isCustom);
    return allSongs.filter((s) => s.style === filterStyle);
  }, [allSongs, filterStyle]);

  const maxSongBeat = useMemo(() => {
    if (!selectedSong?.notes?.length) return 16;
    return Math.max(...selectedSong.notes.map((n) => n.beat)) + 2.5;
  }, [selectedSong]);

  // Reset track when song changes
  useEffect(() => {
    handleRestart(false);
    if (selectedSong?.recommendedTone) {
      setGuitarTone(selectedSong.recommendedTone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSong?.id]);

  const handleRestart = (autoStart = false) => {
    setIsPlaying(autoStart);
    setCurrentBeat(0);
    currentBeatRef.current = 0;
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    setMaxCombo(0);
    maxComboRef.current = 0;
    setHitStatuses({});
    hitStatusesRef.current = {};
    autoPlayedRef.current = {};
    lastDrumBeatRef.current = -1;
    setWaitingNote(null);
    setSessionFinished(false);
    setLastFeedback(null);
    lastFrameTimeRef.current = null;
  };

  // Register a note hit (via Microphone, Fretboard click, Keyboard, or Auto-Guide)
  const triggerNoteHit = (note, quality = 'PERFECT') => {
    if (hitStatusesRef.current[note.id]) return;
    hitStatusesRef.current = { ...hitStatusesRef.current, [note.id]: 'hit' };
    setHitStatuses({ ...hitStatusesRef.current });

    const newCombo = comboRef.current + 1;
    comboRef.current = newCombo;
    setCombo(newCombo);
    if (newCombo > maxComboRef.current) {
      maxComboRef.current = newCombo;
      setMaxCombo(newCombo);
    }

    const multiplier = Math.min(4, 1 + Math.floor(newCombo / 4));
    const basePoints = quality === 'PERFECT' ? 100 : 75;
    const nextScore = scoreRef.current + basePoints * multiplier;
    scoreRef.current = nextScore;
    setScore(nextScore);

    setLastFeedback({
      text:
        quality === 'PERFECT' ? t.highway.hitPerfect : t.highway.hitGreat,
      type: 'hit',
      key: Date.now(),
    });

    setActiveNeckFlash({ string: note.string, fret: note.fret });
    setWaitingNote(null);
  };

  // Handle user manually playing a string & fret on the interactive fretboard (or keyboard)
  const handleManualPluck = (stringNumber, fretNumber) => {
    const playedInfo = audioEngine.playStringFret(
      stringNumber,
      fretNumber,
      guitarTone
    );
    setActiveNeckFlash({ string: stringNumber, fret: fretNumber });

    // Check if there is an active or waiting note on the highway near currentBeat
    const beatNow = currentBeatRef.current;
    const candidate = selectedSong.notes.find(
      (n) =>
        !hitStatusesRef.current[n.id] &&
        Math.abs(n.beat - beatNow) <= 0.85 &&
        ((n.string === stringNumber && n.fret === fretNumber) ||
          getNoteForStringFret(n.string, n.fret).midi === playedInfo.midi)
    );

    if (candidate) {
      triggerNoteHit(candidate, 'PERFECT');
    } else if (waitingNote) {
      const targetInfo = getNoteForStringFret(
        waitingNote.string,
        waitingNote.fret
      );
      if (
        (waitingNote.string === stringNumber &&
          waitingNote.fret === fretNumber) ||
        targetInfo.midi === playedInfo.midi
      ) {
        triggerNoteHit(waitingNote, 'PERFECT');
      }
    }
  };

  // Keyboard shortcuts (1-6 to pluck active/upcoming fret on strings 1-6, Space to play/pause)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
        return;
      }
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 6) {
        const beatNow = currentBeatRef.current;
        // Find upcoming note on that string to make keyboard jamming intuitive
        const upcomingOnString = selectedSong.notes.find(
          (n) =>
            !hitStatusesRef.current[n.id] &&
            n.string === keyNum &&
            Math.abs(n.beat - beatNow) <= 1.2
        );
        const fretToPlay = upcomingOnString ? upcomingOnString.fret : 0;
        handleManualPluck(keyNum, fretToPlay);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSong, guitarTone, waitingNote]);

  // Main 60FPS Highway & Microphone Pitch Loop
  useEffect(() => {
    let active = true;

    const tick = (timestamp) => {
      if (!active) return;

      // 1. Poll live microphone pitch if enabled
      let livePitch = null;
      if (isMicActive) {
        livePitch = audioEngine.getDetectedPitch();
        if (livePitch) {
          setDetectedPitch(livePitch);
        }
      }

      if (isPlaying && !sessionFinished) {
        if (!lastFrameTimeRef.current) {
          lastFrameTimeRef.current = timestamp;
        }
        const deltaSec = (timestamp - lastFrameTimeRef.current) / 1000;
        lastFrameTimeRef.current = timestamp;

        const effectiveBpm = (selectedSong?.bpm || 96) * tempoScale;
        const beatsPerSec = effectiveBpm / 60;
        let nextBeat = currentBeatRef.current + deltaSec * beatsPerSec;

        // Check if Practice "Wait for Note" mode should pause on an unhit note
        const unhitAtPlayhead = selectedSong.notes.find(
          (n) =>
            !hitStatusesRef.current[n.id] &&
            n.beat <= nextBeat &&
            n.beat >= currentBeatRef.current - 0.35
        );

        // Check if microphone matches any note in the hit window
        if (livePitch) {
          const micCandidate = selectedSong.notes.find((n) => {
            if (hitStatusesRef.current[n.id]) return false;
            if (Math.abs(n.beat - nextBeat) > 0.65) return false;
            const target = getNoteForStringFret(n.string, n.fret);
            // Match exact MIDI (±1 semitone tolerance) or matching pitchClass
            return (
              Math.abs(target.midi - livePitch.midi) <= 1 ||
              target.pitchClass === livePitch.pitchClass
            );
          });
          if (micCandidate) {
            triggerNoteHit(micCandidate, 'PERFECT');
          }
        }

        if (practiceWaitMode && unhitAtPlayhead && !hitStatusesRef.current[unhitAtPlayhead.id]) {
          // Pause at the note until user plays it on mic or clicks it on fretboard
          nextBeat = unhitAtPlayhead.beat;
          setWaitingNote(unhitAtPlayhead);
          if (!autoPlayedRef.current[unhitAtPlayhead.id] && autoSynthGuide) {
            autoPlayedRef.current[unhitAtPlayhead.id] = true;
            audioEngine.playStringFret(
              unhitAtPlayhead.string,
              unhitAtPlayhead.fret,
              guitarTone
            );
          }
        } else {
          setWaitingNote(null);

          // Drum backing beat pulse
          const wholeBeat = Math.floor(nextBeat);
          if (
            drumBacking &&
            wholeBeat > lastDrumBeatRef.current &&
            wholeBeat >= 1
          ) {
            lastDrumBeatRef.current = wholeBeat;
            if (wholeBeat % 2 === 1) {
              audioEngine.playDrumOrClick('kick');
            } else {
              audioEngine.playDrumOrClick('snare');
            }
          }

          // Check notes crossing the playhead
          selectedSong.notes.forEach((n) => {
            if (
              n.beat <= nextBeat &&
              !autoPlayedRef.current[n.id]
            ) {
              autoPlayedRef.current[n.id] = true;
              if (autoSynthGuide) {
                audioEngine.playStringFret(n.string, n.fret, guitarTone);
                setActiveNeckFlash({ string: n.string, fret: n.fret });
                // In Play-Along mode (when mic is off and wait mode is off), credit play-along hits
                if (!isMicActive && !hitStatusesRef.current[n.id]) {
                  triggerNoteHit(n, 'GREAT');
                }
              }
            }

            // Mark missed notes that passed well behind playhead
            if (
              n.beat < nextBeat - 0.65 &&
              !hitStatusesRef.current[n.id]
            ) {
              hitStatusesRef.current = {
                ...hitStatusesRef.current,
                [n.id]: 'missed',
              };
              setHitStatuses({ ...hitStatusesRef.current });
              comboRef.current = 0;
              setCombo(0);
              setLastFeedback({
                text: t.highway.hitMiss,
                type: 'miss',
                key: Date.now(),
              });
            }
          });
        }

        currentBeatRef.current = nextBeat;
        setCurrentBeat(nextBeat);

        // Check for end of track
        if (nextBeat >= maxSongBeat) {
          setIsPlaying(false);
          setSessionFinished(true);
          const totalNotes = selectedSong.notes.length || 1;
          const hits = Object.values(hitStatusesRef.current).filter(
            (v) => v === 'hit'
          ).length;
          const acc = Math.round((hits / totalNotes) * 100);
          const stars = acc >= 85 ? 3 : acc >= 60 ? 2 : 1;
          const xpEarned = stars * 50 + hits * 5;

          if (stars >= 2) {
            confetti({
              particleCount: 70,
              spread: 65,
              origin: { y: 0.6 },
            });
          }
          onCompleteSong(selectedSong.id, {
            score: scoreRef.current,
            stars,
            accuracy: acc,
            xpEarned,
          });
        }
      } else {
        lastFrameTimeRef.current = null;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPlaying,
    isMicActive,
    practiceWaitMode,
    autoSynthGuide,
    drumBacking,
    tempoScale,
    guitarTone,
    selectedSong,
    sessionFinished,
    maxSongBeat,
  ]);

  const totalNotes = selectedSong?.notes?.length || 1;
  const hitCount = Object.values(hitStatuses).filter((s) => s === 'hit').length;
  const processedCount = Object.keys(hitStatuses).length;
  const accuracy =
    processedCount > 0 ? Math.round((hitCount / processedCount) * 100) : 100;
  const multiplier = Math.min(4, 1 + Math.floor(combo / 4));

  // Find next upcoming note to highlight on the interactive neck
  const nextTargetNote = useMemo(() => {
    if (waitingNote) return waitingNote;
    return selectedSong?.notes?.find(
      (n) => !hitStatuses[n.id] && n.beat >= currentBeat - 0.4
    );
  }, [selectedSong, hitStatuses, currentBeat, waitingNote]);

  return (
    <div className="highway-layout">
      {/* Left Sidebar: Song & Riff Selector */}
      <aside className="song-sidebar">
        <div className="sidebar-header">
          <h3>
            <Music size={17} />
            <span>{t.highway.selectSong}</span>
          </h3>
          <div className="style-filter-pills">
            {[
              { id: 'all', label: t.highway.filterAll },
              { id: 'acoustic', label: t.highway.filterAcoustic },
              { id: 'electric', label: t.highway.filterElectric },
              { id: 'custom', label: t.highway.filterCustom },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-pill ${filterStyle === tab.id ? 'active' : ''}`}
                onClick={() => setFilterStyle(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="song-list-scroll">
          {filteredSongs.map((song) => {
            const isSelected = selectedSong?.id === song.id;
            const prog = userProgress?.[song.id];
            return (
              <button
                key={song.id}
                type="button"
                className={`song-card-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSong(song)}
              >
                <div className="song-card-top">
                  <span className={`song-style-badge ${song.style}`}>
                    {song.style === 'electric' ? '⚡ Electric' : '🎸 Acoustic'}
                  </span>
                  <span className="song-bpm-badge">{song.bpm} BPM</span>
                </div>
                <div className="song-card-title">
                  {lang === 'en' ? song.titleEn : song.titleEs}
                </div>
                <div className="song-card-meta">
                  <span>{song.artist}</span>
                  {prog?.stars > 0 && (
                    <span className="song-stars">
                      {'★'.repeat(prog.stars)}
                      {'☆'.repeat(3 - prog.stars)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center & Right Main Studio Stage */}
      <section className="highway-main-stage">
        {/* Top Controls & Score HUD Bar */}
        <div className="highway-hud-bar">
          <div className="song-active-info">
            <div className="stage-pill">
              Stage {selectedSong.stage || 1} •{' '}
              {lang === 'en'
                ? selectedSong.difficulty
                : selectedSong.difficultyEs}
            </div>
            <h2>
              {lang === 'en' ? selectedSong.titleEn : selectedSong.titleEs}
            </h2>
          </div>

          {/* Live Score & Streak Counters */}
          <div className="hud-stats-group">
            <div className="hud-stat-box">
              <span className="hud-label">{t.highway.score}</span>
              <span className="hud-value amber">{score.toLocaleString()}</span>
            </div>
            <div className="hud-stat-box">
              <span className="hud-label">{t.highway.combo}</span>
              <span className="hud-value green">
                <Flame size={15} /> {combo} ({multiplier}x)
              </span>
            </div>
            <div className="hud-stat-box">
              <span className="hud-label">{t.highway.accuracy}</span>
              <span className="hud-value purple">{accuracy}%</span>
            </div>
            <div className="hud-stat-box mic-pitch-box">
              <span className="hud-label">{t.highway.detectedPitch}</span>
              <span className="hud-value cyan">
                {isMicActive
                  ? detectedPitch
                    ? `${detectedPitch.note} (${detectedPitch.frequency}Hz)`
                    : t.highway.noSignal
                  : 'Mic Off'}
              </span>
            </div>
          </div>
        </div>

        {/* Transport & Practice Mode Toolbar */}
        <div className="highway-transport-bar">
          <div className="transport-buttons">
            <button
              type="button"
              className={`play-btn-primary ${isPlaying ? 'playing' : ''}`}
              onClick={() => {
                if (sessionFinished) {
                  handleRestart(true);
                } else {
                  setIsPlaying(!isPlaying);
                }
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span>{isPlaying ? t.highway.pause : t.highway.play}</span>
            </button>

            <button
              type="button"
              className="transport-btn"
              onClick={() => handleRestart(false)}
              title={t.highway.restart}
            >
              <RotateCcw size={16} />
              <span>{t.highway.restart}</span>
            </button>

            <button
              type="button"
              className={`transport-toggle ${practiceWaitMode ? 'active' : ''}`}
              onClick={() => setPracticeWaitMode(!practiceWaitMode)}
              title={t.highway.practiceModeDesc}
            >
              <Hand size={15} />
              <span>{t.highway.practiceMode}</span>
            </button>

            <button
              type="button"
              className={`transport-toggle ${isMicActive ? 'active-mic' : ''}`}
              onClick={onToggleMic}
            >
              {isMicActive ? <Mic size={15} /> : <MicOff size={15} />}
              <span>
                {isMicActive ? t.nav.micActive : t.nav.micOff}
              </span>
            </button>

            <button
              type="button"
              className={`transport-toggle ${autoSynthGuide ? 'active' : ''}`}
              onClick={() => setAutoSynthGuide(!autoSynthGuide)}
            >
              <Volume2 size={15} />
              <span>{t.highway.backingSynth}</span>
            </button>

            <button
              type="button"
              className={`transport-toggle ${drumBacking ? 'active' : ''}`}
              onClick={() => setDrumBacking(!drumBacking)}
            >
              <Drum size={15} />
              <span>{t.highway.drumBacking}</span>
            </button>
          </div>

          <div className="tempo-slider-box">
            <Sliders size={14} />
            <span>
              {t.highway.tempo}: <strong>{Math.round(tempoScale * 100)}%</strong>{' '}
              ({Math.round((selectedSong?.bpm || 96) * tempoScale)} BPM)
            </span>
            <input
              type="range"
              min="0.4"
              max="1.25"
              step="0.05"
              value={tempoScale}
              onChange={(e) => setTempoScale( parseFloat(e.target.value) )}
            />
          </div>
        </div>

        {/* THE 6-STRING COLOR-CODED SCROLLING TAB HIGHWAY */}
        <div className="tab-highway-canvas">
          {/* Hit Feedback Floating Badge */}
          {lastFeedback && (
            <div
              key={lastFeedback.key}
              className={`hit-feedback-badge ${lastFeedback.type}`}
            >
              {lastFeedback.text}
            </div>
          )}

          {/* Waiting for Note Prompt Banner (Yousician Practice Mode) */}
          {waitingNote && (
            <div className="waiting-note-banner">
              <Sparkles size={16} />
              <span>
                {t.highway.waitingForNote} {waitingNote.string} •{' '}
                {waitingNote.fret === 0
                  ? t.highway.openString
                  : `${t.highway.fretLabel} ${waitingNote.fret}`}{' '}
                ({getNoteForStringFret(waitingNote.string, waitingNote.fret).note})
              </span>
            </div>
          )}

          {/* Vertical Beat Grid Lines */}
          {Array.from({ length: Math.ceil(maxSongBeat) + 2 }).map((_, beatIdx) => {
            const beatDelta = beatIdx - currentBeat;
            if (beatDelta < -1.5 || beatDelta > 8) return null;
            const leftPercent = 18 + beatDelta * 11.5;
            return (
              <div
                key={beatIdx}
                className="highway-beat-line"
                style={{ left: `${leftPercent}%` }}
              >
                <span className="beat-num-marker">{beatIdx}</span>
              </div>
            );
          })}

          {/* Playhead Target Laser Line at 18% */}
          <div className="highway-playhead-laser">
            <div className="playhead-top-cap" />
            <div className="playhead-bottom-cap" />
          </div>

          {/* 6 Horizontal Guitar Strings (1 = High e at Top, 6 = Low E at Bottom) */}
          <div className="highway-strings-container">
            {STRING_INFO.map((str) => {
              const isTargetString = nextTargetNote?.string === str.string;
              return (
                <div key={str.string} className="highway-string-lane">
                  {/* Left String Peg Badge */}
                  <button
                    type="button"
                    className={`string-lane-badge ${isTargetString ? 'pulsing' : ''}`}
                    style={{
                      borderColor: str.color,
                      boxShadow: isTargetString ? `0 0 14px ${str.glow}` : 'none',
                    }}
                    onClick={() => handleManualPluck(str.string, 0)}
                    title={`Click to pluck Open String ${str.string} (${str.note})`}
                  >
                    <span
                      className="string-num-circle"
                      style={{ backgroundColor: str.color }}
                    >
                      {str.string}
                    </span>
                    <span className="string-note-code">{str.name}</span>
                  </button>

                  {/* Physical String Line */}
                  <div
                    className="highway-string-wire"
                    style={{
                      height: `${1.5 + str.string * 0.45}px`,
                      background: `linear-gradient(90deg, ${str.color} 0%, rgba(255,255,255,0.22) 100%)`,
                    }}
                  />

                  {/* Playhead Target Ring on each string */}
                  <div
                    className="playhead-string-ring"
                    style={{
                      borderColor: str.color,
                      boxShadow: isTargetString ? `0 0 16px ${str.color}` : 'none',
                    }}
                  />

                  {/* Scrolling Notes on this String */}
                  {selectedSong.notes
                    .filter((n) => n.string === str.string)
                    .map((note) => {
                      const beatDelta = note.beat - currentBeat;
                      if (beatDelta < -1.4 || beatDelta > 7.5) return null;
                      const leftPercent = 18 + beatDelta * 11.5;
                      const status = hitStatuses[note.id]; // 'hit' | 'missed' | undefined
                      const noteInfo = getNoteForStringFret(
                        note.string,
                        note.fret
                      );

                      return (
                        <button
                          key={note.id}
                          type="button"
                          className={`highway-note-gem ${status || ''}`}
                          style={{
                            left: `${leftPercent}%`,
                            backgroundColor:
                              status === 'hit'
                                ? '#10b981'
                                : status === 'missed'
                                ? '#475569'
                                : str.color,
                            boxShadow:
                              status === 'hit'
                                ? '0 0 20px rgba(16, 185, 129, 0.85)'
                                : `0 4px 16px ${str.glow}`,
                          }}
                          onClick={() =>
                            handleManualPluck(note.string, note.fret)
                          }
                        >
                          <span className="gem-fret-number">{note.fret}</span>
                          <span className="gem-note-sub">
                            {note.label || noteInfo.pitchClass}
                          </span>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coach Tip Bar */}
        <div className="coach-tip-banner">
          <div className="coach-badge">
            <Award size={15} />
            <span>{t.highway.coachTip}:</span>
          </div>
          <p>{lang === 'en' ? selectedSong.tipEn : selectedSong.tipEs}</p>
          <span className="keyboard-shortcut-pill">{t.highway.keyboardHint}</span>
        </div>

        {/* LIVE INTERACTIVE 15-FRET GUITAR NECK (Click any string/fret to play & score) */}
        <div className="interactive-neck-panel">
          <div className="neck-panel-header">
            <span>{t.highway.interactiveNeck}</span>
            {nextTargetNote && (
              <span className="next-target-pill">
                Next: String {nextTargetNote.string} • Fret{' '}
                {nextTargetNote.fret} (
                {
                  getNoteForStringFret(
                    nextTargetNote.string,
                    nextTargetNote.fret
                  ).note
                }
                )
              </span>
            )}
          </div>

          <div className="guitar-fretboard-grid">
            {/* Fret Numbers Row (0 to 15) */}
            <div className="fret-numbers-row">
              <div className="fret-num-cell string-label-col">Str</div>
              {Array.from({ length: 16 }).map((_, fretIdx) => (
                <div
                  key={fretIdx}
                  className={`fret-num-cell ${
                    [3, 5, 7, 9, 12, 15].includes(fretIdx) ? 'inlay-fret' : ''
                  }`}
                >
                  {fretIdx === 0 ? 'Open' : fretIdx}
                </div>
              ))}
            </div>

            {/* 6 Strings on the Neck */}
            {STRING_INFO.map((str) => (
              <div key={str.string} className="fretboard-string-row">
                <div
                  className="fret-string-name"
                  style={{ color: str.color }}
                >
                  {str.string}:{str.name}
                </div>
                {Array.from({ length: 16 }).map((_, fretIdx) => {
                  const isTarget =
                    nextTargetNote &&
                    nextTargetNote.string === str.string &&
                    nextTargetNote.fret === fretIdx;
                  const isFlashing =
                    activeNeckFlash &&
                    activeNeckFlash.string === str.string &&
                    activeNeckFlash.fret === fretIdx;
                  const noteData = getNoteForStringFret(str.string, fretIdx);

                  return (
                    <button
                      key={fretIdx}
                      type="button"
                      className={`fret-cell ${fretIdx === 0 ? 'nut-cell' : ''} ${
                        isTarget ? 'target-fret' : ''
                      } ${isFlashing ? 'flashing-fret' : ''}`}
                      onClick={() => handleManualPluck(str.string, fretIdx)}
                    >
                      <span
                        className="neck-wire"
                        style={{
                          backgroundColor: str.color,
                          height: `${1 + str.string * 0.35}px`,
                        }}
                      />
                      {(isTarget || isFlashing || fretIdx === 0) && (
                        <span
                          className="fret-note-dot"
                          style={{
                            backgroundColor: isTarget
                              ? str.color
                              : isFlashing
                              ? '#10b981'
                              : 'rgba(30, 41, 59, 0.9)',
                            borderColor: str.color,
                          }}
                        >
                          {isTarget ? fretIdx : noteData.pitchClass}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* End of Session Celebration Modal */}
        {sessionFinished && (
          <div className="session-modal-overlay">
            <div className="session-modal-card">
              <CheckCircle size={42} className="text-emerald" />
              <h2>{t.highway.songComplete}</h2>
              <p className="modal-song-name">
                {lang === 'en' ? selectedSong.titleEn : selectedSong.titleEs}
              </p>

              <div className="stars-display-row">
                {[1, 2, 3].map((starNum) => {
                  const earned =
                    (accuracy >= 85 ? 3 : accuracy >= 60 ? 2 : 1) >= starNum;
                  return (
                    <span
                      key={starNum}
                      className={`star-trophy ${earned ? 'gold' : 'dim'}`}
                    >
                      ★
                    </span>
                  );
                })}
              </div>

              <div className="modal-stats-grid">
                <div className="modal-stat">
                  <span>{t.highway.score}</span>
                  <strong>{score.toLocaleString()}</strong>
                </div>
                <div className="modal-stat">
                  <span>{t.highway.accuracy}</span>
                  <strong>{accuracy}%</strong>
                </div>
                <div className="modal-stat">
                  <span>{t.highway.notesHit}</span>
                  <strong>
                    {hitCount} / {totalNotes}
                  </strong>
                </div>
                <div className="modal-stat">
                  <span>{t.highway.maxStreak}</span>
                  <strong>{maxCombo}</strong>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="play-btn-primary"
                  onClick={() => handleRestart(true)}
                >
                  <RotateCcw size={16} />
                  <span>{t.highway.playAgain}</span>
                </button>
                <button
                  type="button"
                  className="transport-btn"
                  onClick={() => {
                    const idx = allSongs.findIndex(
                      (s) => s.id === selectedSong.id
                    );
                    const nextSong = allSongs[(idx + 1) % allSongs.length];
                    onSelectSong(nextSong);
                  }}
                >
                  <span>{t.highway.nextLesson}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
