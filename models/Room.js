const mongoose = require('mongoose')

const RoomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  pin: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'public',
    enum: ['public', 'private']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Room', RoomSchema)