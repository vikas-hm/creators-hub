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