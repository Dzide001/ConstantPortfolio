import { formatLong } from './dates';
import { isCarriedOver, progressFor, tasksForDay } from './tree';
import { useLedger } from './useLedger';
import { Backup } from './components/Backup';
import { PlanPane } from './components/PlanPane';
import { SchedulePane } from './components/SchedulePane';

export function App() {
  const ledger = useLedger();
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
          <div className="mock">Phase 1 · stored on this device</div>
          <h1>{formatLong(today)}</h1>
        </div>
      </header>

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
        <PlanPane ledger={ledger} />
        <SchedulePane ledger={ledger} />
      </div>

      <Backup ledger={ledger} />
    </div>
  );
}
