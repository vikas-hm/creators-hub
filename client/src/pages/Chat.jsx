import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import Avatar from '../components/Avatar';
import MessageMenu from '../components/MessageMenu';
import {
  CheckIcon,
  DoubleCheckIcon,
  TrashIcon,
  ArrowLeftIcon,
  ReplyIcon,
} from '../components/Icons';

const SWIPE_TRIGGER = 56; // how far to slide before the reply is armed
const SWIPE_MAX = 90; // how far the message can slide

const clock = (d) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const snippet = (m) =>
  m.unsent ? 'Message unsent' : m.text || (m.post ? 'Shared a post' : '');

function groupReactions(list, myId) {
  const map = new Map();
  (list || []).forEach((r) => {
    const g = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
    g.count += 1;
    if (String(r.user) === myId) g.mine = true;
    map.set(r.emoji, g);
  });
  return [...map.values()];
}

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
  const [notice, setNotice] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [drag, setDrag] = useState(null);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const pressTimer = useRef(null);
  const snapTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const longFired = useRef(false);
  const gesture = useRef({ mode: 'idle' });

  const closeMenu = useCallback(() => setMenuId(null), []);

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

  useEffect(
    () => () => {
      clearTimeout(pressTimer.current);
      clearTimeout(snapTimer.current);
    },
    []
  );

  if (!token) return <Navigate to="/login" />;

  const reload = async () => {
    const res = await api.get('/messages/with/' + username);
    setMessages(res.data.messages);
  };

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 2000);
  };

  const startReply = (m) => {
    setMenuId(null);
    setEditId(null);
    setReplyTo(m);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ---- Touch and mouse: hold for options, slide right to reply ----
  const cancelPress = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const openMenu = (m) => {
    if (m.unsent || editId === m._id) return;
    setMenuId(m._id);
  };

  const startPress = (e, m) => {
    longFired.current = false;
    gesture.current = { mode: 'idle' };

    if (m.unsent || editId === m._id) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('input, button, textarea')) return;

    startPos.current = { x: e.clientX, y: e.clientY };
    gesture.current = { mode: 'pending', id: m._id, armed: false };

    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      pressTimer.current = null;
      gesture.current = { mode: 'idle' };
      setMenuId(m._id);
      if (navigator.vibrate) navigator.vibrate(15);
    }, 450);
  };

  const movePress = (e) => {
    const g = gesture.current;
    if (g.mode !== 'pending' && g.mode !== 'swipe') return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    if (g.mode === 'pending') {
      if (Math.hypot(dx, dy) < 8) return;

      // The finger moved, so this is not a long press any more
      cancelPress();

      if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        clearTimeout(snapTimer.current);
        gesture.current = { mode: 'swipe', id: g.id, armed: false };
        longFired.current = true; // do not open a shared post after the slide
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // not supported, the slide still works inside the message
        }
      } else {
        gesture.current = { mode: 'idle' }; // scrolling up or down
        return;
      }
    }

    const x = Math.max(0, Math.min(dx, SWIPE_MAX));
    const armed = x >= SWIPE_TRIGGER;

    if (armed && !gesture.current.armed && navigator.vibrate) navigator.vibrate(10);
    gesture.current.armed = armed;

    setDrag({ id: gesture.current.id, x, snapping: false });
  };

  const endPress = (e, m) => {
    cancelPress();
    const g = gesture.current;
    gesture.current = { mode: 'idle' };

    if (g.mode !== 'swipe') return;

    // Spring back, and reply if the slide was long enough
    setDrag({ id: g.id, x: 0, snapping: true });
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => setDrag(null), 220);

    if (g.armed && e.type === 'pointerup') startReply(m);
  };

  // A long press or a slide must not also open a shared post
  const swallowClick = (e) => {
    if (longFired.current) {
      e.preventDefault();
      e.stopPropagation();
      longFired.current = false;
    }
  };

  // ---- Actions ----
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await api.post('/messages/to/' + username, {
        text,
        replyTo: replyTo ? replyTo._id : undefined,
      });
      setText('');
      setReplyTo(null);
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message');
    }
  };

  const react = async (m, emoji) => {
    setMenuId(null);
    setError('');
    try {
      const res = await api.post('/messages/' + m._id + '/react', { emoji });
      setMessages((list) =>
        list.map((x) => (x._id === m._id ? { ...x, reactions: res.data.reactions } : x))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add your reaction');
    }
  };

  const copyText = async (m) => {
    setMenuId(null);
    try {
      await navigator.clipboard.writeText(m.text);
      flash('Copied');
    } catch {
      flash('Could not copy');
    }
  };

  const startEdit = (m) => {
    setMenuId(null);
    setEditId(m._id);
    setEditText(m.text);
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
    const ok = window.confirm('Unsend this message? ' + other.name + ' will no longer see it.');
    if (!ok) return;
    setError('');
    try {
      await api.delete('/messages/' + m._id);
      if (replyTo && replyTo._id === m._id) setReplyTo(null);
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

  const menuMessage = messages.find((m) => m._id === menuId);
  const myReaction = menuMessage?.reactions?.find((r) => String(r.user) === myId)?.emoji;

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

              {messages.length > 0 && (
                <p className="chat-hint">
                  Slide a message right to reply. Hold it (or right-click) for more. Double-tap for ❤️.
                </p>
              )}

              {messages.map((m, i) => {
                const mine = m.sender === myId;
                const side = mine ? 'mine' : 'theirs';
                const editing = editId === m._id;
                const groups = groupReactions(m.reactions, myId);
                const dragging = drag && drag.id === m._id ? drag : null;

                return (
                  <div key={m._id} className="msg-wrap">
                    <div className={'msg-row ' + side}>
                      <div
                        className={'bubble ' + side + (m.unsent ? ' unsent' : '')}
                        style={
                          dragging
                            ? {
                                transform: 'translateX(' + dragging.x + 'px)',
                                transition: dragging.snapping ? 'transform 0.2s ease' : 'none',
                              }
                            : undefined
                        }
                        tabIndex={m.unsent ? -1 : 0}
                        title={m.unsent ? undefined : 'Slide right to reply. Hold or right-click for options.'}
                        onPointerDown={(e) => startPress(e, m)}
                        onPointerMove={movePress}
                        onPointerUp={(e) => endPress(e, m)}
                        onPointerCancel={(e) => endPress(e, m)}
                        onPointerLeave={cancelPress}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          openMenu(m);
                        }}
                        onClickCapture={swallowClick}
                        onDoubleClick={() => {
                          if (!m.unsent && !editing) react(m, '❤️');
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.target === e.currentTarget &&
                            (e.key === 'Enter' || e.key === 'ContextMenu')
                          ) {
                            e.preventDefault();
                            openMenu(m);
                          }
                        }}
                      >
                        {dragging && (
                          <span
                            className={
                              'swipe-icon' + (dragging.x >= SWIPE_TRIGGER ? ' armed' : '')
                            }
                            style={{ opacity: Math.min(dragging.x / SWIPE_TRIGGER, 1) }}
                            aria-hidden="true"
                          >
                            <ReplyIcon />
                          </span>
                        )}

                        {m.unsent ? (
                          <p>{mine ? 'You unsent a message' : other.name + ' unsent a message'}</p>
                        ) : (
                          <>
                            {m.replyTo && (
                              <div className="quote">
                                <strong>
                                  {m.replyTo.sender === myId ? 'You' : other.name}
                                </strong>
                                <span>{snippet(m.replyTo)}</span>
                              </div>
                            )}

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

                    {groups.length > 0 && (
                      <div className={'reactions ' + side}>
                        {groups.map((g) => (
                          <button
                            key={g.emoji}
                            type="button"
                            className={'react-chip' + (g.mine ? ' mine' : '')}
                            onClick={() => react(m, g.emoji)}
                            aria-pressed={g.mine}
                            aria-label={
                              g.emoji + ' ' + g.count + (g.mine ? ' (yours, tap to remove)' : '')
                            }
                          >
                            <span>{g.emoji}</span>
                            {g.count > 1 && <span className="react-count">{g.count}</span>}
                          </button>
                        ))}
                      </div>
                    )}

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

            {replyTo && (
              <div className="reply-bar">
                <div className="reply-text">
                  <strong>
                    Replying to {replyTo.sender === myId ? 'yourself' : other.name}
                  </strong>
                  <span>{snippet(replyTo)}</span>
                </div>
                <button
                  type="button"
                  className="mini"
                  onClick={() => setReplyTo(null)}
                  aria-label="Cancel reply"
                  title="Cancel reply"
                >
                  ×
                </button>
              </div>
            )}

            <form className="comment-form" onSubmit={send}>
              <input
                ref={inputRef}
                placeholder="Write a message..."
                value={text}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                aria-label="Write a message"
              />
              <button className="btn" type="submit">Send</button>
            </form>

            {notice && <p className="success" role="status">{notice}</p>}
            {error && <p className="error" role="alert">{error}</p>}
          </section>
        )}

        {menuMessage && !menuMessage.unsent && (
          <MessageMenu
            message={menuMessage}
            mine={menuMessage.sender === myId}
            myReaction={myReaction}
            onClose={closeMenu}
            onReact={(emoji) => react(menuMessage, emoji)}
            onReply={() => startReply(menuMessage)}
            onCopy={() => copyText(menuMessage)}
            onEdit={() => startEdit(menuMessage)}
            onUnsend={() => unsend(menuMessage)}
          />
        )}
      </main>
    </div>
  );
}

export default function Chat() {
  const { username } = useParams();
  return <ChatView key={username} username={username} />;
}