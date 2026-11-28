import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import ShareSheet from '../components/ShareSheet';
import { downloadUrl } from '../utils';
import {
  HeartIcon,
  SendIcon,
  DownloadIcon,
  VolumeOnIcon,
  VolumeOffIcon,
} from '../components/Icons';

const HOLD_MS = 250; // hold this long to pause

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

function Reel({ post, currentUserId, muted, setMuted }) {
  const videoRef = useRef(null);
  const holdTimer = useRef(null);
  const flashTimer = useRef(null);
  const held = useRef(false);
  const holdEndedAt = useRef(0);
  const startPoint = useRef({ x: 0, y: 0 });

  const [liked, setLiked] = useState(post.likes.includes(currentUserId));
  const [count, setCount] = useState(post.likes.length);
  const [sheet, setSheet] = useState(false);
  const [flash, setFlash] = useState(null);

  // Keep the real video in step with the sound setting
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Play when this reel is on screen, pause when it is not
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.7 }
    );
    observer.observe(video);

    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      clearTimeout(holdTimer.current);
      clearTimeout(flashTimer.current);
    },
    []
  );

  const showFlash = (kind) => {
    setFlash({ kind, id: Date.now() });
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 700);
  };

  // ---- Hold to pause, tap for sound ----
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    held.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };

    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      held.current = true;
      clearTimeout(flashTimer.current);
      videoRef.current?.pause();
      setFlash({ kind: 'paused', id: Date.now() });
    }, HOLD_MS);
  };

  const onMove = (e) => {
    if (!holdTimer.current) return;
    const moved = Math.hypot(e.clientX - startPoint.current.x, e.clientY - startPoint.current.y);
    // The finger is scrolling, so this is not a hold
    if (moved > 10) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const release = () => {
    clearTimeout(holdTimer.current);
    holdTimer.current = null;

    if (held.current) {
      held.current = false;
      holdEndedAt.current = Date.now();
      videoRef.current?.play().catch(() => {});
      setFlash(null);
    }
  };

  const onTap = () => {
    // The click that comes right after a hold must not change the sound
    if (Date.now() - holdEndedAt.current < 500) return;

    const next = !muted;
    setMuted(next);
    showFlash(next ? 'sound-off' : 'sound-on');
  };

  const toggleLike = async () => {
    try {
      const res = await api.post('/posts/' + post._id + '/like');
      setLiked(res.data.liked);
      setCount(res.data.likes);
    } catch (err) {
      console.log(err);
    }
  };

  const username = post.user?.username || 'unknown';

  return (
    <section className="reel" id={'reel-' + post._id}>
      <div className="reel-frame">
        <video
          ref={videoRef}
          className="reel-video"
          src={post.imageUrl}
          loop
          playsInline
          muted={muted}
          preload="metadata"
          title="Tap for sound. Hold to pause."
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
          onContextMenu={(e) => e.preventDefault()}
          onClick={onTap}
        />

        {flash && (
          <div
            key={flash.id}
            className={'reel-flash ' + (flash.kind === 'paused' ? 'hold' : 'pop')}
            aria-hidden="true"
          >
            {flash.kind === 'paused' ? (
              <PauseGlyph />
            ) : flash.kind === 'sound-on' ? (
              <VolumeOnIcon />
            ) : (
              <VolumeOffIcon />
            )}
          </div>
        )}

        <div className="reel-info">
          <Link to={'/u/' + username}>@{username}</Link>
          {post.caption && <p>{post.caption}</p>}
        </div>

        <div className="reel-side">
          <button
            className={'reel-btn' + (liked ? ' on' : '')}
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? 'Unlike' : 'Like'}
            title={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={liked} />
            <span>{count}</span>
          </button>

          <button
            className="reel-btn"
            onClick={() => setSheet(true)}
            aria-label="Share"
            title="Share"
          >
            <SendIcon />
          </button>

          <button
            className="reel-btn"
            onClick={() => {
              window.location.href = downloadUrl(post.imageUrl);
            }}
            aria-label="Download"
            title="Download"
          >
            <DownloadIcon />
          </button>

          <button
            className="reel-btn"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            title={muted ? 'Turn sound on' : 'Turn sound off'}
          >
            {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
          </button>
        </div>

        {sheet && <ShareSheet postId={post._id} onClose={() => setSheet(false)} />}
      </div>
    </section>
  );
}

export default function Reels() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [params] = useSearchParams();
  const start = params.get('start');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const scrolled = useRef(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    async function load() {
      try {
        const res = await api.get('/posts/reels');
        let list = res.data;

        // The reel that was tapped in the feed may be older than the latest 30
        if (start && !list.some((p) => p._id === start)) {
          try {
            const one = await api.get('/posts/' + start);
            if (one.data.mediaType === 'video') list = [one.data, ...list];
          } catch {
            // that reel was deleted, show the others
          }
        }

        if (!ignore) setPosts(list);
      } catch (err) {
        console.log(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [token, start]);

  // Jump to the reel that was tapped in the feed
  useEffect(() => {
    if (loading || !start || scrolled.current) return;
    const el = document.getElementById('reel-' + start);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      scrolled.current = true;
    }
  }, [loading, posts, start]);

  if (!token) return <Navigate to="/login" />;

  return (
    <div className="reels-page">
      <Topbar />
      <div className="reels">
        {loading && <p className="reels-msg">Loading reels...</p>}

        {!loading && posts.length === 0 && (
          <p className="reels-msg">
            No reels yet. Publish a short video from the feed and it will show up here.
          </p>
        )}

        {posts.map((post) => (
          <Reel
            key={post._id}
            post={post}
            currentUserId={user?.id}
            muted={muted}
            setMuted={setMuted}
          />
        ))}
      </div>
    </div>
  );
}