import mongoose, { Schema, Document } from 'mongoose';

export interface IContributionFile extends Document {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

const ContributionFileSchema = new Schema<IContributionFile>({
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ContributionFile ||
  mongoose.model<IContributionFile>('ContributionFile', ContributionFileSchema);
