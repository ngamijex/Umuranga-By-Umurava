import mongoose, { Document, Schema } from "mongoose";

export interface IPracticalSubmission extends Document {
  jobId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  /** Index of the pipeline stage with type `practical` */
  pipelineStageIndex: number;
  answers: string;
  submittedAt: Date;
  /** 0–100 after AI grading */
  score?: number;
  feedback?: string;
  /** 1 = best after cross-candidate comparison */
  compareRank?: number;
  comparisonSummary?: string;
}

const practicalSubmissionSchema = new Schema<IPracticalSubmission>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    pipelineStageIndex: { type: Number, required: true },
    answers: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    score: { type: Number, min: 0, max: 100 },
    feedback: { type: String, default: "" },
    compareRank: { type: Number, min: 1 },
    comparisonSummary: { type: String, default: "" },
  },
  { timestamps: true }
);

practicalSubmissionSchema.index({ jobId: 1, candidateId: 1, pipelineStageIndex: 1 }, { unique: true });

export const PracticalSubmission = mongoose.model<IPracticalSubmission>("PracticalSubmission", practicalSubmissionSchema);
