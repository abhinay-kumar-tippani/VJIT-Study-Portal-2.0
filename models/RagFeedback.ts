import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRagFeedbackDoc extends Document {
  queryLogId: Schema.Types.ObjectId | string;
  verdict: 'up' | 'down';
  optionalComment?: string;
  createdAt: Date;
}

const RagFeedbackSchema = new Schema<IRagFeedbackDoc>(
  {
    queryLogId:      { type: Schema.Types.ObjectId, ref: 'RagQuery', required: true, index: true },
    verdict:         { type: String, enum: ['up', 'down'], required: true, index: true },
    optionalComment: { type: String, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'rag_feedback' }
);

const RagFeedback: Model<IRagFeedbackDoc> =
  mongoose.models.RagFeedback ??
  mongoose.model<IRagFeedbackDoc>('RagFeedback', RagFeedbackSchema, 'rag_feedback');

export default RagFeedback;
