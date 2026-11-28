import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import Avatar from '../components/Avatar';

const WORDS = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  reply: 'replied to your comment',
  comment_like: 'liked your comment',
};

const describe = (n) =>
  n.type === 'message_reaction'
    ? 'reacted ' + n.text + ' to your message'
    : WORDS[n.type] || 'did something';

const target = (n) => {
  if (n.type === 'message_reaction') return '/messages/' + n.sender.username;
  if (n.post) return '/p/' + n.post._id;
  return '/u/' + n.sender.username;
};

export default function Notifications() {
  const token = localStorage.getItem('token');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/notifications')
      .then((res) => {
        if (ignore) return;
        setItems(res.data.filter((n) => n.sender));
        return api.post('/notifications/read-all');
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
    <div>
      <Topbar />
      <main className="home-main">
        <h2>Notifications</h2>

        {loading && <p className="sub">Loading...</p>}

        {!loading && items.length === 0 && (
          <div className="empty">
            <p>Nothing here yet. When someone likes, comments, reacts or follows you, it shows up here.</p>
          </div>
        )}

        {items.map((n) => (
          <Link
            key={n._id}
            className={'notif' + (n.read ? '' : ' unread')}
            to={target(n)}
          >
            <Avatar user={n.sender} />
            <div className="notif-text">
              <span>
                <strong>{n.sender.username}</strong> {describe(n)}
              </span>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
            {n.type === 'message_reaction' && <span className="notif-emoji">{n.text}</span>}
            {n.post?.mediaType === 'image' && (
              <img className="notif-thumb" src={n.post.imageUrl} alt="" />
            )}
          </Link>
        ))}
      </main>
    </div>
  );
}