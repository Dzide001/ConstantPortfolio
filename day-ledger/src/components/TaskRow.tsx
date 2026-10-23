import { useState } from 'react';
import { addDays } from '../dates';
import { childrenOf, isCarriedOver } from '../tree';
import type { Calendar } from '../calendar/useCalendar';
import type { Ledger } from '../useLedger';
import type { Node } from '../types';

interface Props {
  node: Node;
  nodes: Node[];
  ledger: Ledger;
  cal: Calendar;
  isSub?: boolean;
}

const PRIORITY_LABEL = ['No priority', 'High priority', 'Medium priority'] as const;

export function TaskRow({ node, nodes, ledger, cal, isSub = false }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const subs = childrenOf(nodes, node.id);
  const carried = isCarriedOver(node, ledger.today);

  const submitSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    ledger.add(draft, node.id);
    setDraft('');
  };

  return (
    <li>
      <div className={`task${isSub ? ' sub' : ''}`}>
        <span className={`pri p${node.priority}`} title={PRIORITY_LABEL[node.priority]} />
        <label>
          <input type="checkbox" checked={node.done} onChange={() => ledger.toggle(node.id)} />
          <span className="txt">
            {node.title}
            {(node.start || node.eventId || carried) && (
              <span className="tags">
                {node.start && <span className="tag">{node.start}</span>}
                {node.eventId && <span className="tag ev">On calendar</span>}
                {carried && <span className="tag late">Carried over</span>}
              </span>
            )}
          </span>
        </label>
        <button
          type="button"
          className="more"
          aria-expanded={open}
          aria-label={`Options for ${node.title}`}
          onClick={() => {
            setOpen(!open);
            setConfirmDelete(false);
          }}
        >
          ⋯
        </button>
      </div>

      {open && (
        <div className="opts">
          {!isSub && (
            <button type="button" onClick={() => setAdding(!adding)}>
              + Subtask
            </button>
          )}
          {!isSub && (
            <>
              <label className="inline">
                Time
                <input
                  type="time"
                  value={node.start ?? ''}
                  onChange={(e) => ledger.patch(node.id, { start: e.target.value || undefined, minutes: node.minutes ?? 30 })}
                />
              </label>
              <label className="inline">
                Length
                <select
                  value={node.minutes ?? 30}
                  onChange={(e) => ledger.patch(node.id, { minutes: Number(e.target.value) })}
                >
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
              {cal.status === 'connected' && node.start && (
                node.eventId ? (
                  <button type="button" onClick={() => cal.unlinkTask(node)}>
                    On calendar · remove
                  </button>
                ) : (
                  <button type="button" onClick={() => cal.addTask(node)}>
                    Add to calendar
                  </button>
                )
              )}
              <button type="button" onClick={() => ledger.patch(node.id, { day: addDays(ledger.today, 1), start: undefined })}>
                Move to tomorrow
              </button>
              <button type="button" onClick={() => ledger.patch(node.id, { priority: ((node.priority + 1) % 3) as 0 | 1 | 2 })}>
                Priority: {['none', 'high', 'medium'][node.priority]}
              </button>
            </>
          )}
          {confirmDelete ? (
            <button
              type="button"
              className="danger"
              onClick={() => {
                cal.removeTask(node);
                ledger.remove(node.id);
              }}
            >
              Confirm delete{subs.length ? ` (+${subs.length} subtask${subs.length > 1 ? 's' : ''})` : ''}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
        </div>
      )}

      {adding && !isSub && (
        <form className="subadd" onSubmit={submitSub}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Subtask title"
            aria-label={`New subtask for ${node.title}`}
          />
          <button type="submit">Add</button>
        </form>
      )}

      {subs.length > 0 && (
        <ul>
          {subs.map((s) => (
            <TaskRow key={s.id} node={s} nodes={nodes} ledger={ledger} cal={cal} isSub />
          ))}
        </ul>
      )}
    </li>
  );
}
