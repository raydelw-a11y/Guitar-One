import React, { useState } from 'react';
import { Guitar, Lock, User, Mail, Sparkles, Globe, CheckCircle2, ArrowRight, ShieldCheck, Music2 } from 'lucide-react';

export default function AuthScreen({
  lang,
  setLang,
  t,
  accounts,
  onLoginSuccess,
  onRegisterAccount,
  buildTimestamp,
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [preferredStyle, setPreferredStyle] = useState('both');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError(t.auth.errorEmpty);
      return;
    }

    if (mode === 'register') {
      if (cleanPass !== confirmPassword.trim()) {
        setError(t.auth.errorPasswordMatch);
        return;
      }
      const existing = accounts.find(
        (acc) =>
          acc.identifier.toLowerCase() === cleanId ||
          acc.name.toLowerCase() === cleanId
      );
      if (existing) {
        setError(t.auth.errorAccountExists);
        return;
      }

      const newAccount = {
        id: `user-${Date.now()}`,
        name: name.trim() || identifier.trim().split('@')[0],
        identifier: identifier.trim(),
        password: cleanPass,
        skillLevel,
        preferredStyle,
        xp: 150,
        streak: 1,
        completedSongs: {},
        customTabs: [],
        createdAt: new Date().toISOString(),
      };
      onRegisterAccount(newAccount);
    } else {
      // Login check: match saved accounts OR allow quick creation if master password / first-time login
      const matched = accounts.find(
        (acc) =>
          (acc.identifier.toLowerCase() === cleanId ||
            acc.name.toLowerCase() === cleanId) &&
          acc.password === cleanPass
      );

      if (matched) {
        onLoginSuccess(matched);
      } else {
        setError(t.auth.errorInvalidCreds);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleQuickDemo = () => {
    const demoAcc =
      accounts.find((a) => a.id === 'raydel-studio') || accounts[0];
    if (demoAcc) {
      onLoginSuccess(demoAcc);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Background decorative studio glow */}
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      {/* Top Bar: Bilingual Toggle & Studio Badge */}
      <div className="auth-topbar">
        <div className="private-access-pill">
          <ShieldCheck size={15} className="text-amber" />
          <span>{t.auth.privateAccessBadge}</span>
        </div>

        <button
          type="button"
          className="lang-toggle-btn"
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          title="Switch Language / Cambiar Idioma"
        >
          <Globe size={15} />
          <span>{lang === 'en' ? 'EN • Español' : 'ES • English'}</span>
        </button>
      </div>

      <div className="auth-container">
        {/* Left Hero Brand Column */}
        <div className="auth-brand-panel">
          <div className="brand-logo-row">
            <div className="brand-icon-box">
              <Guitar size={34} />
            </div>
            <div>
              <h1 className="brand-title">{t.appName}</h1>
              <p className="brand-subtitle">{t.tagline}</p>
            </div>
          </div>

          <div className="brand-feature-list">
            <div className="brand-feature-item">
              <span className="feature-dot purple" />
              <div>
                <strong>
                  {lang === 'en'
                    ? '6-String Color Highway & Real-Time Mic'
                    : 'Pista de 6 Cuerdas a Color y Micrófono en Vivo'}
                </strong>
                <p>
                  {lang === 'en'
                    ? 'Play your real acoustic or electric guitar—Guitar One listens and scores every note.'
                    : 'Toca tu guitarra acústica o eléctrica real: Guitar One escucha y califica cada nota.'}
                </p>
              </div>
            </div>

            <div className="brand-feature-item">
              <span className="feature-dot green" />
              <div>
                <strong>
                  {lang === 'en'
                    ? 'Gibson & Yousician-Style Curriculum'
                    : 'Currículo Estilo Gibson y Yousician'}
                </strong>
                <p>
                  {lang === 'en'
                    ? '5 structured stages from open strings & campfire chords to legendary rock solos.'
                    : '5 etapas desde cuerdas al aire y acordes hasta riffs y solos legendarios.'}
                </p>
              </div>
            </div>

            <div className="brand-feature-item">
              <span className="feature-dot orange" />
              <div>
                <strong>
                  {lang === 'en'
                    ? 'Pro Chromatic Tuner, Chords, Scales & Tab Builder'
                    : 'Afinador Cromático Pro, Acordes, Escalas y Creador de Tabs'}
                </strong>
                <p>
                  {lang === 'en'
                    ? 'Multi-tuning headstock, interactive 15-fret neck, metronome & custom riff studio.'
                    : 'Clavijero multiafinación, mástil interactivo de 15 trastes, metrónomo y creador de riffs.'}
                </p>
              </div>
            </div>
          </div>

          {/* Saved Accounts Quick Switcher */}
          {accounts.length > 0 && (
            <div className="saved-accounts-card">
              <div className="saved-accounts-header">
                <Music2 size={14} />
                <span>{t.auth.savedAccountsTitle}</span>
              </div>
              <div className="saved-accounts-grid">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className="saved-account-chip"
                    onClick={() => onLoginSuccess(acc)}
                  >
                    <div className="avatar-circle">
                      {acc.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="saved-acc-meta">
                      <span className="saved-acc-name">{acc.name}</span>
                      <span className="saved-acc-xp">
                        {acc.xp} XP • {t.auth.switchAccount}
                      </span>
                    </div>
                    <ArrowRight size={14} className="chip-arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Auth Form Card */}
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              <Lock size={15} />
              <span>{t.auth.loginTab}</span>
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              <User size={15} />
              <span>{t.auth.registerTab}</span>
            </button>
          </div>

          <div className="auth-card-header">
            <h2>
              {mode === 'login'
                ? t.auth.welcomeBack
                : t.auth.createYourAccount}
            </h2>
            <p>
              {mode === 'login'
                ? t.auth.subtitleLogin
                : t.auth.subtitleRegister}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="form-group">
                <label>{t.auth.nameLabel}</label>
                <div className="input-with-icon">
                  <User size={16} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t.auth.namePlaceholder}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{t.auth.emailLabel}</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.auth.emailPlaceholder}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t.auth.passwordLabel}</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.auth.passwordPlaceholder}
                />
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label>{t.auth.confirmPasswordLabel}</label>
                  <div className="input-with-icon">
                    <CheckCircle2 size={16} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t.auth.confirmPasswordPlaceholder}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>{t.auth.skillLevelLabel}</label>
                    <select
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      onKeyDown={handleKeyDown}
                    >
                      <option value="beginner">{t.auth.skillBeginner}</option>
                      <option value="intermediate">
                        {t.auth.skillIntermediate}
                      </option>
                      <option value="advanced">{t.auth.skillAdvanced}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{t.auth.styleLabel}</label>
                    <select
                      value={preferredStyle}
                      onChange={(e) => setPreferredStyle(e.target.value)}
                      onKeyDown={handleKeyDown}
                    >
                      <option value="both">{t.auth.styleBoth}</option>
                      <option value="acoustic">{t.auth.styleAcoustic}</option>
                      <option value="electric">{t.auth.styleElectric}</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {error && <div className="auth-error-banner">{error}</div>}

            <button type="submit" className="auth-submit-btn">
              <Sparkles size={17} />
              <span>
                {mode === 'login'
                  ? t.auth.loginButton
                  : t.auth.registerButton}
              </span>
            </button>

            <div className="enter-key-hint">{t.auth.enterHint}</div>
          </form>

          <div className="auth-divider">
            <span>OR / O</span>
          </div>

          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleQuickDemo}
          >
            <Guitar size={16} />
            <span>{t.auth.quickDemoButton}</span>
          </button>
        </div>
      </div>

      {/* Corner Timestamp Indicator required by Global Rule */}
      <div className="corner-timestamp">
        {t.updatedPrefix} {buildTimestamp}
      </div>
    </div>
  );
}
