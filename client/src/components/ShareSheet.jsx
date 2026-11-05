import { useEffect, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';
import { CheckIcon, LinkIcon, ShareIcon, CommentIcon } from './Icons';

export default function ShareSheet({ postId, onClose }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [others, setOthers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });

  const link = window.location.origin + '/p/' + postId;
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let ignore = false;

    api
      .get('/users/connections')
      .then((res) => {
        if (!ignore) setConnections(res.data);
      })
      .catch((err) => console.log(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const term = q.trim();

  useEffect(() => {
    if (!term) return;
    let ignore = false;

    const timer = setTimeout(() => {
      api
        .get('/messages/search', { params: { q: term } })
        .then((res) => {
          if (!ignore) setOthers(res.data);
        })
        .catch((err) => console.log(err));
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [term]);

  const lower = term.toLowerCase();
  const connectionIds = new Set(connections.map((u) => u._id));

  const matched = term
    ? connections.filter(
        (u) => u.name.toLowerCase().includes(lower) || u.username.includes(lower)
      )
    : connections;

  const otherPeople = term ? others.filter((u) => !connectionIds.has(u._id)) : [];

  const toggle = (u) =>
    setPicked((list) =>
      list.some((p) => p._id === u._id)
        ? list.filter((p) => p._id !== u._id)
        : [...list, u]
    );

  const send = async () => {
    if (picked.length === 0) return;
    setBusy(true);
    setMessage({ text: '', error: false });

    const results = await Promise.allSettled(
      picked.map((u) => api.post('/messages/to/' + u.username, { postId, text: note }))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    setBusy(false);

    if (failed === 0) {
      setMessage({ text: 'Sent', error: false });
      setPicked([]);
      setNote('');
      setTimeout(onClose, 900);
    } else {
      setMessage({ text: failed + ' message(s) could not be sent', error: true });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMessage({ text: 'Link copied', error: false });
    } catch {
      setMessage({ text: 'Could not copy the link', error: true });
    }
  };

  const whatsapp = () => {
    const text = 'Check out this post on Creators Hub: ' + link;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'Creators Hub', url: link });
    } catch {
      // person closed the share menu
    }
  };

  const tile = (u) => {
    const on = picked.some((p) => p._id === u._id);
    return (
      <button
        key={u._id}
        type="button"
        className={'tile' + (on ? ' on' : '')}
        onClick={() => toggle(u)}
        aria-pressed={on}
      >
        <span className="tile-avatar">
          <Avatar user={u} size="tile" />
          {on && (
            <span className="tile-check">
              <CheckIcon />
            </span>
          )}
        </span>
        <span className="tile-name">{u.name}</span>
      </button>
    );
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Share"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" />

        <div className="sheet-head">
          <strong>Share</strong>
          <button type="button" className="mini" onClick={onClose} aria-label="Close" title="Close">
            ×
          </button>
        </div>

        <input
          className="sheet-search"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search people"
        />

        <div className="sheet-body">
          {loading && <p className="muted-line">Loading...</p>}

          {!loading && matched.length > 0 && <div className="tiles">{matched.map(tile)}</div>}

          {!loading && !term && connections.length === 0 && (
            <p className="muted-line">
              You do not follow anyone yet and no one follows you. Search a name above.
            </p>
          )}

          {otherPeople.length > 0 && (
            <>
              <p className="sheet-label">More people</p>
              <div className="tiles">{otherPeople.map(tile)}</div>
            </>
          )}

          {term && matched.length === 0 && otherPeople.length === 0 && (
            <p className="muted-line">No one found for "{term}".</p>
          )}
        </div>

        {picked.length > 0 ? (
          <div className="sheet-send">
            <input
              placeholder="Write a message..."
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Write a message"
            />
            <button className="btn" type="button" onClick={send} disabled={busy}>
              {busy ? 'Sending...' : 'Send' + (picked.length > 1 ? ' (' + picked.length + ')' : '')}
            </button>
          </div>
        ) : (
          <div className="sheet-actions">
            <button type="button" className="action" onClick={copyLink}>
              <span className="action-icon"><LinkIcon /></span>
              Copy link
            </button>
            <button type="button" className="action" onClick={whatsapp}>
              <span className="action-icon green"><CommentIcon /></span>
              WhatsApp
            </button>
            {canNativeShare && (
              <button type="button" className="action" onClick={nativeShare}>
                <span className="action-icon"><ShareIcon /></span>
                More
              </button>
            )}
          </div>
        )}

        {message.text && (
          <p className={message.error ? 'error' : 'success'} role="status">
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}