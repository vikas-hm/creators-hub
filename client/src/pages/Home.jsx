import { Navigate, useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

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
        <div className="empty">
          <p>Your feed is empty for now. The first posts will show up here.</p>
        </div>
      </main>
    </div>
  );
}