import mongoose, { Document, Schema } from "mongoose";
import type { IPracticalAssessmentDefinition, IAssessmentResource, IAssessmentSection } from "./assessmentDefinition";
export type { IPracticalAssessmentDefinition } from "./assessmentDefinition";

export interface IHrInputs {
  targetCount: number;
  preferences: string;
  criteria: string;
  notes: string;
}

/** HR-configured content for emails and external steps (practical test link, interview URL, etc.). */
export interface IApplicantComms {
  /** e.g. HackerRank, Google Form, internal app, or Umuranga /assessment page */
  assessmentUrl: string;
  /** e.g. "Multiple choice + 2 open questions + small repo" */
  assessmentFormat: string;
  /** ISO datetime string — submit answers before this time */
  submissionDeadlineAt: string;
  /** Zoom / Daily / Meet link for human or AI-assisted interview */
  interviewUrl: string;
  interviewDurationMins: number;
  /** Shown in AI-drafted emails (deadlines, what to prepare) */
  extraInstructions: string;
}

export interface IStageEmailLog {
  candidateId: mongoose.Types.ObjectId;
  kind: "advance" | "regret";
  sentAt: Date;
  subject: string;
  to: string;
}

export interface IPipelineStage {
  _id?: any;
  name: string;
  description: string;
  type: "cv_screen" | "deep_review" | "practical" | "ai_interview" | "final";
  status: "pending" | "running" | "done";
  hrInputs: IHrInputs;
  candidateIds: mongoose.Types.ObjectId[];
  shortlistedIds: mongoose.Types.ObjectId[];
  ranAt?: Date;
  applicantComms?: IApplicantComms;
  emailLog?: IStageEmailLog[];
  /** Practical stage: in-app form/project definition for candidates */
  assessmentDefinition?: IPracticalAssessmentDefinition;
  /** Live progress during a run — { screened: number, total: number } */
  screeningProgress?: { screened: number; total: number };
}

export interface IPipeline extends Document {
  jobId: mongoose.Types.ObjectId;
  currentStageIndex: number;
  stages: IPipelineStage[];
  finalConclusion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hrInputsSchema = new Schema<IHrInputs>(
  {
    targetCount: { type: Number, default: 0 },
    preferences: { type: String, default: "" },
    criteria: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const applicantCommsSchema = new Schema<IApplicantComms>(
  {
    assessmentUrl: { type: String, default: "" },
    assessmentFormat: { type: String, default: "" },
    submissionDeadlineAt: { type: String, default: "" },
    interviewUrl: { type: String, default: "" },
    interviewDurationMins: { type: Number, default: 30 },
    extraInstructions: { type: String, default: "" },
  },
  { _id: false }
);

const stageEmailLogSchema = new Schema<IStageEmailLog>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    kind: { type: String, enum: ["advance", "regret"], required: true },
    sentAt: { type: Date, default: Date.now },
    subject: { type: String, default: "" },
    to: { type: String, default: "" },
  },
  { _id: false }
);

const assessmentQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    inputType: { type: String, enum: ["text", "textarea", "file", "multiple_choice"], required: true },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const assessmentSectionSchema = new Schema<IAssessmentSection>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    questions: { type: [assessmentQuestionSchema], default: [] },
  },
  { _id: false }
);

const assessmentResourceSchema = new Schema<IAssessmentResource>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, default: "" },
    sizeBytes: { type: Number, default: 0 },
  },
  { _id: false }
);

const assessmentDefinitionSchema = new Schema<IPracticalAssessmentDefinition>(
  {
    mode: { type: String, enum: ["form", "project", "both"], default: "form" },
    title: { type: String, default: "" },
    questions: { type: [assessmentQuestionSchema], default: [] },
    sections: { type: [assessmentSectionSchema], default: [] },
    projectInstructions: { type: String, default: "" },
    maxFiles: { type: Number, default: 5 },
    maxFileMb: { type: Number, default: 10 },
    resources: { type: [assessmentResourceSchema], default: [] },
  },
  { _id: false }
);

const stageSchema = new Schema<IPipelineStage>({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  type: {
    type: String,
    enum: ["cv_screen", "deep_review", "practical", "ai_interview", "final"],
    required: true,
  },
  status: { type: String, enum: ["pending", "running", "done"], default: "pending" },
  hrInputs: { type: hrInputsSchema, default: () => ({ targetCount: 0, preferences: "", criteria: "", notes: "" }) },
  candidateIds: [{ type: Schema.Types.ObjectId, ref: "Candidate" }],
  shortlistedIds: [{ type: Schema.Types.ObjectId, ref: "Candidate" }],
  ranAt: { type: Date },
  applicantComms: { type: applicantCommsSchema, default: () => ({}) },
  emailLog: { type: [stageEmailLogSchema], default: [] },
  assessmentDefinition: { type: assessmentDefinitionSchema, default: undefined },
  screeningProgress: {
    type: new Schema({ screened: { type: Number, default: 0 }, total: { type: Number, default: 0 } }, { _id: false }),
    default: undefined,
  },
});

export const DEFAULT_STAGES: Omit<IPipelineStage, "_id">[] = [
  {
    name: "Initial CV Screen",
    description: "AI screens all candidates based on CVs, skills, and profiles against job requirements.",
    type: "cv_screen",
    status: "pending",
    hrInputs: { targetCount: 0, preferences: "", criteria: "", notes: "" },
    candidateIds: [],
    shortlistedIds: [],
  },
  {
    name: "Deep Profile Review",
    description: "In-depth AI analysis of shortlisted candidates — culture fit, project quality, and experience depth.",
    type: "deep_review",
    status: "pending",
    hrInputs: { targetCount: 0, preferences: "", criteria: "", notes: "" },
    candidateIds: [],
    shortlistedIds: [],
  },
  {
    name: "Practical Assessment",
    description: "AI evaluates candidates' practical abilities and technical competency for the role.",
    type: "practical",
    status: "pending",
    hrInputs: { targetCount: 0, preferences: "", criteria: "", notes: "" },
    candidateIds: [],
    shortlistedIds: [],
  },
  {
    name: "AI Interview",
    description: "AI conducts a structured competency-based interview evaluation of each candidate.",
    type: "ai_interview",
    status: "pending",
    hrInputs: { targetCount: 0, preferences: "", criteria: "", notes: "" },
    candidateIds: [],
    shortlistedIds: [],
  },
  {
    name: "Final Selection",
    description: "HR reviews finalists and makes the ultimate hiring decision.",
    type: "final",
    status: "pending",
    hrInputs: { targetCount: 0, preferences: "", criteria: "", notes: "" },
    candidateIds: [],
    shortlistedIds: [],
  },
];

const pipelineSchema = new Schema<IPipeline>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
    currentStageIndex: { type: Number, default: 0 },
    stages: { type: [stageSchema], default: () => DEFAULT_STAGES.map(s => ({ ...s })) },
    finalConclusion: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Pipeline = mongoose.model<IPipeline>("Pipeline", pipelineSchema);
