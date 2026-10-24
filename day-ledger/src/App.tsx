import { formatLong } from './dates';
import { isCarriedOver, progressFor, tasksForDay } from './tree';
import { useCalendar } from './calendar/useCalendar';
import { useLedger } from './useLedger';
import { useReminders } from './useReminders';
import { useSync } from './sync/useSync';
import { SyncPanel } from './components/SyncPanel';
import { Alerts } from './components/Alerts';
import { AlertsToggle } from './components/AlertsToggle';
import { Backup } from './components/Backup';
import { PlanPane } from './components/PlanPane';
import { SchedulePane } from './components/SchedulePane';

export function App() {
  const ledger = useLedger();
  const cal = useCalendar(ledger);
  const reminders = useReminders(ledger);
  const sync = useSync(ledger);
  if (!ledger.ready) return <div className="wrap" aria-busy="true" />;

  const { nodes, today } = ledger;
  const { done, total } = progressFor(nodes, today);
  const todays = tasksForDay(nodes, today);
  const carried = todays.filter((t) => isCarriedOver(t, today)).length;
  const blocked = todays.filter((t) => t.start).reduce((sum, t) => sum + (t.minutes ?? 30), 0);

  return (
    <div className="wrap">
      <header>
        <div>
          <div className="mock">Phase 4 · tasks stored on this device</div>
          <h1>{formatLong(today)}</h1>
        </div>
        <div className="headright">
          <SyncPanel sync={sync} />
          <AlertsToggle />
        </div>
      </header>

      <Alerts reminders={reminders} />

      {ledger.saveError && (
        <p className="alert" role="alert">
          {ledger.saveError}
        </p>
      )}

      <div className="strip" aria-label="Day summary">
        <div>
          <b>
            {done} / {total}
          </b>
          <span>items done</span>
          <div className="bar">
            <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div>
          <b>{todays.length}</b>
          <span>tasks today</span>
        </div>
        {cal.status === 'connected' && (
          <div>
            <b>{cal.events.length}</b>
            <span>calendar events</span>
          </div>
        )}
        <div>
          <b>{Math.floor(blocked / 60)}h {String(blocked % 60).padStart(2, '0')}m</b>
          <span>time-blocked</span>
        </div>
        <div>
          <b className={carried ? 'warn' : ''}>{carried}</b>
          <span>carried over</span>
          {carried > 0 && (
            <button type="button" className="linkbtn" onClick={ledger.moveOverdueToToday}>
              Move to today
            </button>
          )}
        </div>
      </div>

      <div className="panes">
        <PlanPane ledger={ledger} cal={cal} />
        <SchedulePane ledger={ledger} cal={cal} />
      </div>

      <Backup ledger={ledger} />
    </div>
  );
}
