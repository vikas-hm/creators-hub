import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import PostCard from '../components/PostCard';
import { MailIcon } from '../components/Icons';

function ProfileView({ username }) {
  const token = localStorage.getItem('token');
  const myId = JSON.parse(localStorage.getItem('user') || 'null')?.id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    Promise.all([
      api.get('/users/' + username),
      api.get('/posts/user/' + username),
    ])
      .then(([p, ps]) => {
        if (ignore) return;
        setProfile(p.data);
        setPosts(ps.data);
        setFollowers(p.data.followers.length);
        setFollowing(p.data.followers.includes(myId));
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('missing');
      });

    return () => {
      ignore = true;
    };
  }, [username, token, myId]);

  if (!token) return <Navigate to="/login" />;

  const toggleFollow = async () => {
    try {
      const res = await api.post('/users/' + profile._id + '/follow');
      setFollowing(res.data.following);
      setFollowers((n) => n + (res.data.following ? 1 : -1));
    } catch (err) {
      console.log(err);
    }
  };

  const isMe = profile?._id === myId;
    const removePost = (id) => setPosts((list) => list.filter((p) => p._id !== id));

  return (
    <div>
      <Topbar />
      <main className="home-main">
        {status === 'loading' && <p className="sub">Loading profile...</p>}

        {status === 'missing' && (
          <div className="empty">
            <p>We could not find @{username}. <Link to="/">Back to the feed</Link></p>
          </div>
        )}

        {status === 'ready' && (
          <>
            <section className="profile-head">
              <div className="avatar big">{profile.name[0]}</div>
              <div className="profile-info">
                <h2>{profile.name}</h2>
                <p className="sub">@{profile.username}</p>
                {profile.bio && <p>{profile.bio}</p>}
                <p className="stats">
                  <strong>{posts.length}</strong> posts
                  <strong>{followers}</strong> followers
                  <strong>{profile.following.length}</strong> following
                </p>
                {!isMe && (
                  <div className="profile-buttons">
                    <button className="btn follow" onClick={toggleFollow}>
                      {following ? 'Unfollow' : 'Follow'}
                    </button>
                    <Link className="btn message-btn" to={'/messages/' + profile.username}>
                      <MailIcon />
                      Message
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {posts.length === 0 && (
              <div className="empty">
                <p>{isMe ? 'You have not posted yet. Publish your first post from the feed.' : 'No posts yet.'}</p>
              </div>
            )}

            {posts.map((post) => (
              <PostCard key={post._id} post={post} currentUserId={myId} onDeleted={removePost} />            ))}
          </>
        )}
      </main>
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  return <ProfileView key={username} username={username} />;
}