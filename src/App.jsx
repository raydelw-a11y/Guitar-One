import React, { useState, useEffect, useMemo } from 'react';
import {
  Guitar,
  PlayCircle,
  Compass,
  Radio,
  Layers,
  Clock,
  Mic,
  MicOff,
  Globe,
  LogOut,
  Sparkles,
  Flame,
  Star,
  Volume2,
} from 'lucide-react';
import { translations } from './data/translations';
import { SONGS_LIBRARY } from './data/musicData';
import { audioEngine } from './utils/audioEngine';
import AuthScreen from './components/AuthScreen';
import TabHighway from './components/TabHighway';
import LearningPath from './components/LearningPath';
import ProTuner from './components/ProTuner';
import ChordsScalesLab from './components/ChordsScalesLab';
import MetronomeAndTabCreator from './components/MetronomeAndTabCreator';
import './App.css';

/* global __BUILD_TIMESTAMP__ */
const FALLBACK_TIMESTAMP = '11:18 AM - 11/05/2026';
const BUILD_TIMESTAMP =
  typeof __BUILD_TIMESTAMP__ !== 'undefined'
    ? __BUILD_TIMESTAMP__
    : FALLBACK_TIMESTAMP;

const DEFAULT_ACCOUNTS = [
  {
    id: 'raydel-studio',
    name: 'Raydel',
    identifier: 'raydel',
    password: '123',
    skillLevel: 'intermediate',
    preferredStyle: 'both',
    xp: 450,
    streak: 5,
    completedSongs: {
      'stage1-open-strings': { score: 1600, stars: 3, accuracy: 100 },
    },
    customTabs: [],
    createdAt: '2026-11-05T11:00:00.000Z',
  },
];

