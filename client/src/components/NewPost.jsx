import { useState } from 'react';
import api from '../api';

export default function NewPost({ onCreated }) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/posts', { imageUrl, caption });
      setImageUrl('');
      setCaption('');
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not publish your post');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="composer">
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Image link</span>
          <input
            placeholder="https://picsum.photos/id/10/600/400"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Caption</span>
          <input
            placeholder="Say something about your work"
            value={caption}
            maxLength={500}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Publishing...' : 'Publish post'}
        </button>
      </form>
    </section>
  );
}