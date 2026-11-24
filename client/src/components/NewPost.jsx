import { useEffect, useState } from 'react';
import api from '../api';
import { checkFile, MEDIA_HINT } from '../mediacheck';

export default function NewPost({ onCreated, challengeId }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const isVideo = file?.type.startsWith('video/');

  const pickFile = async (e) => {
    const f = e.target.files[0];
    setError('');
    if (!f) return;

    const problem = await checkFile(f);
    if (problem) {
      setFile(null);
      setPreview('');
      setInputKey((k) => k + 1);
      setError(problem);
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
      if (challengeId) data.append('challengeId', challengeId);
      await api.post('/posts', data);

      setFile(null);
      setPreview('');
      setCaption('');
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
          <span>{challengeId ? 'Your edited photo or video' : 'Photo or video'}</span>
          <input
            key={inputKey}
            type="file"
            accept="image/*,video/*"
            onChange={pickFile}
          />
          <small className="hint">{MEDIA_HINT}</small>
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
            placeholder={
              challengeId ? 'Tell people what you changed' : 'Say something about your work'
            }
            value={caption}
            maxLength={500}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy
            ? 'Uploading, please wait...'
            : challengeId
              ? 'Submit my entry'
              : 'Publish post'}
        </button>
      </form>
    </section>
  );
}