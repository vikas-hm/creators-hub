import { Link, useNavigate } from 'react-router-dom';

export default function Topbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

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
        <button className="btn-ghost" onClick={logout}>Log out</button>
      </nav>
    </header>
  );
}