import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChunkDoc extends Document {
  driveFileId: string;
  fileName: string;
  webViewLink: string;
  branches: string[]; // Array of branches using this file (e.g. ['CSE-AIML', 'CSE', 'IT'])
  semester: number;
  subject: string;
  resourceType: string;
  chunkIndex: number;
  pageNumber?: number | null; // Null for page-less documents like DOCX
  text: string;
  contentHash?: string; // SHA-256 hash of extracted full text
  source: 'native' | 'ocr'; // 'native' for extracted text, 'ocr' for vision transcribed text
  embedModel?: string; // e.g. 'jina-embeddings-v3'
  embedding: number[];
  createdAt: Date;
}

const ChunkSchema = new Schema<IChunkDoc>(
  {
    driveFileId:  { type: String, required: true, index: true },
    fileName:     { type: String, required: true },
    webViewLink:  { type: String, required: true },
    branches:     { type: [String], required: true, default: [], index: true },
    semester:     { type: Number, required: true, index: true },
    subject:      { type: String, required: true, index: true },
    resourceType: { type: String, required: true },
    chunkIndex:   { type: Number, required: true },
    pageNumber:   { type: Number, required: false, default: null },
    text:         { type: String, required: true },
    contentHash:  { type: String, required: false, index: true },
    source:       { type: String, enum: ['native', 'ocr'], default: 'native', index: true },
    embedModel:   { type: String, required: false, default: 'jina-embeddings-v3', index: true },
    embedding:    { type: [Number], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'chunks' }
);

// Compound index for file + chunk order
ChunkSchema.index({ driveFileId: 1, chunkIndex: 1 }, { unique: true });
ChunkSchema.index({ branches: 1, semester: 1, subject: 1 });

const Chunk: Model<IChunkDoc> =
  mongoose.models.Chunk ??
  mongoose.model<IChunkDoc>('Chunk', ChunkSchema, 'chunks');

export default Chunk;
