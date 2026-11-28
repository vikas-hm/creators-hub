import { useEffect } from 'react';
import { ReplyIcon, PencilIcon, TrashIcon, CopyIcon } from './Icons';

export const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function MessageMenu({
  message,
  mine,
  myReaction,
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onUnsend,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Message options"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" />

        <div className="emoji-row">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={'emoji-btn' + (myReaction === emoji ? ' on' : '')}
              onClick={() => onReact(emoji)}
              aria-label={'React with ' + emoji}
              aria-pressed={myReaction === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="menu-list">
          <button type="button" onClick={onReply}>
            <ReplyIcon />
            Reply
          </button>

          {message.text && (
            <button type="button" onClick={onCopy}>
              <CopyIcon />
              Copy
            </button>
          )}

          {mine && message.canEdit && (
            <button type="button" onClick={onEdit}>
              <PencilIcon />
              Edit
            </button>
          )}

          {mine && (
            <button type="button" className="danger" onClick={onUnsend}>
              <TrashIcon />
              Unsend
            </button>
          )}
        </div>
      </div>
    </div>
  );
}