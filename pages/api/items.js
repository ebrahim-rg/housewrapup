import { readItems, writeItems, hasSeeded, markSeeded } from '../../lib/redis';
import { SEED_TITLES } from '../../lib/seed';

const PEOPLE = ['RG', 'Erum', 'Yousuf'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function clean(str, max = 500) {
  return String(str ?? '').trim().slice(0, max);
}

// null means unassigned
function assignee(value) {
  return PEOPLE.includes(value) ? value : null;
}

function newItem(title) {
  return {
    id: uid(),
    title,
    done: false,
    assignee: null,
    createdAt: Date.now(),
    comments: [],
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      let items = await readItems();
      // one-time load of the starter list; never runs again once the flag is set
      if (!items.length && !(await hasSeeded())) {
        items = SEED_TITLES.map((t) => newItem(clean(t, 300))).filter((i) => i.title);
        await writeItems(items);
        await markSeeded();
      }
      return res.status(200).json({ items });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { action } = body;
    let items = await readItems();

    switch (action) {
      case 'add': {
        const title = clean(body.title, 300);
        if (!title) return res.status(400).json({ error: 'Title required' });
        const item = newItem(title);
        item.assignee = assignee(body.assignee);
        items.push(item);
        break;
      }

      case 'addMany': {
        const titles = Array.isArray(body.titles) ? body.titles : [];
        const who = assignee(body.assignee);
        titles
          .map((t) => clean(t, 300))
          .filter(Boolean)
          .forEach((title) => {
            const item = newItem(title);
            item.assignee = who;
            items.push(item);
          });
        break;
      }

      case 'edit': {
        const title = clean(body.title, 300);
        if (!title) return res.status(400).json({ error: 'Title required' });
        items = items.map((it) => (it.id === body.id ? { ...it, title } : it));
        break;
      }

      case 'assign': {
        const who = assignee(body.assignee);
        items = items.map((it) => (it.id === body.id ? { ...it, assignee: who } : it));
        break;
      }

      case 'toggle': {
        items = items.map((it) =>
          it.id === body.id
            ? { ...it, done: !it.done, doneAt: !it.done ? Date.now() : null }
            : it
        );
        break;
      }

      case 'delete': {
        items = items.filter((it) => it.id !== body.id);
        break;
      }

      case 'comment': {
        const text = clean(body.text, 2000);
        if (!text) return res.status(400).json({ error: 'Comment required' });
        items = items.map((it) =>
          it.id === body.id
            ? { ...it, comments: [...(it.comments || []), { id: uid(), text, at: Date.now() }] }
            : it
        );
        break;
      }

      case 'deleteComment': {
        items = items.map((it) =>
          it.id === body.id
            ? { ...it, comments: (it.comments || []).filter((c) => c.id !== body.commentId) }
            : it
        );
        break;
      }

      case 'clearDone': {
        items = items.filter((it) => !it.done);
        break;
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    await writeItems(items);
    return res.status(200).json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
