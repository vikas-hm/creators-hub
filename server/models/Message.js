const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 1000 },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    reactions: [reactionSchema],
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    unsent: { type: Boolean, default: false },
    // Users who deleted this message from their own chat view
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);