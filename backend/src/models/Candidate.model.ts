import mongoose, { Document, Schema } from "mongoose";

export interface ICandidate extends Document {
  name: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  resumeText?: string;
  profileData: {
    skills: string[];
    experienceYears: number;
    educationLevel: string;
    currentRole?: string;
    location?: string;
  };
  jobId: mongoose.Types.ObjectId;
  status: "pending" | "screened" | "shortlisted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    linkedinUrl: { type: String },
    resumeUrl: { type: String },
    resumeText: { type: String },
    profileData: {
      skills: { type: [String], default: [] },
      experienceYears: { type: Number, default: 0, min: 0 },
      educationLevel: { type: String, default: "" },
      currentRole: { type: String },
      location: { type: String },
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "screened", "shortlisted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

CandidateSchema.index({ jobId: 1, email: 1 }, { unique: true });

export const Candidate = mongoose.model<ICandidate>("Candidate", CandidateSchema);
