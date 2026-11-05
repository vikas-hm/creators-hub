import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { BellIcon, MailIcon, SearchIcon } from './Icons';

export default function Topbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [unread, setUnread] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    let ignore = false;

    const load = () => {
      api
        .get('/notifications/unread-count')
        .then((res) => {
          if (!ignore) setUnread(res.data.count);
        })
        .catch(() => {});
      api
        .get('/messages/unread-count')
        .then((res) => {
          if (!ignore) setUnreadMsgs(res.data.count);
        })
        .catch(() => {});
    };

    load();
    const timer = setInterval(load, 20000);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="topbar">
      <Link to="/" className="brand">Creators Hub</Link>
      <nav className="topnav">
        <Link to="/">Feed</Link>
        <Link to="/reels">Reels</Link>
        <Link to="/challenge">Challenge</Link>
        <Link to={'/u/' + user?.username}>My profile</Link>
        <Link to="/search" className="bell" aria-label="Search people" title="Search people">
          <SearchIcon />
        </Link>
        <Link to="/messages" className="bell" aria-label="Messages" title="Messages">
          <MailIcon />
          {unreadMsgs > 0 && <span className="badge">{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
        </Link>
        <Link to="/notifications" className="bell" aria-label="Notifications" title="Notifications">
          <BellIcon />
          {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
        </Link>
        <button className="btn-ghost" onClick={logout}>Log out</button>
      </nav>
    </header>
  );
}