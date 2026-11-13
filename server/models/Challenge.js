const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    endsAt: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    publicId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);