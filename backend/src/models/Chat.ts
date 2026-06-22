import mongoose, { Schema, Document } from 'mongoose';

export interface IMemberInfo {
  user: mongoose.Types.ObjectId;
  role: 'owner' | 'member';
  joinedAt: Date;
}

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'private' | 'group';
  participants: mongoose.Types.ObjectId[];
  groupName: string;
  groupAdmin?: mongoose.Types.ObjectId;
  groupDescription: string;
  groupAvatar: string;
  membersInfo: IMemberInfo[];
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  type: {
    type: String,
    enum: ['private', 'group'],
    required: true
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }],
  groupName: {
    type: String,
    default: ''
  },
  groupAdmin: {
    type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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

const Chat = mongoose.model<IChat>('Chat', chatSchema);
export default Chat;
