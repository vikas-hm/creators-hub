import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import Avatar from '../components/Avatar';
import {
  CheckIcon,
  DoubleCheckIcon,
  TrashIcon,
  MoreIcon,
  PencilIcon,
  ArrowLeftIcon,
} from '../components/Icons';

const clock = (d) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myId = JSON.parse(localStorage.getItem('user') || 'null')?.id;

  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
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

  // Close the message menu when you click anywhere else
  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuId]);

  if (!token) return <Navigate to="/login" />;

  const reload = async () => {
    const res = await api.get('/messages/with/' + username);
    setMessages(res.data.messages);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await api.post('/messages/to/' + username, { text });
      setText('');
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message');
    }
  };

  const startEdit = (m) => {
    setEditId(m._id);
    setEditText(m.text);
    setMenuId(null);
    setError('');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditText('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    setError('');
    try {
      await api.patch('/messages/' + editId, { text: editText });
      setEditId(null);
      setEditText('');
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not edit the message');
    }
  };

  const unsend = async (m) => {
    setMenuId(null);
    const ok = window.confirm(
      'Unsend this message? ' + other.name + ' will no longer see it.'
    );
    if (!ok) return;
    setError('');
    try {
      await api.delete('/messages/' + m._id);
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not unsend the message');
    }
  };

  const deleteChat = async () => {
    const ok = window.confirm(
      'Delete this whole chat? It is removed only for you. ' +
        (other?.name || 'The other person') +
        ' will still see it.'
    );
    if (!ok) return;
    try {
      await api.delete('/messages/with/' + username);
      navigate('/messages');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the chat');
    }
  };

  // The last message I sent that was not unsent. "Seen" is shown under it.
  const lastMineIndex = messages.reduce(
    (acc, m, i) => (m.sender === myId && !m.unsent ? i : acc),
    -1
  );

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
              <Link to="/messages" className="chat-back" aria-label="Back to messages" title="Back">
                <ArrowLeftIcon />
              </Link>
              <Link to={'/u/' + other.username} className="chat-name">
                <Avatar user={other} size="small" />
                <strong>{other.name}</strong>
                <span className="muted">@{other.username}</span>
              </Link>
              <button
                type="button"
                className="mini danger push-right"
                onClick={deleteChat}
                aria-label="Delete chat"
                title="Delete chat"
              >
                <TrashIcon />
              </button>
            </div>

            <div className="chat-body">
              {messages.length === 0 && (
                <p className="muted-line">No messages yet. Say hi to {other.name}.</p>
              )}

              {messages.map((m, i) => {
                const mine = m.sender === myId;
                const editing = editId === m._id;

                return (
                  <div key={m._id} className="msg-wrap">
                    <div className={'msg-row ' + (mine ? 'mine' : 'theirs')}>
                      {mine && !m.unsent && !editing && (
                        <div className="msg-menu-wrap">
                          <button
                            type="button"
                            className="msg-more"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId((id) => (id === m._id ? null : m._id));
                            }}
                            aria-label="Message options"
                            aria-expanded={menuId === m._id}
                            title="Message options"
                          >
                            <MoreIcon />
                          </button>

                          {menuId === m._id && (
                            <div className={'msg-menu' + (i < 2 ? ' down' : '')} role="menu">
                              {m.canEdit && (
                                <button type="button" role="menuitem" onClick={() => startEdit(m)}>
                                  <PencilIcon />
                                  Edit
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                className="danger"
                                onClick={() => unsend(m)}
                              >
                                <TrashIcon />
                                Unsend
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={
                          'bubble ' + (mine ? 'mine' : 'theirs') + (m.unsent ? ' unsent' : '')
                        }
                      >
                        {m.unsent ? (
                          <p>{mine ? 'You unsent a message' : other.name + ' unsent a message'}</p>
                        ) : (
                          <>
                            {m.post !== null && <SharedPost post={m.post} />}

                            {editing ? (
                              <form className="edit-row" onSubmit={saveEdit}>
                                <input
                                  value={editText}
                                  maxLength={1000}
                                  onChange={(e) => setEditText(e.target.value)}
                                  aria-label="Edit your message"
                                  autoFocus
                                />
                                <div className="edit-actions">
                                  <button type="button" className="cancel" onClick={cancelEdit}>
                                    Cancel
                                  </button>
                                  <button type="submit" className="save">Save</button>
                                </div>
                              </form>
                            ) : (
                              m.text && <p>{m.text}</p>
                            )}

                            <small>
                              {clock(m.createdAt)}
                              {m.edited ? ' · edited' : ''}
                              {mine && (
                                <span
                                  className={'ticks' + (m.read ? ' seen' : '')}
                                  aria-label={m.read ? 'Seen' : 'Sent'}
                                  title={m.read ? 'Seen' : 'Sent'}
                                >
                                  {m.read ? <DoubleCheckIcon /> : <CheckIcon />}
                                </span>
                              )}
                            </small>
                          </>
                        )}
                      </div>
                    </div>

                    {i === lastMineIndex && m.read && (
                      <p className="seen-label">
                        Seen{m.readAt ? ' ' + clock(m.readAt) : ''}
                      </p>
                    )}
                  </div>
                );
              })}
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