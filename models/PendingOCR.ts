import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPendingOCRDoc extends Document {
  driveFileId: string;
  fileName: string;
  subject: string;
  pageNumber: number;
  status: 'pending' | 'done' | 'failed';
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
}

const PendingOCRSchema = new Schema<IPendingOCRDoc>(
  {
    driveFileId:   { type: String, required: true, index: true },
    fileName:      { type: String, required: true },
    subject:       { type: String, required: true, index: true },
    pageNumber:    { type: Number, required: true },
    status:        { type: String, enum: ['pending', 'done', 'failed'], default: 'pending', index: true },
    failureReason: { type: String, required: false },
    processedAt:   { type: Date, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'pending_ocr' }
);

PendingOCRSchema.index({ driveFileId: 1, pageNumber: 1 }, { unique: true });

const PendingOCR: Model<IPendingOCRDoc> =
  mongoose.models.PendingOCR ??
  mongoose.model<IPendingOCRDoc>('PendingOCR', PendingOCRSchema, 'pending_ocr');

export default PendingOCR;
