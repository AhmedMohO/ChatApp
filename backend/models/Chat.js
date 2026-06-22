import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  groupName: {
    type: String,
    default: ''
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groupDescription: {
    type: String,
    default: ''
  },
  groupAvatar: {
    type: String,
    default: ''
  },
  membersInfo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
