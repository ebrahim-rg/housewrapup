import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PEOPLE = ['RG', 'Erum', 'Yousuf'];
const CYCLE = [null, 'RG', 'Erum', 'Yousuf'];
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'RG', label: 'RG' },
  { key: 'Erum', label: 'Erum' },
  { key: 'Yousuf', label: 'Yousuf' },
];

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Index() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [hideDone, setHideDone] = useState(false);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.items || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!busy.current) load();
    }, 6000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (payload) => {
    busy.current = true;
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setItems(data.items || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      busy.current = false;
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    const lines = newTitle
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setNewTitle('');
    // adding while inside someone's tab assigns it to them straight away
    const preset = PEOPLE.includes(tab) ? tab : null;
    if (lines.length === 1) await send({ action: 'add', title: lines[0], assignee: preset });
    else await send({ action: 'addMany', titles: lines, assignee: preset });
  };

  const flipAssignee = (item) => {
    const next = CYCLE[(CYCLE.indexOf(item.assignee ?? null) + 1) % CYCLE.length];
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, assignee: next } : it)));
    send({ action: 'assign', id: item.id, assignee: next });
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.title);
  };

  const saveEdit = async (id) => {
    const title = editValue.trim();
    setEditingId(null);
    if (title) await send({ action: 'edit', id, title });
  };

  const counts = useMemo(() => {
    const c = { all: items.length, unassigned: 0, RG: 0, Erum: 0, Yousuf: 0 };
    let done = 0;
    items.forEach((it) => {
      if (it.done) done += 1;
      if (!it.assignee) c.unassigned += 1;
      else if (c[it.assignee] !== undefined) c[it.assignee] += 1;
    });
    return { ...c, done };
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (tab === 'unassigned' && it.assignee) return false;
      if (PEOPLE.includes(tab) && it.assignee !== tab) return false;
      if (hideDone && it.done) return false;
      if (!q) return true;
      const inTitle = it.title.toLowerCase().includes(q);
      const inComments = (it.comments || []).some((c) => c.text.toLowerCase().includes(q));
      return inTitle || inComments;
    });
  }, [items, tab, hideDone, search]);

  return (
    <>
      <Head>
        <title>House Wrapup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f6f5f2" />
      </Head>

      <main className="wrap">
        <header className="head">
          <h1>House Wrapup</h1>
          <p className="sub">
            {counts.done} of {counts.all} sorted
            {counts.all > 0 && (
              <span className="bar">
                <span className="fill" style={{ width: `${(counts.done / counts.all) * 100}%` }} />
              </span>
            )}
          </p>
        </header>

        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tab ${tab === t.key ? 'on' : ''} p-${t.key}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <em>{counts[t.key] ?? 0}</em>
            </button>
          ))}
        </nav>

        <div className="toolbar">
          <input
            className="search"
            placeholder="Search tasks and comments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="toggle">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            Hide done
          </label>
        </div>

        <form className="add" onSubmit={addItem}>
          <textarea
            rows={1}
            placeholder={
              PEOPLE.includes(tab)
                ? `Add a task for ${tab}… (one per line for several)`
                : 'Add a task… (one per line to add several)'
            }
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addItem(e);
              }
            }}
          />
          <button type="submit">Add</button>
        </form>

        {error && <div className="error">{error}</div>}
        {loading && <p className="empty">Loading…</p>}
        {!loading && !visible.length && (
          <p className="empty">
            {items.length ? 'Nothing here yet.' : 'No tasks yet — add the first one above.'}
          </p>
        )}

        <ul className="list">
          {visible.map((item) => {
            const comments = item.comments || [];
            const isOpen = openId === item.id;
            const who = item.assignee || null;
            return (
              <li key={item.id} className={`item ${item.done ? 'done' : ''}`}>
                <div className="row">
                  <button
                    className="check"
                    type="button"
                    aria-label={item.done ? 'Mark not done' : 'Mark done'}
                    onClick={() => send({ action: 'toggle', id: item.id })}
                  >
                    {item.done ? '✓' : ''}
                  </button>

                  {editingId === item.id ? (
                    <input
                      className="editInput"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(item.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="title" onDoubleClick={() => startEdit(item)}>
                      {item.title}
                    </span>
                  )}

                  <button
                    type="button"
                    className={`tag p-${who || 'unassigned'}`}
                    onClick={() => flipAssignee(item)}
                    title="Click to reassign"
                  >
                    {who || 'Unassigned'}
                  </button>

                  <div className="actions">
                    <button
                      type="button"
                      className={`ghost ${comments.length ? 'has' : ''}`}
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      title="Comments"
                    >
                      💬{comments.length > 0 && <b>{comments.length}</b>}
                    </button>
                    <button type="button" className="ghost" onClick={() => startEdit(item)} title="Edit">
                      ✎
                    </button>
                    <button
                      type="button"
                      className="ghost del"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete "${item.title}"?`)) send({ action: 'delete', id: item.id });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="thread">
                    {comments.map((c) => (
                      <div className="comment" key={c.id}>
                        <p>{c.text}</p>
                        <div className="cmeta">
                          <span>{timeAgo(c.at)}</span>
                          <button
                            type="button"
                            onClick={() => send({ action: 'deleteComment', id: item.id, commentId: c.id })}
                          >
                            remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <CommentBox onSubmit={(text) => send({ action: 'comment', id: item.id, text })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {counts.done > 0 && (
          <button
            type="button"
            className="clear"
            onClick={() => {
              if (confirm(`Permanently delete ${counts.done} finished task(s)?`))
                send({ action: 'clearDone' });
            }}
          >
            Clear {counts.done} finished task{counts.done > 1 ? 's' : ''}
          </button>
        )}

        <footer className="foot">Tap a name tag to reassign · list refreshes every few seconds</footer>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 720px;
          margin: 0 auto;
          padding: 28px 18px 80px;
        }
        h1 {
          margin: 0;
          font-size: 26px;
          letter-spacing: -0.02em;
        }
        .sub {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bar {
          display: inline-block;
          width: 90px;
          height: 5px;
          background: var(--line);
          border-radius: 99px;
          overflow: hidden;
        }
        .fill {
          display: block;
          height: 100%;
          background: var(--accent);
          transition: width 0.3s;
        }
        .tabs {
          display: flex;
          gap: 6px;
          margin: 20px 0 12px;
          flex-wrap: wrap;
        }
        .tab {
          border: 1px solid var(--line);
          background: var(--card);
          border-radius: 99px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
        }
        .tab em {
          font-style: normal;
          font-weight: 500;
          margin-left: 7px;
          opacity: 0.6;
        }
        .tab.on {
          color: #fff;
          border-color: transparent;
          background: #6b6862;
        }
        .tab.on.p-RG {
          background: #2f6f4f;
        }
        .tab.on.p-Erum {
          background: #8d4a6f;
        }
        .tab.on.p-Yousuf {
          background: #3a5f95;
        }
        .tab.on.p-all {
          background: #33312e;
        }
        .toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .search {
          flex: 1;
          min-width: 160px;
          border: 1px solid var(--line);
          background: var(--card);
          border-radius: 99px;
          padding: 8px 14px;
          font-size: 13px;
          outline: none;
        }
        .search:focus {
          border-color: var(--accent);
        }
        .toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
        }
        .add {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
        }
        .add textarea {
          flex: 1;
          resize: vertical;
          min-height: 44px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 12px 14px;
          background: var(--card);
          outline: none;
          font-size: 15px;
        }
        .add textarea:focus {
          border-color: var(--accent);
        }
        .add button {
          border: 0;
          background: var(--accent);
          color: #fff;
          border-radius: var(--radius);
          padding: 0 20px;
          font-weight: 600;
        }
        .list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .item {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 12px 14px;
        }
        .row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .check {
          flex: 0 0 22px;
          width: 22px;
          height: 22px;
          margin-top: 1px;
          border-radius: 7px;
          border: 1.5px solid var(--line);
          background: transparent;
          color: #fff;
          font-size: 13px;
          line-height: 1;
        }
        .item.done .check {
          background: var(--accent);
          border-color: var(--accent);
        }
        .title {
          flex: 1;
          font-size: 15px;
          line-height: 1.45;
          word-break: break-word;
          cursor: text;
        }
        .item.done .title {
          text-decoration: line-through;
          color: var(--muted);
        }
        .editInput {
          flex: 1;
          border: 1px solid var(--accent);
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 15px;
          outline: none;
          background: #fff;
        }
        .tag {
          flex: 0 0 auto;
          border: 1px solid transparent;
          border-radius: 99px;
          padding: 3px 10px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .tag.p-unassigned {
          background: #f0eeea;
          color: #8a8781;
          border-color: var(--line);
        }
        .tag.p-RG {
          background: #e7f1ea;
          color: #2f6f4f;
        }
        .tag.p-Erum {
          background: #f7e9f0;
          color: #8d4a6f;
        }
        .tag.p-Yousuf {
          background: #e7eef8;
          color: #3a5f95;
        }
        .actions {
          display: flex;
          gap: 2px;
        }
        .ghost {
          border: 0;
          background: transparent;
          color: var(--muted);
          font-size: 14px;
          padding: 4px 6px;
          border-radius: 8px;
          line-height: 1;
        }
        .ghost:hover {
          background: var(--bg);
        }
        .ghost.has {
          color: var(--accent);
        }
        .ghost b {
          font-size: 11px;
          margin-left: 3px;
        }
        .ghost.del:hover {
          color: var(--danger);
        }
        .thread {
          margin: 12px 0 2px 32px;
          border-top: 1px dashed var(--line);
          padding-top: 10px;
        }
        .comment {
          margin-bottom: 10px;
        }
        .comment p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .cmeta {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 11.5px;
          color: var(--muted);
          margin-top: 2px;
        }
        .cmeta button {
          border: 0;
          background: transparent;
          color: var(--muted);
          font-size: 11px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .comment:hover .cmeta button {
          opacity: 1;
        }
        .cmeta button:hover {
          color: var(--danger);
        }
        .empty {
          text-align: center;
          color: var(--muted);
          font-size: 14px;
          padding: 30px 0;
        }
        .error {
          background: #fdecea;
          color: var(--danger);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .clear {
          margin: 20px auto 0;
          display: block;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--muted);
          border-radius: 99px;
          padding: 8px 16px;
          font-size: 13px;
        }
        .foot {
          text-align: center;
          color: var(--muted);
          font-size: 12px;
          margin-top: 26px;
        }
        @media (max-width: 520px) {
          .tag {
            padding: 3px 8px;
          }
          .title {
            font-size: 14.5px;
          }
        }
      `}</style>
    </>
  );
}

function CommentBox({ onSubmit }) {
  const [text, setText] = useState('');
  return (
    <form
      className="cbox"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        setText('');
        onSubmit(t);
      }}
    >
      <textarea
        rows={2}
        placeholder="Add a comment…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form.requestSubmit();
        }}
      />
      <button type="submit">Post</button>
      <style jsx>{`
        .cbox {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          margin-top: 8px;
        }
        textarea {
          flex: 1;
          resize: vertical;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        textarea:focus {
          border-color: var(--accent);
        }
        button {
          border: 0;
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 600;
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 13px;
        }
      `}</style>
    </form>
  );
}
