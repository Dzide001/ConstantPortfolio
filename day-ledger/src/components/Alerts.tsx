import { SNOOZE_MINUTES } from '../reminders';
import type { Reminders } from '../useReminders';

export function Alerts({ reminders }: { reminders: Reminders }) {
  if (reminders.visible.length === 0) return null;
  return (
    <div className="alerts" role="status" aria-live="polite">
      {reminders.visible.map(({ alert, node, label }) => (
        <div key={alert.key} className="remind">
          <div className="remind-text">
            <b>{node.title}</b>
            <span>
              {label} · {node.start}
            </span>
          </div>
          <div className="remind-btns">
            <button type="button" className="primary" onClick={() => reminders.complete(alert)}>
              Done
            </button>
            <button type="button" onClick={() => reminders.snooze(alert.key)}>
              Snooze {SNOOZE_MINUTES} min
            </button>
            <button type="button" onClick={() => reminders.dismiss(alert.key)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
