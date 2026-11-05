import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
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

function Reel({ post, currentUserId, muted, setMuted }) {
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(post.likes.includes(currentUserId));
  const [count, setCount] = useState(post.likes.length);
  const [sheet, setSheet] = useState(false);

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

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) video.play();
    else video.pause();
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
    <section className="reel">
      <div className="reel-frame">
        <video
          ref={videoRef}
          className="reel-video"
          src={post.imageUrl}
          loop
          playsInline
          muted={muted}
          preload="metadata"
          onClick={togglePlay}
        />

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

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/posts/reels')
      .then((res) => {
        if (!ignore) setPosts(res.data);
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