import { useState } from 'react';

export default function Avatar({ user, size = '' }) {
  const [failedUrl, setFailedUrl] = useState('');
  const name = user?.name || '?';
  const cls = 'avatar' + (size ? ' ' + size : '');

  if (user?.avatar && user.avatar !== failedUrl) {
    return (
      <img
        className={cls + ' photo'}
        src={user.avatar}
        alt=""
        onError={() => setFailedUrl(user.avatar)}
      />
    );
  }

  return (
    <div className={cls} aria-hidden="true">
      {name[0]}
    </div>
  );
}