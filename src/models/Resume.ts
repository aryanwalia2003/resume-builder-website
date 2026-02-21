import mongoose, { Schema, Document } from 'mongoose';

export interface IResume extends Document {
  user_id: string; // If you add auth later, this will be useful
  meta_code: string;
  title: string;
  data: any; // Using any for the JSON payload for flexibility, but we can type this strictly later
  current_version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema: Schema = new Schema(
  {
    user_id: { type: String, required: false, default: 'anonymous' }, // Optional for now
    meta_code: { type: String, required: true },
    title: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true }, // Store the JSON payload here
    current_version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);
