import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';

function Reel({ post, currentUserId, muted, setMuted }) {
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(post.likes.includes(currentUserId));
  const [count, setCount] = useState(post.likes.length);

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
          >
            {liked ? '♥' : '♡'}
            <span>{count}</span>
          </button>
          <button className="reel-btn" onClick={() => setMuted((m) => !m)}>
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
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