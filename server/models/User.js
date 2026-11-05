const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Password reset fields. select:false keeps them out of normal responses.
    resetOtp: { type: String, default: '', select: false },
    resetExpires: { type: Date, select: false },
    resetAttempts: { type: Number, default: 0, select: false },
    resetSentAt: { type: Date, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);