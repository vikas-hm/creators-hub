import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import PostCard from '../components/PostCard';

function AdminForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/challenges', { title, description, endsAt });
      setTitle('');
      setDescription('');
      setEndsAt('');
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the challenge');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="composer admin-box">
      <h3>Create a new challenge</h3>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input
            placeholder="Best 10-second edit"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Description</span>
          <input
            placeholder="Explain what people should make"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Ends on</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating...' : 'Start challenge'}
        </button>
      </form>
    </section>
  );
}

export default function Challenge() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/challenges/current')
      .then((res) => {
        if (!ignore) setData(res.data);
      })
      .catch((err) => console.log(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [token, version]);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/challenges/is-admin')
      .then((res) => {
        if (!ignore) setIsAdmin(res.data.admin);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" />;

  const challenge = data?.challenge;

  return (
    <div>
      <Topbar />
      <main className="home-main">
        {isAdmin && <AdminForm onCreated={() => setVersion((v) => v + 1)} />}

        {loading && <p className="sub">Loading challenge...</p>}

        {!loading && !challenge && (
          <div className="empty">
            <p>No challenge is running right now. A new one will start soon.</p>
          </div>
        )}

        {challenge && (
          <>
            <section className="challenge-hero">
              <h2>{challenge.title}</h2>
              {challenge.description && <p>{challenge.description}</p>}
              <p className="challenge-end">
                {data.active
                  ? 'Open until ' + new Date(challenge.endsAt).toLocaleDateString()
                  : 'This challenge has ended'}
              </p>
              {data.active && (
                <p className="challenge-how">
                  To enter, publish a post on the feed and tick the challenge box.
                  The most liked entry ranks first.
                </p>
              )}
            </section>

            {data.entries.length === 0 && (
              <div className="empty">
                <p>No entries yet. Be the first to enter.</p>
              </div>
            )}

            {data.entries.map((post, i) => (
              <div key={post._id}>
                <span className="rank">#{i + 1}</span>
                <PostCard post={post} currentUserId={user?.id} />
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}