// Showcase: JSX — components, hooks, lists, and events.
import { useEffect, useMemo, useRef, useState } from "react";

const STATUS_COLORS = {
  idle: "gray",
  loading: "blue",
  error: "red",
};

function Badge({ status, count }) {
  const color = STATUS_COLORS[status] ?? "gray";
  return (
    <span className={`badge badge-${color}`} title={`${count} items`}>
      {status}: {count}
    </span>
  );
}

function TodoItem({ todo, onToggle, onRemove }) {
  return (
    <li className={todo.done ? "todo is-done" : "todo"}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
        <span>{todo.text}</span>
      </label>
      <button type="button" aria-label={`Remove ${todo.text}`} onClick={() => onRemove(todo.id)}>
        ×
      </button>
    </li>
  );
}

export default function TodoApp({ initialTodos = [] }) {
  const [todos, setTodos] = useState(initialTodos);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("idle");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (todos.length === 0) return;
    try {
      localStorage.setItem("todos", JSON.stringify(todos));
    } catch {
      // storage unavailable — ignore
    }
  }, [todos]);

  const visible = useMemo(() => {
    switch (filter) {
      case "active":
        return todos.filter((t) => !t.done);
      case "done":
        return todos.filter((t) => t.done);
      default:
        return todos;
    }
  }, [todos, filter]);

  const remaining = todos.filter((t) => !t.done).length;

  function addTodo(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setDraft("");
  }

  function toggleTodo(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function removeTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  async function reload() {
    setStatus("loading");
    try {
      const res = await fetch("/api/todos");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTodos(await res.json());
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="app">
      <header className="app-head">
        <h1>
          Todos <Badge status={status} count={todos.length} />
        </h1>
        <button type="button" onClick={reload} disabled={status === "loading"}>
          {status === "loading" ? "Reloading…" : "Reload"}
        </button>
      </header>

      <form onSubmit={addTodo}>
        <input
          ref={inputRef}
          value={draft}
          placeholder="What needs doing?"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={draft.trim() === ""}>
          Add
        </button>
      </form>

      {visible.length === 0 ? (
        <p className="empty">
          {todos.length === 0 ? "Nothing here yet — add your first todo." : "No todos match."}
        </p>
      ) : (
        <ul className="todos">
          {visible.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onRemove={removeTodo} />
          ))}
        </ul>
      )}

      <footer className="app-foot">
        <span>
          {remaining} of {todos.length} left
        </span>
        <div role="group" aria-label="Filter">
          {["all", "active", "done"].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              className={filter === f ? "is-active" : ""}
              onClick={() => setFilter(f)}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </footer>

      <>
        <hr />
        <small>Tip: press Enter to add · counts update live.</small>
      </>
    </main>
  );
}
