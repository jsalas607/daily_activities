import { useState } from 'react';

const DAY_ABBR = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const ALL_DAYS  = [0, 1, 2, 3, 4, 5, 6];

function DayPicker({ value, onChange }) {
  function toggle(i) {
    if (value.includes(i)) {
      onChange(value.filter(d => d !== i));
    } else {
      onChange([...value, i].sort((a, b) => a - b));
    }
  }
  return (
    <div className="day-picker">
      {DAY_ABBR.map((label, i) => (
        <button
          key={i}
          type="button"
          className={`day-btn ${value.includes(i) ? 'day-on' : ''}`}
          onClick={() => toggle(i)}
          title={label}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ActivityManager({ activities, onAdd, onDelete, onChangeDays }) {
  const [input,       setInput]       = useState('');
  const [scheduled,   setScheduled]   = useState([]);
  const [error,       setError]       = useState('');

  function handleAdd() {
    const name = input.trim();
    if (!name) return;
    if (activities.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      setError('Esa actividad ya existe.');
      return;
    }
    if (scheduled.length === 0) {
      setError('Selecciona al menos un día de la semana.');
      return;
    }
    onAdd(name, scheduled);
    setInput('');
    setScheduled([]);
    setError('');
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleAdd();
  }

  return (
    <div className="card activity-manager">
      <h2 className="card-title">
        <span className="icon">📋</span> Mis Actividades
      </h2>

      {/* ── Add form ── */}
      <div className="add-form">
        <div className="input-row">
          <input
            className="text-input"
            type="text"
            placeholder="Nueva actividad..."
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            maxLength={50}
          />
          <button className="btn btn-primary" onClick={handleAdd}>Agregar</button>
        </div>
        <DayPicker value={scheduled} onChange={setScheduled} />
        {error && <p className="input-error">{error}</p>}
      </div>

      {/* ── List ── */}
      {activities.length === 0 ? (
        <p className="empty-hint">Agrega actividades para empezar a registrar tu día.</p>
      ) : (
        <ul className="activity-list">
          {activities.map(activity => {
            const days = activity.scheduledDays ?? ALL_DAYS;
            return (
              <li key={activity.id} className="activity-item activity-item-col">
                <div className="activity-row-top">
                  <span className="activity-dot" />
                  <span className="activity-name">{activity.name}</span>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => onDelete(activity.id)}
                    title="Eliminar"
                  >✕</button>
                </div>
                <DayPicker
                  value={days}
                  onChange={newDays => onChangeDays(activity.id, newDays)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
