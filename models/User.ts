import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDoc extends Document {
  rollNumber: string;
  name: string;
  passwordEncrypted: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
  lastActiveAt?: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    rollNumber:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    name:              { type: String, required: true, trim: true },
    passwordEncrypted: { type: String, required: true },
    isAdmin:           { type: Boolean, default: false },
    isSuperAdmin:      { type: Boolean, default: false },
    lastActiveAt:      { type: Date },
  },
  { timestamps: true }
);

const User: Model<IUserDoc> =
  mongoose.models.User ?? mongoose.model<IUserDoc>('User', UserSchema);

export default User;
