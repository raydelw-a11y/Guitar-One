import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  Music,
  Play,
  Repeat,
  Sparkles,
  Layers,
  Compass,
} from 'lucide-react';
import {
  CHORDS_DICTIONARY,
  SCALES_DICTIONARY,
  NOTE_NAMES,
  STRING_INFO,
  getNoteForStringFret,
} from '../data/musicData';
import { audioEngine } from '../utils/audioEngine';

export default function ChordsScalesLab({ lang, t, guitarTone }) {
  const [subTab, setSubTab] = useState('chords'); // 'chords' | 'scales'

  // Chords State
  const [chordCategory, setChordCategory] = useState('all');
  const [selectedChord, setSelectedChord] = useState(CHORDS_DICTIONARY[0]);

  // Chord Switching Trainer State
  const [chordAId, setChordAId] = useState('Em');
  const [chordBId, setChordBId] = useState('G');
  const [trainerRunning, setTrainerRunning] = useState(false);
  const [trainerSeconds, setTrainerSeconds] = useState(60);
  const [switchCount, setSwitchCount] = useState(0);
  const [activeTrainerSide, setActiveTrainerSide] = useState('A');

  // Scales State
  const [rootNote, setRootNote] = useState('A');
  const [selectedScale, setSelectedScale] = useState(SCALES_DICTIONARY[0]);
  const [playingScaleNote, setPlayingScaleNote] = useState(null);

  const filteredChords = useMemo(() => {
    if (chordCategory === 'all') return CHORDS_DICTIONARY;
    return CHORDS_DICTIONARY.filter((c) => c.category === chordCategory);
  }, [chordCategory]);

  // Chord switching countdown timer
  useEffect(() => {
    if (!trainerRunning) return;
    if (trainerSeconds <= 0) {
      setTrainerRunning(false);
      return;
    }
    const timer = setInterval(() => {
      setTrainerSeconds((s) => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [trainerRunning, trainerSeconds]);

  const handleSelectChord = (chord) => {
    setSelectedChord(chord);
    audioEngine.strumChord(chord.frets, guitarTone, false);
  };

  const handleTriggerSwitch = () => {
    if (!trainerRunning) return;
    const nextSide = activeTrainerSide === 'A' ? 'B' : 'A';
    setActiveTrainerSide(nextSide);
    setSwitchCount((c) => c + 1);
    const targetId = nextSide === 'A' ? chordAId : chordBId;
    const chordObj = CHORDS_DICTIONARY.find((c) => c.id === targetId);
    if (chordObj) {
      setSelectedChord(chordObj);
      audioEngine.strumChord(chordObj.frets, guitarTone, false);
    }
  };

  // Compute scale pitch classes for the chosen Root + Scale formula
  const scalePitchClasses = useMemo(() => {
    const rootIdx = NOTE_NAMES.indexOf(rootNote);
    if (rootIdx === -1) return [];
    return selectedScale.intervals.map(
      (semitones) => NOTE_NAMES[(rootIdx + semitones) % 12]
    );
  }, [rootNote, selectedScale]);

  // Play scale ascending or descending
  const handlePlayScaleSequence = (ascending = true) => {
    // Collect 1-octave + position sequence across strings 6 to 1 around frets 0–9
    const sequence = [];
    const stringsOrder = [6, 5, 4, 3, 2, 1];
    stringsOrder.forEach((strNum) => {
      for (let f = 0; f <= 8; f++) {
        const info = getNoteForStringFret(strNum, f);
        if (scalePitchClasses.includes(info.pitchClass)) {
          // Avoid duplicate MIDI pitches in ascending run
          if (
            !sequence.length ||
            info.midi > sequence[sequence.length - 1].midi
          ) {
            sequence.push({ string: strNum, fret: f, ...info });
          }
        }
      }
    });

    const ordered = ascending ? sequence : [...sequence].reverse();
    ordered.slice(0, 14).forEach((item, idx) => {
      setTimeout(() => {
        setPlayingScaleNote({ string: item.string, fret: item.fret });
        audioEngine.playStringFret(item.string, item.fret, guitarTone, 0.7);
      }, idx * 210);
    });
    setTimeout(
      () => setPlayingScaleNote(null),
      Math.min(14, ordered.length) * 210 + 300
    );
  };

  return (
    <div className="lab-page-container">
      {/* Sub-navigation between Chords Lab and Scales Explorer */}
      <div className="lab-subtabs-bar">
        <button
          type="button"
          className={`lab-subtab-btn ${subTab === 'chords' ? 'active' : ''}`}
          onClick={() => setSubTab('chords')}
        >
          <Layers size={17} />
          <span>{t.lab.chordsTab}</span>
        </button>
        <button
          type="button"
          className={`lab-subtab-btn ${subTab === 'scales' ? 'active' : ''}`}
          onClick={() => setSubTab('scales')}
        >
          <Compass size={17} />
          <span>{t.lab.scalesTab}</span>
        </button>
      </div>

      {subTab === 'chords' ? (
        <div className="chords-lab-grid">
          {/* Left Column: Chord Dictionary Selector */}
          <div className="chords-list-panel">
            <div className="style-filter-pills">
              {[
                { id: 'all', label: t.lab.chordCategoryAll },
                { id: 'major', label: t.lab.chordCategoryMajor },
                { id: 'minor', label: t.lab.chordCategoryMinor },
                { id: 'power', label: t.lab.chordCategoryPower },
                { id: 'seventh', label: t.lab.chordCategorySeventh },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-pill ${
                    chordCategory === cat.id ? 'active' : ''
                  }`}
                  onClick={() => setChordCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="chord-buttons-grid">
              {filteredChords.map((chord) => (
                <button
                  key={chord.id}
                  type="button"
                  className={`chord-tile-btn ${
                    selectedChord.id === chord.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelectChord(chord)}
                >
                  <strong>{chord.id}</strong>
                  <span>{lang === 'en' ? chord.name : chord.nameEs}</span>
                </button>
              ))}
            </div>

            {/* 60-Second Chord Switching Speed Trainer */}
            <div className="chord-trainer-box">
              <h4>
                <Repeat size={16} />
                <span>{t.lab.chordTrainerTitle}</span>
              </h4>

              <div className="trainer-selects-row">
                <div>
                  <label>{t.lab.chordA}</label>
                  <select
                    value={chordAId}
                    onChange={(e) => setChordAId(e.target.value)}
                  >
                    {CHORDS_DICTIONARY.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} ({lang === 'en' ? c.name : c.nameEs})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>{t.lab.chordB}</label>
                  <select
                    value={chordBId}
                    onChange={(e) => setChordBId(e.target.value)}
                  >
                    {CHORDS_DICTIONARY.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} ({lang === 'en' ? c.name : c.nameEs})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="trainer-controls-row">
                {!trainerRunning ? (
                  <button
                    type="button"
                    className="play-btn-primary"
                    onClick={() => {
                      setTrainerSeconds(60);
                      setSwitchCount(0);
                      setTrainerRunning(true);
                    }}
                  >
                    <Play size={16} />
                    <span>{t.lab.startTrainer}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="play-btn-primary"
                      onClick={handleTriggerSwitch}
                    >
                      <span>
                        Strum Next:{' '}
                        {activeTrainerSide === 'A' ? chordBId : chordAId} (
                        {trainerSeconds}s)
                      </span>
                    </button>
                    <button
                      type="button"
                      className="transport-btn"
                      onClick={() => setTrainerRunning(false)}
                    >
                      {t.lab.stopTrainer}
                    </button>
                  </>
                )}
                <div className="switches-counter-badge">
                  {t.lab.switchesCount}: <strong>{switchCount}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Chord Diagram & Fretboard */}
          <div className="chord-inspector-card">
            <div className="chord-inspector-header">
              <div>
                <span className="stage-pill">{selectedChord.category}</span>
                <h2>
                  {lang === 'en' ? selectedChord.name : selectedChord.nameEs}
                </h2>
              </div>

              <div className="chord-play-buttons">
                <button
                  type="button"
                  className="play-btn-primary"
                  onClick={() =>
                    audioEngine.strumChord(
                      selectedChord.frets,
                      guitarTone,
                      false
                    )
                  }
                >
                  <Volume2 size={17} />
                  <span>{t.lab.strumChord}</span>
                </button>
                <button
                  type="button"
                  className="transport-btn"
                  onClick={() =>
                    audioEngine.strumChord(
                      selectedChord.frets,
                      guitarTone,
                      true
                    )
                  }
                >
                  <Music size={16} />
                  <span>{t.lab.arpeggiateChord}</span>
                </button>
              </div>
            </div>

            <p className="chord-tip-text">
              {lang === 'en' ? selectedChord.tipEn : selectedChord.tipEs}
            </p>

            {/* Interactive 7-Fret Chord Neck Diagram */}
            <div className="chord-neck-visualizer">
              <div className="fret-numbers-row">
                <div className="fret-num-cell string-label-col">Str / Fing</div>
                {Array.from({ length: 8 }).map((_, fIdx) => (
                  <div key={fIdx} className="fret-num-cell">
                    {fIdx === 0 ? 'Open' : `Fret ${fIdx}`}
                  </div>
                ))}
              </div>

              {STRING_INFO.map((str) => {
                // selectedChord.frets is ordered [str6, str5, str4, str3, str2, str1]
                const arrayIdx = 6 - str.string;
                const targetFret = selectedChord.frets[arrayIdx];
                const fingerCode = selectedChord.fingers[arrayIdx];

                return (
                  <div key={str.string} className="fretboard-string-row">
                    <div
                      className="fret-string-name"
                      style={{ color: str.color }}
                    >
                      {str.string}:{str.name} ({fingerCode})
                    </div>
                    {Array.from({ length: 8 }).map((_, fretIdx) => {
                      const isChordTone = targetFret === fretIdx;
                      const isMuted = targetFret === -1 && fretIdx === 0;
                      const noteInfo = getNoteForStringFret(
                        str.string,
                        fretIdx
                      );

                      return (
                        <button
                          key={fretIdx}
                          type="button"
                          className={`fret-cell ${
                            fretIdx === 0 ? 'nut-cell' : ''
                          } ${isChordTone ? 'target-fret' : ''}`}
                          onClick={() =>
                            audioEngine.playStringFret(
                              str.string,
                              fretIdx,
                              guitarTone
                            )
                          }
                        >
                          <span
                            className="neck-wire"
                            style={{
                              backgroundColor: str.color,
                              height: `${1 + str.string * 0.35}px`,
                            }}
                          />
                          {isMuted && (
                            <span className="muted-x-badge">✕</span>
                          )}
                          {isChordTone && (
                            <span
                              className="fret-note-dot"
                              style={{
                                backgroundColor: str.color,
                                borderColor: '#fff',
                              }}
                            >
                              {noteInfo.pitchClass}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="finger-legend-note">{t.lab.fingerLabels}</div>
          </div>
        </div>
      ) : (
        /* SCALES FRETBOARD EXPLORER */
        <div className="scales-explorer-panel">
          <div className="scales-controls-header">
            <div className="scale-selectors-group">
              <div className="form-group">
                <label>{t.lab.rootNote}</label>
                <div className="root-keys-bar">
                  {NOTE_NAMES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`root-key-btn ${rootNote === n ? 'active' : ''}`}
                      onClick={() => setRootNote(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>{t.lab.scaleType}</label>
                <select
                  value={selectedScale.id}
                  onChange={(e) => {
                    const found = SCALES_DICTIONARY.find(
                      (s) => s.id === e.target.value
                    );
                    if (found) setSelectedScale(found);
                  }}
                >
                  {SCALES_DICTIONARY.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {lang === 'en' ? sc.nameEn : sc.nameEs}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="scale-play-actions">
              <button
                type="button"
                className="play-btn-primary"
                onClick={() => handlePlayScaleSequence(true)}
              >
                <Play size={16} />
                <span>{t.lab.playScaleAsc}</span>
              </button>
              <button
                type="button"
                className="transport-btn"
                onClick={() => handlePlayScaleSequence(false)}
              >
                <Play size={16} />
                <span>{t.lab.playScaleDesc}</span>
              </button>
            </div>
          </div>

          <div className="scale-summary-banner">
            <div>
              <h3>
                {rootNote}{' '}
                {lang === 'en' ? selectedScale.nameEn : selectedScale.nameEs}
              </h3>
              <p>
                {lang === 'en' ? selectedScale.descEn : selectedScale.descEs}
              </p>
            </div>
            <div className="scale-notes-chips">
              <span className="scale-notes-label">{t.lab.scaleNotes}:</span>
              {scalePitchClasses.map((pc, idx) => (
                <span
                  key={pc}
                  className={`scale-tone-pill ${idx === 0 ? 'root' : ''}`}
                >
                  {pc} <small>({selectedScale.degrees[idx]})</small>
                </span>
              ))}
            </div>
          </div>

          {/* 15-Fret Interactive Scale Fretboard */}
          <div className="guitar-fretboard-grid scale-neck-large">
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

            {STRING_INFO.map((str) => (
              <div key={str.string} className="fretboard-string-row">
                <div
                  className="fret-string-name"
                  style={{ color: str.color }}
                >
                  {str.string}:{str.name}
                </div>
                {Array.from({ length: 16 }).map((_, fretIdx) => {
                  const noteInfo = getNoteForStringFret(str.string, fretIdx);
                  const isInScale = scalePitchClasses.includes(
                    noteInfo.pitchClass
                  );
                  const isRoot = noteInfo.pitchClass === rootNote;
                  const isPlayingNow =
                    playingScaleNote &&
                    playingScaleNote.string === str.string &&
                    playingScaleNote.fret === fretIdx;

                  return (
                    <button
                      key={fretIdx}
                      type="button"
                      className={`fret-cell ${
                        fretIdx === 0 ? 'nut-cell' : ''
                      } ${isPlayingNow ? 'flashing-fret' : ''}`}
                      onClick={() =>
                        audioEngine.playStringFret(
                          str.string,
                          fretIdx,
                          guitarTone
                        )
                      }
                    >
                      <span
                        className="neck-wire"
                        style={{
                          backgroundColor: str.color,
                          height: `${1 + str.string * 0.35}px`,
                        }}
                      />
                      {isInScale && (
                        <span
                          className={`fret-note-dot ${
                            isRoot ? 'root-dot' : 'scale-dot'
                          }`}
                          style={{
                            backgroundColor: isPlayingNow
                              ? '#10b981'
                              : isRoot
                              ? '#f59e0b'
                              : str.color,
                            borderColor: isRoot ? '#fff' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {noteInfo.pitchClass}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
