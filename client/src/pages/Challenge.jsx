import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import NewChallenge from '../components/NewChallenge';
import { TrophyIcon } from '../components/Icons';
import { timeLeft } from '../utils';

function ChallengeCard({ c }) {
  const by = c.createdBy ? '@' + c.createdBy.username : 'Creators Hub';

  return (
    <Link className="challenge-card" to={'/challenge/' + c._id}>
      {c.mediaUrl ? (
        c.mediaType === 'video' ? (
          <video className="challenge-thumb" src={c.mediaUrl} muted playsInline preload="metadata" />
        ) : (
          <img className="challenge-thumb" src={c.mediaUrl} alt="" />
        )
      ) : (
        <div className="challenge-thumb">
          <TrophyIcon />
        </div>
      )}

      <div className="challenge-card-body">
        <h3>{c.title}</h3>
        <span className="muted-line" style={{ margin: 0 }}>
          by {by} · {c.entries} {c.entries === 1 ? 'entry' : 'entries'}
        </span>
        <span className={'chip' + (c.active ? '' : ' ended')}>{timeLeft(c.endsAt)}</span>
      </div>
    </Link>
  );
}

export default function Challenges() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/challenges')
      .then((res) => {
        if (!ignore) setItems(res.data);
      })
      .catch((err) => console.log(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" />;

  const open = items.filter((c) => c.active);
  const ended = items.filter((c) => !c.active);

  return (
    <div>
      <Topbar />
      <main className="home-main">
        <div className="page-title-row">
          <h2>Challenges</h2>
          <button className="btn small" type="button" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : 'Start a challenge'}
          </button>
        </div>
        <p className="sub">
          Download a photo or video, edit it your way, and let people vote.
        </p>

        {showForm && (
          <NewChallenge onCreated={(c) => navigate('/challenge/' + c._id)} />
        )}

        {loading && <p className="sub" style={{ marginTop: 24 }}>Loading challenges...</p>}

        {!loading && items.length === 0 && (
          <div className="empty" style={{ marginTop: 24 }}>
            <p>No challenges yet. Be the first to start one.</p>
          </div>
        )}

        {open.length > 0 && (
          <>
            <h3 className="section-label">Open now</h3>
            {open.map((c) => (
              <ChallengeCard key={c._id} c={c} />
            ))}
          </>
        )}

        {ended.length > 0 && (
          <>
            <h3 className="section-label">Ended</h3>
            {ended.map((c) => (
              <ChallengeCard key={c._id} c={c} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}