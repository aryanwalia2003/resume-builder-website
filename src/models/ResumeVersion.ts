import mongoose, { Schema, Document } from 'mongoose';

export interface IResumeVersion extends Document {
  resume_id: mongoose.Types.ObjectId;
  version_number: number;
  data: any;
  changed_sections: string[]; // e.g. ["basics", "work"] — tracks what was edited
  change_summary?: string;    // Optional human-readable description
  change_type: 'edit' | 'upload' | 'rollback'; // What triggered this version
  createdAt: Date;
}

const ResumeVersionSchema: Schema = new Schema(
  {
    resume_id: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
    version_number: { type: Number, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    changed_sections: { type: [String], default: [] },
    change_summary: { type: String },
    change_type: {
      type: String,
      enum: ['edit', 'upload', 'rollback'],
      default: 'edit',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index to ensure version uniqueness per resume
ResumeVersionSchema.index({ resume_id: 1, version_number: 1 }, { unique: true });

export default mongoose.models.ResumeVersion || mongoose.model<IResumeVersion>('ResumeVersion', ResumeVersionSchema);
