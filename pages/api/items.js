import { readItems, writeItems } from '../../lib/redis';

const PEOPLE = ['RG', 'Erum', 'Yousuf'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function clean(str, max = 500) {
  return String(str ?? '').trim().slice(0, max);
}

function person(who) {
  return PEOPLE.includes(who) ? who : 'RG';
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const items = await readItems();
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
        items.push({
          id: uid(),
          title,
          done: false,
          createdAt: Date.now(),
          createdBy: person(body.who),
          doneBy: null,
          comments: [],
        });
        break;
      }

      case 'addMany': {
        const titles = Array.isArray(body.titles) ? body.titles : [];
        titles
          .map((t) => clean(t, 300))
          .filter(Boolean)
          .forEach((title) => {
            items.push({
              id: uid(),
              title,
              done: false,
              createdAt: Date.now(),
              createdBy: person(body.who),
              doneBy: null,
              comments: [],
            });
          });
        break;
      }

      case 'edit': {
        const title = clean(body.title, 300);
        if (!title) return res.status(400).json({ error: 'Title required' });
        items = items.map((it) => (it.id === body.id ? { ...it, title } : it));
        break;
      }

      case 'toggle': {
        items = items.map((it) =>
          it.id === body.id
            ? {
                ...it,
                done: !it.done,
                doneBy: !it.done ? person(body.who) : null,
                doneAt: !it.done ? Date.now() : null,
              }
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
            ? {
                ...it,
                comments: [
                  ...(it.comments || []),
                  { id: uid(), who: person(body.who), text, at: Date.now() },
                ],
              }
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
