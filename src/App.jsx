import { useState } from 'react';
import ActivityManager from './components/ActivityManager';
import DailyTracker from './components/DailyTracker';
import Calendar from './components/Calendar';
import WeeklyProgress from './components/WeeklyProgress';
import GoogleCalendarSync from './components/GoogleCalendarSync';
import {
  getActivities, saveActivities,
  getRecords, saveRecords,
  getTodayKey,
} from './utils/storage';
import './App.css';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [activities, setActivities] = useState(() => getActivities());
  const [records, setRecords] = useState(() => getRecords());

  const todayKey = getTodayKey();
  const todayRecord = records[todayKey] || {};

  function addActivity(name, scheduledDays) {
    const updated = [...activities, { id: generateId(), name, scheduledDays }];
    setActivities(updated);
    saveActivities(updated);
  }

  function deleteActivity(id) {
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated);
    saveActivities(updated);
  }

  function changeActivityDays(id, scheduledDays) {
    const updated = activities.map(a => a.id === id ? { ...a, scheduledDays } : a);
    setActivities(updated);
    saveActivities(updated);
  }

  function toggleToday(activityId) {
    const current = records[todayKey] || {};
    const updated = {
      ...records,
      [todayKey]: { ...current, [activityId]: !current[activityId] },
    };
    setRecords(updated);
    saveRecords(updated);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="logo-icon">🗓</span> Daily Activities
        </h1>
        <p className="app-subtitle">Registra y sigue tus actividades diarias</p>
      </header>

      <main className="app-main">
        <div className="left-col">
          <ActivityManager
            activities={activities}
            onAdd={addActivity}
            onDelete={deleteActivity}
            onChangeDays={changeActivityDays}
          />
          <DailyTracker
            activities={activities}
            todayRecord={todayRecord}
            records={records}
            onToggle={toggleToday}
          />
        </div>
        <div className="right-col">
          <WeeklyProgress
            activities={activities}
            records={records}
          />
          <GoogleCalendarSync activities={activities} />
          <Calendar
            activities={activities}
            records={records}
          />
        </div>
      </main>
    </div>
  );
}
