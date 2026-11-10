// Showcase: TSX — typed components, generics, hooks, unions, and events.
import { type ChangeEvent, type ReactNode, useCallback, useMemo, useReducer, useState } from "react";

export type Theme = "light" | "dark";

export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Task {
  readonly id: number;
  title: string;
  priority: Priority;
  done: boolean;
  tags?: string[];
}

type Action =
  | { type: "add"; title: string; priority: Priority }
  | { type: "toggle"; id: number }
  | { type: "remove"; id: number }
  | { type: "clear" };

const PRIORITY_LABEL = {
  low: "Low",
  normal: "Normal",
  high: "High",
} satisfies Record<Priority, string>;

let nextId = 1;

function reducer(tasks: Task[], action: Action): Task[] {
  switch (action.type) {
    case "add":
      return [...tasks, { id: nextId++, title: action.title, priority: action.priority, done: false }];
    case "toggle":
      return tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case "remove":
      return tasks.filter((t) => t.id !== action.id);
    case "clear":
      return tasks.filter((t) => !t.done);
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

interface ListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string | number;
  render: (item: T, index: number) => ReactNode;
  empty?: ReactNode;
}

// A generic component: the trailing comma in <T,> keeps TSX from reading it as a tag.
export function List<T,>({ items, getKey, render, empty = <p className="muted">Nothing here.</p> }: ListProps<T>) {
  if (items.length === 0) return <>{empty}</>;
  return (
    <ul className="list">
      {items.map((item, index) => (
        <li key={getKey(item)}>{render(item, index)}</li>
      ))}
    </ul>
  );
}

type BadgeProps = { priority: Priority; children?: ReactNode } & React.HTMLAttributes<HTMLSpanElement>;

function Badge({ priority, children, ...rest }: BadgeProps) {
  return (
    <span {...rest} className={`badge badge-${priority}`} data-priority={priority}>
      {children ?? PRIORITY_LABEL[priority]}
    </span>
  );
}

export default function TaskBoard({ theme = "dark", initial = [] }: { theme?: Theme; initial?: Task[] }) {
  const [tasks, dispatch] = useReducer(reducer, initial);
  const [title, setTitle] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tasks.filter((t) => t.title.toLowerCase().includes(q) || t.tags?.some((tag) => tag === q)) : tasks;
  }, [tasks, query]);

  const remaining = tasks.filter((t) => !t.done).length;

  const onPriority = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (isPriority(value)) setPriority(value);
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    dispatch({ type: "add", title: title.trim(), priority });
    setTitle("");
  }

  return (
    <section className={`board board-${theme}`} aria-label="Tasks">
      <header>
        <h2>
          Tasks <small>{remaining} left</small>
        </h2>
        <input
          type="search"
          placeholder="Filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      <form onSubmit={onSubmit}>
        <input value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
        <select value={priority} onChange={onPriority}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={title.length === 0}>
          Add
        </button>
      </form>

      <List
        items={visible}
        getKey={(task) => task.id}
        empty={query ? <p>No match for “{query}”.</p> : undefined}
        render={(task) => (
          <label className={task.done ? "task is-done" : "task"}>
            <input type="checkbox" checked={task.done} onChange={() => dispatch({ type: "toggle", id: task.id })} />
            {task.title} <Badge priority={task.priority} title={`Priority: ${task.priority}`} />
            {task.priority === "high" && !task.done ? <strong aria-hidden="true">!</strong> : null}
          </label>
        )}
      />

      {tasks.some((t) => t.done) && (
        <footer>
          <button type="button" onClick={() => dispatch({ type: "clear" })}>
            Clear completed
          </button>
        </footer>
      )}
    </section>
  );
}
