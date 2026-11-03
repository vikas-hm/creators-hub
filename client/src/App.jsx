import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Reels from './pages/Reels';
import PostPage from './pages/Post';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/u/:username" element={<Profile />} />
      <Route path="/reels" element={<Reels />} />
      <Route path="/p/:id" element={<PostPage />} />
    </Routes>
  );
}