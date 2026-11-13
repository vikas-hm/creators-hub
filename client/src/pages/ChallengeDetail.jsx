import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import PostCard from '../components/PostCard';
import NewPost from '../components/NewPost';
import { DownloadIcon, TrashIcon } from '../components/Icons';
import { downloadUrl, timeLeft } from '../utils';

function DetailView({ id }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/challenges/' + id)
      .then((res) => {
        if (ignore) return;
        setData(res.data);
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus((s) => (s === 'ready' ? s : 'missing'));
      });

    return () => {
      ignore = true;
    };
  }, [id, token, version]);

  if (!token) return <Navigate to="/login" />;

  const refresh = () => setVersion((v) => v + 1);

  const remove = async () => {
    const ok = window.confirm(
      'Delete this challenge? Entries stay as normal posts. This cannot be undone.'
    );
    if (!ok) return;
    setError('');
    try {
      await api.delete('/challenges/' + id);
      navigate('/challenge');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the challenge');
    }
  };

  const c = data?.challenge;

  return (
    <div>
      <Topbar />
      <main className="home-main">
        {status === 'loading' && <p className="sub">Loading challenge...</p>}

        {status === 'missing' && (
          <div className="empty">
            <p>
              This challenge was deleted or the link is wrong.{' '}
              <Link to="/challenge">Back to challenges</Link>
            </p>
          </div>
        )}

        {status === 'ready' && (
          <>
            <section className="challenge-hero">
              <h2>{c.title}</h2>
              <p className="challenge-by">
                Started by{' '}
                {c.createdBy ? (
                  <Link to={'/u/' + c.createdBy.username}>@{c.createdBy.username}</Link>
                ) : (
                  'Creators Hub'
                )}
              </p>
              {c.description && <p className="challenge-text">{c.description}</p>}
              <p className="challenge-end">
                {data.active
                  ? timeLeft(c.endsAt) + ' · ends ' + new Date(c.endsAt).toLocaleString()
                  : 'This challenge has ended'}
              </p>
            </section>

            {c.mediaUrl && (
              <section className="ref-card">
                <h3>Start from this {c.mediaType === 'video' ? 'video' : 'photo'}</h3>
                {c.mediaType === 'video' ? (
                  <video className="ref-media" src={c.mediaUrl} controls playsInline preload="metadata" />
                ) : (
                  <img className="ref-media" src={c.mediaUrl} alt="The original to edit" />
                )}
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    window.location.href = downloadUrl(c.mediaUrl);
                  }}
                >
                  <DownloadIcon />
                  Download original
                </button>
              </section>
            )}

            {data.active && (
              <>
                <div className="enter-head">
                  <h3>Enter this challenge</h3>
                  <p className="muted-line">
                    {c.mediaUrl
                      ? 'Download the original, edit it your way, and upload your version here. '
                      : 'Make your entry and upload it here. '}
                    The most liked entry wins.
                  </p>
                </div>
                <NewPost challengeId={c._id} onCreated={refresh} />
              </>
            )}

            {data.canDelete && (
              <div className="challenge-owner">
                <button type="button" className="btn-outline danger-text" onClick={remove}>
                  <TrashIcon />
                  Delete challenge
                </button>
              </div>
            )}

            {error && <p className="error" role="alert">{error}</p>}

            <h3 className="section-label">Entries ({data.entries.length})</h3>

            {data.entries.length === 0 && (
              <div className="empty">
                <p>No entries yet. Be the first to enter.</p>
              </div>
            )}

            {data.entries.map((post, i) => {
              const winner = !data.active && i === 0 && post.likes.length > 0;
              return (
                <div key={post._id}>
                  <span className={'rank' + (winner ? ' winner' : '')}>
                    #{i + 1}
                    {winner ? ' Winner' : ''}
                  </span>
                  <PostCard post={post} currentUserId={user?.id} onDeleted={refresh} />
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}

export default function ChallengeDetail() {
  const { id } = useParams();
  return <DetailView key={id} id={id} />;
}