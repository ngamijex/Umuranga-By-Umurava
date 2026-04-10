import mongoose, { Document, Schema } from "mongoose";

export interface IJob extends Document {
  title: string;
  department: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears: number;
  educationLevel: string;
  weights: {
    skills: number;
    experience: number;
    education: number;
    culture: number;
  };
  status: "active" | "closed" | "draft";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    experienceYears: { type: Number, required: true, min: 0 },
    educationLevel: { type: String, required: true },
    weights: {
      skills: { type: Number, default: 40, min: 0, max: 100 },
      experience: { type: Number, default: 30, min: 0, max: 100 },
      education: { type: Number, default: 20, min: 0, max: 100 },
      culture: { type: Number, default: 10, min: 0, max: 100 },
    },
    status: {
      type: String,
      enum: ["active", "closed", "draft"],
      default: "draft",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Job = mongoose.model<IJob>("Job", JobSchema);
