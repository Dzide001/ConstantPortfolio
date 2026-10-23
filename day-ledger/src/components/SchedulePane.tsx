import { useEffect, useState } from 'react';
import { fromMinutes, toMinutes } from '../dates';
import { tasksForDay } from '../tree';
import type { Ledger } from '../useLedger';

const FIRST = 6;
const LAST = 22;

export function SchedulePane({ ledger }: { ledger: Ledger }) {
  const { nodes, today } = ledger;
  const blocks = tasksForDay(nodes, today).filter((t) => t.start);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const nowH = now.getHours();
  const nowLabel = fromMinutes(now.getHours() * 60 + now.getMinutes());
  const hours = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);

  return (
    <section aria-labelledby="sched">
      <h2 id="sched">
        Schedule <small>time-blocked tasks</small>
      </h2>

      <div className="calnote" role="note">
        <b>Calendar events</b> will appear here once Google Calendar is connected (Phase 2).
      </div>

      <div className="tl">
        {hours.map((h) => {
          const slot = blocks.filter((b) => Math.floor(toMinutes(b.start!) / 60) === h);
          return (
            <div key={h}>
              <div className="row">
                <div className="hr">{String(h).padStart(2, '0')}:00</div>
                <div className="slot">
                  {slot.map((b) => (
                    <div key={b.id} className={`blk${b.done ? ' isdone' : ''}`}>
                      <b>{b.title}</b>
                      <span>
                        {b.start}–{fromMinutes(toMinutes(b.start!) + (b.minutes ?? 30))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {h === nowH && <div className="now" data-time={nowLabel} role="img" aria-label={`Current time ${nowLabel}`} />}
            </div>
          );
        })}
      </div>
      {blocks.length === 0 && <p className="empty">Give a task a time (⋯ menu on the task) to block it into your day.</p>}
    </section>
  );
}
