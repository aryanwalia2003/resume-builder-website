import mongoose, { Schema, Document } from 'mongoose';

export interface IUpload extends Document {
  generation_id: mongoose.Types.ObjectId;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  drive_link?: string;
  error_log?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UploadSchema: Schema = new Schema(
  {
    generation_id: { type: Schema.Types.ObjectId, ref: 'Generation', required: true, unique: true },
    status: {
      type: String,
      enum: ['PENDING', 'UPLOADING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      required: true,
    },
    drive_link: { type: String },
    error_log: { type: String },
  },
  { timestamps: true }
);

// Index for finding pending jobs
UploadSchema.index({ status: 1 });

export default mongoose.models.Upload || mongoose.model<IUpload>('Upload', UploadSchema);
