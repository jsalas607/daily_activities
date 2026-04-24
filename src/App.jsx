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
  const [user,       setUser]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activities, setActivities] = useState([]);
  const [records,    setRecords]    = useState({});

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
    } else {
      setActivities([]);
      setRecords({});
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

        {/* Mis Actividades — ancho completo */}
        <ActivityManager
          activities={activities}
          onAdd={addActivity}
          onDelete={deleteActivity}
          onChangeDays={changeActivityDays}
        />

        {/* Fila inferior: Calendario | Registro + Progreso */}
        <div className="bottom-cols">
          <Calendar
            activities={activities}
            records={records}
          />
          <div className="right-col">
            <DailyTracker
              activities={activities}
              todayRecord={todayRecord}
              records={records}
              onToggle={toggleToday}
            />
            <WeeklyProgress
              activities={activities}
              records={records}
            />
          </div>
        </div>

      </main>
    </div>
  );
}
