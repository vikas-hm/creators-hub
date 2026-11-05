import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';

export default function Search() {
  const token = localStorage.getItem('token');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [doneFor, setDoneFor] = useState('');

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
          <Link key={u._id} className="notif" to={'/u/' + u.username}>
            <div className="avatar">{u.name[0]}</div>
            <div className="notif-text">
              <strong>{u.name}</strong>
              <small>@{u.username}{u.bio ? ' · ' + u.bio : ''}</small>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}