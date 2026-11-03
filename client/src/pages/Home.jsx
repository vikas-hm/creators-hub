import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import NewPost from '../components/NewPost';
import PostCard from '../components/PostCard';

export default function Home() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
    const removePost = (id) => setPosts((list) => list.filter((p) => p._id !== id));

  const refreshPosts = async () => {
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/posts')
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
    <div>
      <Topbar />

      <main className="home-main">
        <h2>Hi, {user?.name}</h2>
        <p className="sub">@{user?.username}</p>

        <NewPost onCreated={refreshPosts} />

        {loading && <p className="sub" style={{ marginTop: 24 }}>Loading posts...</p>}

        {!loading && posts.length === 0 && (
          <div className="empty">
            <p>No posts yet. Publish the first one above.</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post._id} post={post} currentUserId={user?.id} onDeleted={removePost} />        ))}
      </main>
    </div>
  );
}