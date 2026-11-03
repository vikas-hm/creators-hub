import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import PostCard from '../components/PostCard';

function PostView({ id }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [post, setPost] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/posts/' + id)
      .then((res) => {
        if (ignore) return;
        setPost(res.data);
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('missing');
      });

    return () => {
      ignore = true;
    };
  }, [id, token]);

  if (!token) return <Navigate to="/login" />;

  return (
    <div>
      <Topbar />
      <main className="home-main">
        {status === 'loading' && <p className="sub">Loading post...</p>}

        {status === 'missing' && (
          <div className="empty">
            <p>This post was deleted or the link is wrong. <Link to="/">Back to the feed</Link></p>
          </div>
        )}

        {status === 'ready' && (
          <PostCard post={post} currentUserId={user?.id} onDeleted={() => navigate('/')} />
        )}
      </main>
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams();
  return <PostView key={id} id={id} />;
}