import { useState } from 'react';
import api from '../api';

export default function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(post.likes.includes(currentUserId));
  const [count, setCount] = useState(post.likes.length);

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

  return (
    <article className="post">
      <div className="post-head">
        <div className="avatar">{name[0]}</div>
        <div>
          <strong>{name}</strong>
          <span className="muted">@{username}</span>
        </div>
      </div>

      <img className="post-img" src={post.imageUrl} alt={post.caption || 'Post by ' + name} />

      <div className="post-actions">
        <button
          className={'like' + (liked ? ' on' : '')}
          onClick={toggleLike}
          aria-pressed={liked}
        >
          {liked ? '♥' : '♡'} {count}
        </button>
      </div>

      {post.caption && (
        <p className="caption">
          <strong>{username}</strong> {post.caption}
        </p>
      )}
    </article>
  );
}