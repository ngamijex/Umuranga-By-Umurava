import mongoose, { Document, Schema } from "mongoose";

export interface ISkill {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience: number;
}

export interface ILanguage {
  name: string;
  proficiency: "Basic" | "Conversational" | "Fluent" | "Native";
}

export interface IWorkExperience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  technologies: string[];
  isCurrent: boolean;
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number;
}

export interface ICertification {
  name: string;
  issuer: string;
  issueDate: string;
}

export interface IProject {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link?: string;
  startDate: string;
  endDate: string;
}

export interface IAvailability {
  status: "Available" | "Open to Opportunities" | "Not Available";
  type: "Full-time" | "Part-time" | "Contract";
  startDate?: string;
}

export interface ISocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ICandidate extends Document {
  jobId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: ISkill[];
  languages?: ILanguage[];
  experience: IWorkExperience[];
  education: IEducation[];
  certifications?: ICertification[];
  projects: IProject[];
  availability: IAvailability;
  socialLinks?: ISocialLinks;
  resumeText?: string;
  status: "pending" | "screened" | "shortlisted" | "rejected";
  /** Set when the candidate did not make the shortlist at this pipeline stage (0-based index). */
  rejectedAtStageIndex?: number;
  /** Pipeline stage name at rejection (denormalized for display). */
  rejectedAtStageName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema = new Schema<ISkill>({ name: { type: String, required: true }, level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"], default: "Intermediate" }, yearsOfExperience: { type: Number, default: 0, min: 0 } }, { _id: false });
const LanguageSchema = new Schema<ILanguage>({ name: { type: String, required: true }, proficiency: { type: String, enum: ["Basic", "Conversational", "Fluent", "Native"], default: "Conversational" } }, { _id: false });
const WorkExpSchema = new Schema<IWorkExperience>({ company: { type: String, default: "" }, role: { type: String, default: "" }, startDate: { type: String, default: "" }, endDate: { type: String, default: "" }, description: { type: String, default: "" }, technologies: { type: [String], default: [] }, isCurrent: { type: Boolean, default: false } }, { _id: false });
const EducationSchema = new Schema<IEducation>({ institution: { type: String, default: "" }, degree: { type: String, default: "" }, fieldOfStudy: { type: String, default: "" }, startYear: { type: Number, default: 0 }, endYear: { type: Number, default: 0 } }, { _id: false });
const CertSchema = new Schema<ICertification>({ name: { type: String, required: true }, issuer: { type: String, default: "" }, issueDate: { type: String, default: "" } }, { _id: false });
const ProjectSchema = new Schema<IProject>({ name: { type: String, required: true }, description: { type: String, default: "" }, technologies: { type: [String], default: [] }, role: { type: String, default: "" }, link: { type: String }, startDate: { type: String, default: "" }, endDate: { type: String, default: "" } }, { _id: false });

const CandidateSchema = new Schema<ICandidate>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    headline:  { type: String, required: true, trim: true },
    bio:       { type: String },
    location:  { type: String, required: true, trim: true, default: "" },
    skills:    { type: [SkillSchema], default: [] },
    languages: { type: [LanguageSchema], default: [] },
    experience:    { type: [WorkExpSchema], default: [] },
    education:     { type: [EducationSchema], default: [] },
    certifications:{ type: [CertSchema], default: [] },
    projects:      { type: [ProjectSchema], default: [] },
    availability: {
      status: { type: String, enum: ["Available", "Open to Opportunities", "Not Available"], default: "Available" },
      type:   { type: String, enum: ["Full-time", "Part-time", "Contract"], default: "Full-time" },
      startDate: { type: String },
    },
    socialLinks: {
      linkedin:  { type: String },
      github:    { type: String },
      portfolio: { type: String },
    },
    resumeText: { type: String },
    status: { type: String, enum: ["pending", "screened", "shortlisted", "rejected"], default: "pending" },
    rejectedAtStageIndex: { type: Number, min: 0 },
    rejectedAtStageName: { type: String, trim: true },
  },
  { timestamps: true }
);

CandidateSchema.index({ jobId: 1, email: 1 }, { unique: true });
CandidateSchema.index({ jobId: 1, status: 1 }); // fast bulk-status queries
CandidateSchema.index({ _id: 1, jobId: 1 }); // fast per-candidate updates during screening

export const Candidate = mongoose.model<ICandidate>("Candidate", CandidateSchema);