export default function App() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('guitar_one_lang') || 'en';
  });

  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('guitar_one_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load saved accounts:', e);
    }
    return DEFAULT_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUserId = sessionStorage.getItem('guitar_one_active_user');
      if (savedUserId) {
        const found = accounts.find((a) => a.id === savedUserId);
        if (found) return found;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('highway'); // 'highway' | 'learn' | 'tuner' | 'lab' | 'tools'
  const [guitarTone, setGuitarTone] = useState('acoustic'); // 'acoustic' | 'clean' | 'overdrive'
  const [isMicActive, setIsMicActive] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(SONGS_LIBRARY[0].id);

  const t = translations[lang] || translations.en;

  useEffect(() => {
    localStorage.setItem('guitar_one_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('guitar_one_accounts', JSON.stringify(accounts));
  }, [accounts]);

  // Combine built-in curriculum with user's custom tabs
  const allSongs = useMemo(() => {
    const custom = currentUser?.customTabs || [];
    return [...SONGS_LIBRARY, ...custom];
  }, [currentUser]);

  const selectedSong = useMemo(() => {
    return (
      allSongs.find((s) => s.id === selectedSongId) ||
      allSongs[0] ||
      SONGS_LIBRARY[0]
    );
  }, [allSongs, selectedSongId]);

  const totalStars = useMemo(() => {
    if (!currentUser?.completedSongs) return 0;
    return Object.values(currentUser.completedSongs).reduce(
      (sum, item) => sum + (item.stars || 0),
      0
    );
  }, [currentUser]);

  const handleLoginSuccess = (account) => {
    setCurrentUser(account);
    sessionStorage.setItem('guitar_one_active_user', account.id);
    if (account.preferredStyle === 'electric') {
      setGuitarTone('overdrive');
    } else {
      setGuitarTone('acoustic');
    }
  };

  const handleRegisterAccount = (newAccount) => {
    const updated = [newAccount, ...accounts];
    setAccounts(updated);
    handleLoginSuccess(newAccount);
  };

  const handleLogout = () => {
    if (isMicActive) {
      audioEngine.stopMicrophone();
      setIsMicActive(false);
    }
    sessionStorage.removeItem('guitar_one_active_user');
    setCurrentUser(null);
  };

  const handleToggleMic = async () => {
    if (isMicActive) {
      audioEngine.stopMicrophone();
      setIsMicActive(false);
    } else {
      const ok = await audioEngine.startMicrophone();
      setIsMicActive(ok);
    }
  };

  const handleCompleteSong = (songId, result) => {
    if (!currentUser) return;
    const prevSongRecord = currentUser.completedSongs?.[songId] || {
      score: 0,
      stars: 0,
      accuracy: 0,
    };

    const updatedCompleted = {
      ...(currentUser.completedSongs || {}),
      [songId]: {
        score: Math.max(prevSongRecord.score, result.score),
        stars: Math.max(prevSongRecord.stars, result.stars),
        accuracy: Math.max(prevSongRecord.accuracy, result.accuracy),
      },
    };

    const updatedUser = {
      ...currentUser,
      xp: (currentUser.xp || 0) + (result.xpEarned || 50),
      completedSongs: updatedCompleted,
    };

    setCurrentUser(updatedUser);
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updatedUser.id ? updatedUser : acc))
    );
  };

  const handleSaveCustomTab = (customSong) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      xp: (currentUser.xp || 0) + 75,
      customTabs: [customSong, ...(currentUser.customTabs || [])],
    };
    setCurrentUser(updatedUser);
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updatedUser.id ? updatedUser : acc))
    );
    setSelectedSongId(customSong.id);
    setActiveTab('highway');
  };

  const handleDeleteCustomTab = (tabId) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      customTabs: (currentUser.customTabs || []).filter((t) => t.id !== tabId),
    };
    setCurrentUser(updatedUser);
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updatedUser.id ? updatedUser : acc))
    );
  };

  // Show Account Creation & Login screen when not signed in
  if (!currentUser) {
    return (
      <AuthScreen
        lang={lang}
        setLang={setLang}
        t={t}
        accounts={accounts}
        onLoginSuccess={handleLoginSuccess}
        onRegisterAccount={handleRegisterAccount}
        buildTimestamp={BUILD_TIMESTAMP}
      />
    );
  }

  return (
    <div className="studio-app-shell">
      {/* Top Studio Navigation Header */}
      <header className="studio-navbar">
        <div className="navbar-brand" onClick={() => setActiveTab('highway')}>
          <div className="navbar-logo-icon">
            <Guitar size={22} />
          </div>
          <div>
            <span className="navbar-title">{t.appName}</span>
            <span className="navbar-badge">PRO STUDIO</span>
          </div>
        </div>

        {/* Center Module Navigation Tabs */}
        <nav className="navbar-tabs">
          {[
            { id: 'highway', label: t.nav.highway, icon: PlayCircle },
            { id: 'learn', label: t.nav.learnPath, icon: Compass },
            { id: 'tuner', label: t.nav.tuner, icon: Radio },
            { id: 'lab', label: t.nav.chordsScales, icon: Layers },
            { id: 'tools', label: t.nav.metronomeTabs, icon: Clock },
          ].map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-tab-item ${
                  activeTab === item.id ? 'active' : ''
                }`}
                onClick={() => setActiveTab(item.id)}
              >
                <IconComponent size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Studio Controls: Guitar Tone, Mic, XP, Language, Account */}
        <div className="navbar-right-controls">
          {/* Tone Selector (Acoustic / Clean / Overdrive) */}
          <div className="tone-selector-pill">
            <Volume2 size={14} />
            <select
              value={guitarTone}
              onChange={(e) => {
                const nextTone = e.target.value;
                setGuitarTone(nextTone);
                audioEngine.playFrequency(220, nextTone, 0.7, 0.35);
              }}
              title="Select Guitar Synth Tone"
            >
              <option value="acoustic">🎸 {t.nav.toneAcoustic}</option>
              <option value="clean">✨ {t.nav.toneClean}</option>
              <option value="overdrive">⚡ {t.nav.toneOverdrive}</option>
            </select>
          </div>

          {/* Live Microphone Pill */}
          <button
            type="button"
            className={`nav-mic-pill ${isMicActive ? 'live' : ''}`}
            onClick={handleToggleMic}
          >
            {isMicActive ? <Mic size={14} /> : <MicOff size={14} />}
            <span>{isMicActive ? t.nav.micActive : t.nav.micOff}</span>
          </button>

          {/* User Stats & Profile */}
          <div className="user-stats-pills">
            <span className="stat-chip xp">
              <Sparkles size={13} /> {currentUser.xp} {t.nav.xp}
            </span>
            <span className="stat-chip stars">
              <Star size={13} /> {totalStars}
            </span>
            <span className="stat-chip streak">
              <Flame size={13} /> {currentUser.streak}d
            </span>
          </div>

          {/* Language Switcher EN / ES */}
          <button
            type="button"
            className="lang-toggle-btn compact"
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          >
            <Globe size={14} />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* User Avatar & Logout */}
          <div className="user-profile-badge">
            <span className="user-avatar-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
            <span className="user-name-label">{currentUser.name}</span>
            <button
              type="button"
              className="logout-icon-btn"
              onClick={handleLogout}
              title={t.auth.logout}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Active Studio Module Content */}
      <main className="studio-main-content">
        {activeTab === 'highway' && (
          <TabHighway
            lang={lang}
            t={t}
            allSongs={allSongs}
            selectedSong={selectedSong}
            onSelectSong={(song) => setSelectedSongId(song.id)}
            guitarTone={guitarTone}
            setGuitarTone={setGuitarTone}
            isMicActive={isMicActive}
            onToggleMic={handleToggleMic}
            userProgress={currentUser.completedSongs}
            onCompleteSong={handleCompleteSong}
          />
        )}

        {activeTab === 'learn' && (
          <LearningPath
            lang={lang}
            t={t}
            allSongs={allSongs}
            userProgress={currentUser.completedSongs}
            onLaunchSong={(song) => {
              setSelectedSongId(song.id);
              setActiveTab('highway');
            }}
          />
        )}

        {activeTab === 'tuner' && (
          <ProTuner
            lang={lang}
            t={t}
            guitarTone={guitarTone}
            isMicActive={isMicActive}
            onToggleMic={handleToggleMic}
          />
        )}

        {activeTab === 'lab' && (
          <ChordsScalesLab lang={lang} t={t} guitarTone={guitarTone} />
        )}

        {activeTab === 'tools' && (
          <MetronomeAndTabCreator
            lang={lang}
            t={t}
            guitarTone={guitarTone}
            customTabs={currentUser.customTabs || []}
            onSaveCustomTab={handleSaveCustomTab}
            onDeleteCustomTab={handleDeleteCustomTab}
            onLaunchCustomTab={(song) => {
              setSelectedSongId(song.id);
              setActiveTab('highway');
            }}
          />
        )}
      </main>

      {/* Corner Timestamp Indicator required by Global Rule */}
      <div className="corner-timestamp">
        {t.updatedPrefix} {BUILD_TIMESTAMP}
      </div>
    </div>
  );
}
