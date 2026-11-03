import { useEffect, useState } from 'react';
import api from '../api';

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

export default function NewPost({ onCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [challenge, setChallenge] = useState(null);
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    let ignore = false;
    api
      .get('/challenges/current')
      .then((res) => {
        if (!ignore && res.data.challenge && res.data.active) {
          setChallenge(res.data.challenge);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

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
    setError('');
    setInputKey((k) => k + 1);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a photo or a video first');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const data = new FormData();
      data.append('media', file);
      data.append('caption', caption);
      if (enter && challenge) data.append('challengeId', challenge._id);
      await api.post('/posts', data);

      setFile(null);
      setPreview('');
      setCaption('');
      setEnter(false);
      setInputKey((k) => k + 1);
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
          <span>Photo or video</span>
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
              <img className="preview" src={preview} alt="Preview of your post" />
            )}
            <button type="button" className="btn-remove" onClick={removeFile}>
              Remove
            </button>
          </div>
        )}

        <label className="field">
          <span>Caption</span>
          <input
            placeholder="Say something about your work"
            value={caption}
            maxLength={500}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>

        {challenge && (
          <label className="check">
            <input
              type="checkbox"
              checked={enter}
              onChange={(e) => setEnter(e.target.checked)}
            />
            <span>
              Enter this week's challenge: <strong>{challenge.title}</strong>
            </span>
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Uploading, please wait...' : 'Publish post'}
        </button>
      </form>
    </section>
  );
}