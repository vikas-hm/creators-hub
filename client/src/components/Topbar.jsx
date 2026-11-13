import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from './Avatar';
import Logo from './Logo';
import {
  HomeIcon,
  SearchIcon,
  ReelsIcon,
  MailIcon,
  BellIcon,
  TrophyIcon,
  SettingsIcon,
  LogoutIcon,
} from './Icons';

const cls = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '');
const deskCls = ({ isActive }) => 'nav-item desk-only' + (isActive ? ' active' : '');

export default function Topbar() {
  const navigate = useNavigate();
  const stored = JSON.parse(localStorage.getItem('user') || 'null');
  const [me, setMe] = useState(stored);
  const [unread, setUnread] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    let ignore = false;
    api
      .get('/users/me')
      .then((res) => {
        if (!ignore) setMe(res.data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

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

  const badge = (n) => n > 0 && <span className="nav-badge">{n > 9 ? '9+' : n}</span>;

  return (
    <>
      <header className="appbar">
        <Link to="/" className="brand" aria-label="Creators Hub home">
          <Logo size={30} />
        </Link>
        <div className="appbar-actions">
          <NavLink to="/challenge" className={cls} aria-label="Challenge" title="Challenge">
            <TrophyIcon />
          </NavLink>
          <NavLink to="/notifications" className={cls} aria-label="Notifications" title="Notifications">
            <BellIcon />
            {badge(unread)}
          </NavLink>
          <NavLink to="/settings" className={cls} aria-label="Settings" title="Settings">
            <SettingsIcon />
          </NavLink>
        </div>
      </header>

      <nav className="navbar" aria-label="Main">
        <Link to="/" className="brand nav-brand" aria-label="Creators Hub home">
          <Logo size={34} />
        </Link>

        <NavLink to="/" end className={cls} aria-label="Home" title="Home">
          <HomeIcon />
          <span className="nav-label">Home</span>
        </NavLink>

        <NavLink to="/search" className={cls} aria-label="Search" title="Search">
          <SearchIcon />
          <span className="nav-label">Search</span>
        </NavLink>

        <NavLink to="/reels" className={cls} aria-label="Reels" title="Reels">
          <ReelsIcon />
          <span className="nav-label">Reels</span>
        </NavLink>

        <NavLink to="/challenge" className={deskCls} aria-label="Challenge" title="Challenge">
          <TrophyIcon />
          <span className="nav-label">Challenge</span>
        </NavLink>

        <NavLink to="/messages" className={cls} aria-label="Messages" title="Messages">
          <MailIcon />
          <span className="nav-label">Messages</span>
          {badge(unreadMsgs)}
        </NavLink>

        <NavLink to="/notifications" className={deskCls} aria-label="Notifications" title="Notifications">
          <BellIcon />
          <span className="nav-label">Notifications</span>
          {badge(unread)}
        </NavLink>

        <NavLink
          to={'/u/' + (me?.username || '')}
          className={cls}
          aria-label="My profile"
          title="My profile"
        >
          <Avatar user={me} size="nav" />
          <span className="nav-label">Profile</span>
        </NavLink>

        <div className="nav-spacer" />

        <NavLink to="/settings" className={deskCls} aria-label="Settings" title="Settings">
          <SettingsIcon />
          <span className="nav-label">Settings</span>
        </NavLink>

        <button
          type="button"
          className="nav-item desk-only"
          onClick={logout}
          aria-label="Log out"
          title="Log out"
        >
          <LogoutIcon />
          <span className="nav-label">Log out</span>
        </button>
      </nav>
    </>
  );
}