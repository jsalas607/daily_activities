import { useState } from 'react';
import { getWeekKeys, getWeekLabel, getTodayKey } from '../utils/storage';

export default function WeeklyProgress({ activities, records }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const todayKey      = getTodayKey();
  const weekKeys      = getWeekKeys(weekOffset);
  const label         = getWeekLabel(weekOffset);
  const isCurrentWeek = weekOffset === 0;

  // Per-activity stats
  const stats = activities.map(a => {
    const scheduledDays = a.scheduledDays ?? [0,1,2,3,4,5,6];

    // Target = how many scheduled days fall in this week
    // (a full week always has 7 days, each day of week appears once)
    const target = scheduledDays.length;

    // Days in the week up to today that were scheduled
    const eligibleKeys     = weekKeys.filter(k => k <= todayKey);
    const expectedSoFar    = eligibleKeys.filter(k => {
      const dow = new Date(k + 'T00:00:00').getDay();
      return scheduledDays.includes(dow);
    }).length;

    // Completed: any eligible day where the user checked it
    const done = eligibleKeys.filter(k => records[k]?.[a.id]).length;

    const pct     = target > 0 ? Math.round((done / target) * 100) : 0;
    const onTrack = done >= expectedSoFar || !isCurrentWeek;

    return { ...a, done, target, expectedSoFar, pct, onTrack };
  });

  const totalDone   = stats.reduce((s, a) => s + a.done, 0);
  const totalTarget = stats.reduce((s, a) => s + a.target, 0);
  const overallPct  = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

  function statusColor(pct) {
    if (pct >= 100) return 'excellent';
    if (pct >= 70)  return 'good';
    if (pct >= 40)  return 'medium';
    return 'low';
  }

  const overallStatus = statusColor(overallPct);

  return (
    <div className="card weekly-progress">
      <div className="wp-header">
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <span className="icon">📊</span> Progreso Semanal
        </h2>
        <div className="wp-nav">
          <button className="btn-icon" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
          <span className="wp-label">{label}</span>
          <button
            className="btn-icon"
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={isCurrentWeek}
            style={{ opacity: isCurrentWeek ? 0.3 : 1 }}
          >›</button>
        </div>
      </div>

      {/* Overall ring */}
      <div className="wp-overall">
        <div className={`wp-ring wp-ring-${overallStatus}`}>
          <svg viewBox="0 0 44 44" className="ring-svg">
            <circle cx="22" cy="22" r="18" className="ring-track" />
            <circle
              cx="22" cy="22" r="18"
              className="ring-fill"
              strokeDasharray={`${(overallPct / 100) * 113.1} 113.1`}
              strokeDashoffset="28.3"
            />
          </svg>
          <span className="ring-pct">{overallPct}%</span>
        </div>
        <div className="wp-overall-info">
          <p className="wp-overall-title">
            {isCurrentWeek ? 'Esta semana' : 'Semana seleccionada'}
          </p>
          <p className="wp-overall-sub">
            {overallPct}% <span className="wp-overall-goal">/ 100%</span>
          </p>
          <span className={`status-chip status-${overallStatus}`}>
            {overallStatus === 'excellent' && '¡Excelente!'}
            {overallStatus === 'good'      && 'Vas bien'}
            {overallStatus === 'medium'    && 'Puedes mejorar'}
            {overallStatus === 'low'       && 'Necesitas esfuerzo'}
          </span>
        </div>
      </div>

      {/* Per-activity bars */}
      {activities.length === 0 ? (
        <p className="empty-hint">Agrega actividades para ver tu progreso.</p>
      ) : (
        <ul className="wp-list">
          {stats.map(a => (
            <li key={a.id} className="wp-item">
              <div className="wp-item-top">
                <span className="wp-item-name">{a.name}</span>
                <span className={`wp-item-count ${a.pct >= 100 ? 'count-met' : ''}`}>
                  {a.done}/{a.target}d &nbsp;·&nbsp; {a.pct}%
                </span>
              </div>
              <div className="wp-bar-track">
                <div
                  className={`wp-bar-fill wp-bar-${statusColor(a.pct)}`}
                  style={{ width: `${Math.min(a.pct, 100)}%` }}
                />
              </div>
              {isCurrentWeek && !a.onTrack && a.done < a.target && (
                <p className="wp-warning">
                  ⚠ Vas atrasado — te faltan {a.target - a.done} día{a.target - a.done > 1 ? 's' : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
