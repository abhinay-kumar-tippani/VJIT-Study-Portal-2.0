import mongoose, { Schema, Document, Model } from 'mongoose';
import { COMMUNITY_CONFIG } from '@/lib/community';

export interface IReplyRef {
  messageId: string;
  authorName: string;
  snippet: string;
}

export interface IMessageDoc extends Document {
  authorId: string;       // rollNumber
  authorName: string;
  authorRole: 'student' | 'admin';
  text: string;
  channel: string;
  replyTo?: IReplyRef;
  createdAt: Date;
  updatedAt: Date;
}

const ReplyRefSchema = new Schema(
  {
    messageId:  { type: String, required: true },
    authorName: { type: String, required: true },
    snippet:    { type: String, required: true, maxlength: 120 },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessageDoc>(
  {
    authorId:   { type: String, required: true, trim: true, uppercase: true },
    authorName: { type: String, required: true, trim: true },
    authorRole: { type: String, required: true, enum: ['student', 'admin'] },
    text:       { type: String, required: true, trim: true, maxlength: 2000 },
    channel:    { type: String, required: true, default: COMMUNITY_CONFIG.DEFAULT_CHANNEL, index: true },
    replyTo:    { type: ReplyRefSchema, default: undefined },
  },
  { timestamps: true, collection: COMMUNITY_CONFIG.COLLECTION }
);

// For the main feed query: channel + createdAt sorted
MessageSchema.index({ channel: 1, createdAt: -1 });

const Message: Model<IMessageDoc> =
  mongoose.models.Message ??
  mongoose.model<IMessageDoc>('Message', MessageSchema, COMMUNITY_CONFIG.COLLECTION);

export default Message;
