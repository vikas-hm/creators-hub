import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';

const texts = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
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
            <p>Nothing here yet. When someone likes, comments, or follows you, it shows up here.</p>
          </div>
        )}

        {items.map((n) => (
          <Link
            key={n._id}
            className={'notif' + (n.read ? '' : ' unread')}
            to={n.post ? '/p/' + n.post._id : '/u/' + n.sender.username}
          >
            <div className="avatar">{n.sender.name[0]}</div>
            <div className="notif-text">
              <span>
                <strong>{n.sender.username}</strong> {texts[n.type] || 'did something'}
              </span>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
            {n.post?.mediaType === 'image' && (
              <img className="notif-thumb" src={n.post.imageUrl} alt="" />
            )}
          </Link>
        ))}
      </main>
    </div>
  );
}