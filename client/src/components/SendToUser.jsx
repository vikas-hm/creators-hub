import { useState } from 'react';
import api from '../api';

export default function SendToUser({ postId, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');

  const onChange = async (e) => {
    const value = e.target.value;
    setQ(value);
    setMessage('');
    if (!value.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await api.get('/messages/search', { params: { q: value } });
      setResults(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const send = async (user) => {
    try {
      await api.post('/messages/to/' + user.username, { postId });
      setMessage('Sent to @' + user.username);
      setQ('');
      setResults([]);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not send');
    }
  };

  return (
    <div className="sendbox">
      <div className="sendbox-head">
        <strong>Send to a user</strong>
        <button type="button" className="mini" onClick={onClose} aria-label="Close" title="Close">
          ×
        </button>
      </div>
      <input
        placeholder="Search a username"
        value={q}
        onChange={onChange}
        aria-label="Search a username"
      />
      {results.map((u) => (
        <button key={u._id} type="button" className="sendbox-user" onClick={() => send(u)}>
          <span className="avatar small">{u.name[0]}</span>
          <span>
            <strong>{u.name}</strong> <span className="muted">@{u.username}</span>
          </span>
        </button>
      ))}
      {message && <p className="notice" role="status">{message}</p>}
    </div>
  );
}