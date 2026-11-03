const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    endsAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);