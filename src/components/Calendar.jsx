import { useState } from 'react';
import { dateKey, getTodayKey } from '../utils/storage';

const DAY_HEADERS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_COLORS   = ['#ef4444','#3b82f6','#f59e0b','#3b82f6','#f59e0b','#3b82f6','#10b981'];
const MONTH_NAMES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_NAMES_ES = ['enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'];

export default function Calendar({ activities, records }) {
  const today    = new Date();
  const todayKey = getTodayKey();

  const [viewYear,    setViewYear]    = useState(today.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Activities scheduled for a given day-of-week
  function scheduledFor(dow) {
    return activities.filter(a => {
      const days = a.scheduledDays ?? [0,1,2,3,4,5,6];
      return days.includes(dow);
    });
  }

  function completedCount(key) {
    const r = records[key] || {};
    return Object.values(r).filter(Boolean).length;
  }

  function hasSome(key) {
    const r = records[key];
    return r && Object.values(r).some(Boolean);
  }

  // Panel data for selected day
  const selDate     = selectedKey ? new Date(selectedKey + 'T00:00:00') : null;
  const selDow      = selDate ? selDate.getDay() : null;
  const selRecord   = selectedKey ? (records[selectedKey] || {}) : {};
  const selScheduled = selDow !== null ? scheduledFor(selDow) : [];
  const selDone     = selScheduled.filter(a => selRecord[a.id]).length;
  const isFutureSelected = selectedKey ? selectedKey > todayKey : false;

  return (
    <div className="cal-wrapper card">

      {/* ── Header ── */}
      <div className="cal-topbar">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <h2 className="cal-title">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>
        {selectedKey && (
          <button className="cal-clear-btn" onClick={() => setSelectedKey(null)}>
            Limpiar ✕
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="cal-body">

        {/* ── Detail Panel (always visible, left side) ── */}
        <div className="cal-panel">
          {!selectedKey ? (
            <div className="cal-panel-empty">
              <span className="cal-panel-empty-icon">👆</span>
              <p>Selecciona un día para ver sus actividades</p>
            </div>
          ) : (
            <>
              <div className="cal-panel-date">
                <span className="cal-panel-day">{selDate.getDate()}</span>
                <div>
                  <p className="cal-panel-weekday">{DAY_HEADERS[selDow]}</p>
                  <p className="cal-panel-month">
                    {MONTH_NAMES_ES[selDate.getMonth()]} {selDate.getFullYear()}
                  </p>
                  {selectedKey === todayKey && (
                    <span className="cal-panel-today-chip">Hoy</span>
                  )}
                </div>
              </div>

              {!isFutureSelected ? (
                <>
                  <div className="cal-panel-stats">
                    <span className="cal-panel-stat-num">{selDone}</span>
                    <span className="cal-panel-stat-label">/ {selScheduled.length} completadas</span>
                  </div>
                  {selScheduled.length === 0 ? (
                    <p className="empty-hint" style={{ marginTop: 8 }}>
                      No hay actividades programadas para este día.
                    </p>
                  ) : (
                    <ul className="cal-panel-list">
                      {selScheduled.map(a => {
                        const done = !!selRecord[a.id];
                        return (
                          <li key={a.id} className={`cal-panel-item ${done ? 'cpi-done' : 'cpi-miss'}`}>
                            <span className="cpi-icon">{done ? '✓' : '○'}</span>
                            <span className="cpi-name">{a.name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              ) : (
                <>
                  <p className="cal-panel-future-label">Programado para este día:</p>
                  {selScheduled.length === 0 ? (
                    <p className="empty-hint" style={{ marginTop: 8 }}>
                      No hay actividades programadas.
                    </p>
                  ) : (
                    <ul className="cal-panel-list">
                      {selScheduled.map(a => (
                        <li key={a.id} className="cal-panel-item cpi-future">
                          <span className="cpi-icon">○</span>
                          <span className="cpi-name">{a.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Grid */}
        <div className="cal-grid-wrap">
          <div className="cal-grid">
            {DAY_HEADERS.map((h, i) => (
              <div key={h} className="cal-hdr" style={{ color: DAY_COLORS[i] }}>{h}</div>
            ))}

            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} className="cal-cell cal-empty" />;

              const key        = dateKey(viewYear, viewMonth, day);
              const dow        = new Date(key + 'T00:00:00').getDay();
              const isToday    = key === todayKey;
              const isFuture   = key > todayKey;
              const hasAct     = hasSome(key);
              const isSelected = selectedKey === key;
              const done       = completedCount(key);
              const scheduled  = scheduledFor(dow).length;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedKey(isSelected ? null : key)}
                  className={[
                    'cal-cell',
                    isToday    ? 'c-today'    : '',
                    isFuture   ? 'c-future'   : 'c-past',
                    isSelected ? 'c-selected' : '',
                    hasAct && !isSelected ? 'c-has-act' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="c-num">{day}</span>
                  {/* Badge: completed/scheduled */}
                  {!isSelected && scheduled > 0 && (
                    <span className={`c-badge ${hasAct ? 'c-badge-done' : ''}`}>
                      {isFuture ? scheduled : `${done}/${scheduled}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
