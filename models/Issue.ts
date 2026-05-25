import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIssueDoc extends Document {
  reportId: string;
  studentRollNo: string;
  studentName: string;
  branch: string;
  semester: string;
  issueType: string;
  subject?: string;
  description: string;
  screenshotUrl?: string;
  status: 'pending' | 'resolved';
  createdAt: Date;
  resolvedAt: Date | null;
}

const IssueSchema = new Schema<IIssueDoc>(
  {
    reportId: {
      type: String,
      unique: true,
      default: () => 'REP-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    },
    studentRollNo: { type: String, required: true, uppercase: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    branch: { type: String, required: true },
    semester: { type: String, required: true },
    issueType: {
      type: String,
      required: true,
      enum: [
        'Missing Study Material',
        'Broken PDF/File',
        'AI Assistant Not Working',
        'Wrong Subject/Semester',
        'Login/Signup Problem',
        'YouTube Link Not Working',
        'Other',
      ],
    },
    subject: { type: String, default: '' },
    description: { type: String, required: true, trim: true },
    screenshotUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes
IssueSchema.index({ studentRollNo: 1 });
IssueSchema.index({ status: 1 });

const Issue: Model<IIssueDoc> =
  mongoose.models.Issue ?? mongoose.model<IIssueDoc>('Issue', IssueSchema);

export default Issue;
