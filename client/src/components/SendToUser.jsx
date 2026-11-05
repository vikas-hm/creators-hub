import { useEffect, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';
import { SendIcon, CheckIcon } from './Icons';

export default function SendToUser({ postId, onClose }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [others, setOthers] = useState([]);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState([]);
  const [error, setError] = useState('');

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

  const matchedConnections = term
    ? connections.filter(
        (u) => u.name.toLowerCase().includes(lower) || u.username.includes(lower)
      )
    : connections;

  const otherPeople = term ? others.filter((u) => !connectionIds.has(u._id)) : [];

  const send = async (user) => {
    setError('');
    try {
      await api.post('/messages/to/' + user.username, { postId, text: note });
      setSent((list) => [...list, user._id]);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send');
    }
  };

  const row = (u) => {
    const done = sent.includes(u._id);
    return (
      <div className="sendbox-row" key={u._id}>
        <Avatar user={u} size="small" />
        <div className="sendbox-name">
          <strong>{u.name}</strong>
          <span className="muted">@{u.username}</span>
        </div>
        <button
          type="button"
          className={'send-btn' + (done ? ' done' : '')}
          onClick={() => send(u)}
          disabled={done}
          aria-label={done ? 'Sent to ' + u.username : 'Send to ' + u.username}
          title={done ? 'Sent' : 'Send'}
        >
          {done ? <CheckIcon /> : <SendIcon />}
        </button>
      </div>
    );
  };

  return (
    <div className="sendbox">
      <div className="sendbox-head">
        <strong>Send to</strong>
        <button type="button" className="mini" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </div>

      <input
        placeholder="Search a name or username"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search a name or username"
      />

      <div className="sendbox-list">
        {loading && <p className="muted-line">Loading...</p>}

        {!loading && matchedConnections.length > 0 && (
          <>
            <p className="sendbox-title">
              {term ? 'From your followers and following' : 'Your followers and following'}
            </p>
            {matchedConnections.map(row)}
          </>
        )}

        {!loading && !term && connections.length === 0 && (
          <p className="muted-line">
            You do not follow anyone yet and no one follows you. Search a name above.
          </p>
        )}

        {otherPeople.length > 0 && (
          <>
            <p className="sendbox-title">Other people</p>
            {otherPeople.map(row)}
          </>
        )}

        {term && matchedConnections.length === 0 && otherPeople.length === 0 && (
          <p className="muted-line">No one found for "{term}".</p>
        )}
      </div>

      <input
        placeholder="Add a message (optional)"
        value={note}
        maxLength={300}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Add a message"
      />

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}