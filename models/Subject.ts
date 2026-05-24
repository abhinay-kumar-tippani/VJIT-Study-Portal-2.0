import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubjectDoc extends Document {
  name: string;
  code: string;
  branch: string;
  semester: number;
}

const SubjectSchema = new Schema<ISubjectDoc>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    branch: {
      type: String,
      required: true,
      enum: ['CSE', 'CSE-AIML', 'CSE-DS', 'IT'],
    },
    semester: { type: Number, required: true, min: 1, max: 8 },
  },
  { timestamps: true }
);

SubjectSchema.index({ branch: 1, semester: 1 });

const Subject: Model<ISubjectDoc> =
  mongoose.models.Subject ??
  mongoose.model<ISubjectDoc>('Subject', SubjectSchema);

export default Subject;
