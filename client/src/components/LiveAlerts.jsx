import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from './Avatar';

// Remembered while the app is open, so moving between pages does not repeat alerts
const seen = { uid: null, ready: false, message: null, notification: null };

const WORDS = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  reply: 'replied to your comment',
  comment_like: 'liked your comment',
};

function fromMessage(m) {
  return {
    key: 'm' + m.id,
    title: m.from.name,
    body: m.text || 'Sent you a post',
    to: '/messages/' + m.from.username,
    user: m.from,
    at: m.at,
  };
}

function fromNotification(n) {
  let body = WORDS[n.type] || 'did something';
  let to = n.post ? '/p/' + n.post : '/u/' + n.from.username;

  if (n.type === 'message_reaction') {
    body = 'reacted ' + n.text + ' to your message';
    to = '/messages/' + n.from.username;
  }

  return { key: 'n' + n.id, title: n.from.name, body, to, user: n.from, at: n.at };
}

async function systemNotify(item) {
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    const options = {
      body: item.body,
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      tag: item.key,
      data: { url: item.to },
    };
    if (reg) await reg.showNotification(item.title, options);
    else new Notification(item.title, options);
  } catch {
    // this browser does not allow it
  }
}

export default function LiveAlerts() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  const timer = useRef(null);

  const [toast, setToast] = useState(null);
  const [ask, setAsk] = useState(
    () =>
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default' &&
      !localStorage.getItem('alertsAsked') &&
      !!localStorage.getItem('token')
  );

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    const uid = JSON.parse(localStorage.getItem('user') || 'null')?.id || null;
    if (seen.uid !== uid) {
      seen.uid = uid;
      seen.ready = false;
      seen.message = null;
      seen.notification = null;
    }

    let ignore = false;

    const show = (item) => {
      setToast(item);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 6000);

      if (
        document.hidden &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        systemNotify(item);
      }
    };

    const check = async () => {
      try {
        const res = await api.get('/notifications/alerts');
        if (ignore) return;

        const { message, notification } = res.data;
        const newMessage = message && message.id !== seen.message ? message : null;
        const newNote = notification && notification.id !== seen.notification ? notification : null;

        seen.message = message ? message.id : null;
        seen.notification = notification ? notification.id : null;

        // The first check only remembers what is already there
        if (!seen.ready) {
          seen.ready = true;
          return;
        }

        const items = [];
        if (newMessage && pathRef.current !== '/messages/' + newMessage.from.username) {
          items.push(fromMessage(newMessage));
        }
        if (newNote) items.push(fromNotification(newNote));

        if (items.length > 0) {
          items.sort((a, b) => new Date(b.at) - new Date(a.at));
          show(items[0]);
        }
      } catch {
        // offline or the server is waking up, try again next time
      }
    };

    check();
    const poll = setInterval(check, 8000);

    return () => {
      ignore = true;
      clearInterval(poll);
      clearTimeout(timer.current);
    };
  }, []);

  const turnOn = () => {
    localStorage.setItem('alertsAsked', '1');
    setAsk(false);
    Notification.requestPermission().catch(() => {});
  };

  const notNow = () => {
    localStorage.setItem('alertsAsked', '1');
    setAsk(false);
  };

  return (
    <>
      {ask && (
        <div className="alert-ask" role="region" aria-label="Alerts">
          <span>Get an alert when someone messages you or likes your post?</span>
          <div className="alert-ask-actions">
            <button type="button" className="btn small" onClick={turnOn}>
              Turn on
            </button>
            <button type="button" className="btn-outline neutral" onClick={notNow}>
              Not now
            </button>
          </div>
        </div>
      )}

      {toast && (
        <button
          type="button"
          className="toast"
          role="status"
          onClick={() => {
            navigate(toast.to);
            setToast(null);
          }}
        >
          <Avatar user={toast.user} size="small" />
          <span className="toast-text">
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </span>
        </button>
      )}
    </>
  );
}