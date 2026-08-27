import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRagQueryDoc extends Document {
  query: string;
  userBranch?: string;
  semester?: number;
  searchAllToggle?: boolean;
  mode: string;
  chunksReturned: number;
  topScore: number;
  scores: number[];
  grounded: boolean;
  sourceMix: {
    native: number;
    ocr: number;
  };
  latencyMs: number;
  fellBack: boolean;
  answeredAt: Date;
  sessionId: string; // Random UUID per session — NO student roll numbers or email address PII!
}

const RagQuerySchema = new Schema<IRagQueryDoc>(
  {
    query:           { type: String, required: true, index: true },
    userBranch:      { type: String, required: false },
    semester:        { type: Number, required: false },
    searchAllToggle: { type: Boolean, required: false, default: false },
    mode:            { type: String, required: true, index: true },
    chunksReturned:  { type: Number, required: true },
    topScore:        { type: Number, required: true },
    scores:          { type: [Number], required: true, default: [] },
    grounded:        { type: Boolean, required: true, index: true },
    sourceMix: {
      native:        { type: Number, required: true, default: 0 },
      ocr:           { type: Number, required: true, default: 0 },
    },
    latencyMs:       { type: Number, required: true },
    fellBack:        { type: Boolean, required: true, default: false, index: true },
    answeredAt:      { type: Date, required: true, default: Date.now, index: true },
    sessionId:       { type: String, required: true, index: true },
  },
  { timestamps: false, collection: 'rag_queries' }
);

RagQuerySchema.index({ answeredAt: -1, grounded: 1 });

const RagQuery: Model<IRagQueryDoc> =
  mongoose.models.RagQuery ??
  mongoose.model<IRagQueryDoc>('RagQuery', RagQuerySchema, 'rag_queries');

export default RagQuery;
