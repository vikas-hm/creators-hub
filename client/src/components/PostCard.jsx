import { useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

export default function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(post.likes.includes(currentUserId));
  const [count, setCount] = useState(post.likes.length);

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const name = post.user?.name || 'Unknown';
  const username = post.user?.username || 'unknown';

  const toggleLike = async () => {
    try {
      const res = await api.post('/posts/' + post._id + '/like');
      setLiked(res.data.liked);
      setCount(res.data.likes);
    } catch (err) {
      console.log(err);
    }
  };

  const loadComments = async () => {
    const res = await api.get('/posts/' + post._id + '/comments');
    setComments(res.data);
  };

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        await loadComments();
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post('/posts/' + post._id + '/comments', { text });
      setText('');
      await loadComments();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <article className="post">
      <div className="post-head">
        <Link className="post-user" to={'/u/' + username}>
          <div className="avatar">{name[0]}</div>
          <div>
            <strong>{name}</strong>
            <span className="muted">@{username}</span>
          </div>
        </Link>
      </div>

            {post.mediaType === 'video' ? (
        <video
          className="post-video"
          src={post.imageUrl}
          controls
          playsInline
          loop
          preload="metadata"
        />
      ) : (
        <img className="post-img" src={post.imageUrl} alt={post.caption || 'Post by ' + name} />
      )}

      <div className="post-actions">
        <button
          className={'like' + (liked ? ' on' : '')}
          onClick={toggleLike}
          aria-pressed={liked}
        >
          {liked ? '♥' : '♡'} {count}
        </button>
        <button className="like" onClick={toggleComments} aria-expanded={open}>
          {open ? 'Hide comments' : 'Comments'}
        </button>
      </div>

      {post.caption && (
        <p className="caption">
          <strong>{username}</strong> {post.caption}
        </p>
      )}

      {open && (
        <div className="comments">
          {loading && <p className="muted-line">Loading comments...</p>}
          {!loading && comments.length === 0 && (
            <p className="muted-line">No comments yet. Be the first to give feedback.</p>
          )}
          {comments.map((c) => (
            <p className="comment" key={c._id}>
              <strong>{c.user?.username || 'unknown'}</strong> {c.text}
            </p>
          ))}
          <form className="comment-form" onSubmit={addComment}>
            <input
              placeholder="Write feedback..."
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value)}
              aria-label="Write a comment"
            />
            <button className="btn" type="submit">Post</button>
          </form>
        </div>
      )}
    </article>
  );
}