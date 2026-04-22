import mongoose, { Document, Schema } from "mongoose";

export interface IInterviewTurn {
  speaker: "ai" | "candidate";
  text: string;
  timestamp: Date;
}

export interface IInterviewScore {
  confidence: number;      // 0-100
  communication: number;   // 0-100
  accuracy: number;        // 0-100
  attitude: number;        // 0-100
  overall: number;         // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface IInterviewSession extends Document {
  jobId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  pipelineStageIndex: number;
  inviteToken: string;
  status: "pending" | "in_progress" | "completed" | "expired";
  windowStart: Date;
  windowEnd: Date;
  startedAt?: Date;
  completedAt?: Date;
  transcript: IInterviewTurn[];
  recordingStoredName?: string;
  score?: IInterviewScore;
  /** AI-generated questions prepared before the interview */
  interviewQuestions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const turnSchema = new Schema<IInterviewTurn>(
  {
    speaker: { type: String, enum: ["ai", "candidate"], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const scoreSchema = new Schema<IInterviewScore>(
  {
    confidence: Number,
    communication: Number,
    accuracy: Number,
    attitude: Number,
    overall: Number,
    feedback: String,
    strengths: [String],
    improvements: [String],
  },
  { _id: false }
);

const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    pipelineStageIndex: { type: Number, required: true },
    inviteToken: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "expired"],
      default: "pending",
    },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    startedAt: Date,
    completedAt: Date,
    transcript: { type: [turnSchema], default: [] },
    recordingStoredName: String,
    score: { type: scoreSchema, default: undefined },
    interviewQuestions: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const InterviewSession = mongoose.model<IInterviewSession>(
  "InterviewSession",
  InterviewSessionSchema
);
