// Makes Cloudinary send the file as a download
export function downloadUrl(url) {
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
}

// Opens the phone share sheet, or copies the link on a laptop
export async function sharePost(postId, caption) {
  const link = window.location.origin + '/p/' + postId;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Creators Hub',
        text: caption || 'Check out this post',
        url: link,
      });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(link);
    return 'copied';
  } catch {
    return 'failed';
  }
}

// "3 days left", "5 hours left", "Ended"
export function timeLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Ended';

  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  if (days >= 1) return days + (days === 1 ? ' day left' : ' days left');

  const hours = Math.floor(mins / 60);
  if (hours >= 1) return hours + (hours === 1 ? ' hour left' : ' hours left');

  return Math.max(mins, 1) + ' min left';
}