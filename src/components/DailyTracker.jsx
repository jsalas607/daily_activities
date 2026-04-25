import { useState } from 'react';
import { getTodayKey, getCurrentWeekKeys } from '../utils/storage';

const DAY_NAMES  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'];

export default function DailyTracker({ activities, todayRecord, records, onToggle, isSubmitted, onSubmit }) {
  const [confirming, setConfirming] = useState(false);

  const today    = new Date();
  const todayKey = getTodayKey();
  const todayDow = today.getDay();

  const dayName   = DAY_NAMES[todayDow];
  const monthName = MONTH_NAMES[today.getMonth()];
  const dateLabel = `${dayName}, ${today.getDate()} de ${monthName} de ${today.getFullYear()}`;

  const todayActivities = activities.filter(a => {
    const days = a.scheduledDays ?? [0,1,2,3,4,5,6];
    return days.includes(todayDow);
  });

  const weekKeys = getCurrentWeekKeys();

  function weekCount(activityId) {
    return weekKeys.filter(k => k <= todayKey && records[k]?.[activityId]).length;
  }

  const completed = todayActivities.filter(a => todayRecord[a.id]).length;
  const total     = todayActivities.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  function handleSubmit() {
    onSubmit();
    setConfirming(false);
  }

  return (
    <div className="card daily-tracker">
      <h2 className="card-title">
        <span className="icon">✅</span> Registro de Hoy
      </h2>
      <p className="today-date">{dateLabel}</p>

      {total > 0 && (
        <div className="progress-bar-wrap">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-label">{completed}/{total} — {pct}%</span>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="empty-hint">Agrega actividades en el panel de la izquierda.</p>
      ) : todayActivities.length === 0 ? (
        <p className="empty-hint">No tienes actividades programadas para hoy.</p>
      ) : (
        <>
          <ul className="tracker-list">
            {todayActivities.map(activity => {
              const done      = !!todayRecord[activity.id];
              const target    = (activity.scheduledDays ?? [0,1,2,3,4,5,6]).length;
              const done_week = weekCount(activity.id);
              const weekMet   = done_week >= target;

              return (
                <li
                  key={activity.id}
                  className={`tracker-item ${done ? 'done' : ''} ${isSubmitted ? 'tracker-locked' : ''}`}
                  onClick={() => !isSubmitted && onToggle(activity.id)}
                >
                  <span className={`checkbox ${done ? 'checked' : ''}`}>
                    {done ? '✓' : ''}
                  </span>
                  <span className="tracker-name">{activity.name}</span>
                  <span className={`week-badge ${weekMet ? 'week-met' : ''}`} title="Esta semana">
                    {done_week}/{target}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* ── Zona de envío ── */}
          {isSubmitted ? (
            <div className="submit-done">
              <span className="submit-done-icon">📬</span>
              <span>Registro enviado — día bloqueado</span>
            </div>
          ) : confirming ? (
            <div className="submit-confirm">
              <p className="submit-confirm-text">
                ¿Enviar registro? <strong>No podrás modificarlo después.</strong>
              </p>
              <div className="submit-confirm-btns">
                <button className="btn btn-primary" onClick={handleSubmit}>
                  Sí, enviar
                </button>
                <button className="btn-link" onClick={() => setConfirming(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-submit-day" onClick={() => setConfirming(true)}>
              📤 Enviar registro de hoy
            </button>
          )}
        </>
      )}
    </div>
  );
}
