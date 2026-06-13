import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyActivityDoc extends Document {
  date: Date;
  studentRollNo: string;
  name: string;
  createdAt: Date;
}

const DailyActivitySchema = new Schema<IDailyActivityDoc>(
  {
    date: { type: Date, required: true },
    studentRollNo: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index to guarantee uniqueness of user activity logs per day
DailyActivitySchema.index({ date: 1, studentRollNo: 1 }, { unique: true });

// TTL index to automatically purge logs older than 7 days (604800 seconds)
DailyActivitySchema.index({ date: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const DailyActivity: Model<IDailyActivityDoc> =
  mongoose.models.DailyActivity ?? mongoose.model<IDailyActivityDoc>('DailyActivity', DailyActivitySchema);

export default DailyActivity;
