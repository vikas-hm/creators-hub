import { useEffect, useState } from 'react';
import api from '../api';
import { HeartIcon, ReplyIcon } from './Icons';

function CommentItem({ comment, currentUserId, onReply, isReply }) {
  const [liked, setLiked] = useState(comment.likes.includes(currentUserId));
  const [count, setCount] = useState(comment.likes.length);
  const username = comment.user?.username || 'unknown';

  const toggleLike = async () => {
    try {
      const res = await api.post('/posts/comments/' + comment._id + '/like');
      setLiked(res.data.liked);
      setCount(res.data.likes);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className={'comment' + (isReply ? ' reply' : '')}>
      <p className="comment-text">
        <strong>{username}</strong> {comment.text}
      </p>
      <div className="comment-actions">
        <button
          className={'mini' + (liked ? ' on' : '')}
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike comment' : 'Like comment'}
          title={liked ? 'Unlike' : 'Like'}
        >
          <HeartIcon filled={liked} />
          {count > 0 && <span>{count}</span>}
        </button>
        <button
          className="mini"
          onClick={() => onReply(comment)}
          aria-label="Reply"
          title="Reply"
        >
          <ReplyIcon />
        </button>
      </div>
    </div>
  );
}

export default function CommentSection({ postId }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await api.get('/posts/' + postId + '/comments');
    setComments(res.data);
  };

  useEffect(() => {
    let ignore = false;

    api
      .get('/posts/' + postId + '/comments')
      .then((res) => {
        if (!ignore) setComments(res.data);
      })
      .catch((err) => console.log(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [postId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await api.post('/posts/' + postId + '/comments', {
        text,
        parentId: replyTo ? replyTo._id : undefined,
      });
      setText('');
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post your comment');
    }
  };

  // Main comments newest first, replies oldest first under each one
  const mainComments = comments.filter((c) => !c.parent).reverse();
  const repliesOf = (id) => comments.filter((c) => c.parent === id);

  return (
    <div className="comments">
      {loading && <p className="muted-line">Loading comments...</p>}

      {!loading && comments.length === 0 && (
        <p className="muted-line">No comments yet. Be the first to give feedback.</p>
      )}

      {mainComments.map((c) => (
        <div key={c._id}>
          <CommentItem comment={c} currentUserId={user?.id} onReply={setReplyTo} />
          {repliesOf(c._id).map((r) => (
            <CommentItem
              key={r._id}
              comment={r}
              currentUserId={user?.id}
              onReply={setReplyTo}
              isReply
            />
          ))}
        </div>
      ))}

      {replyTo && (
        <p className="replying">
          Replying to <strong>@{replyTo.user?.username}</strong>
          <button
            type="button"
            className="mini"
            onClick={() => setReplyTo(null)}
            aria-label="Cancel reply"
            title="Cancel reply"
          >
            ×
          </button>
        </p>
      )}

      <form className="comment-form" onSubmit={submit}>
        <input
          placeholder={replyTo ? 'Write your reply...' : 'Write feedback...'}
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          aria-label="Write a comment"
        />
        <button className="btn" type="submit">Post</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}