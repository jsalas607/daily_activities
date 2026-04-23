import { useState, useEffect, useRef } from 'react';
import { getGoogleConfig, saveGoogleConfig, getWeekKeys, getWeekLabel } from '../utils/storage';

const SCOPE   = 'https://www.googleapis.com/auth/calendar.events';
const CAL_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export default function GoogleCalendarSync({ activities }) {
  const [config, setConfig]         = useState(() => getGoogleConfig());
  const [clientId, setClientId]     = useState('');
  const [time, setTime]             = useState(config.reminderTime || '08:00');
  const [accessToken, setAccessToken] = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [feedback, setFeedback]     = useState(null); // { type: 'ok'|'error', text }
  const [showGuide, setShowGuide]   = useState(false);
  const tokenClientRef              = useRef(null);

  // Init token client when we have a clientId
  useEffect(() => {
    if (!config.clientId) return;
    const init = () => {
      if (!window.google?.accounts?.oauth2) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: SCOPE,
        callback: (resp) => {
          if (resp.error) {
            setFeedback({ type: 'error', text: 'Error al conectar con Google: ' + resp.error });
            return;
          }
          setAccessToken(resp.access_token);
          setFeedback(null);
        },
      });
    };
    // GIS may still be loading
    if (window.google?.accounts?.oauth2) init();
    else { const t = setTimeout(init, 1500); return () => clearTimeout(t); }
  }, [config.clientId]);

  function handleSaveClientId() {
    if (!clientId.trim()) return;
    const updated = { ...config, clientId: clientId.trim() };
    setConfig(updated);
    saveGoogleConfig(updated);
    setClientId('');
  }

  function handleConnect() {
    if (!tokenClientRef.current) {
      setFeedback({ type: 'error', text: 'Google aún está cargando, espera un momento.' });
      return;
    }
    tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
  }

  function handleDisconnect() {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    setAccessToken(null);
    setFeedback(null);
  }

  function handleResetClientId() {
    const updated = { ...config, clientId: '' };
    setConfig(updated);
    saveGoogleConfig(updated);
    setAccessToken(null);
    setFeedback(null);
  }

  function handleTimeChange(val) {
    setTime(val);
    const updated = { ...config, reminderTime: val };
    setConfig(updated);
    saveGoogleConfig(updated);
  }

  async function handleSync() {
    if (!accessToken) { handleConnect(); return; }
    setSyncing(true);
    setFeedback(null);

    const weekKeys = getWeekKeys(0);
    const tz       = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [hh, mm] = time.split(':');
    let created = 0, skipped = 0, authError = false;

    for (const dayKey of weekKeys) {
      const dow           = new Date(dayKey + 'T00:00:00').getDay();
      const dayActivities = activities.filter(a => {
        const days = a.scheduledDays ?? [0,1,2,3,4,5,6];
        return days.includes(dow);
      });
      if (dayActivities.length === 0) { skipped++; continue; }

      // Build event end time (+30 min)
      const startDate = new Date(`${dayKey}T${hh}:${mm}:00`);
      const endDate   = new Date(startDate.getTime() + 30 * 60000);
      const pad       = n => String(n).padStart(2, '0');
      const fmtLocal  = d =>
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

      const description = dayActivities.map(a => `• ${a.name}`).join('\n');

      const event = {
        summary:     '📋 Actividades del día',
        description,
        start:       { dateTime: fmtLocal(startDate), timeZone: tz },
        end:         { dateTime: fmtLocal(endDate),   timeZone: tz },
        reminders:   { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
      };

      try {
        const res = await fetch(CAL_API, {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (res.status === 401) { authError = true; break; }
        if (res.ok) created++;
      } catch {
        // network error — continue
      }
    }

    setSyncing(false);

    if (authError) {
      setAccessToken(null);
      setFeedback({ type: 'error', text: 'Sesión expirada. Vuelve a conectarte con Google.' });
      return;
    }

    const updated = { ...config, lastSync: new Date().toISOString() };
    setConfig(updated);
    saveGoogleConfig(updated);

    setFeedback({
      type: 'ok',
      text: `✓ ${created} evento${created !== 1 ? 's' : ''} creados en Google Calendar (${skipped} días sin actividades omitidos)`,
    });
  }

  const weekLabel = getWeekLabel(0);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="card gc-card">
      <div className="gc-header">
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <span className="icon">🗓</span> Google Calendar
        </h2>
        <button className="btn-link" onClick={() => setShowGuide(g => !g)}>
          {showGuide ? 'Ocultar guía' : '¿Cómo configurar?'}
        </button>
      </div>

      {/* Setup guide */}
      {showGuide && (
        <div className="gc-guide">
          <p className="gc-guide-title">Pasos para obtener tu Client ID</p>
          <ol className="gc-guide-list">
            <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">console.cloud.google.com</a></li>
            <li>Crea un proyecto nuevo (ej: <em>Daily Activities</em>)</li>
            <li>Ve a <strong>APIs y servicios → Habilitar APIs</strong> y activa <strong>Google Calendar API</strong></li>
            <li>Ve a <strong>Credenciales → Crear credenciales → ID de cliente OAuth</strong></li>
            <li>Tipo de aplicación: <strong>Aplicación web</strong></li>
            <li>En <strong>Orígenes autorizados</strong> agrega: <code>http://localhost:5173</code></li>
            <li>Copia el <strong>Client ID</strong> y pégalo abajo</li>
          </ol>
        </div>
      )}

      {/* Step 1: Enter client ID */}
      {!config.clientId ? (
        <div className="gc-section">
          <label className="gc-label">Client ID de Google</label>
          <div className="input-row" style={{ marginTop: 6 }}>
            <input
              className="text-input"
              placeholder="xxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveClientId()}
            />
            <button className="btn btn-primary" onClick={handleSaveClientId}>
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Step 2: Connect */}
          <div className="gc-section">
            {accessToken ? (
              <div className="gc-connected-row">
                <span className="gc-dot" />
                <span className="gc-connected-text">Conectado con Google</span>
                <button className="btn-link gc-disconnect" onClick={handleDisconnect}>
                  Desconectar
                </button>
              </div>
            ) : (
              <button className="btn btn-google" onClick={handleConnect}>
                <GoogleIcon />
                Conectar con Google
              </button>
            )}
          </div>

          {/* Step 3: Config + Sync */}
          {accessToken && (
            <>
              <div className="gc-time-row">
                <label className="gc-label">⏰ Hora del aviso diario</label>
                <input
                  type="time"
                  className="gc-time-input"
                  value={time}
                  onChange={e => handleTimeChange(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary gc-sync-btn"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing
                  ? '⏳ Sincronizando...'
                  : `📤 Sincronizar semana (${weekLabel})`}
              </button>

              {config.lastSync && !syncing && (
                <p className="gc-last-sync">
                  Última sincronización:{' '}
                  {new Date(config.lastSync).toLocaleString('es', {
                    day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </>
          )}

          {/* Reset client ID */}
          <button className="btn-link gc-reset" onClick={handleResetClientId}>
            Cambiar Client ID
          </button>
        </>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`gc-feedback gc-feedback-${feedback.type}`}>
          {feedback.text}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
