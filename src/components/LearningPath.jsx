import React from 'react';
import { Play, CheckCircle2, Award, Flame, Music } from 'lucide-react';

export default function LearningPath({
  lang,
  t,
  allSongs,
  userProgress,
  onLaunchSong,
}) {
  const stages = [
    { num: 1, title: t.learn.stage1, badge: '01' },
    { num: 2, title: t.learn.stage2, badge: '02' },
    { num: 3, title: t.learn.stage3, badge: '03' },
    { num: 4, title: t.learn.stage4, badge: '04' },
    { num: 5, title: t.learn.stage5, badge: '05' },
  ];

  return (
    <div className="learn-page-container">
      <div className="module-header-banner">
        <div>
          <h2>{t.learn.title}</h2>
          <p>{t.learn.subtitle}</p>
        </div>
      </div>

      <div className="stages-timeline">
        {stages.map((stage) => {
          const stageSongs = allSongs.filter((s) => s.stage === stage.num);
          return (
            <div key={stage.num} className="stage-block-card">
              <div className="stage-header-row">
                <span className="stage-number-pill">{stage.badge}</span>
                <h3>{stage.title}</h3>
              </div>

              <div className="stage-lessons-grid">
                {stageSongs.map((song) => {
                  const prog = userProgress?.[song.id];
                  const isDone = prog && prog.stars > 0;

                  return (
                    <div
                      key={song.id}
                      className={`lesson-curriculum-card ${
                        isDone ? 'completed' : ''
                      }`}
                    >
                      <div className="lesson-card-top">
                        <span className={`song-style-badge ${song.style}`}>
                          {song.style === 'electric'
                            ? '⚡ Electric'
                            : '🎸 Acoustic'}
                        </span>
                        <span className="lesson-difficulty-tag">
                          {lang === 'en'
                            ? song.difficulty
                            : song.difficultyEs}
                        </span>
                      </div>

                      <h4>
                        {lang === 'en' ? song.titleEn : song.titleEs}
                      </h4>
                      <p className="lesson-artist-sub">{song.artist}</p>

                      <p className="lesson-coach-excerpt">
                        {lang === 'en' ? song.tipEn : song.tipEs}
                      </p>

                      <div className="lesson-stats-row">
                        <span>
                          <Flame size={13} /> {song.bpm} {t.learn.bpm}
                        </span>
                        <span>
                          <Music size={13} /> {song.notes.length}{' '}
                          {t.learn.duration}
                        </span>
                        {isDone && (
                          <span className="earned-stars-pill">
                            {'★'.repeat(prog.stars)}
                            {'☆'.repeat(3 - prog.stars)} ({prog.score} pts)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="launch-lesson-btn"
                        onClick={() => onLaunchSong(song)}
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                        <span>{t.learn.startLesson}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
