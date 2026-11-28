import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import Avatar from '../components/Avatar';

const LIMIT = 10;
const keyFor = (uid) => 'recentSearches:' + (uid || 'guest');

function readRecent(uid) {
  try {
    const list = JSON.parse(localStorage.getItem(keyFor(uid)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveRecent(uid, list) {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(list));
  } catch {
    // storage is full or blocked, the list just will not be remembered
  }
}

export default function Search() {
  const token = localStorage.getItem('token');
  const myId = JSON.parse(localStorage.getItem('user') || 'null')?.id;

  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [doneFor, setDoneFor] = useState('');
  const [recent, setRecent] = useState(() => readRecent(myId));

  useEffect(() => {
    const term = q.trim();
    if (!term || !token) return;
    let ignore = false;

    const timer = setTimeout(() => {
      api
        .get('/users/search', { params: { q: term } })
        .then((res) => {
          if (ignore) return;
          setResults(res.data);
          setDoneFor(term);
        })
        .catch((err) => console.log(err));
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [q, token]);

  if (!token) return <Navigate to="/login" />;

  const remember = (u) => {
    const entry = {
      _id: u._id,
      name: u.name,
      username: u.username,
      avatar: u.avatar || '',
      bio: u.bio || '',
    };
    const next = [entry, ...recent.filter((r) => r._id !== u._id)].slice(0, LIMIT);
    setRecent(next);
    saveRecent(myId, next);
  };

  const forget = (id) => {
    const next = recent.filter((r) => r._id !== id);
    setRecent(next);
    saveRecent(myId, next);
  };

  const clearAll = () => {
    setRecent([]);
    saveRecent(myId, []);
  };

  const term = q.trim();
  const shown = term ? results : [];

  return (
    <div>
      <Topbar />
      <main className="home-main">
        <h2>Search people</h2>

        <input
          className="search-input"
          placeholder="Search by name or username"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search by name or username"
          autoFocus
        />

        {term && doneFor === term && results.length === 0 && (
          <div className="empty" style={{ marginTop: 20 }}>
            <p>No one found for "{term}".</p>
          </div>
        )}

        {shown.map((u) => (
          <Link
            key={u._id}
            className="notif"
            to={'/u/' + u.username}
            onClick={() => remember(u)}
          >
            <Avatar user={u} />
            <div className="notif-text">
              <strong>{u.name}</strong>
              <small>@{u.username}{u.bio ? ' · ' + u.bio : ''}</small>
            </div>
          </Link>
        ))}

        {!term && (
          <>
            <div className="recent-head">
              <h3 className="section-label">Recent</h3>
              {recent.length > 0 && (
                <button type="button" className="link-btn" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>

            {recent.length === 0 && (
              <p className="muted-line" style={{ marginTop: 10 }}>
                The people you open from search will show up here.
              </p>
            )}

            {recent.map((u) => (
              <div className="recent-row" key={u._id}>
                <Link className="notif" to={'/u/' + u.username} onClick={() => remember(u)}>
                  <Avatar user={u} />
                  <div className="notif-text">
                    <strong>{u.name}</strong>
                    <small>@{u.username}</small>
                  </div>
                </Link>
                <button
                  type="button"
                  className="mini"
                  onClick={() => forget(u._id)}
                  aria-label={'Remove ' + u.username + ' from recent searches'}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}