import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2, Sliders, Radio } from 'lucide-react';
import { TUNINGS, STRING_INFO } from '../data/musicData';
import { audioEngine } from '../utils/audioEngine';

export default function ProTuner({
  lang,
  t,
  guitarTone,
  isMicActive,
  onToggleMic,
}) {
  const [selectedTuningKey, setSelectedTuningKey] = useState('standard');
  const [lockedStringNum, setLockedStringNum] = useState(null); // null = Auto-Detect
  const [pitchData, setPitchData] = useState(null);
  const [activeStringPeg, setActiveStringPeg] = useState(null);
  const rafRef = useRef(null);

  const currentTuning = TUNINGS[selectedTuningKey] || TUNINGS.standard;

  useEffect(() => {
    let mounted = true;
    const updateTuner = () => {
      if (!mounted) return;
      if (isMicActive) {
        const detected = audioEngine.getDetectedPitch();
        if (detected) {
          setPitchData(detected);
        }
      }
      rafRef.current = requestAnimationFrame(updateTuner);
    };
    rafRef.current = requestAnimationFrame(updateTuner);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMicActive]);

  // Determine which target string we are comparing against
  const getTargetStringInfo = () => {
    if (lockedStringNum) {
      return currentTuning.strings.find((s) => s.string === lockedStringNum);
    }
    if (!pitchData) {
      return currentTuning.strings[0]; // Default 6th string
    }
    // Find closest string by frequency
    let closest = currentTuning.strings[0];
    let minDiff = Infinity;
    currentTuning.strings.forEach((s) => {
      const diff = Math.abs(pitchData.frequency - s.freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    });
    return closest;
  };

  const targetString = getTargetStringInfo();

  // Compute cent difference relative to targetString (or chromatic if far)
  const getCentsFromTarget = () => {
    if (!pitchData || !targetString) return 0;
    const centsDiff = Math.round(
      1200 * Math.log2(pitchData.frequency / targetString.freq)
    );
    return Math.max(-50, Math.min(50, centsDiff));
  };

  const cents = pitchData ? getCentsFromTarget() : 0;
  const isInTune = pitchData && Math.abs(cents) <= 6;

  const handlePlayReference = (strObj) => {
    setActiveStringPeg(strObj.string);
    audioEngine.playFrequency(strObj.freq, guitarTone, 2.2, 0.5);
    setTimeout(() => setActiveStringPeg(null), 900);
  };

  const handleStrumFullTuning = () => {
    currentTuning.strings.forEach((s, idx) => {
      setTimeout(() => {
        setActiveStringPeg(s.string);
        audioEngine.playFrequency(s.freq, guitarTone, 2.0, 0.45);
      }, idx * 140);
    });
    setTimeout(() => setActiveStringPeg(null), 1200);
  };

  return (
    <div className="tuner-page-container">
      <div className="module-header-banner">
        <div>
          <h2>{t.tuner.title}</h2>
          <p>{t.tuner.subtitle}</p>
        </div>

        <div className="tuner-header-actions">
          <div className="tuning-select-wrapper">
            <Sliders size={15} />
            <select
              value={selectedTuningKey}
              onChange={(e) => setSelectedTuningKey(e.target.value)}
            >
              {Object.values(TUNINGS).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {lang === 'en' ? preset.nameEn : preset.nameEs}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`mic-cta-btn ${isMicActive ? 'active' : ''}`}
            onClick={onToggleMic}
          >
            {isMicActive ? <Mic size={17} /> : <MicOff size={17} />}
            <span>
              {isMicActive ? t.tuner.stopMic : t.tuner.startMic}
            </span>
          </button>
        </div>
      </div>

      <div className="tuner-studio-grid">
        {/* Left: Chromatic & Target String Gauge Meter */}
        <div className="tuner-gauge-card">
          <div className="tuner-mode-row">
            <button
              type="button"
              className={`filter-pill ${lockedStringNum === null ? 'active' : ''}`}
              onClick={() => setLockedStringNum(null)}
            >
              <Radio size={14} />
              <span>{t.tuner.autoDetect}</span>
            </button>
            {lockedStringNum !== null && (
              <span className="locked-string-pill">
                {t.tuner.manualLock} #{lockedStringNum} ({targetString?.note})
              </span>
            )}
          </div>

          {/* Cent Arc Meter */}
          <div className="tuner-dial-box">
            <div className="tuner-scale-marks">
              <span>-50</span>
              <span>-25</span>
              <span className="zero-center">0</span>
              <span>+25</span>
              <span>+50</span>
            </div>

            <div className="tuner-meter-track">
              <div className="tuner-center-zone" />
              <div
                className={`tuner-needle-indicator ${
                  isInTune ? 'in-tune' : cents < 0 ? 'flat' : 'sharp'
                }`}
                style={{
                  left: `${50 + cents}%`,
                }}
              />
            </div>

            {/* Big Note Readout */}
            <div className={`tuner-big-note ${isInTune ? 'tuned-glow' : ''}`}>
              <div className="detected-note-main">
                {pitchData ? pitchData.note : targetString?.note}
              </div>
              <div className="detected-freq-sub">
                {pitchData
                  ? `${pitchData.frequency} Hz (${cents > 0 ? `+${cents}` : cents} ${t.tuner.cents})`
                  : `${targetString?.freq} Hz (Target)`}
              </div>
            </div>

            {/* Tuning Status Pill */}
            <div
              className={`tuning-status-banner ${
                !pitchData
                  ? 'idle'
                  : isInTune
                  ? 'perfect'
                  : cents < 0
                  ? 'flat'
                  : 'sharp'
              }`}
            >
              {!pitchData ? (
                <span>
                  {isMicActive
                    ? t.highway.noSignal
                    : lang === 'en'
                    ? 'Click "Start Microphone Tuner" or pluck any string peg on the right →'
                    : 'Haz clic en "Encender Micrófono" o toca cualquier clavija a la derecha →'}
                </span>
              ) : isInTune ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>{t.tuner.inTune}</span>
                </>
              ) : cents < 0 ? (
                <span>{t.tuner.tuneUp}</span>
              ) : (
                <span>{t.tuner.tuneDown}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Interactive Guitar Headstock & Reference Tones */}
        <div className="tuner-headstock-card">
          <div className="headstock-card-top">
            <h3>{t.tuner.headstockTitle}</h3>
            <button
              type="button"
              className="strum-all-btn"
              onClick={handleStrumFullTuning}
            >
              <Volume2 size={15} />
              <span>{t.tuner.strumAll}</span>
            </button>
          </div>

          <div className="strings-pegs-list">
            {currentTuning.strings.map((strObj) => {
              const colorInfo =
                STRING_INFO.find((s) => s.string === strObj.string) ||
                STRING_INFO[0];
              const isTarget = targetString?.string === strObj.string;
              const isLocked = lockedStringNum === strObj.string;
              const isPlayingRef = activeStringPeg === strObj.string;

              return (
                <div
                  key={strObj.string}
                  className={`string-peg-row ${isTarget ? 'target-active' : ''} ${
                    isPlayingRef ? 'ringing' : ''
                  }`}
                  style={{
                    borderColor: isTarget ? colorInfo.color : undefined,
                  }}
                >
                  <button
                    type="button"
                    className="peg-lock-btn"
                    onClick={() =>
                      setLockedStringNum(isLocked ? null : strObj.string)
                    }
                  >
                    <span
                      className="peg-number-badge"
                      style={{ backgroundColor: colorInfo.color }}
                    >
                      {strObj.string}
                    </span>
                    <div className="peg-note-details">
                      <strong>{strObj.note}</strong>
                      <span>{strObj.freq} Hz</span>
                    </div>
                  </button>

                  <div
                    className="peg-visual-wire"
                    style={{
                      backgroundColor: colorInfo.color,
                      height: `${1.5 + strObj.string * 0.45}px`,
                    }}
                  />

                  <button
                    type="button"
                    className="play-ref-btn"
                    onClick={() => handlePlayReference(strObj)}
                  >
                    <Volume2 size={15} />
                    <span>{t.tuner.playReference}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
