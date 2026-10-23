import { useState } from 'react';
import { childrenOf, tasksForDay } from '../tree';
import type { Calendar } from '../calendar/useCalendar';
import type { Ledger } from '../useLedger';
import { TaskRow } from './TaskRow';

export function PlanPane({ ledger, cal }: { ledger: Ledger; cal: Calendar }) {
  const { nodes, today } = ledger;
  const goals = childrenOf(nodes, null);
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const todayIds = new Set(tasksForDay(nodes, today).map((t) => t.id));
  const target = goals.find((g) => g.id === goalId) ?? goals[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !title.trim()) return;
    ledger.add(title, target.id);
    setTitle('');
  };

  const submitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    ledger.addGoal(newGoal);
    setNewGoal('');
  };

  const total = [...todayIds].length;

  return (
    <section aria-labelledby="plan">
      <h2 id="plan">
        Today's plan <small>goal → task → subtask</small>
      </h2>

      <form className="add" onSubmit={submit}>
        <input
          id="newtask"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task for today"
          aria-label="New task"
        />
        <select aria-label="Goal for the new task" value={target?.id ?? ''} onChange={(e) => setGoalId(e.target.value)}>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <button type="submit">Add</button>
      </form>

      {total === 0 && (
        <p className="empty">Nothing planned for today. Add your first task above, or add a goal below to group related work.</p>
      )}

      {goals.map((g) => {
        const tasks = childrenOf(nodes, g.id).filter((t) => todayIds.has(t.id));
        const done = tasks.filter((t) => t.done).length;
        const isClosed = closed[g.id];
        return (
          <div key={g.id} className={`goal${isClosed ? ' closed' : ''}`}>
            <button
              type="button"
              className="ghead"
              aria-expanded={!isClosed}
              onClick={() => setClosed({ ...closed, [g.id]: !isClosed })}
            >
              <svg className="caret" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span className="t">{g.title}</span>
              <span className="c">
                {done}/{tasks.length}
              </span>
            </button>
            {!isClosed && (
              <ul className="items">
                {tasks.map((t) => (
                  <TaskRow key={t.id} node={t} nodes={nodes} ledger={ledger} cal={cal} />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <form className="add goalform" onSubmit={submitGoal}>
        <input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="New goal, e.g. Q4 board update"
          aria-label="New goal"
        />
        <button type="submit">Add goal</button>
      </form>
    </section>
  );
}
