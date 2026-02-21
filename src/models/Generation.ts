import mongoose, { Schema, Document } from 'mongoose';

export interface IGeneration extends Document {
  resume_id: mongoose.Types.ObjectId;
  version_number: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  output_filename: string;       // e.g. "JohnDoe_SWE_2602_v4"
  resume_data: any;              // Full snapshot of resume JSON at generation time
  meta_code: string;             // Denormalized for engine convenience
  drive_link?: string;
  pdf_path?: string;             // Local/container path to generated PDF
  error_log?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GenerationSchema: Schema = new Schema(
  {
    resume_id: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
    version_number: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      required: true,
    },
    output_filename: { type: String, required: true },
    resume_data: { type: Schema.Types.Mixed, required: true },
    meta_code: { type: String, required: true },
    drive_link: { type: String },
    pdf_path: { type: String },
    error_log: { type: String },
  },
  { timestamps: true }
);

// Index for the engine to poll for PENDING jobs
GenerationSchema.index({ status: 1, createdAt: 1 });

export default mongoose.models.Generation || mongoose.model<IGeneration>('Generation', GenerationSchema);
