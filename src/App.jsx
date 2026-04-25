import { useState, useEffect } from 'react';
import ActivityManager from './components/ActivityManager';
import DailyTracker from './components/DailyTracker';
import Calendar from './components/Calendar';
import WeeklyProgress from './components/WeeklyProgress';
import Auth from './components/Auth';
import { supabase } from './utils/supabase';
import { getTodayKey } from './utils/storage';
import './App.css';

export default function App() {
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activities,  setActivities]  = useState([]);
  const [records,     setRecords]     = useState({});
  const [submissions, setSubmissions] = useState({});

  const todayKey    = getTodayKey();
  const todayRecord = records[todayKey] || {};

  // ── Escuchar cambios de sesión ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Cargar datos cuando el usuario inicia sesión ────────────────────────
  useEffect(() => {
    if (user) {
      loadActivities();
      loadRecords();
      loadSubmissions();
      requestNotificationPermission();
    } else {
      setActivities([]);
      setRecords({});
      setSubmissions({});
    }
  }, [user]);

  async function loadActivities() {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('created_at');
    if (data) {
      setActivities(data.map(a => ({
        id:            a.id,
        name:          a.name,
        scheduledDays: a.scheduled_days,
      })));
    }
  }

  async function loadSubmissions() {
    const { data } = await supabase.from('daily_submissions').select('date');
    if (data) {
      const subs = {};
      data.forEach(s => { subs[s.date] = true; });
      setSubmissions(subs);
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  async function loadRecords() {
    const { data } = await supabase
      .from('records')
      .select('*');
    if (data) {
      const rec = {};
      data.forEach(r => {
        if (!rec[r.date]) rec[r.date] = {};
        rec[r.date][r.activity_id] = r.done;
      });
      setRecords(rec);
    }
  }

  // ── CRUD actividades ────────────────────────────────────────────────────
  async function addActivity(name, scheduledDays) {
    const { data } = await supabase
      .from('activities')
      .insert({ user_id: user.id, name, scheduled_days: scheduledDays })
      .select()
      .single();
    if (data) {
      setActivities(prev => [...prev, {
        id:            data.id,
        name:          data.name,
        scheduledDays: data.scheduled_days,
      }]);
    }
  }

  async function deleteActivity(id) {
    await supabase.from('activities').delete().eq('id', id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  async function changeActivityDays(id, scheduledDays) {
    await supabase
      .from('activities')
      .update({ scheduled_days: scheduledDays })
      .eq('id', id);
    setActivities(prev =>
      prev.map(a => a.id === id ? { ...a, scheduledDays } : a)
    );
  }

  // ── Toggle actividad de hoy ─────────────────────────────────────────────
  async function toggleToday(activityId) {
    const current = records[todayKey]?.[activityId] ?? false;
    const newDone = !current;

    // Actualización optimista (cambia la UI de inmediato sin esperar a Supabase)
    setRecords(prev => ({
      ...prev,
      [todayKey]: { ...(prev[todayKey] || {}), [activityId]: newDone },
    }));

    await supabase.from('records').upsert({
      user_id:     user.id,
      activity_id: activityId,
      date:        todayKey,
      done:        newDone,
    }, { onConflict: 'user_id,activity_id,date' });
  }

  async function submitDay() {
    if (submissions[todayKey]) return;
    const { error } = await supabase.from('daily_submissions').insert({
      user_id: user.id,
      date:    todayKey,
    });
    if (!error) {
      setSubmissions(prev => ({ ...prev, [todayKey]: true }));
      showNotification('📬 Registro enviado', 'Tu registro de hoy ha sido guardado. ¡Buen trabajo!');
    }
  }

  // ── Timer auto-envío a las 23:59 ───────────────────────────────────────
  useEffect(() => {
    if (!user || submissions[todayKey]) return;

    const now         = new Date();
    const warning     = new Date(); warning.setHours(23, 58, 0, 0);
    const autoSubmit  = new Date(); autoSubmit.setHours(23, 59, 0, 0);

    const msToWarning    = warning    - now;
    const msToAutoSubmit = autoSubmit - now;

    let warningTimer, submitTimer;

    if (msToWarning > 0) {
      warningTimer = setTimeout(() => {
        showNotification('⏰ Daily Activities', 'Tu registro diario se enviará automáticamente en 1 minuto.');
      }, msToWarning);
    }

    if (msToAutoSubmit > 0) {
      submitTimer = setTimeout(() => {
        submitDay();
      }, msToAutoSubmit);
    }

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(submitTimer);
    };
  }, [user, submissions[todayKey], todayKey]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // ── Pantallas de carga / login ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo">🗓</div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  // ── App principal ───────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">
            <span className="logo-icon">🗓</span> Daily Activities
          </h1>
          <p className="app-subtitle">Registra y sigue tus actividades diarias</p>
        </div>
        <div className="app-header-right">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="user-avatar"
            />
          )}
          <div className="user-info">
            <span className="user-name">{user.user_metadata?.full_name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="btn-link user-signout" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="app-main">

        {/* Columna izquierda 30% — Mis Actividades */}
        <div className="col-left">
          <ActivityManager
            activities={activities}
            onAdd={addActivity}
            onDelete={deleteActivity}
            onChangeDays={changeActivityDays}
          />
        </div>

        {/* Columna derecha 70% — Registro + Progreso arriba, Calendario abajo */}
        <div className="col-right">
          <div className="col-right-top">
            <DailyTracker
              activities={activities}
              todayRecord={todayRecord}
              records={records}
              onToggle={toggleToday}
              isSubmitted={!!submissions[todayKey]}
              onSubmit={submitDay}
            />
            <WeeklyProgress
              activities={activities}
              records={records}
            />
          </div>
          <Calendar
            activities={activities}
            records={records}
          />
        </div>

      </main>
    </div>
  );
}
