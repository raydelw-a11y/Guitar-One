import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Music,
  Volume2,
  HandMetal,
} from 'lucide-react';
import { STRING_INFO, getNoteForStringFret } from '../data/musicData';
import { audioEngine } from '../utils/audioEngine';

export default function MetronomeAndTabCreator({
  lang,
  t,
  guitarTone,
  customTabs,
  onSaveCustomTab,
  onDeleteCustomTab,
  onLaunchCustomTab,
}) {
  // Metronome State
  const [bpm, setBpm] = useState(100);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [accentFirst, setAccentFirst] = useState(true);
  const [soundMode, setSoundMode] = useState('click'); // 'click' | 'drums'
  const [isMetroRunning, setIsMetroRunning] = useState(false);
  const [activeBeatIndex, setActiveBeatIndex] = useState(-1);
  const tapTimesRef = useRef([]);

  // Custom Tab Creator State
  const [tabTitle, setTabTitle] = useState('');
  const [tabStyle, setTabStyle] = useState('electric');
  const [tabBpm, setTabBpm] = useState(105);
  const [selectedString, setSelectedString] = useState(4);
  const [selectedFret, setSelectedFret] = useState(0);
  const [draftNotes, setDraftNotes] = useState([
    { id: 1, beat: 1, string: 6, fret: 0, label: 'E2' },
    { id: 2, beat: 2, string: 5, fret: 2, label: 'B2' },
    { id: 3, beat: 3, string: 4, fret: 2, label: 'E3' },
    { id: 4, beat: 4, string: 3, fret: 1, label: 'G#3' },
  ]);

  useEffect(() => {
    if (!isMetroRunning) {
      setActiveBeatIndex(-1);
      return;
    }
    let beatCounter = 0;
    const intervalMs = (60 / bpm) * 1000;

    const triggerTick = () => {
      const currentInBar = beatCounter % beatsPerMeasure;
      setActiveBeatIndex(currentInBar);
      const isDownbeat = currentInBar === 0 && accentFirst;

      if (soundMode === 'drums') {
        audioEngine.playDrumOrClick(currentInBar % 2 === 0 ? 'kick' : 'snare');
      } else {
        audioEngine.playDrumOrClick('click', isDownbeat);
      }
      beatCounter++;
    };

    triggerTick();
    const id = setInterval(triggerTick, intervalMs);
    return () => clearInterval(id);
  }, [isMetroRunning, bpm, beatsPerMeasure, accentFirst, soundMode]);

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((time) => now - time < 3000);
    recent.push(now);
    tapTimesRef.current = recent;

    if (recent.length >= 2) {
      const intervals = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i] - recent[i - 1]);
      }
      const avgMs =
        intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const calculatedBpm = Math.min(240, Math.max(40, Math.round(60000 / avgMs)));
      setBpm(calculatedBpm);
    }
    audioEngine.playDrumOrClick('click', true);
  };

  const handleAddNoteToDraft = (strNum = selectedString, fretNum = selectedFret) => {
    const info = audioEngine.playStringFret(strNum, fretNum, guitarTone);
    const nextBeat =
      draftNotes.length > 0
        ? draftNotes[draftNotes.length - 1].beat + 1
        : 1;
    const newNote = {
      id: Date.now() + Math.random(),
      beat: nextBeat,
      string: strNum,
      fret: fretNum,
      label: info.pitchClass,
    };
    setDraftNotes([...draftNotes, newNote]);
  };

  const handleSaveAndPlay = (e) => {
    e.preventDefault();
    if (!draftNotes.length) return;
    const cleanTitle =
      tabTitle.trim() ||
      (lang === 'en' ? 'My Custom Studio Riff' : 'Mi Riff Personalizado');

    const newSong = {
      id: `custom-${Date.now()}`,
      isCustom: true,
      stage: 2,
      titleEn: cleanTitle,
      titleEs: cleanTitle,
      artist: 'Custom Studio Tab',
      style: tabStyle,
      recommendedTone: tabStyle === 'electric' ? 'overdrive' : 'acoustic',
      difficulty: 'Custom',
      difficultyEs: 'Personalizado',
      bpm: Number(tabBpm) || 100,
      tipEn: 'Your custom studio riff! Use Practice Wait Mode or adjust the speed slider to master every note.',
      tipEs: '¡Tu propio riff personalizado! Usa el modo Esperar Nota o ajusta la velocidad para dominarlo.',
      notes: draftNotes.map((n, i) => ({
        ...n,
        id: i + 1,
        beat: i + 1,
      })),
    };

    onSaveCustomTab(newSong);
    setTabTitle('');
  };

  return (
    <div className="tools-page-grid">
      {/* LEFT CARD: STUDIO METRONOME */}
      <div className="metronome-studio-card">
        <div className="card-header-row">
          <Clock size={20} className="text-amber" />
          <h3>{t.tools.metronomeTitle}</h3>
        </div>

        <div className="bpm-giant-display">
          <button
            type="button"
            className="bpm-step-btn"
            onClick={() => setBpm((b) => Math.max(35, b - 2))}
          >
            -
          </button>
          <div className="bpm-readout-center">
            <span className="bpm-number">{bpm}</span>
            <span className="bpm-unit">BPM</span>
          </div>
          <button
            type="button"
            className="bpm-step-btn"
            onClick={() => setBpm((b) => Math.min(240, b + 2))}
          >
            +
          </button>
        </div>

        <input
          type="range"
          min="35"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="bpm-range-slider"
        />

        {/* Visual Beat Pulse Dots */}
        <div className="beat-leds-row">
          {Array.from({ length: beatsPerMeasure }).map((_, idx) => (
            <div
              key={idx}
              className={`beat-led-orb ${
                activeBeatIndex === idx
                  ? idx === 0
                    ? 'active-downbeat'
                    : 'active-beat'
                  : ''
              }`}
            >
              {idx + 1}
            </div>
          ))}
        </div>

        <div className="metro-options-grid">
          <div className="form-group">
            <label>{t.tools.timeSignature}</label>
            <div className="pill-choice-row">
              {[
                { beats: 4, label: '4/4' },
                { beats: 3, label: '3/4' },
                { beats: 6, label: '6/8' },
                { beats: 5, label: '5/4' },
              ].map((sig) => (
                <button
                  key={sig.label}
                  type="button"
                  className={`filter-pill ${
                    beatsPerMeasure === sig.beats ? 'active' : ''
                  }`}
                  onClick={() => setBeatsPerMeasure(sig.beats)}
                >
                  {sig.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Sound / Sonido</label>
            <div className="pill-choice-row">
              <button
                type="button"
                className={`filter-pill ${soundMode === 'click' ? 'active' : ''}`}
                onClick={() => setSoundMode('click')}
              >
                Studio Click
              </button>
              <button
                type="button"
                className={`filter-pill ${soundMode === 'drums' ? 'active' : ''}`}
                onClick={() => setSoundMode('drums')}
              >
                Kick & Snare
              </button>
              <button
                type="button"
                className={`filter-pill ${accentFirst ? 'active' : ''}`}
                onClick={() => setAccentFirst(!accentFirst)}
              >
                {t.tools.accentFirst}
              </button>
            </div>
          </div>
        </div>

        <div className="metro-action-buttons">
          <button
            type="button"
            className={`play-btn-primary ${isMetroRunning ? 'playing' : ''}`}
            onClick={() => setIsMetroRunning(!isMetroRunning)}
          >
            {isMetroRunning ? <Square size={17} /> : <Play size={17} />}
            <span>
              {isMetroRunning
                ? t.tools.stopMetronome
                : t.tools.startMetronome}
            </span>
          </button>

          <button
            type="button"
            className="transport-btn"
            onClick={handleTapTempo}
          >
            <span>{t.tools.tapTempo}</span>
          </button>
        </div>
      </div>

      {/* RIGHT CARD: CUSTOM TAB & RIFF BUILDER */}
      <div className="tab-creator-card">
        <div className="card-header-row">
          <HandMetal size={20} className="text-purple" />
          <div>
            <h3>{t.tools.tabCreatorTitle}</h3>
            <p className="card-sub-desc">{t.tools.tabCreatorSubtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSaveAndPlay} className="tab-creator-form">
          <div className="form-row-3">
            <div className="form-group">
              <label>{t.tools.songTitleLabel}</label>
              <input
                type="text"
                value={tabTitle}
                onChange={(e) => setTabTitle(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'e.g. Midnight Blues Riff'
                    : 'ej. Riff Blues de Medianoche'
                }
              />
            </div>

            <div className="form-group">
              <label>{t.tools.songStyleLabel}</label>
              <select
                value={tabStyle}
                onChange={(e) => setTabStyle(e.target.value)}
              >
                <option value="electric">⚡ Electric (Overdrive)</option>
                <option value="acoustic">🎸 Acoustic</option>
              </select>
            </div>

            <div className="form-group">
              <label>BPM</label>
              <input
                type="number"
                min="50"
                max="200"
                value={tabBpm}
                onChange={(e) => setTabBpm(e.target.value)}
              />
            </div>
          </div>

          {/* Note Picker Controls */}
          <div className="note-adder-toolbar">
            <div className="form-group">
              <label>{t.tools.stringLabel}</label>
              <div className="pill-choice-row">
                {STRING_INFO.map((s) => (
                  <button
                    key={s.string}
                    type="button"
                    className={`filter-pill ${
                      selectedString === s.string ? 'active' : ''
                    }`}
                    style={{
                      borderColor:
                        selectedString === s.string ? s.color : undefined,
                    }}
                    onClick={() => setSelectedString(s.string)}
                  >
                    {s.string}:{s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                {t.tools.fretLabel}: <strong>{selectedFret}</strong> (
                {getNoteForStringFret(selectedString, selectedFret).note})
              </label>
              <input
                type="range"
                min="0"
                max="15"
                value={selectedFret}
                onChange={(e) => setSelectedFret(Number(e.target.value))}
              />
            </div>

            <button
              type="button"
              className="add-note-btn"
              onClick={() => handleAddNoteToDraft(selectedString, selectedFret)}
            >
              <Plus size={16} />
              <span>{t.tools.addNote}</span>
            </button>

            <button
              type="button"
              className="transport-btn"
              onClick={() => setDraftNotes([])}
            >
              <Trash2 size={15} />
              <span>{t.tools.clearNotes}</span>
            </button>
          </div>

          {/* Visual 6-String ASCII / Studio Tab Preview */}
          <div className="tab-draft-preview">
            {STRING_INFO.map((str) => (
              <div key={str.string} className="tab-preview-line">
                <span
                  className="tab-line-name"
                  style={{ color: str.color }}
                >
                  {str.name}|
                </span>
                <div className="tab-line-slots">
                  {draftNotes.map((note, idx) => (
                    <span
                      key={note.id || idx}
                      className={`tab-slot-cell ${
                        note.string === str.string ? 'has-note' : ''
                      }`}
                      style={{
                        color:
                          note.string === str.string ? str.color : undefined,
                      }}
                    >
                      {note.string === str.string ? note.fret : '-'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="auth-submit-btn">
            <Sparkles size={17} />
            <span>{t.tools.saveAndPlay}</span>
          </button>
        </form>

        {/* Saved Custom Tabs List */}
        {customTabs?.length > 0 && (
          <div className="saved-custom-tabs-section">
            <h4>{t.tools.customSavedList}</h4>
            <div className="saved-custom-list">
              {customTabs.map((ct) => (
                <div key={ct.id} className="saved-custom-row">
                  <div>
                    <strong>{ct.titleEn}</strong>
                    <span>
                      {' '}
                      • {ct.bpm} BPM • {ct.notes.length} notes
                    </span>
                  </div>
                  <div className="saved-custom-actions">
                    <button
                      type="button"
                      className="filter-pill active"
                      onClick={() => onLaunchCustomTab(ct)}
                    >
                      <Play size={13} /> Play
                    </button>
                    <button
                      type="button"
                      className="filter-pill"
                      onClick={() => onDeleteCustomTab(ct.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
