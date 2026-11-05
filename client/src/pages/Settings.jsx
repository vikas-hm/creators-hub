import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';
import Topbar from '../components/Topbar';
import Avatar from '../components/Avatar';

const MAX_PHOTO = 5 * 1024 * 1024;
const empty = { text: '', error: false };

export default function Settings() {
  const token = localStorage.getItem('token');
  const fileRef = useRef(null);

  const [me, setMe] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState(empty);
  const [profileMsg, setProfileMsg] = useState(empty);
  const [pwMsg, setPwMsg] = useState(empty);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    api
      .get('/users/me')
      .then((res) => {
        if (ignore) return;
        setMe(res.data);
        setName(res.data.name);
        setBio(res.data.bio || '');
      })
      .catch((err) => console.log(err));

    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" />;

  const pickPhoto = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoMsg({ text: 'Choose a photo', error: true });
      return;
    }
    if (file.size > MAX_PHOTO) {
      setPhotoMsg({ text: 'Photo can be up to 5 MB', error: true });
      return;
    }

    setPhotoBusy(true);
    setPhotoMsg(empty);
    try {
      const data = new FormData();
      data.append('avatar', file);
      await api.post('/users/me/avatar', data);

      // Read the profile again so we show exactly what the database saved
      const fresh = await api.get('/users/me');
      setMe(fresh.data);

      if (fresh.data.avatar) {
        setPhotoMsg({ text: 'Profile photo updated', error: false });
      } else {
        setPhotoMsg({
          text: 'The server did not save the photo. Check the server terminal.',
          error: true,
        });
      }
    } catch (err) {
      setPhotoMsg({
        text: err.response?.data?.message || 'Could not upload the photo',
        error: true,
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setPhotoBusy(true);
    setPhotoMsg(empty);
    try {
      await api.delete('/users/me/avatar');
      setMe((m) => ({ ...m, avatar: '' }));
      setPhotoMsg({ text: 'Profile photo removed', error: false });
    } catch (err) {
      setPhotoMsg({
        text: err.response?.data?.message || 'Could not remove the photo',
        error: true,
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(empty);
    try {
      const res = await api.put('/users/me', { name, bio });
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: res.data.name }));
      setMe(res.data);
      setProfileMsg({ text: 'Profile saved', error: false });
    } catch (err) {
      setProfileMsg({
        text: err.response?.data?.message || 'Could not save your profile',
        error: true,
      });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(empty);
    if (next !== confirm) {
      setPwMsg({ text: 'The two new passwords do not match', error: true });
      return;
    }
    try {
      await api.post('/users/me/password', { currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setPwMsg({ text: 'Password changed', error: false });
    } catch (err) {
      setPwMsg({
        text: err.response?.data?.message || 'Could not change the password',
        error: true,
      });
    }
  };

  return (
    <div>
      <Topbar />
      <main className="home-main">
        <h2>Settings</h2>

        {!me && <p className="sub">Loading...</p>}

        {me && (
          <>
            <section className="composer settings-card">
              <h3>Profile photo</h3>
              <div className="photo-row">
                <Avatar user={me} size="big" />
                <div className="photo-actions">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={pickPhoto}
                  />
                  <button
                    type="button"
                    className="btn follow"
                    onClick={() => fileRef.current.click()}
                    disabled={photoBusy}
                  >
                    {photoBusy ? 'Please wait...' : 'Change photo'}
                  </button>
                  {me.avatar && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={removePhoto}
                      disabled={photoBusy}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
              {photoMsg.text && (
                <p className={photoMsg.error ? 'error' : 'success'} role="status">
                  {photoMsg.text}
                </p>
              )}
            </section>

            <section className="composer settings-card">
              <h3>Profile details</h3>
              <form className="form" onSubmit={saveProfile}>
                <label className="field">
                  <span>Name</span>
                  <input
                    value={name}
                    maxLength={50}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Bio</span>
                  <input
                    placeholder="Tell people what you edit or shoot"
                    value={bio}
                    maxLength={150}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </label>
                <p className="muted-line">
                  Username: @{me.username}. Email: {me.email}. These cannot be changed here.
                </p>
                {profileMsg.text && (
                  <p className={profileMsg.error ? 'error' : 'success'} role="status">
                    {profileMsg.text}
                  </p>
                )}
                <button className="btn" type="submit">Save profile</button>
              </form>
            </section>

            <section className="composer settings-card">
              <h3>Change password</h3>
              <form className="form" onSubmit={changePassword}>
                <label className="field">
                  <span>Current password</span>
                  <input
                    type="password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </label>
                {pwMsg.text && (
                  <p className={pwMsg.error ? 'error' : 'success'} role="status">
                    {pwMsg.text}
                  </p>
                )}
                <button className="btn" type="submit">Change password</button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}