const fs = require('fs');
const os = require('os');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const MAX_IMAGE = 10 * 1024 * 1024; // Cloudinary Free plan limit for photos
const MAX_VIDEO = 100 * 1024 * 1024; // Cloudinary Free plan limit for videos
const MAX_SHORT_SIDE = 1080; // "1080p" means the shorter side is at most 1080 pixels
const MAX_LONG_SIDE = 2560;

class UploadError extends Error {}

// Files are saved to a temporary file, not kept in memory
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) =>
      cb(null, 'upload-' + Date.now() + '-' + Math.round(Math.random() * 1e9)),
  }),
  limits: { fileSize: MAX_VIDEO },
});

const handleUpload = (req, res, next) => {
  upload.single('media')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too big. Photos can be up to 10 MB and videos up to 100 MB.'
          : 'Upload error';
      return res.status(400).json({ message });
    }

    // Always delete the temporary file when the request is finished
    res.on('close', () => {
      if (req.file) fs.unlink(req.file.path, () => {});
    });

    next();
  });
};

// Works with both styles of Cloudinary callbacks
const finish = (resolve, reject) => (err, result) => {
  if (err) return reject(err);
  if (result && result.error) {
    return reject(new Error(result.error.message || 'Cloudinary error'));
  }
  resolve(result);
};

function uploadPhoto(file, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, finish(resolve, reject));
    fs.createReadStream(file.path).on('error', reject).pipe(stream);
  });
}

function uploadVideo(file, options) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, chunk_size: 6000000 };
    const uploader = cloudinary.uploader;

    if (typeof uploader.upload_large === 'function') {
      uploader.upload_large(file.path, opts, finish(resolve, reject));
    } else if (typeof uploader.upload_chunked_stream === 'function') {
      const stream = uploader.upload_chunked_stream(opts, finish(resolve, reject));
      fs.createReadStream(file.path).on('error', reject).pipe(stream);
    } else {
      reject(new Error('This Cloudinary version cannot upload large videos'));
    }
  });
}

// Checks the file, uploads it, and returns { url, type, publicId }
async function saveMedia(file, folder = 'creators-hub') {
  if (!file) throw new UploadError('Choose a photo or a video');

  const isVideo = file.mimetype.startsWith('video/');
  const isImage = file.mimetype.startsWith('image/');

  if (!isVideo && !isImage) throw new UploadError('Only photos and videos are allowed');
  if (isImage && file.size > MAX_IMAGE) throw new UploadError('Photos can be up to 10 MB');

  const options = {
    folder,
    resource_type: isVideo ? 'video' : 'image',
    timeout: 600000,
  };

  const result = isVideo ? await uploadVideo(file, options) : await uploadPhoto(file, options);

  if (isVideo) {
    const w = result.width || 0;
    const h = result.height || 0;

    if (Math.min(w, h) > MAX_SHORT_SIDE || Math.max(w, h) > MAX_LONG_SIDE) {
      try {
        await cloudinary.uploader.destroy(result.public_id, { resource_type: 'video' });
      } catch (err) {
        console.log('Could not remove the oversized video:', err.message);
      }
      throw new UploadError(
        'This video is ' + w + 'x' + h + ', which is higher than 1080p. Export it at 1080p or lower.'
      );
    }
  }

  return {
    url: result.secure_url,
    type: isVideo ? 'video' : 'image',
    publicId: result.public_id,
  };
}

// Turns any error into a status and a message the person can understand
function uploadErrorMessage(err) {
  if (err instanceof UploadError) return { status: 400, message: err.message };

  const text = String((err && err.message) || err || '');

  if (/timeout/i.test(text)) {
    return {
      status: 500,
      message: 'The upload took too long. Try a shorter video, or export it with a lower bitrate.',
    };
  }
  if (/file size too large|maximum is/i.test(text)) {
    const limit = text.match(/maximum is (\d+)/i);
    const mb = limit ? Math.floor(Number(limit[1]) / (1024 * 1024)) : null;
    return {
      status: 400,
      message: mb
        ? 'The file is too large. Your storage allows up to ' + mb + ' MB per file.'
        : 'The file is too large. Use a shorter video.',
    };
  }
  if (/invalid (video|image|file)|unsupported|not a valid/i.test(text)) {
    return { status: 400, message: 'This file format is not supported. Export it as an MP4.' };
  }
  return { status: 500, message: 'Upload failed. Try again.' };
}

module.exports = { handleUpload, saveMedia, UploadError, uploadErrorMessage };