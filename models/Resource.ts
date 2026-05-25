import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IResourceDoc extends Document {
  title: string;
  type: 'notes' | 'qbank' | 'pyq' | 'syllabus' | 'youtube';
  branch: string;
  semester: number;
  subject: string;
  url: string;
  fileType: 'pdf' | 'image' | 'docx' | 'youtube' | 'other';
  uploadedBy: string; // rollNumber
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  embedding?: number[];
  textContent?: string;
  createdAt: Date;
}

const ResourceSchema = new Schema<IResourceDoc>(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['notes', 'qbank', 'pyq', 'syllabus', 'youtube'],
    },
    branch: {
      type: String,
      required: true,
      enum: ['CSE', 'CSE-AIML', 'CSE-DS', 'IT'],
    },
    semester: { type: Number, required: true, min: 1, max: 8 },
    subject: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'image', 'docx', 'youtube', 'other'],
    },
    uploadedBy: { type: String, required: true }, // rollNumber
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    embedding: { type: [Number], select: false }, // Vector — excluded by default
    textContent: { type: String, select: false },  // Raw text for RAG
  },
  { timestamps: true, collection: 'resources' }
);

// Index for vector search (Atlas Search handles the actual knn index)
ResourceSchema.index({ branch: 1, semester: 1, subject: 1, type: 1 });
ResourceSchema.index({ status: 1 });

const Resource: Model<IResourceDoc> =
  mongoose.models.Resource ??
  mongoose.model<IResourceDoc>('Resource', ResourceSchema, 'resources');

export default Resource;
