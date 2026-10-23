import { useEffect, useState } from 'react';
import { fromMinutes, toMinutes } from '../dates';
import { tasksForDay } from '../tree';
import { CLIENT_ID } from '../calendar/auth';
import type { Calendar } from '../calendar/useCalendar';
import type { Ledger } from '../useLedger';

const FIRST = 6;
const LAST = 22;
const bucket = (minutes: number) => Math.min(Math.max(Math.floor(minutes / 60), FIRST), LAST);

export function SchedulePane({ ledger, cal }: { ledger: Ledger; cal: Calendar }) {
  const { nodes, today } = ledger;
  const blocks = tasksForDay(nodes, today).filter((t) => t.start);
  // Events this app created are already shown as task blocks, so hide the calendar's copy.
  const ours = new Set(nodes.map((n) => n.eventId).filter(Boolean));
  const events = cal.events.filter((e) => !ours.has(e.id));
  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const nowH = Math.min(Math.max(now.getHours(), FIRST), LAST);
  const nowLabel = fromMinutes(now.getHours() * 60 + now.getMinutes());
  const hours = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);

  return (
    <section aria-labelledby="sched">
      <h2 id="sched">
        Schedule <small>calendar + time-blocked tasks</small>
      </h2>

      <div className="calnote">
        {cal.status === 'unconfigured' && (
          <p>
            <b>Google Calendar is not set up.</b> Add a Google client ID to connect it. Steps are in <code>docs/GOOGLE_SETUP.md</code>.
            {CLIENT_ID === '' && ' Your task blocks still work without it.'}
          </p>
        )}
        {(cal.status === 'disconnected' || cal.status === 'connecting') && (
          <div className="calrow">
            <span>Show your Google Calendar events here and add time-blocked tasks to it.</span>
            <button type="button" onClick={cal.connect} disabled={cal.status === 'connecting'}>
              {cal.status === 'connecting' ? 'Connecting…' : 'Connect Google Calendar'}
            </button>
          </div>
        )}
        {cal.status === 'connected' && (
          <div className="calrow">
            <span>
              <i className="dot" /> Google Calendar connected · {events.length} event{events.length === 1 ? '' : 's'} today
            </span>
            <span className="calbtns">
              <button type="button" onClick={cal.refresh}>
                Refresh
              </button>
              <button type="button" onClick={cal.disconnect}>
                Disconnect
              </button>
            </span>
          </div>
        )}
        {cal.error && (
          <p className="calerr" role="alert">
            {cal.error}
          </p>
        )}
      </div>

      {allDay.length > 0 && (
        <div className="allday" aria-label="All-day events">
          {allDay.map((e) => (
            <span key={e.id} className="tag ev">
              {e.title}
            </span>
          ))}
        </div>
      )}

      <div className="tl">
        {hours.map((h) => (
          <div key={h}>
            <div className="row">
              <div className="hr">{String(h).padStart(2, '0')}:00</div>
              <div className="slot">
                {timed
                  .filter((e) => bucket(e.startMin) === h)
                  .map((e) => (
                    <div key={e.id} className="blk ev">
                      <b>{e.title}</b>
                      <span>
                        {fromMinutes(e.startMin)}–{fromMinutes(Math.min(e.endMin, 24 * 60 - 1))}
                        {e.location ? ` · ${e.location}` : ''}
                      </span>
                    </div>
                  ))}
                {blocks
                  .filter((b) => bucket(toMinutes(b.start!)) === h)
                  .map((b) => (
                    <div key={b.id} className={`blk${b.done ? ' isdone' : ''}`}>
                      <b>{b.title}</b>
                      <span>
                        {b.start}–{fromMinutes(Math.min(toMinutes(b.start!) + (b.minutes ?? 30), 24 * 60 - 1))}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            {h === nowH && <div className="now" data-time={nowLabel} role="img" aria-label={`Current time ${nowLabel}`} />}
          </div>
        ))}
      </div>
      {blocks.length === 0 && timed.length === 0 && (
        <p className="empty">Give a task a time (⋯ menu on the task) to block it into your day.</p>
      )}
    </section>
  );
}
