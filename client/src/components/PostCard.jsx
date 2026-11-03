import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { downloadUrl, sharePost } from '../utils';
import CommentSection from './CommentSection';
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  DownloadIcon,
  TrashIcon,
} from './Icons';

export default function PostCard({ post, currentUserId, onDeleted }) {
  const [liked, setLiked] = useState(post.likes.includes(currentUserId));
  const [count, setCount] = useState(post.likes.length);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const name = post.user?.name || 'Unknown';
  const username = post.user?.username || 'unknown';
  const isMine = post.user?._id === currentUserId;

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 2500);
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

  const share = async () => {
    const result = await sharePost(post._id, post.caption);
    if (result === 'copied') flash('Link copied');
    if (result === 'failed') flash('Could not copy the link');
  };

  const download = () => {
    window.location.href = downloadUrl(post.imageUrl);
  };

  const remove = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api.delete('/posts/' + post._id);
      if (onDeleted) onDeleted(post._id);
    } catch (err) {
      flash(err.response?.data?.message || 'Could not delete the post');
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
          aria-label={liked ? 'Unlike' : 'Like'}
          title={liked ? 'Unlike' : 'Like'}
        >
          <HeartIcon filled={liked} />
          <span>{count}</span>
        </button>

        <button
          className="like"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Comments"
          title="Comments"
        >
          <CommentIcon />
        </button>

        <button className="like" onClick={share} aria-label="Share" title="Share">
          <ShareIcon />
        </button>

        <button className="like" onClick={download} aria-label="Download" title="Download">
          <DownloadIcon />
        </button>

        {isMine && (
          <button
            className="like danger push-right"
            onClick={remove}
            aria-label="Delete post"
            title="Delete post"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {notice && <p className="notice" role="status">{notice}</p>}

      {post.caption && (
        <p className="caption">
          <strong>{username}</strong> {post.caption}
        </p>
      )}

      {open && <CommentSection postId={post._id} />}
    </article>
  );
}