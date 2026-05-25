import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationDoc extends Document {
  notificationId: string;
  studentRollNo: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedReportId: string;
}

const NotificationSchema = new Schema<INotificationDoc>(
  {
    notificationId: {
      type: String,
      unique: true,
      default: () => 'NOTIF-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    },
    studentRollNo: { type: String, required: true, uppercase: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    relatedReportId: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
NotificationSchema.index({ studentRollNo: 1 });
NotificationSchema.index({ isRead: 1 });

const Notification: Model<INotificationDoc> =
  mongoose.models.Notification ?? mongoose.model<INotificationDoc>('Notification', NotificationSchema);

export default Notification;
