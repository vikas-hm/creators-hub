import { useEffect, useState } from 'react';
import api from '../api';

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) =>
  d.getFullYear() +
  '-' + pad(d.getMonth() + 1) +
  '-' + pad(d.getDate()) +
  'T' + pad(d.getHours()) +
  ':' + pad(d.getMinutes());

export default function NewChallenge({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endsAt, setEndsAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  );
  const [minDate] = useState(() => toLocalInput(new Date()));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const isVideo = file?.type.startsWith('video/');

  const pickFile = (e) => {
    const f = e.target.files[0];
    setError('');
    if (!f) return;

    const video = f.type.startsWith('video/');
    const image = f.type.startsWith('image/');

    if (!video && !image) {
      setError('Choose a photo or a video');
      return;
    }
    if (image && f.size > MAX_IMAGE) {
      setError('Photos can be up to 10 MB');
      return;
    }
    if (video && f.size > MAX_VIDEO) {
      setError('Videos can be up to 50 MB. Try a shorter clip.');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const removeFile = () => {
    setFile(null);
    setPreview('');
    setInputKey((k) => k + 1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = new FormData();
      data.append('title', title);
      data.append('description', description);
      // Convert your local time to a standard time the server understands
      data.append('endsAt', new Date(endsAt).toISOString());
      if (file) data.append('media', file);

      const res = await api.post('/challenges', data);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the challenge');
      setBusy(false);
    }
  };

  return (
    <section className="composer">
      <h3 className="composer-title">Start a challenge</h3>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input
            placeholder="Best cinematic color grade"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>What should people do?</span>
          <textarea
            placeholder="Example: Color grade this photo in your own style. Warm, cold, or moody. Tell us what you used."
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Photo or video to edit (optional)</span>
          <input
            key={inputKey}
            type="file"
            accept="image/*,video/*"
            onChange={pickFile}
          />
        </label>

        {preview && (
          <div className="preview-wrap">
            {isVideo ? (
              <video className="preview" src={preview} controls playsInline muted />
            ) : (
              <img className="preview" src={preview} alt="Preview of the file to edit" />
            )}
            <button type="button" className="btn-remove" onClick={removeFile}>
              Remove
            </button>
          </div>
        )}

        <label className="field">
          <span>Ends on</span>
          <input
            type="datetime-local"
            value={endsAt}
            min={minDate}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating, please wait...' : 'Start challenge'}
        </button>
      </form>
    </section>
  );
}