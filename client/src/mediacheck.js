export const MAX_IMAGE = 10 * 1024 * 1024;
export const MAX_VIDEO = 100 * 1024 * 1024;
export const MEDIA_HINT = 'Photos up to 10 MB. Videos up to 1080p and 100 MB.';

const MAX_SHORT_SIDE = 1080;
const MAX_LONG_SIDE = 2560;

// Reads the width and height of a video without uploading it
function readVideoSize(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let finished = false;

    const finish = (size) => {
      if (finished) return;
      finished = true;
      URL.revokeObjectURL(url);
      resolve(size);
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => finish({ w: video.videoWidth, h: video.videoHeight });
    video.onerror = () => finish(null);
    setTimeout(() => finish(null), 5000);
    video.src = url;
  });
}

// Returns '' when the file is fine, or a message that explains the problem
export async function checkFile(file) {
  const video = file.type.startsWith('video/');
  const image = file.type.startsWith('image/');

  if (!video && !image) return 'Choose a photo or a video';
  if (image && file.size > MAX_IMAGE) return 'Photos can be up to 10 MB';
  if (video && file.size > MAX_VIDEO) {
    return 'Videos can be up to 100 MB. Trim the clip or export it with a lower bitrate.';
  }

  if (video) {
    const size = await readVideoSize(file);
    if (
      size &&
      (Math.min(size.w, size.h) > MAX_SHORT_SIDE || Math.max(size.w, size.h) > MAX_LONG_SIDE)
    ) {
      return (
        'This video is ' + size.w + 'x' + size.h +
        ', which is higher than 1080p. Export it at 1080p or lower.'
      );
    }
  }

  return '';
}