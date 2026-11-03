import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api';
import NewPost from '../components/NewPost';
import PostCard from '../components/PostCard';

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadPosts();
  }, []);

  if (!token) return <Navigate to="/login" />;

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div>
      <header className="topbar">
        <div className="brand">Creators Hub</div>
        <button className="btn-ghost" onClick={logout}>Log out</button>
      </header>

      <main className="home-main">
        <h2>Hi, {user?.name}</h2>
        <p className="sub">@{user?.username}</p>

        <NewPost onCreated={loadPosts} />

        {loading && <p className="sub" style={{ marginTop: 24 }}>Loading posts...</p>}

        {!loading && posts.length === 0 && (
          <div className="empty">
            <p>No posts yet. Publish the first one above.</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post._id} post={post} currentUserId={user?.id} />
        ))}
      </main>
    </div>
  );
}