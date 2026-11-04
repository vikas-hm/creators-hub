import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';

function SharedPost({ post }) {
  if (!post) return <p className="shared-gone">This post is no longer available</p>;

  return (
    <Link to={'/p/' + post._id} className="shared-post">
      {post.mediaType === 'video' ? (
        <video src={post.imageUrl} muted preload="metadata" playsInline />
      ) : (
        <img src={post.imageUrl} alt="" />
      )}
      <span>
        @{post.user?.username || 'unknown'}
        {post.caption ? ': ' + post.caption : ''}
      </span>
    </Link>
  );
}

function ChatView({ username }) {
  const token = localStorage.getItem('token');
  const myId = JSON.parse(localStorage.getItem('user') || 'null')?.id;

  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    const load = () =>
      api
        .get('/messages/with/' + username)
        .then((res) => {
          if (ignore) return;
          setOther(res.data.user);
          setMessages(res.data.messages);
          setStatus('ready');
        })
        .catch(() => {
          if (!ignore) setStatus((s) => (s === 'ready' ? s : 'missing'));
        });

    load();
    const timer = setInterval(load, 5000);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [username, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!token) return <Navigate to="/login" />;

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await api.post('/messages/to/' + username, { text });
      setText('');
      const res = await api.get('/messages/with/' + username);
      setMessages(res.data.messages);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message');
    }
  };

  return (
    <div>
      <Topbar />
      <main className="home-main">
        {status === 'loading' && <p className="sub">Loading chat...</p>}

        {status === 'missing' && (
          <div className="empty">
            <p>We could not find @{username}. <Link to="/messages">Back to messages</Link></p>
          </div>
        )}

        {status === 'ready' && (
          <section className="chat">
            <div className="chat-head">
              <Link to="/messages" aria-label="Back to messages">Back</Link>
              <Link to={'/u/' + other.username} className="chat-name">
                <span className="avatar small">{other.name[0]}</span>
                <strong>{other.name}</strong>
                <span className="muted">@{other.username}</span>
              </Link>
            </div>

            <div className="chat-body">
              {messages.length === 0 && (
                <p className="muted-line">No messages yet. Say hi to {other.name}.</p>
              )}

              {messages.map((m) => (
                <div
                  key={m._id}
                  className={'bubble ' + (m.sender === myId ? 'mine' : 'theirs')}
                >
                  {m.post !== null && <SharedPost post={m.post} />}
                  {m.text && <p>{m.text}</p>}
                  <small>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form className="comment-form" onSubmit={send}>
              <input
                placeholder="Write a message..."
                value={text}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                aria-label="Write a message"
              />
              <button className="btn" type="submit">Send</button>
            </form>
            {error && <p className="error" role="alert">{error}</p>}
          </section>
        )}
      </main>
    </div>
  );
}

export default function Chat() {
  const { username } = useParams();
  return <ChatView key={username} username={username} />;
}