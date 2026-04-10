import mongoose, { Document, Schema } from "mongoose";

export interface IScreeningResult extends Document {
  candidateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  overallScore: number;
  dimensionScores: {
    skills: number;
    experience: number;
    education: number;
    culture: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: "strong_yes" | "yes" | "maybe" | "no";
  aiExplanation: string;
  rank?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScreeningResultSchema = new Schema<IScreeningResult>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    dimensionScores: {
      skills: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      culture: { type: Number, default: 0 },
    },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    gaps: { type: [String], default: [] },
    recommendation: {
      type: String,
      enum: ["strong_yes", "yes", "maybe", "no"],
      required: true,
    },
    aiExplanation: { type: String, required: true },
    rank: { type: Number },
  },
  { timestamps: true }
);

ScreeningResultSchema.index({ jobId: 1, overallScore: -1 });
ScreeningResultSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

export const ScreeningResult = mongoose.model<IScreeningResult>(
  "ScreeningResult",
  ScreeningResultSchema
);
