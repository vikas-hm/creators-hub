import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import Avatar from '../components/Avatar';

export default function Messages() {
  const token = localStorage.getItem('token');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    const load = () =>
      api
        .get('/messages/conversations')
        .then((res) => {
          if (!ignore) setItems(res.data);
        })
        .catch((err) => console.log(err))
        .finally(() => {
          if (!ignore) setLoading(false);
        });

    load();
    const timer = setInterval(load, 10000);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [token]);

  const onSearch = async (e) => {
    const value = e.target.value;
    setQ(value);
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

  if (!token) return <Navigate to="/login" />;

  return (
    <div>
      <Topbar />
      <main className="home-main">
        <h2>Messages</h2>

        <input
          className="search-input"
          placeholder="Search a username to start a chat"
          value={q}
          onChange={onSearch}
          aria-label="Search a username to start a chat"
        />

        {results.map((u) => (
          <Link key={u._id} className="notif" to={'/messages/' + u.username}>
            <Avatar user={u} />
            <div className="notif-text">
              <strong>{u.name}</strong>
              <small>@{u.username}</small>
            </div>
          </Link>
        ))}

        {!q && loading && <p className="sub" style={{ marginTop: 20 }}>Loading...</p>}

        {!q && !loading && items.length === 0 && (
          <div className="empty" style={{ marginTop: 20 }}>
            <p>No chats yet. Search a username above to say hi.</p>
          </div>
        )}

        {!q &&
          items.map((c) => (
            <Link
              key={c.user._id}
              className={'notif' + (c.unread > 0 ? ' unread' : '')}
              to={'/messages/' + c.user.username}
            >
              <Avatar user={c.user} />
              <div className="notif-text">
                <strong>{c.user.name}</strong>
                <small>
                  {c.last.mine ? 'You: ' : ''}
                  {c.last.text || 'Shared a post'}
                  {c.last.mine && c.last.read ? ' · Seen' : ''}
                </small>
              </div>
              {c.unread > 0 && <span className="badge inline">{c.unread}</span>}
            </Link>
          ))}
      </main>
    </div>
  );
}