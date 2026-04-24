"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import api, { publicApiBaseUrl } from "@/lib/api";
import {
  LayoutDashboard, Briefcase, Zap, LogOut, User, Plus,
  Loader2, Upload, BarChart2, FileText, Check, X, ArrowRight,
  Trash2, Pencil, ChevronDown, FileSpreadsheet, ClipboardPaste, Archive, Users, PlayCircle, Layers, CheckCircle, AlertCircle, Lock, Info, Sparkles, Eye, Mail, RotateCcw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, ResponsiveContainer, Legend } from "recharts";
import {
  useReactTable, getCoreRowModel, getPaginationRowModel, getExpandedRowModel, getFilteredRowModel, flexRender,
  type ColumnDef, type PaginationState, type ExpandedState, type ColumnFiltersState,
} from "@tanstack/react-table";

/* ── Types ─────────────────────────────────────────────── */
interface AuthUser { id: string; name: string; email: string; role: string; }
interface Job { _id: string; title: string; department: string; description?: string; status: string; requiredSkills: string[]; preferredSkills?: string[]; experienceYears: number; educationLevel?: string; createdAt: string; practicalAssessmentTemplate?: IPracticalAssessmentDefinition; }
interface CSkill { name: string; level: string; yearsOfExperience: number; }
interface CLanguage { name: string; proficiency: string; }
interface CExperience { company: string; role: string; startDate: string; endDate: string; description: string; technologies: string[]; isCurrent: boolean; }
interface CEducation { institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear: number; }
interface CCertification { name: string; issuer: string; issueDate: string; }
interface CProject { name: string; description: string; technologies: string[]; role: string; link?: string; startDate: string; endDate: string; }
interface CAvailability { status: string; type: string; startDate?: string; }
interface CSocialLinks { linkedin?: string; github?: string; portfolio?: string; }
interface Candidate {
  _id: string; jobId: string; status: string;
  firstName: string; lastName: string; email: string; headline: string; bio?: string; location: string;
  skills: CSkill[]; languages?: CLanguage[]; experience: CExperience[]; education: CEducation[];
  certifications?: CCertification[]; projects: CProject[]; availability: CAvailability; socialLinks?: CSocialLinks;
  resumeText?: string;
  /** Pipeline step where they were not shortlisted (rejected at that step). */
  rejectedAtStageIndex?: number;
  rejectedAtStageName?: string;
}
interface JobReqComparisonRow {
  aspect: string;
  whatJobNeeds: string;
  whatCandidateOffers: string;
  fitLevel: "strong" | "partial" | "weak" | "missing" | string;
  detail: string;
}
interface HrInputsAssessment {
  howPreferencesApply: string;
  howCriteriaApply: string;
  howNotesApply: string;
  overallAlignment: string;
}
interface ScreeningResult {
  _id: string;
  overallScore: number;
  rank: number;
  recommendation: string;
  dimensionScores: { skills: number; experience: number; education: number; culture: number };
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  aiExplanation: string;
  candidateId: Candidate | string;
  jobRequirementComparisons?: JobReqComparisonRow[];
  hrInputsAssessment?: HrInputsAssessment;
}
type Tab = "overview" | "jobs" | "hire";

/* ── Pipeline Types ─────────────────────────────────────── */
interface IHrInputs { targetCount: number; preferences: string; criteria: string; notes: string; }
interface IApplicantComms {
  assessmentUrl?: string;
  assessmentFormat?: string;
  submissionDeadlineAt?: string;
  interviewUrl?: string;
  interviewDurationMins?: number;
  extraInstructions?: string;
}
interface IStageEmailLog {
  candidateId: string;
  kind: "advance" | "regret";
  sentAt: string;
  subject: string;
  to: string;
}
interface ApplicantEmailDraft {
  candidateId: string;
  kind: "advance" | "regret";
  to: string;
  subject: string;
  body: string;
}
interface IAssessmentQuestion { id: string; label: string; inputType: "text" | "textarea" | "file" | "multiple_choice"; options?: string[]; }
interface IAssessmentSection { title: string; description?: string; questions: IAssessmentQuestion[]; }
interface IAssessmentResource { id: string; name: string; storedName: string; mimeType: string; sizeBytes: number; }
interface IPracticalAssessmentDefinition {
  mode: "form" | "project";
  title: string;
  questions: IAssessmentQuestion[];
  sections?: IAssessmentSection[];
  projectInstructions?: string;
  maxFiles?: number;
  maxFileMb?: number;
  resources?: IAssessmentResource[];
}
interface IPipelineStage {
  _id?: string;
  name: string;
  description: string;
  type: "cv_screen" | "deep_review" | "practical" | "ai_interview" | "final";
  status: "pending" | "running" | "done";
  hrInputs: IHrInputs;
  candidateIds: string[];
  shortlistedIds: string[];
  ranAt?: string;
  applicantComms?: IApplicantComms;
  emailLog?: IStageEmailLog[];
  assessmentDefinition?: IPracticalAssessmentDefinition;
}
interface IPipeline { _id: string; jobId: string; currentStageIndex: number; stages: IPipelineStage[]; createdAt: string; updatedAt: string; }

/* ── Helpers ────────────────────────────────────────────── */
const scoreColor = (s: number) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
const recBadge = (r: string) => ({ strong_yes: { label: "Strong Yes", bg: "#dcfce7", color: "#16a34a" }, yes: { label: "Yes", bg: "#dbeafe", color: "#1d4ed8" }, maybe: { label: "Maybe", bg: "#fef9c3", color: "#a16207" }, no: { label: "No", bg: "#fee2e2", color: "#dc2626" } }[r] ?? { label: r, bg: "#f3f4f6", color: "#374151" });

const fitLevelStyle = (f: string) => {
  const x = (f || "").toLowerCase();
  if (x === "strong") return { bg: "#dcfce7", color: "#15803d", label: "Strong match" };
  if (x === "partial") return { bg: "#fef9c3", color: "#a16207", label: "Partial" };
  if (x === "weak") return { bg: "#ffedd5", color: "#c2410c", label: "Weak" };
  if (x === "missing") return { bg: "#fee2e2", color: "#b91c1c", label: "Missing" };
  return { bg: "#f1f5f9", color: "#475569", label: f || "—" };
};

function AiJudgmentModal({
  result,
  candidate,
  job,
  onClose,
}: {
  result: ScreeningResult | null;
  candidate: Candidate | null;
  job: Job | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const badge = recBadge(result.recommendation);
  const comps = result.jobRequirementComparisons || [];
  const hr = result.hrInputsAssessment;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-judgment-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          maxWidth: "720px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "12px", minWidth: 0 }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #dbeafe, #eff6ff)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles style={{ width: "22px", height: "22px", color: "#2b72f0" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="ai-judgment-title" style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                AI judgment — {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate"}
              </h2>
              {job && <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>{job.title} · {job.department}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: scoreColor(result.overallScore) }}>Score {result.overallScore}/100</span>
                <span style={{ padding: "2px 10px", borderRadius: "12px", background: badge.bg, color: badge.color, fontSize: "0.72rem", fontWeight: 700 }}>{badge.label}</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ padding: "8px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer", color: "#64748b", flexShrink: 0 }}>
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1, fontSize: "0.82rem", color: "#334155", lineHeight: 1.65 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>SUMMARY</p>
          <p style={{ margin: "0 0 20px", whiteSpace: "pre-wrap" }}>{result.aiExplanation}</p>

          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 10px" }}>DIMENSION SCORES</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "22px" }}>
            {(["skills", "experience", "education", "culture"] as const).map(dim => (
              <div key={dim} style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px 12px", border: "1px solid #f1f5f9" }}>
                <p style={{ margin: "0 0 4px", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "capitalize" }}>{dim}</p>
                <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: scoreColor(result.dimensionScores[dim]) }}>{result.dimensionScores[dim]}</p>
              </div>
            ))}
          </div>

          {comps.length > 0 && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 10px" }}>JOB REQUIREMENTS VS CANDIDATE</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "22px" }}>
                {comps.map((row, i) => {
                  const fl = fitLevelStyle(row.fitLevel);
                  return (
                    <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", background: "#fafafa" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{row.aspect || "Requirement"}</span>
                        <span style={{ padding: "2px 8px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 700, background: fl.bg, color: fl.color }}>{fl.label}</span>
                      </div>
                      <p style={{ margin: "0 0 6px", fontSize: "0.78rem" }}><span style={{ color: "#64748b", fontWeight: 600 }}>Job needs: </span>{row.whatJobNeeds}</p>
                      <p style={{ margin: "0 0 6px", fontSize: "0.78rem" }}><span style={{ color: "#64748b", fontWeight: 600 }}>Candidate: </span>{row.whatCandidateOffers}</p>
                      {row.detail && <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569" }}>{row.detail}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {hr && (hr.howPreferencesApply || hr.howCriteriaApply || hr.howNotesApply || hr.overallAlignment) && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 10px" }}>HR INPUTS ALIGNMENT</p>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
                {hr.howPreferencesApply && <p style={{ margin: "0 0 12px" }}><strong style={{ color: "#166534" }}>Preferences — </strong>{hr.howPreferencesApply}</p>}
                {hr.howCriteriaApply && <p style={{ margin: "0 0 12px" }}><strong style={{ color: "#166534" }}>Criteria — </strong>{hr.howCriteriaApply}</p>}
                {hr.howNotesApply && <p style={{ margin: "0 0 12px" }}><strong style={{ color: "#166534" }}>Notes — </strong>{hr.howNotesApply}</p>}
                {hr.overallAlignment && <p style={{ margin: 0 }}><strong style={{ color: "#166534" }}>Overall — </strong>{hr.overallAlignment}</p>}
              </div>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "12px" }}>
            <div>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>STRENGTHS</p>
              <ul style={{ margin: 0, paddingLeft: "18px" }}>{(result.strengths || []).map((s, i) => <li key={i} style={{ marginBottom: "4px" }}>{s}</li>)}</ul>
            </div>
            <div>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>GAPS</p>
              <ul style={{ margin: 0, paddingLeft: "18px" }}>{(result.gaps || []).map((s, i) => <li key={i} style={{ marginBottom: "4px" }}>{s}</li>)}</ul>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>MATCHED SKILLS</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{(result.matchedSkills || []).map(s => <span key={s} style={{ padding: "2px 8px", borderRadius: "8px", background: "#dcfce7", color: "#15803d", fontSize: "0.72rem", fontWeight: 600 }}>{s}</span>)}</div>
            </div>
            <div>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>MISSING SKILLS</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{(result.missingSkills || []).map(s => <span key={s} style={{ padding: "2px 8px", borderRadius: "8px", background: "#fee2e2", color: "#b91c1c", fontSize: "0.72rem", fontWeight: 600 }}>{s}</span>)}</div>
            </div>
          </div>

          {comps.length === 0 && !hr?.overallAlignment && (
            <p style={{ margin: "16px 0 0", fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic" }}>
              Re-run AI screening to generate detailed job-vs-candidate and HR alignment (newer screenings include structured comparisons).
            </p>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ width: "100%", padding: "10px 16px", borderRadius: "10px", border: "none", background: "#2b72f0", color: "#fff", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicantDetailModal({
  candidate,
  job,
  onClose,
}: {
  candidate: Candidate | null;
  job: Job | null;
  onClose: () => void;
}) {
  if (!candidate) return null;
  const ac = candidate.availability?.status === "Available"
    ? { bg: "#dcfce7", color: "#16a34a" }
    : candidate.availability?.status === "Open to Opportunities"
      ? { bg: "#fef9c3", color: "#b45309" }
      : { bg: "#fee2e2", color: "#dc2626" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="applicant-detail-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          maxWidth: "760px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "12px", minWidth: 0 }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #e0e7ff, #eef2ff)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User style={{ width: "22px", height: "22px", color: "#2b72f0" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="applicant-detail-title" style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                {candidate.firstName} {candidate.lastName}
              </h2>
              <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "#64748b", wordBreak: "break-all" }}>{candidate.email}</p>
              {job && <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>Applied to · {job.title} · {job.department}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px", alignItems: "center" }}>
                <span style={{ padding: "2px 10px", borderRadius: "12px", background: ac.bg, color: ac.color, fontSize: "0.72rem", fontWeight: 600 }}>
                  {candidate.availability?.status || "—"} · {candidate.availability?.type || "—"}
                </span>
                {candidate.status && (
                  <span style={{ padding: "2px 10px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }}>
                    {candidate.status}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ padding: "8px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer", color: "#64748b", flexShrink: 0 }}>
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {candidate.status === "rejected" && (
          <div style={{ padding: "12px 22px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: "0.78rem", color: "#991b1b", lineHeight: 1.55 }}>
            <strong>Not shortlisted</strong>
            {candidate.rejectedAtStageName
              ? ` at “${candidate.rejectedAtStageName}”.`
              : typeof candidate.rejectedAtStageIndex === "number"
                ? ` at screening step ${candidate.rejectedAtStageIndex + 1}.`
                : " in the pipeline."}
            {typeof candidate.rejectedAtStageIndex === "number" && candidate.rejectedAtStageIndex > 0 && (
              <span style={{ display: "block", marginTop: "6px", fontSize: "0.72rem", color: "#64748b" }}>
                They had already passed earlier screening steps before being not shortlisted at this step.
              </span>
            )}
          </div>
        )}

        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1, fontSize: "0.82rem", color: "#334155", lineHeight: 1.65 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 6px" }}>HEADLINE</p>
          <p style={{ margin: "0 0 18px", fontWeight: 600, color: "#0f172a" }}>{candidate.headline || "—"}</p>

          {candidate.bio?.trim() && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 6px" }}>BIO</p>
              <p style={{ margin: "0 0 18px", whiteSpace: "pre-wrap" }}>{candidate.bio}</p>
            </>
          )}

          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 6px" }}>LOCATION</p>
          <p style={{ margin: "0 0 18px" }}>{candidate.location || "—"}</p>

          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>SKILLS</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
            {(candidate.skills || []).length ? (candidate.skills || []).map(s => (
              <span key={s.name} style={{ padding: "4px 10px", borderRadius: "10px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.72rem", fontWeight: 600 }}>
                {s.name} · {s.level} · {s.yearsOfExperience}yr
              </span>
            )) : <span style={{ color: "#94a3b8" }}>—</span>}
          </div>

          {(candidate.languages || []).length > 0 && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>LANGUAGES</p>
              <p style={{ margin: "0 0 18px" }}>{(candidate.languages || []).map(l => `${l.name} (${l.proficiency})`).join(" · ")}</p>
            </>
          )}

          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>EXPERIENCE</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
            {(candidate.experience || []).length ? (candidate.experience || []).map((e, i) => (
              <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", background: "#fafafa" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#0f172a" }}>{e.role} · {e.company}</p>
                <p style={{ margin: "0 0 6px", fontSize: "0.75rem", color: "#64748b" }}>{e.startDate} – {e.isCurrent ? "Present" : e.endDate}</p>
                {e.description && <p style={{ margin: "0 0 6px", fontSize: "0.78rem" }}>{e.description}</p>}
                {(e.technologies || []).length > 0 && (
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "#475569" }}>Tech: {(e.technologies || []).join(", ")}</p>
                )}
              </div>
            )) : <span style={{ color: "#94a3b8" }}>—</span>}
          </div>

          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>EDUCATION</p>
          <div style={{ marginBottom: "18px" }}>
            {(candidate.education || []).length ? (candidate.education || []).map((e, i) => (
              <p key={i} style={{ margin: "0 0 8px" }}>
                <strong>{e.degree}</strong> in {e.fieldOfStudy} — {e.institution} ({e.startYear}–{e.endYear})
              </p>
            )) : <span style={{ color: "#94a3b8" }}>—</span>}
          </div>

          {(candidate.certifications || []).length > 0 && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>CERTIFICATIONS</p>
              <ul style={{ margin: "0 0 18px", paddingLeft: "18px" }}>
                {(candidate.certifications || []).map((c, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>{c.name} — {c.issuer} {c.issueDate ? `(${c.issueDate})` : ""}</li>
                ))}
              </ul>
            </>
          )}

          {(candidate.projects || []).length > 0 && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>PROJECTS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                {(candidate.projects || []).map((p, i) => (
                  <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px" }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{p.name}</p>
                    <p style={{ margin: 0, fontSize: "0.78rem" }}>{p.description}</p>
                    {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "#2b72f0" }}>{p.link}</a>}
                  </div>
                ))}
              </div>
            </>
          )}

          {(candidate.socialLinks?.linkedin || candidate.socialLinks?.github || candidate.socialLinks?.portfolio) && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px" }}>LINKS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "18px", fontSize: "0.78rem" }}>
                {candidate.socialLinks?.linkedin && <span>LinkedIn: {candidate.socialLinks.linkedin}</span>}
                {candidate.socialLinks?.github && <span>GitHub: {candidate.socialLinks.github}</span>}
                {candidate.socialLinks?.portfolio && <span>Portfolio: {candidate.socialLinks.portfolio}</span>}
              </div>
            </>
          )}

          {candidate.resumeText?.trim() && (
            <>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText style={{ width: "14px", height: "14px" }} /> RESUME / CV TEXT
              </p>
              <pre style={{ margin: 0, padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.75rem", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "240px", overflow: "auto", fontFamily: "inherit", color: "#475569" }}>
                {candidate.resumeText}
              </pre>
            </>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ width: "100%", padding: "10px 16px", borderRadius: "10px", border: "none", background: "#2b72f0", color: "#fff", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Auth Gate ──────────────────────────────────────────── */
const SLIDES = [
  { img: "/l.png", title: "Find Top Talent, Faster", desc: "Scan hundreds of candidates in seconds with Gemini AI and surface your best matches instantly." },
  { img: "/b.png", title: "All Your Candidates, Organised", desc: "Upload resumes, build profiles, and manage your entire hiring pipeline in one place." },
  { img: "/l1.png", title: "AI Screens So You Don't Have To", desc: "Deep semantic analysis of skills, experience, and culture fit — explained in plain language." },
];

const AUTH_FOCUS_STYLE = { borderColor: "#2b72f0" };
const AUTH_BLUR_STYLE  = { borderColor: "#e5e7eb" };

function AuthField({ type, k, ph, form, setForm }: {
  type: string; k: "name" | "email" | "password"; ph: string;
  form: { name: string; email: string; password: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; password: string }>>;
}) {
  return (
    <input type={type} placeholder={ph} value={form[k]} required
      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      onFocus={e => Object.assign(e.target.style, AUTH_FOCUS_STYLE)}
      onBlur={e => Object.assign(e.target.style, AUTH_BLUR_STYLE)}
      style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #93c5fd", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" as const, background: "#f9fafb", color: "#0f172a", transition: "border-color 0.2s" }} />
  );
}

function AuthGate({ onAuth }: { onAuth: (u: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const goSlide = (i: number) => setSlide(i);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const { data } = await api.post(`/auth/${mode}`, form);
      localStorage.setItem("umuranga_token", data.token);
      onAuth(data.user);
    } catch (ex: any) { setErr(ex.response?.data?.error || "Something went wrong"); }
    finally { setLoading(false); }
  };


  return (
    <div style={{ height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", padding: "0 16px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideRight{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* ── CARD ─────────────────────────────────────────── */}
      <div style={{ display: "flex", width: "100%", maxWidth: "880px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>

        {/* ── LEFT PANEL ──────────────────────────────────── */}
        <div style={{ width: "55%", background: "#2b72f0", display: "flex", flexDirection: "column", padding: "14px 32px 20px" }}>
          {/* Logo */}
          <div style={{ textAlign: "center" }}>
            <Image src="/logo.svg" alt="Umuranga" width={150} height={40} style={{ filter: "brightness(0) invert(1)", display: "block", margin: "0 auto" }} />
          </div>

          {/* Image — centered in remaining space */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <div key={slide} style={{ animation: "slideRight 0.4s ease", position: "relative", width: "240px", height: "200px" }}>
              <Image src={SLIDES[slide].img} alt={SLIDES[slide].title} fill style={{ objectFit: "contain" }} />
            </div>
          </div>

          {/* Text + Dots — pinned to bottom */}
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 4px", lineHeight: 1.3 }}>{SLIDES[slide].title}</h2>
            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.75rem", lineHeight: 1.55, maxWidth: "220px", margin: "0 auto 10px" }}>{SLIDES[slide].desc}</p>
            <div style={{ display: "flex", gap: "7px", alignItems: "center", justifyContent: "center" }}>
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => goSlide(i)} style={{ width: i === slide ? "24px" : "7px", height: "7px", borderRadius: "4px", background: i === slide ? "#fff" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", transition: "all 0.25s", padding: 0 }} />
              ))}
            </div>
          </div>

          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", textAlign: "center", marginTop: "10px" }}>By Umurava</p>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────── */}
        <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "28px 30px" }}>

          {/* Heading */}
          <div style={{ marginBottom: "14px" }}>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px", lineHeight: 1.2 }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>
              {mode === "login" ? "Sign in to your Hiring Playground" : "Start screening candidates with AI"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {mode === "register" && <AuthField type="text" k="name" ph="Full name" form={form} setForm={setForm} />}
            <AuthField type="email" k="email" ph="Email address" form={form} setForm={setForm} />
            <AuthField type="password" k="password" ph={mode === "register" ? "Password (min 8 chars)" : "Password"} form={form} setForm={setForm} />

            {err && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca" }}>
                <X style={{ width: "13px", height: "13px", color: "#dc2626", flexShrink: 0 }} />
                <span style={{ color: "#dc2626", fontSize: "0.8rem" }}>{err}</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ marginTop: "2px", padding: "11px", borderRadius: "10px", background: loading ? "#93c5fd" : "#2b72f0", color: "#fff", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {loading && <Loader2 style={{ width: "15px", height: "15px", animation: "spin 0.8s linear infinite" }} />}
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create Account"}
            </button>
          </form>

          {/* Toggle */}
          <p style={{ textAlign: "center", marginTop: "10px", color: "#9ca3af", fontSize: "0.82rem" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(m => m === "login" ? "register" : "login"); setErr(""); }}
              style={{ color: "#2b72f0", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <p style={{ textAlign: "center", marginTop: "12px", color: "#0f172a", fontSize: "0.7rem" }}>
            © {new Date().getFullYear()} Umuranga
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar ────────────────────────────────────────────── */
const NAV = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard, color: "#fbbf24" },
  { id: "jobs",     label: "Jobs",     Icon: Briefcase,      color: "#34d399" },
  { id: "hire",     label: "Hire",     Icon: Zap,            color: "#c084fc" },
] as const;
function Sidebar({ tab, setTab, user, onLogout }: { tab: Tab; setTab: (t: Tab) => void; user: AuthUser; onLogout: () => void }) {
  return (
    <aside style={{ width: "240px", background: "#2b72f0", display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "26px 22px 20px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <Image src="/logo.svg" alt="Umuranga" width={150} height={40} style={{ filter: "brightness(0) invert(1)" }} />
      </div>
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "3px" }}>
        {NAV.map(({ id, label, Icon, color }) => (
          <button key={id} onClick={() => setTab(id as Tab)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "10px", border: "none", cursor: "pointer", textAlign: "left", width: "100%", background: tab === id ? "#fff" : "transparent", color: tab === id ? "#2b72f0" : "rgba(255,255,255,0.9)", fontSize: "0.875rem", fontWeight: tab === id ? 700 : 500, transition: "all 0.15s" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: tab === id ? color + "18" : "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon style={{ width: "16px", height: "16px", color: tab === id ? color : color }} />
            </div>
            {label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.12)" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User style={{ width: "16px", height: "16px", color: "#2b72f0" }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.68rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
          </div>
          <button onClick={onLogout} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: "2px" }}><LogOut style={{ width: "15px", height: "15px" }} /></button>
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.62rem", textAlign: "center", marginTop: "10px" }}>© {new Date().getFullYear()} Umuranga. All rights reserved.</p>
      </div>
    </aside>
  );
}

/* ── Overview Tab ───────────────────────────────────────── */
function OverviewTab({ jobs, user }: { jobs: Job[]; user: AuthUser }) {
  const stats = [
    { label: "Total Jobs", value: jobs.length, color: "#2b72f0", Icon: Briefcase },
    { label: "Active", value: jobs.filter(j => j.status === "active").length, color: "#16a34a", Icon: BarChart2 },
    { label: "Drafts", value: jobs.filter(j => j.status === "draft").length, color: "#d97706", Icon: FileText },
    { label: "Closed", value: jobs.filter(j => j.status === "closed").length, color: "#64748b", Icon: Check },
  ];
  return (
    <div style={{ padding: "32px 36px", maxWidth: "1040px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>Welcome back, {user.name.split(" ")[0]}</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Here is your hiring activity at a glance.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "16px", marginBottom: "32px" }}>
        {stats.map(({ label, value, color, Icon }) => (
          <div key={label} style={{ background: color, borderRadius: "20px", padding: "16px 20px", boxShadow: `0 4px 14px ${color}55` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon style={{ width: "17px", height: "17px", color: "#fff" }} /></div>
            </div>
            <p style={{ fontSize: "1.9rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "4px", height: "20px", borderRadius: "2px", background: "#2b72f0" }} />
            <h2 style={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>Recent Jobs</h2>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>{jobs.length} total</span>
        </div>
        {jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}><Briefcase strokeWidth={1} style={{ width: "40px", height: "40px", margin: "0 auto 12px", color: "#34d399" }} /><p style={{ fontWeight: 500 }}>No jobs yet. Go to the Jobs tab to create one.</p></div>
        ) : jobs.slice(0, 7).map(j => (
          <div key={j._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #bfdbfe", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: j.status === "active" ? "#22c55e" : j.status === "draft" ? "#f59e0b" : "#94a3b8", flexShrink: 0 }} />
              <div><p style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.875rem" }}>{j.title}</p><p style={{ color: "#64748b", fontSize: "0.75rem" }}>{j.department}</p></div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 600, background: j.status === "active" ? "#dcfce7" : j.status === "draft" ? "#fef9c3" : "#f1f5f9", color: j.status === "active" ? "#16a34a" : j.status === "draft" ? "#a16207" : "#64748b" }}>{j.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Jobs Tab ───────────────────────────────────────────── */
const jBlank = { title: "", department: "", description: "", requiredSkills: "", preferredSkills: "", experienceYears: 0, educationLevel: "Bachelor's", status: "draft" };
const jSc = (s: string) => s === "active" ? { bg: "#dcfce7", color: "#16a34a", bar: "#22c55e" } : s === "draft" ? { bg: "#fef9c3", color: "#a16207", bar: "#f59e0b" } : { bg: "#f1f5f9", color: "#64748b", bar: "#94a3b8" };
const jInSt: React.CSSProperties = { padding: "10px 12px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.875rem", outline: "none", background: "#fff", color: "#0f172a", width: "100%", boxSizing: "border-box" };
const jSelSt: React.CSSProperties = { padding: "10px 12px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.875rem", outline: "none", background: "#fff", color: "#0f172a", width: "100%" };
const jLbl = (t: string, req?: boolean) => <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t}{req && <span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span>}</label>;

function JobsTab({ jobs, onCreated, onUpdated, onDeleted }: { jobs: Job[]; onCreated: (j: Job) => void; onUpdated: (j: Job) => void; onDeleted: (id: string) => void }) {
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [form, setForm] = useState({ ...jBlank });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const [practicalBuilderJobId, setPracticalBuilderJobId] = useState<string | null>(null);
  const [practicalFormMode, setPracticalFormMode] = useState<"form" | "project" | "both">("form");
  const [practicalFormTitle, setPracticalFormTitle] = useState("");
  const [practicalFormSections, setPracticalFormSections] = useState<IAssessmentSection[]>([]);
  const [practicalFormQuestions, setPracticalFormQuestions] = useState<IAssessmentQuestion[]>([]);
  const [practicalFormInstructions, setPracticalFormInstructions] = useState("");
  const [practicalFormResources, setPracticalFormResources] = useState<IAssessmentResource[]>([]);
  const [practicalSaving, setPracticalSaving] = useState(false);
  const [practicalAiGenerating, setPracticalAiGenerating] = useState(false);
  const [practicalAiHint, setPracticalAiHint] = useState("");
  const [resourceUploading, setResourceUploading] = useState(false);
  const [resourceError, setResourceError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    const payload = { ...form, requiredSkills: form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean), preferredSkills: form.preferredSkills.split(",").map(s => s.trim()).filter(Boolean) };
    try {
      if (mode === "create") { const { data } = await api.post("/jobs", payload); onCreated(data.data); }
      else if (editJob) { const { data } = await api.put(`/jobs/${editJob._id}`, payload); onUpdated(data.data); }
      setMode(null); setEditJob(null); setForm({ ...jBlank });
    } catch (e: any) { setErr(e.response?.data?.error || "Error saving job"); } finally { setSaving(false); }
  };

  const deleteJob = async (id: string) => {
    try { await api.delete(`/jobs/${id}`); onDeleted(id); setDelConfirm(null); } catch {}
  };

  const setStatus = async (j: Job, st: string) => {
    try { const { data } = await api.put(`/jobs/${j._id}`, { status: st }); onUpdated(data.data); } catch {}
  };

  const openPracticalBuilder = (j: Job) => {
    const tpl = j.practicalAssessmentTemplate;
    setPracticalFormMode((tpl?.mode as "form" | "project" | "both") || "form");
    setPracticalFormTitle(tpl?.title || "");
    setPracticalFormSections(tpl?.sections ? JSON.parse(JSON.stringify(tpl.sections)) : []);
    setPracticalFormQuestions(tpl?.questions ? [...tpl.questions] : []);
    setPracticalFormInstructions(tpl?.projectInstructions || "");
    setPracticalFormResources(tpl?.resources ? [...tpl.resources] : []);
    setPracticalBuilderJobId(j._id);
  };

  const generateAiAssessment = async (jobId: string, genTarget: "form" | "project") => {
    setPracticalAiGenerating(true);
    try {
      const { data } = await api.post(`/jobs/${jobId}/generate-assessment`, {
        mode: genTarget,
        hint: practicalAiHint.trim(),
      });
      const def: IPracticalAssessmentDefinition = data.data.assessmentDefinition;
      if (!practicalFormTitle.trim()) setPracticalFormTitle(def.title || "");
      if (genTarget === "form" && def.sections?.length) {
        setPracticalFormSections(JSON.parse(JSON.stringify(def.sections)));
      } else if (genTarget === "project") {
        setPracticalFormInstructions(def.projectInstructions || "");
      }
      // Immediately add any AI-generated datasets to the local resource list
      // so HR sees them right away without needing to save first.
      if (def.resources?.length) {
        setPracticalFormResources(prev => {
          const existingNames = new Set(prev.map(r => r.storedName));
          const fresh = def.resources!.filter(r => !existingNames.has(r.storedName));
          return [...prev, ...fresh];
        });
      }
      // Also sync the full job so the jobs list reflects the new resources
      if (data.data.job) {
        onUpdated(data.data.job);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || "AI generation failed");
    } finally {
      setPracticalAiGenerating(false);
    }
  };

  const uploadResources = async (jobId: string, files: FileList) => {
    if (!files.length) return;
    setResourceUploading(true);
    setResourceError("");
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append("files", files[i]);
    try {
      const { data } = await api.post(`/jobs/${jobId}/assessment-resources`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUpdated(data.data);
      // Sync local resource list from the returned job
      const updatedResources: IAssessmentResource[] = data.data?.practicalAssessmentTemplate?.resources || [];
      if (updatedResources.length) setPracticalFormResources(updatedResources);
    } catch (e: any) {
      setResourceError(e.response?.data?.error || "Upload failed");
    } finally {
      setResourceUploading(false);
    }
  };

  const deleteResource = async (jobId: string, storedName: string) => {
    try {
      const { data } = await api.delete(`/jobs/${jobId}/assessment-resources/${storedName}`);
      onUpdated(data.data);
      // Remove from local list immediately
      setPracticalFormResources(prev => prev.filter(r => r.storedName !== storedName));
    } catch (e: any) {
      alert(e.response?.data?.error || "Delete failed");
    }
  };

  const savePracticalTemplate = async (jobId: string) => {
    setPracticalSaving(true);
    try {
      const payload = {
        practicalAssessmentTemplate: {
          mode: practicalFormMode,
          title: practicalFormTitle.trim() || "Practical Assessment",
          sections: practicalFormMode !== "project" ? practicalFormSections : [],
          questions: [],
          projectInstructions: practicalFormMode !== "form" ? practicalFormInstructions : "",
          maxFiles: 5,
          maxFileMb: 10,
          // Always send the current local resource list so saves never wipe them
          resources: practicalFormResources,
        },
      };
      const { data } = await api.put(`/jobs/${jobId}`, payload);
      onUpdated(data.data);
      setPracticalBuilderJobId(null);
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to save assessment template");
    } finally {
      setPracticalSaving(false);
    }
  };

  const startEdit = (j: Job) => {
    setForm({ title: j.title, department: j.department, description: j.description || "", requiredSkills: j.requiredSkills.join(", "), preferredSkills: j.preferredSkills?.join(", ") || "", experienceYears: j.experienceYears, educationLevel: j.educationLevel || "Bachelor's", status: j.status });
    setEditJob(j); setMode("edit"); setExpandedId(null);
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1040px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>Jobs</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{jobs.length} job{jobs.length !== 1 ? "s" : ""} posted</p>
        </div>
        <button onClick={() => { setMode(mode === "create" ? null : "create"); setEditJob(null); setForm({ ...jBlank }); setErr(""); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "#2b72f0", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 2px 8px rgba(43,114,240,0.3)" }}>
          <Plus style={{ width: "15px", height: "15px" }} />{mode === "create" ? "Cancel" : "New Job"}
        </button>
      </div>

      {/* ── Create / Edit Form ── */}
      {mode && (
        <div style={{ background: "#fff", borderRadius: "14px", padding: "24px 28px", boxShadow: "0 2px 16px rgba(43,114,240,0.1)", border: "1px solid #93c5fd", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{ width: "4px", height: "20px", borderRadius: "2px", background: "#2b72f0" }} />
            <h2 style={{ fontWeight: 700, color: "#0f172a" }}>{mode === "create" ? "Create New Job" : `Edit — ${editJob?.title}`}</h2>
          </div>
          <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Job Title", true)}<input value={form.title} placeholder="e.g. Senior Frontend Engineer" required onChange={e => sf("title", e.target.value)} style={jInSt} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Department", true)}<input value={form.department} placeholder="e.g. Engineering" required onChange={e => sf("department", e.target.value)} style={jInSt} /></div>
            <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Description")}<textarea value={form.description} placeholder="Describe the role, responsibilities and requirements…" rows={3} onChange={e => sf("description", e.target.value)} style={{ ...jInSt, resize: "vertical", fontFamily: "inherit" }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Required Skills (comma-sep)")}<input value={form.requiredSkills} placeholder="e.g. React, TypeScript, Node.js" onChange={e => sf("requiredSkills", e.target.value)} style={jInSt} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Preferred Skills (comma-sep)")}<input value={form.preferredSkills} placeholder="e.g. GraphQL, Docker" onChange={e => sf("preferredSkills", e.target.value)} style={jInSt} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Min. Experience (years)")}<input type="number" value={form.experienceYears} placeholder="e.g. 3" onChange={e => sf("experienceYears", +e.target.value)} style={jInSt} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Education Level")}<select value={form.educationLevel} onChange={e => sf("educationLevel", e.target.value)} style={jSelSt}>{["High School", "Associate's", "Bachelor's", "Master's", "PhD"].map(l => <option key={l}>{l}</option>)}</select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{jLbl("Status")}<select value={form.status} onChange={e => sf("status", e.target.value)} style={jSelSt}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></div>
            {err && <p style={{ gridColumn: "1/-1", color: "#dc2626", fontSize: "0.8rem", padding: "8px 12px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>{err}</p>}
            <div style={{ gridColumn: "1/-1", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setMode(null); setEditJob(null); setErr(""); }} style={{ padding: "9px 20px", borderRadius: "10px", background: "#f1f5f9", color: "#475569", border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: "9px 22px", borderRadius: "10px", background: "#2b72f0", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : mode === "create" ? "Create Job" : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Job List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {jobs.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "56px", textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <Briefcase strokeWidth={1} style={{ width: "44px", height: "44px", margin: "0 auto 12px", color: "#34d399" }} />
            <p style={{ fontWeight: 600 }}>No jobs yet</p><p style={{ fontSize: "0.875rem" }}>Click "New Job" to get started.</p>
          </div>
        ) : jobs.map(j => {
          const s = jSc(j.status); const isExp = expandedId === j._id; const isDel = delConfirm === j._id;
          const tpl = j.practicalAssessmentTemplate;
          const totalSections = tpl?.sections?.length || 0;
          const totalQ = (tpl?.sections || []).reduce((a: number, sec: IAssessmentSection) => a + sec.questions.length, 0) || tpl?.questions?.length || 0;
          const hasForm = totalQ > 0;
          const hasProject = !!(tpl?.projectInstructions?.trim());
          const assessmentSet = !!(tpl?.title && (hasForm || hasProject));
          const assessmentKind = hasForm && hasProject ? "both" : hasForm ? "form" : hasProject ? "project" : null;
          return (
            <div key={j._id} style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${s.bar}`, overflow: "hidden" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                    <h3 style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{j.title}</h3>
                    <span style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 700, background: s.bg, color: s.color }}>{j.status}</span>
                    {assessmentSet ? (
                      <span style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "0.65rem", fontWeight: 700, background: assessmentKind === "both" ? "#eef2ff" : "#dcfce7", color: assessmentKind === "both" ? "#4338ca" : "#16a34a", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        {assessmentKind === "both" ? "✓ Form + Project" : assessmentKind === "form" ? "✓ Form Q&A" : "✓ Project brief"}
                      </span>
                    ) : (
                      <span
                        title="Click to set up the practical assessment"
                        onClick={e => { e.stopPropagation(); setExpandedId(j._id); if (practicalBuilderJobId !== j._id) openPracticalBuilder(j); }}
                        style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "0.65rem", fontWeight: 700, background: "#fef3c7", color: "#b45309", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px", border: "1px solid #fde68a" }}
                      >
                        ⚠ No assessment — set up →
                      </span>
                    )}
                  </div>
                  <p style={{ color: "#64748b", fontSize: "0.78rem" }}>{j.department} · {j.experienceYears}+ yrs · {j.requiredSkills.slice(0, 3).join(", ")}{j.requiredSkills.length > 3 ? ` +${j.requiredSkills.length - 3}` : ""}</p>
                </div>
                <p style={{ color: "#94a3b8", fontSize: "0.72rem", whiteSpace: "nowrap", flexShrink: 0 }}>{new Date(j.createdAt).toLocaleDateString()}</p>
                <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
                  <button title="View details" onClick={() => setExpandedId(isExp ? null : j._id)} style={{ padding: "6px 8px", borderRadius: "8px", border: "none", background: isExp ? "#dbeafe" : "#f1f5f9", cursor: "pointer", color: isExp ? "#2b72f0" : "#64748b", display: "flex", alignItems: "center" }}>
                    <ChevronDown style={{ width: "14px", height: "14px", transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                  <button title="Edit" onClick={() => startEdit(j)} style={{ padding: "6px 8px", borderRadius: "8px", border: "none", background: "#eff6ff", cursor: "pointer", color: "#2b72f0", display: "flex", alignItems: "center" }}>
                    <Pencil style={{ width: "13px", height: "13px" }} />
                  </button>
                  <button title="Delete" onClick={() => setDelConfirm(isDel ? null : j._id)} style={{ padding: "6px 8px", borderRadius: "8px", border: "none", background: "#fef2f2", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}>
                    <Trash2 style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>
              </div>
              {/* Delete confirm */}
              {isDel && (
                <div style={{ borderTop: "1px solid #fecaca", background: "#fef2f2", padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <p style={{ flex: 1, color: "#dc2626", fontSize: "0.83rem", fontWeight: 600 }}>Delete "{j.title}"? This cannot be undone.</p>
                  <button onClick={() => setDelConfirm(null)} style={{ padding: "5px 14px", borderRadius: "8px", background: "#fff", border: "1px solid #fecaca", color: "#475569", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>Cancel</button>
                  <button onClick={() => deleteJob(j._id)} style={{ padding: "5px 14px", borderRadius: "8px", background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>Delete</button>
                </div>
              )}
              {/* Expanded details */}
              {isExp && !isDel && (
                <div style={{ borderTop: "1px solid #bfdbfe", padding: "16px 20px", background: "#f8fafc" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: j.description ? "14px" : 0 }}>
                    <div>
                      <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "6px" }}>REQUIRED SKILLS</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{j.requiredSkills.length ? j.requiredSkills.map(sk => <span key={sk} style={{ padding: "2px 8px", borderRadius: "12px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.7rem", fontWeight: 600 }}>{sk}</span>) : <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>—</span>}</div>
                    </div>
                    <div>
                      <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "6px" }}>PREFERRED SKILLS</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{j.preferredSkills?.length ? j.preferredSkills.map(sk => <span key={sk} style={{ padding: "2px 8px", borderRadius: "12px", background: "#f0fdf4", color: "#16a34a", fontSize: "0.7rem", fontWeight: 600 }}>{sk}</span>) : <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>—</span>}</div>
                    </div>
                    <div>
                      <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "6px" }}>SET STATUS</p>
                      <div style={{ display: "flex", gap: "5px" }}>
                        {(["draft", "active", "closed"]).map(st => { const cs = jSc(st); return <button key={st} onClick={() => setStatus(j, st)} style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 600, border: "1.5px solid", borderColor: j.status === st ? cs.bar : "#bfdbfe", background: j.status === st ? cs.bar : "#fff", color: j.status === st ? "#fff" : "#64748b", cursor: "pointer", textTransform: "capitalize" }}>{st}</button>; })}
                      </div>
                    </div>
                  </div>
                  {j.description && <div><p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "6px" }}>DESCRIPTION</p><p style={{ color: "#475569", fontSize: "0.83rem", lineHeight: 1.7 }}>{j.description}</p></div>}

                  {/* ── Practical Assessment Builder ── */}
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div>
                        <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", margin: 0 }}>PRACTICAL ASSESSMENT TEMPLATE</p>
                        {assessmentSet ? (
                          <p style={{ fontSize: "0.75rem", color: "#475569", margin: "3px 0 0" }}>
                            <strong>{tpl!.title}</strong>
                            <span style={{ color: "#94a3b8", marginLeft: "6px" }}>
                              {hasForm && ` · ${totalSections} section${totalSections !== 1 ? "s" : ""}, ${totalQ} Q`}
                              {hasProject && " · project scenario"}
                              {(tpl!.resources?.length || 0) > 0 ? ` · ${tpl!.resources!.length} resource${tpl!.resources!.length !== 1 ? "s" : ""}` : ""}
                            </span>
                          </p>
                        ) : (
                          <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "3px 0 0" }}>Not configured yet — candidates see a free-text form. Click <strong style={{ color: "#b45309" }}>"Setup Assessment"</strong> to configure.</p>
                        )}
                      </div>
                      <button
                        onClick={() => practicalBuilderJobId === j._id ? setPracticalBuilderJobId(null) : openPracticalBuilder(j)}
                        style={{ padding: "5px 14px", borderRadius: "8px", background: practicalBuilderJobId === j._id ? "#f1f5f9" : "#eff6ff", border: "1px solid #bfdbfe", color: practicalBuilderJobId === j._id ? "#475569" : "#2b72f0", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {practicalBuilderJobId === j._id ? "Close" : j.practicalAssessmentTemplate?.title ? "Edit" : "Setup Assessment"}
                      </button>
                    </div>

                    {practicalBuilderJobId === j._id && (
                      <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #bae6fd", padding: "16px", marginTop: "6px" }}>

                        {/* Title + Mode */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>ASSESSMENT TITLE</label>
                            <input
                              value={practicalFormTitle}
                              onChange={e => setPracticalFormTitle(e.target.value)}
                              placeholder="e.g. Technical Take-Home Test"
                              style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #bae6fd", fontSize: "0.8rem", boxSizing: "border-box" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>TYPE</label>
                            <select
                              value={practicalFormMode}
                              onChange={e => setPracticalFormMode(e.target.value as "form" | "project" | "both")}
                              style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #bae6fd", fontSize: "0.8rem" }}
                            >
                              <option value="form">Form only — structured Q&amp;A</option>
                              <option value="project">Project only — scenario + deliverables</option>
                              <option value="both">Both — Form Q&amp;A + Project scenario</option>
                            </select>
                          </div>
                        </div>

                        {/* AI Generation — split buttons per part */}
                        <div style={{ marginBottom: "14px", padding: "12px", borderRadius: "8px", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#7c3aed", letterSpacing: "0.08em", margin: "0 0 6px" }}>✨ AI GENERATION</p>
                          <div style={{ marginBottom: "8px" }}>
                            <label style={{ display: "block", fontSize: "0.62rem", color: "#64748b", marginBottom: "3px" }}>Hint (optional)</label>
                            <input
                              value={practicalAiHint}
                              onChange={e => setPracticalAiHint(e.target.value)}
                              placeholder="e.g. Focus on system design, SQL, and scalability"
                              style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd6fe", fontSize: "0.78rem", boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {practicalFormMode !== "project" && (
                              <button
                                onClick={() => generateAiAssessment(j._id, "form")}
                                disabled={practicalAiGenerating}
                                style={{ padding: "6px 14px", borderRadius: "8px", background: practicalAiGenerating ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", fontSize: "0.72rem", fontWeight: 700, cursor: practicalAiGenerating ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              >
                                {practicalAiGenerating ? <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: "12px", height: "12px" }} />}
                                Generate form questions
                              </button>
                            )}
                            {practicalFormMode !== "form" && (
                              <button
                                onClick={() => generateAiAssessment(j._id, "project")}
                                disabled={practicalAiGenerating}
                                style={{ padding: "6px 14px", borderRadius: "8px", background: practicalAiGenerating ? "#94a3b8" : "#6366f1", color: "#fff", border: "none", fontSize: "0.72rem", fontWeight: 700, cursor: practicalAiGenerating ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              >
                                {practicalAiGenerating ? <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: "12px", height: "12px" }} />}
                                Generate project brief
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Project brief editor — visible when mode is project or both */}
                        {practicalFormMode !== "form" && (
                          <div style={{ marginBottom: "14px", padding: "14px", borderRadius: "10px", border: "1px solid #a5b4fc", background: "#eef2ff" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 800 }}>P</span>
                                </span>
                                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#3730a3" }}>PROJECT SCENARIO &amp; DELIVERABLES</span>
                              </div>
                              {practicalFormInstructions.trim() && (
                                <button
                                  onClick={() => { if (confirm("Clear the project brief and all attached datasets?")) { setPracticalFormInstructions(""); setPracticalFormResources([]); } }}
                                  style={{ padding: "3px 10px", borderRadius: "6px", background: "none", border: "1px solid #c7d2fe", color: "#6366f1", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer" }}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "#4338ca", marginBottom: "4px" }}>SCENARIO / BRIEF</label>
                            <textarea
                              value={practicalFormInstructions}
                              onChange={e => setPracticalFormInstructions(e.target.value)}
                              rows={6}
                              placeholder="Describe the scenario, context, resources provided, tech stack expected, timebox, evaluation criteria, and what to submit (e.g. PDF report, GitHub repo link, Figma file…)"
                              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #a5b4fc", fontSize: "0.8rem", resize: "vertical", boxSizing: "border-box", background: "#fff" }}
                            />
                            <p style={{ fontSize: "0.65rem", color: "#6366f1", marginTop: "6px", margin: "6px 0 0" }}>
                              Candidates will read this scenario, work on their deliverables, and submit files + links below. Attach resources (datasets, starter code, PDFs) via the Resource Attachments section.
                            </p>
                          </div>
                        )}

                        {/* Sectioned form builder — visible when mode is form or both */}
                        {practicalFormMode !== "project" && (
                          <div style={{ marginBottom: "14px", padding: "14px", borderRadius: "10px", border: "1px solid #bae6fd", background: "#f0f9ff" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 800 }}>Q</span>
                                </span>
                                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0c4a6e" }}>FORM QUESTIONS (MCQ + Written)</span>
                              </div>
                              {practicalFormSections.length > 0 && (
                                <button
                                  onClick={() => { if (confirm("Clear all sections and questions?")) setPracticalFormSections([]); }}
                                  style={{ padding: "3px 10px", borderRadius: "6px", background: "none", border: "1px solid #bae6fd", color: "#0369a1", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer" }}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                        {/* ── Sectioned form builder ── */}
                          <div style={{ marginBottom: "0" }}>
                            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", marginBottom: "8px" }}>SECTIONS &amp; QUESTIONS</label>
                            {practicalFormSections.length === 0 && (
                              <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "8px" }}>No sections yet. Click "Generate with AI" above or add a section manually.</p>
                            )}
                            {practicalFormSections.map((sec, si) => (
                              <div key={si} style={{ marginBottom: "14px", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                                {/* Section header */}
                                <div style={{ background: "#f8fafc", padding: "10px 12px", display: "flex", gap: "8px", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0" }}>
                                  <div style={{ flex: 1 }}>
                                    <input
                                      value={sec.title}
                                      onChange={e => { const s = [...practicalFormSections]; s[si] = { ...s[si], title: e.target.value }; setPracticalFormSections(s); }}
                                      placeholder="Section title (e.g. Technical Skills)"
                                      style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem", fontWeight: 700, boxSizing: "border-box", marginBottom: "4px" }}
                                    />
                                    <input
                                      value={sec.description || ""}
                                      onChange={e => { const s = [...practicalFormSections]; s[si] = { ...s[si], description: e.target.value }; setPracticalFormSections(s); }}
                                      placeholder="Section description (optional)"
                                      style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.71rem", color: "#64748b", boxSizing: "border-box" }}
                                    />
                                  </div>
                                  <button onClick={() => setPracticalFormSections(s => s.filter((_, i) => i !== si))} style={{ padding: "4px 8px", background: "#fef2f2", border: "none", borderRadius: "6px", color: "#dc2626", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>Remove section</button>
                                </div>
                                {/* Questions in section */}
                                <div style={{ padding: "10px 12px" }}>
                                  {sec.questions.map((q, qi) => (
                                    <div key={q.id} style={{ marginBottom: "10px", padding: "10px", background: "#fafafa", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                      <div style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                                        <select
                                          value={q.inputType}
                                          onChange={e => {
                                            const s = [...practicalFormSections];
                                            const newType = e.target.value as IAssessmentQuestion["inputType"];
                                            s[si].questions[qi] = { ...s[si].questions[qi], inputType: newType, options: newType === "multiple_choice" ? (q.options?.length ? q.options : ["", "", "", ""]) : [] };
                                            setPracticalFormSections(s);
                                          }}
                                          style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.7rem", background: q.inputType === "multiple_choice" ? "#eff6ff" : "#f8fafc" }}
                                        >
                                          <option value="textarea">Written answer</option>
                                          <option value="text">Short text</option>
                                          <option value="multiple_choice">Multiple choice</option>
                                          <option value="file">File upload</option>
                                        </select>
                                        <input
                                          value={q.label}
                                          onChange={e => { const s = [...practicalFormSections]; s[si].questions[qi] = { ...s[si].questions[qi], label: e.target.value }; setPracticalFormSections(s); }}
                                          placeholder="Question text…"
                                          style={{ flex: 1, padding: "5px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem" }}
                                        />
                                        <button onClick={() => { const s = [...practicalFormSections]; s[si].questions = s[si].questions.filter((_, i) => i !== qi); setPracticalFormSections(s); }} style={{ padding: "4px 6px", background: "#fef2f2", border: "none", borderRadius: "6px", color: "#dc2626", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1 }}>×</button>
                                      </div>
                                      {q.inputType === "multiple_choice" && (
                                        <div style={{ paddingLeft: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                          {(q.options || []).map((opt, oi) => (
                                            <div key={oi} style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                              <span style={{ color: "#94a3b8", fontSize: "0.65rem", width: "14px", textAlign: "center" }}>○</span>
                                              <input
                                                value={opt}
                                                onChange={e => { const s = [...practicalFormSections]; const opts = [...(s[si].questions[qi].options || [])]; opts[oi] = e.target.value; s[si].questions[qi] = { ...s[si].questions[qi], options: opts }; setPracticalFormSections(s); }}
                                                placeholder={`Option ${oi + 1}`}
                                                style={{ flex: 1, padding: "4px 7px", borderRadius: "5px", border: "1px solid #e2e8f0", fontSize: "0.73rem" }}
                                              />
                                              {(q.options || []).length > 2 && (
                                                <button onClick={() => { const s = [...practicalFormSections]; const opts = (s[si].questions[qi].options || []).filter((_, i) => i !== oi); s[si].questions[qi] = { ...s[si].questions[qi], options: opts }; setPracticalFormSections(s); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem" }}>×</button>
                                              )}
                                            </div>
                                          ))}
                                          <button onClick={() => { const s = [...practicalFormSections]; const opts = [...(s[si].questions[qi].options || []), ""]; s[si].questions[qi] = { ...s[si].questions[qi], options: opts }; setPracticalFormSections(s); }} style={{ alignSelf: "flex-start", padding: "3px 8px", borderRadius: "5px", background: "#eff6ff", border: "1px dashed #bfdbfe", color: "#2b72f0", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", marginTop: "2px" }}>+ option</button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                      onClick={() => { const s = [...practicalFormSections]; s[si].questions = [...s[si].questions, { id: `s${si + 1}q${Date.now()}`, label: "", inputType: "textarea", options: [] }]; setPracticalFormSections(s); }}
                                      style={{ padding: "4px 10px", borderRadius: "6px", background: "#f0f9ff", border: "1px dashed #bae6fd", color: "#0369a1", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer" }}
                                    >+ Written question</button>
                                    <button
                                      onClick={() => { const s = [...practicalFormSections]; s[si].questions = [...s[si].questions, { id: `s${si + 1}q${Date.now()}`, label: "", inputType: "multiple_choice", options: ["", "", "", ""] }]; setPracticalFormSections(s); }}
                                      style={{ padding: "4px 10px", borderRadius: "6px", background: "#eff6ff", border: "1px dashed #bfdbfe", color: "#1d4ed8", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer" }}
                                    >+ MCQ</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => setPracticalFormSections(s => [...s, { title: "", description: "", questions: [] }])}
                              style={{ padding: "6px 14px", borderRadius: "7px", background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#475569", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                            >+ Add Section</button>
                          </div>
                          </div>
                        )}

                        {/* Resource attachments */}
                        <div style={{ marginBottom: "14px", padding: "12px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", letterSpacing: "0.08em", margin: "0 0 6px" }}>📎 RESOURCE ATTACHMENTS</p>
                          <p style={{ fontSize: "0.7rem", color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>
                            Upload datasets, starter code, PDFs, or any reference material candidates can download from their assessment page.
                          </p>

                          {/* Resources — driven by local state so AI-generated ones appear instantly */}
                          {practicalFormResources.length > 0 && (
                            <div style={{ marginBottom: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                              {practicalFormResources.map(r => (
                                <div key={r.storedName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: "6px", background: "#fff", border: "1px solid #e2e8f0", fontSize: "0.72rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <FileText style={{ width: "12px", height: "12px", color: "#64748b", flexShrink: 0 }} />
                                    <span style={{ color: "#0f172a", fontWeight: 500 }}>{r.name}</span>
                                    <span style={{ color: "#94a3b8" }}>{r.sizeBytes < 1024 ? `(${r.sizeBytes} B)` : `(${(r.sizeBytes / 1024).toFixed(1)} KB)`}</span>
                                  </div>
                                  <button
                                    onClick={() => deleteResource(j._id, r.storedName)}
                                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "2px 4px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 600 }}
                                  >Remove</button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload input */}
                          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "7px", background: resourceUploading ? "#94a3b8" : "#f1f5f9", border: "1px dashed #cbd5e1", color: "#475569", fontSize: "0.72rem", fontWeight: 600, cursor: resourceUploading ? "not-allowed" : "pointer" }}>
                            {resourceUploading ? <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: "12px", height: "12px" }} />}
                            {resourceUploading ? "Uploading…" : "Attach files"}
                            <input
                              type="file"
                              multiple
                              style={{ display: "none" }}
                              disabled={resourceUploading}
                              onChange={e => e.target.files && uploadResources(j._id, e.target.files)}
                            />
                          </label>
                          {resourceError && <p style={{ color: "#dc2626", fontSize: "0.68rem", margin: "6px 0 0" }}>{resourceError}</p>}
                        </div>

                        <p style={{ fontSize: "0.65rem", color: "#64748b", margin: "0 0 10px", background: "#f0f9ff", padding: "8px 10px", borderRadius: "6px" }}>
                          💡 This template is saved to the job and automatically synced to the Practical Assessment stage in the hiring pipeline. Candidates access their personal assessment link via invitation email.
                        </p>

                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button onClick={() => setPracticalBuilderJobId(null)} style={{ padding: "7px 16px", borderRadius: "8px", background: "#f1f5f9", color: "#475569", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>Cancel</button>
                          <button
                            onClick={() => savePracticalTemplate(j._id)}
                            disabled={practicalSaving}
                            style={{ padding: "7px 18px", borderRadius: "8px", background: practicalSaving ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", cursor: practicalSaving ? "not-allowed" : "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                          >
                            {practicalSaving ? "Saving…" : "Save Assessment Template"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Hire Tab ───────────────────────────────────────────── */
function HireTab({ jobs }: { jobs: Job[] }) {
  const [selJob, setSelJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [selResult, setSelResult] = useState<ScreeningResult | null>(null);
  const [aiJudgmentModal, setAiJudgmentModal] = useState<ScreeningResult | null>(null);
  const [viewApplicant, setViewApplicant] = useState<Candidate | null>(null);
  const [loadingC, setLoadingC] = useState(false);
  const [screening, setScreening] = useState(false);
  const [screenMsg, setScreenMsg] = useState("");
  const [addMode, setAddMode] = useState<"form" | "json" | "csv" | "paste" | "zip" | null>(null);
  const [jsonText, setJsonText] = useState(""); const [jsonErr, setJsonErr] = useState(""); const [jsonUploading, setJsonUploading] = useState(false);
  const [csvRows, setCsvRows] = useState<any[]>([]); const [csvErr, setCsvErr] = useState(""); const [csvUploading, setCsvUploading] = useState(false);
  const [pasteText, setPasteText] = useState(""); const [pasteErr, setPasteErr] = useState(""); const [pasteUploading, setPasteUploading] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null); const [zipUploading, setZipUploading] = useState(false); const [zipResult, setZipResult] = useState<any>(null); const [zipErr, setZipErr] = useState("");
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", headline: "", location: "", skills: "", skillLevel: "Intermediate", role: "", company: "", degree: "Bachelor's", institution: "", fieldOfStudy: "", availStatus: "Available", availType: "Full-time", linkedin: "", github: "" });
  const [saving, setSaving] = useState(false);
  const [editCand, setEditCand] = useState<Candidate | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [jobFilter, setJobFilter] = useState("all");
  const [showImportMore, setShowImportMore] = useState(false);
  const [candSearch, setCandSearch] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });

  /* Pipeline state */
  const [pipeline, setPipeline] = useState<IPipeline | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineMsg, setPipelineMsg] = useState("");
  const [stageRunProgress, setStageRunProgress] = useState<{ processed: number; total: number; failed: number } | null>(null);
  const runPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [unsavedHr, setUnsavedHr] = useState<Record<number, Partial<IHrInputs>>>({});
  const [stageShortlist, setStageShortlist] = useState<Record<number, string[]>>({});
  const [applicantCommsForm, setApplicantCommsForm] = useState({
    assessmentUrl: "",
    assessmentFormat: "",
    submissionDeadlineAt: "",
    interviewUrl: "",
    interviewDurationMins: 30,
    extraInstructions: "",
  });
  const [emailDrafts, setEmailDrafts] = useState<ApplicantEmailDraft[] | null>(null);
  const [emailDraftBusy, setEmailDraftBusy] = useState(false);
  const [emailSendBusy, setEmailSendBusy] = useState(false);
  const [emailOpsMsg, setEmailOpsMsg] = useState("");
  const [smtpConfiguredHint, setSmtpConfiguredHint] = useState<boolean | null>(null);
  const [practicalSubs, setPracticalSubs] = useState<Array<Record<string, unknown>>>([]);
  const [practicalSubsLoading, setPracticalSubsLoading] = useState(false);
  const [gradingPractical, setGradingPractical] = useState(false);

  /* AI Interview state */
  const [interviewSessions, setInterviewSessions] = useState<Array<Record<string, unknown>>>([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewInviting, setInterviewInviting] = useState(false);
  const [interviewWindowEnd, setInterviewWindowEnd] = useState("");
  const [interviewExpandedSession, setInterviewExpandedSession] = useState<string | null>(null);
  const [interviewPickIds, setInterviewPickIds] = useState<Set<string>>(new Set());
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [practicalPickIds, setPracticalPickIds] = useState<Set<string>>(new Set());
  const [assessmentAiHint, setAssessmentAiHint] = useState("");
  const [assessmentGenBusy, setAssessmentGenBusy] = useState(false);
  const [videoModal, setVideoModal] = useState<{ url: string; name: string; transcript: any[] } | null>(null);

  /* Final selection state */
  const [finalSelResults, setFinalSelResults] = useState<any[]>([]);
  const [finalSelLoading, setFinalSelLoading] = useState(false);
  const [finalSelMsg, setFinalSelMsg] = useState("");
  const [finalSelExpanded, setFinalSelExpanded] = useState<string | null>(null);

  /* Rollback state */
  const [rollbackConfirmIdx, setRollbackConfirmIdx] = useState<number | null>(null);
  const [rollbackBusy, setRollbackBusy] = useState(false);
  const [rollbackMsg, setRollbackMsg] = useState("");

  /* Hire sub-tab: applicants | screening */
  const [hireSubTab, setHireSubTab] = useState<"applicants" | "screening">("applicants");

  const loadPipeline = useCallback(async (jobId: string) => {
    setPipelineLoading(true);
    try {
      const { data } = await api.get(`/pipeline/${jobId}`);
      if (data.success) {
        setPipeline(data.data);
        setActiveStageIndex(data.data.currentStageIndex);
        const shortlistMap: Record<number, string[]> = {};
        data.data.stages.forEach((s: IPipelineStage, idx: number) => { shortlistMap[idx] = s.shortlistedIds || []; });
        setStageShortlist(shortlistMap);
      }
    } catch { /* ignore */ }
    finally { setPipelineLoading(false); }
  }, []);

  const doRollback = useCallback(async (stageIdx: number) => {
    if (!selJob) return;
    setRollbackBusy(true);
    setRollbackMsg("");
    try {
      const { data } = await api.post(`/pipeline/${selJob._id}/stage/${stageIdx}/rollback`);
      if (data.success) {
        setRollbackMsg(data.message || "Stage rolled back.");
        setRollbackConfirmIdx(null);
        await loadPipeline(selJob._id);
        setActiveStageIndex(stageIdx);
        // Clear cached email drafts and practical state
        setEmailDrafts(null);
        setPracticalSubs([]);
        setInterviewSessions([]);
      } else {
        setRollbackMsg(data.error || "Rollback failed.");
      }
    } catch { setRollbackMsg("Rollback failed. Please try again."); }
    finally { setRollbackBusy(false); }
  }, [selJob, loadPipeline]);

  const loadJob = useCallback(async (job: Job) => {
    setSelJob(job); setSelResult(null); setAiJudgmentModal(null); setViewApplicant(null); setLoadingC(true); setShowImportMore(false); setCandSearch(""); setExpanded({}); setColumnFilters([]); setPagination(p => ({ ...p, pageIndex: 0 }));
    try {
      const [cR, rR] = await Promise.all([api.get(`/candidates?jobId=${job._id}`), api.get(`/screening/results/${job._id}`)]);
      setCandidates(cR.data.data); setResults(rR.data.data);
      await loadPipeline(job._id);
    } catch { /* ignore */ } finally { setLoadingC(false); }
  }, [loadPipeline]);

  // Auto-load pipeline when switching to screening tab if not loaded
  useEffect(() => {
    if (hireSubTab === "screening" && selJob && !pipeline && !pipelineLoading) {
      loadPipeline(selJob._id);
    }
  }, [hireSubTab, selJob, pipeline, pipelineLoading, loadPipeline]);

  const screeningViewIdx = pipeline ? Math.min(activeStageIndex, pipeline.currentStageIndex || 0) : 0;

  useEffect(() => {
    if (!pipeline || hireSubTab !== "screening") return;
    const st = pipeline.stages[screeningViewIdx];
    if (st?.type !== "practical") return;
    const ac = st.applicantComms;
    setApplicantCommsForm({
      assessmentUrl: ac?.assessmentUrl || "",
      assessmentFormat: ac?.assessmentFormat || "",
      submissionDeadlineAt: ac?.submissionDeadlineAt ? ac.submissionDeadlineAt.slice(0, 16) : "",
      interviewUrl: ac?.interviewUrl || "",
      interviewDurationMins: typeof ac?.interviewDurationMins === "number" ? ac.interviewDurationMins : 30,
      extraInstructions: ac?.extraInstructions || "",
    });
  }, [pipeline, hireSubTab, screeningViewIdx]);

  const savePracticalApplicantComms = useCallback(async () => {
    if (!selJob || !pipeline) return;
    const st = pipeline.stages[screeningViewIdx];
    if (st?.type !== "practical") return;
    try {
      const payload = {
        ...applicantCommsForm,
        submissionDeadlineAt: applicantCommsForm.submissionDeadlineAt
          ? new Date(applicantCommsForm.submissionDeadlineAt).toISOString()
          : "",
      };
      await api.patch(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/applicant-comms`, payload);
      await loadPipeline(selJob._id);
      setPipelineMsg("Saved practical exam settings.");
      setTimeout(() => setPipelineMsg(""), 4000);
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    }
  }, [selJob, pipeline, screeningViewIdx, applicantCommsForm, loadPipeline]);

  const draftApplicantEmails = useCallback(async () => {
    if (!selJob || !pipeline) return;
    setEmailDraftBusy(true);
    setEmailOpsMsg("");
    try {
      const { data } = await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/emails/draft`);
      if (data.success) {
        setEmailDrafts(data.data.drafts);
        setSmtpConfiguredHint(!!data.data.emailConfigured);
        setEmailOpsMsg(
          data.data.emailConfigured
            ? "Drafts ready — review and edit, then send."
            : "Drafts ready — SMTP not configured; “send” will log only until you set SMTP_HOST in the server .env."
        );
      }
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setEmailDraftBusy(false);
    }
  }, [selJob, pipeline, screeningViewIdx]);

  const sendApplicantEmails = useCallback(async () => {
    if (!selJob || !pipeline || !emailDrafts?.length) return;
    setEmailSendBusy(true);
    setEmailOpsMsg("");
    try {
      const { data } = await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/emails/send`, {
        messages: emailDrafts.map(d => ({
          candidateId: d.candidateId,
          kind: d.kind,
          subject: d.subject,
          body: d.body,
        })),
      });
      if (data.success) {
        setPipeline(data.data.pipeline);
        const failed = (data.data.results as { ok: boolean }[]).filter(r => !r.ok).length;
        setEmailOpsMsg(failed ? `Sent with ${failed} failure(s). Check server logs.` : "Emails sent.");
        setTimeout(() => setEmailOpsMsg(""), 6000);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setEmailSendBusy(false);
    }
  }, [selJob, pipeline, screeningViewIdx, emailDrafts]);

  const loadPracticalSubmissions = useCallback(async () => {
    if (!selJob || !pipeline) return;
    if (pipeline.stages[screeningViewIdx]?.type !== "practical") return;
    setPracticalSubsLoading(true);
    try {
      const { data } = await api.get(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/practical/submissions`);
      if (data.success) setPracticalSubs(data.data);
    } catch {
      setPracticalSubs([]);
    } finally {
      setPracticalSubsLoading(false);
    }
  }, [selJob, pipeline, screeningViewIdx]);

  useEffect(() => {
    if (hireSubTab === "screening" && selJob && pipeline?.stages[screeningViewIdx]?.type === "practical") {
      loadPracticalSubmissions();
    }
  }, [hireSubTab, selJob, pipeline, screeningViewIdx, loadPracticalSubmissions]);

  const loadInterviewSessions = useCallback(async () => {
    if (!selJob || !pipeline) return;
    if (pipeline.stages[screeningViewIdx]?.type !== "ai_interview") return;
    setInterviewLoading(true);
    try {
      const { data } = await api.get(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/interview/sessions`);
      if (data.success) setInterviewSessions(data.data);
    } catch { setInterviewSessions([]); }
    finally { setInterviewLoading(false); }
  }, [selJob, pipeline, screeningViewIdx]);

  useEffect(() => {
    if (hireSubTab === "screening" && selJob && pipeline?.stages[screeningViewIdx]?.type === "ai_interview") {
      loadInterviewSessions();
    }
  }, [hireSubTab, selJob, pipeline, screeningViewIdx, loadInterviewSessions]);

  const sendInterviewInvites = useCallback(async () => {
    if (!selJob || !pipeline) return;
    setInterviewInviting(true);
    try {
      const windowEnd = interviewWindowEnd
        ? new Date(interviewWindowEnd).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/interview/invite`, { windowEnd });
      if (data.success) {
        setPipelineMsg(`Interview invitations sent to ${data.data.invited} candidate(s).`);
        await loadInterviewSessions();
      }
    } catch (e: any) {
      setPipelineMsg(e.response?.data?.error || "Failed to send invitations.");
    } finally { setInterviewInviting(false); }
  }, [selJob, pipeline, screeningViewIdx, interviewWindowEnd, loadInterviewSessions]);

  const confirmInterviewShortlist = useCallback(async () => {
    if (!selJob || !pipeline || interviewPickIds.size === 0) return;
    try {
      await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/interview/shortlist`, {
        candidateIds: [...interviewPickIds],
      });
      await loadPipeline(selJob._id);
      setInterviewPickIds(new Set());
      setPipelineMsg("Interview shortlist confirmed.");
    } catch (e: any) {
      setPipelineMsg(e.response?.data?.error || "Failed to confirm shortlist.");
    }
  }, [selJob, pipeline, screeningViewIdx, interviewPickIds, loadPipeline]);

  useEffect(() => {
    setEmailDrafts(null);
    setEmailOpsMsg("");
  }, [screeningViewIdx, hireSubTab]);

  const generateAssessmentAi = useCallback(
    async (mode: "form" | "project") => {
      if (!selJob || !pipeline || pipeline.stages[screeningViewIdx]?.type !== "practical") return;
      setAssessmentGenBusy(true);
      try {
        await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/assessment/generate-ai`, {
          mode,
          hint: assessmentAiHint,
        });
        await loadPipeline(selJob._id);
        setPipelineMsg(mode === "form" ? "AI generated a question form." : "AI generated a project assessment.");
        setTimeout(() => setPipelineMsg(""), 4000);
      } catch (e: any) {
        alert(e.response?.data?.error || e.message);
      } finally {
        setAssessmentGenBusy(false);
      }
    },
    [selJob, pipeline, screeningViewIdx, assessmentAiHint, loadPipeline]
  );

  const runGradePractical = useCallback(async () => {
    if (!selJob || !pipeline) return;
    if (pipeline.stages[screeningViewIdx]?.type !== "practical") return;
    setGradingPractical(true);
    try {
      const { data } = await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/practical/grade-all`);
      if (data.success) {
        setPracticalSubs(data.data.submissions);
        setPipelineMsg(`Graded ${data.data.graded} submission(s) and updated comparison ranks.`);
        setTimeout(() => setPipelineMsg(""), 5000);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setGradingPractical(false);
    }
  }, [selJob, pipeline, screeningViewIdx]);

  const gradeOneSub = useCallback(async (subId: string) => {
    if (!selJob || !pipeline) return;
    setGradingSubId(subId);
    try {
      const { data } = await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/practical/grade-one/${subId}`);
      if (data.success) {
        setPracticalSubs(data.data.submissions);
        setPipelineMsg("Graded and rankings updated.");
        setTimeout(() => setPipelineMsg(""), 4000);
      }
    } catch (e: any) { alert(e.response?.data?.error || e.message); }
    finally { setGradingSubId(null); }
  }, [selJob, pipeline, screeningViewIdx]);

  const runFinalSelection = useCallback(async () => {
    if (!selJob) return;
    setFinalSelLoading(true);
    setFinalSelMsg("");
    try {
      const { data } = await api.post(`/pipeline/${selJob._id}/final-selection`);
      if (data.success) {
        setFinalSelResults(data.data.results || []);
        setFinalSelMsg(`AI synthesised ${data.data.total} candidate(s) across all pipeline stages.`);
        setTimeout(() => setFinalSelMsg(""), 6000);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setFinalSelLoading(false);
    }
  }, [selJob]);

  const confirmPracticalShortlist = useCallback(async () => {
    if (!selJob || !pipeline || practicalPickIds.size === 0) return;
    try {
      const { data } = await api.post(`/pipeline/${selJob._id}/stage/${screeningViewIdx}/shortlist`, {
        shortlistedIds: [...practicalPickIds],
      });
      if (data.success) {
        setPipeline(data.data);
        setActiveStageIndex(data.data.currentStageIndex);
        const { data: candData } = await api.get(`/candidates?jobId=${selJob._id}`);
        setCandidates(candData.data);
        setPracticalPickIds(new Set());
        setPipelineMsg(`✓ Practical shortlist confirmed — ${practicalPickIds.size} candidate(s) advanced.`);
        setTimeout(() => setPipelineMsg(""), 6000);
      }
    } catch { alert("Failed to confirm practical shortlist"); }
  }, [selJob, pipeline, screeningViewIdx, practicalPickIds, loadPipeline]);

  const runAll = async () => {
    if (!selJob) return; setScreening(true); setScreenMsg("Running AI screening on all candidates…");
    try {
      await api.post("/screening/run-all", { jobId: selJob._id });
      const { data } = await api.get(`/screening/results/${selJob._id}`);
      setResults(data.data);
      await loadPipeline(selJob._id);
      setScreenMsg("✓ Screening complete!");
    } catch (e: any) { setScreenMsg("Error: " + (e.response?.data?.error || e.message)); }
    finally { setScreening(false); setTimeout(() => setScreenMsg(""), 4000); }
  };

  const blankForm = { firstName: "", lastName: "", email: "", headline: "", location: "", skills: "", skillLevel: "Intermediate", role: "", company: "", degree: "Bachelor's", institution: "", fieldOfStudy: "", availStatus: "Available", availType: "Full-time", linkedin: "", github: "" };

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const skillNames = addForm.skills.split(",").map(s => s.trim()).filter(Boolean);
      const payload = {
        jobId: selJob!._id,
        firstName: addForm.firstName,
        lastName: addForm.lastName,
        email: addForm.email,
        headline: addForm.headline || (addForm.role ? `${addForm.role}${addForm.company ? ` at ${addForm.company}` : ""}` : "Candidate"),
        location: addForm.location,
        skills: skillNames.map(n => ({ name: n, level: addForm.skillLevel, yearsOfExperience: 0 })),
        experience: addForm.role ? [{ company: addForm.company, role: addForm.role, startDate: "", endDate: "Present", description: "", technologies: [], isCurrent: true }] : [],
        education: addForm.institution ? [{ institution: addForm.institution, degree: addForm.degree, fieldOfStudy: addForm.fieldOfStudy, startYear: 0, endYear: 0 }] : [],
        projects: [],
        availability: { status: addForm.availStatus, type: addForm.availType },
        socialLinks: { linkedin: addForm.linkedin, github: addForm.github },
      };
      await api.post("/candidates", payload);
      const { data } = await api.get(`/candidates?jobId=${selJob!._id}`);
      setCandidates(data.data); setAddMode(null); setAddForm(blankForm);
    } catch (e: any) { alert(e.response?.data?.error || "Error"); } finally { setSaving(false); }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Delete this candidate and their screening result?")) return;
    try {
      // Delete candidate, their screening result, and reset pipeline
      await Promise.all([
        api.delete(`/candidates/${id}`),
        selJob ? api.delete(`/screening/results/${selJob._id}/${id}`) : Promise.resolve(),
      ]);
      setCandidates(prev => prev.filter(c => c._id !== id));
      setResults(prev => prev.filter(r => {
        const cid = typeof r.candidateId === "string" ? r.candidateId : r.candidateId?._id;
        return cid !== id;
      }));
      if (selResult && typeof selResult.candidateId === "object" && (selResult.candidateId as Candidate)._id === id) setSelResult(null);
      if (aiJudgmentModal && (typeof aiJudgmentModal.candidateId === "string" ? aiJudgmentModal.candidateId : (aiJudgmentModal.candidateId as Candidate)?._id) === id) setAiJudgmentModal(null);
      if (viewApplicant?._id === id) setViewApplicant(null);
      // Reset pipeline if we still have candidates, otherwise delete it
      if (selJob) {
        if (candidates.length <= 1) {
          await api.delete(`/pipeline/${selJob._id}`);
          setPipeline(null);
        } else {
          // Reload pipeline to reflect changes
          loadPipeline(selJob._id);
        }
      }
    } catch (e: any) { alert(e.response?.data?.error || "Delete failed"); }
  };

  const clearAllCandidates = async () => {
    if (!confirm(`Remove all ${candidates.length} applicants from this job? This will also delete all screening data and cannot be undone.`)) return;
    try {
      // Delete all candidates, all screening results, and the pipeline
      await Promise.all([
        ...candidates.map(c => api.delete(`/candidates/${c._id}`)),
        selJob ? api.delete(`/screening/results/${selJob._id}`) : Promise.resolve(),
        selJob ? api.delete(`/pipeline/${selJob._id}`) : Promise.resolve(),
      ]);
      setCandidates([]);
      setResults([]);
      setSelResult(null);
      setAiJudgmentModal(null);
      setViewApplicant(null);
      setExpanded({});
      setPipeline(null);
      setStageShortlist({});
      setActiveStageIndex(0);
    } catch (e: any) { alert(e.response?.data?.error || "Clear failed"); }
  };

  const startEdit = (c: Candidate) => {
    setEditCand(c); setAddMode(null);
    setAddForm({
      firstName: c.firstName, lastName: c.lastName, email: c.email,
      headline: c.headline, location: c.location,
      skills: (c.skills || []).map(s => s.name).join(", "),
      skillLevel: c.skills?.[0]?.level || "Intermediate",
      role: c.experience?.[0]?.role || "", company: c.experience?.[0]?.company || "",
      degree: c.education?.[0]?.degree || "Bachelor's", institution: c.education?.[0]?.institution || "",
      fieldOfStudy: c.education?.[0]?.fieldOfStudy || "",
      availStatus: c.availability?.status || "Available", availType: c.availability?.type || "Full-time",
      linkedin: c.socialLinks?.linkedin || "", github: c.socialLinks?.github || "",
    });
  };

  const updateCandidate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const skillNames = addForm.skills.split(",").map(s => s.trim()).filter(Boolean);
      const payload = {
        firstName: addForm.firstName, lastName: addForm.lastName, email: addForm.email,
        headline: addForm.headline || addForm.role, location: addForm.location,
        skills: skillNames.map(n => ({ name: n, level: addForm.skillLevel, yearsOfExperience: editCand?.skills?.find(s => s.name === n)?.yearsOfExperience ?? 0 })),
        experience: addForm.role ? [{ company: addForm.company, role: addForm.role, startDate: editCand?.experience?.[0]?.startDate || "", endDate: editCand?.experience?.[0]?.endDate || "Present", description: editCand?.experience?.[0]?.description || "", technologies: editCand?.experience?.[0]?.technologies || [], isCurrent: editCand?.experience?.[0]?.isCurrent ?? true }] : [],
        education: addForm.institution ? [{ institution: addForm.institution, degree: addForm.degree, fieldOfStudy: addForm.fieldOfStudy, startYear: editCand?.education?.[0]?.startYear ?? 0, endYear: editCand?.education?.[0]?.endYear ?? 0 }] : [],
        availability: { status: addForm.availStatus, type: addForm.availType },
        socialLinks: { linkedin: addForm.linkedin, github: addForm.github, portfolio: editCand?.socialLinks?.portfolio || "" },
      };
      await api.put(`/candidates/${editCand!._id}`, payload);
      const { data } = await api.get(`/candidates?jobId=${selJob!._id}`);
      setCandidates(data.data); setEditCand(null); setAddForm(blankForm);
    } catch (e: any) { alert(e.response?.data?.error || "Update failed"); } finally { setSaving(false); }
  };

  const extractCandidateArray = (parsed: any): any[] => {
    if (Array.isArray(parsed)) return parsed;
    const WRAPPER_KEYS = ["applicants", "candidates", "talent", "data", "results", "profiles", "people"];
    for (const key of WRAPPER_KEYS) {
      if (parsed[key] && Array.isArray(parsed[key])) return parsed[key];
    }
    return [parsed];
  };

  const bulkUpload = async () => {
    setJsonErr(""); setJsonUploading(true);
    try {
      const parsed = JSON.parse(jsonText);
      const arr = extractCandidateArray(parsed);
      await api.post("/candidates/bulk", { candidates: arr, jobId: selJob!._id });
      const { data } = await api.get(`/candidates?jobId=${selJob!._id}`);
      setCandidates(data.data); setAddMode(null); setJsonText("");
    } catch (e: any) { setJsonErr(e.response?.data?.error || "Invalid JSON or server error"); }
    finally { setJsonUploading(false); }
  };

  const buildTalentRow = (r: Record<string, string>) => ({
    firstName: r.firstname || r["first name"] || (r.name || "").split(" ")[0] || "",
    lastName:  r.lastname  || r["last name"]  || (r.name || "").split(" ").slice(1).join(" ") || "",
    email:     r.email || "",
    headline:  r.headline || r.jobtitle || r.role || "",
    location:  r.location || "",
    skills:    (r.skills || "").split(";").map((s: string) => ({ name: s.trim(), level: r.skilllevel || "Intermediate", yearsOfExperience: 0 })).filter((s: any) => s.name),
    experience: r.role || r.company ? [{ company: r.company || "", role: r.role || r.jobtitle || "", startDate: "", endDate: "Present", description: "", technologies: [], isCurrent: true }] : [],
    education: r.degree || r.institution ? [{ institution: r.institution || "", degree: r.degree || "Bachelor's", fieldOfStudy: r.fieldofstudy || r.field || "", startYear: 0, endYear: 0 }] : [],
    projects: [],
    availability: { status: r.availabilitystatus || r.availability || "Available", type: r.availabilitytype || r.type || "Full-time" },
    socialLinks: { linkedin: r.linkedin || "", github: r.github || "", portfolio: r.portfolio || "" },
  });

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const hdrs = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[\s_]/g, ""));
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = (line.match(/"[^"]*"|[^,]+|(?<=,)(?=,)|(?<=,)$/g) || line.split(",")).map((v: string) => v.replace(/^"|"$/g, "").trim());
      const r: Record<string, string> = {};
      hdrs.forEach((h: string, i: number) => { r[h] = vals[i] || ""; });
      return buildTalentRow(r);
    }).filter((c: any) => (c.firstName || c.lastName) && c.email);
  };

  const parsePaste = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter((l: string) => l.trim());
    return lines.map(line => {
      const parts = line.split(/\t|,/).map((p: string) => p.trim());
      const r: Record<string, string> = { firstname: parts[0] || "", lastname: parts[1] || "", email: parts[2] || "", headline: parts[3] || "", location: parts[4] || "", skills: parts[5] || "", role: parts[6] || "", company: parts[7] || "" };
      return buildTalentRow(r);
    }).filter((c: any) => (c.firstName || c.lastName) && c.email);
  };

  const csvUpload = async () => {
    if (!csvRows.length) { setCsvErr("No valid rows found."); return; }
    setCsvUploading(true); setCsvErr("");
    try {
      await api.post("/candidates/bulk", { candidates: csvRows, jobId: selJob!._id });
      const { data } = await api.get(`/candidates?jobId=${selJob!._id}`);
      setCandidates(data.data); setAddMode(null); setCsvRows([]);
    } catch (e: any) { setCsvErr(e.response?.data?.error || "Upload failed"); } finally { setCsvUploading(false); }
  };

  const pasteUpload = async () => {
    const rows = parsePaste(pasteText);
    if (!rows.length) { setPasteErr("No valid rows. Use: Name, Email, Role, Skills (;-sep), Yrs, Education"); return; }
    setPasteErr(""); setPasteUploading(true);
    try {
      await api.post("/candidates/bulk", { candidates: rows, jobId: selJob!._id });
      const { data } = await api.get(`/candidates?jobId=${selJob!._id}`);
      setCandidates(data.data); setAddMode(null); setPasteText("");
    } catch (e: any) { setPasteErr(e.response?.data?.error || "Upload failed"); }
    finally { setPasteUploading(false); }
  };

  const zipUpload = async () => {
    if (!zipFile || !selJob) return;
    setZipUploading(true); setZipErr(""); setZipResult(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("umuranga_token") : null;
      if (!token) {
        setZipErr("Not signed in. Please log in again.");
        return;
      }
      const form = new FormData();
      form.append("zipFile", zipFile);
      form.append("jobId", selJob._id);
      const res = await fetch(`${publicApiBaseUrl}/candidates/upload-zip`, {
        method: "POST", body: form,
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let data: { success?: boolean; error?: string; [k: string]: unknown };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        setZipErr(res.ok ? "Unexpected response from server." : `Server error (${res.status}).`);
        return;
      }
      if (!data.success) { setZipErr(data.error || "Upload failed"); }
      else {
        setZipResult(data);
        const { data: cData } = await api.get(`/candidates?jobId=${selJob._id}`);
        setCandidates(cData.data);
      }
    } catch (e: any) { setZipErr(e.message || "Upload failed"); } finally { setZipUploading(false); }
  };

  const getCand = (r: ScreeningResult): Candidate | null => typeof r.candidateId === "object" ? r.candidateId as Candidate : candidates.find(c => c._id === r.candidateId) || null;
  const availColor = (s?: string) => s === "Available" ? { bg: "#dcfce7", color: "#16a34a" } : s === "Open to Opportunities" ? { bg: "#fef9c3", color: "#b45309" } : { bg: "#fee2e2", color: "#dc2626" };

  /** Per-step pipeline status: first step vs later steps, who advanced vs “not selected” at a given step. */
  const screeningStepStatus = useCallback((c: Candidate): { label: string; bg: string; color: string; title?: string } => {
    const idStr = String(c._id);
    const stages = pipeline?.stages;

    /**
     * Eliminated at a specific step — must run BEFORE “furthest shortlist” logic.
     * Otherwise they still appear in earlier stages’ shortlistedIds and look “Shortlisted → …” by mistake.
     */
    const eliminated =
      c.status === "rejected" ||
      typeof c.rejectedAtStageIndex === "number" ||
      !!c.rejectedAtStageName?.trim();

    if (eliminated) {
      const idx = c.rejectedAtStageIndex;
      const failName =
        c.rejectedAtStageName?.trim() ||
        (typeof idx === "number" && stages?.[idx]?.name) ||
        (typeof idx === "number" ? `Step ${idx + 1}` : "Pipeline");

      /** Stage they did not enter (e.g. “Practical Assessment”) — clearer than naming the step they finished. */
      const nextStageName =
        typeof idx === "number" && stages?.length ? stages[idx + 1]?.name : undefined;

      const label = nextStageName
        ? `Not selected for ${nextStageName}`
        : `Not selected · ${failName}`;

      let title: string;
      if (typeof idx === "number" && idx > 0 && stages?.length) {
        const passedStr = stages.slice(0, idx).map(s => s.name).join(" → ");
        title = nextStageName
          ? `Completed: ${passedStr}. Not shortlisted to proceed to “${nextStageName}”.`
          : `Not shortlisted at “${failName}”.`;
      } else {
        title = nextStageName
          ? `Not shortlisted to proceed to “${nextStageName}” after “${failName}”.`
          : `Not shortlisted at “${failName}”.`;
      }

      return { label, title, bg: "#fee2e2", color: "#b91c1c" };
    }

    const hasResult = results.some(r => {
      const cid = typeof r.candidateId === "string" ? r.candidateId : (r.candidateId as Candidate)?._id;
      return String(cid) === idStr;
    });
    if (!hasResult) {
      return {
        label: "Awaiting screening",
        title: "No AI screening result for this job yet.",
        bg: "#f1f5f9",
        color: "#64748b",
      };
    }
    if (!stages?.length) {
      return { label: "Screened", title: "Screened, but no hiring pipeline loaded for this job.", bg: "#dbeafe", color: "#1d4ed8" };
    }

    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      if (st.status === "running" && (st.candidateIds || []).some(cid => String(cid) === idStr)) {
        return {
          label: `Screening · ${st.name}`,
          title: `AI is running for this step. Pool: ${st.name}.`,
          bg: "#fef9c3",
          color: "#a16207",
        };
      }
    }

    let furthest = -1;
    for (let i = 0; i < stages.length; i++) {
      if ((stages[i].shortlistedIds || []).some(sid => String(sid) === idStr)) furthest = i;
    }

    if (furthest >= 0) {
      const cleared = stages.slice(0, furthest + 1).map(s => s.name).join(" → ");
      const next = stages[furthest + 1];
      if (next) {
        return {
          label: `Shortlisted → ${next.name}`,
          title: `Passed steps: ${cleared}. In the pool for the next step (“${next.name}”). At later steps, some may proceed and some may be not shortlisted.`,
          bg: "#dcfce7",
          color: "#15803d",
        };
      }
      const lastName = stages[furthest]?.name || "Final";
      return {
        label: `Final shortlist · ${lastName}`,
        title: `Passed: ${cleared}. In the final stage pool.`,
        bg: "#ecfccb",
        color: "#3f6212",
      };
    }

    const s0 = stages[0];
    if (s0?.status === "done") {
      return {
        label: "Not shortlisted (step 1)",
        title: "Stage 1 is complete; this candidate was not in the shortlist. (If pipeline data was reset, refresh or re-run.)",
        bg: "#ffedd5",
        color: "#c2410c",
      };
    }
    return {
      label: "Screened",
      title: "Screening result exists; pipeline step 1 not completed yet or candidate not yet in a shortlist.",
      bg: "#dbeafe",
      color: "#1d4ed8",
    };
  }, [results, pipeline]);

  const columns = useMemo<ColumnDef<Candidate>[]>(() => [
    {
      id: "expander",
      header: "",
      enableColumnFilter: false,
      cell: ({ row }) => (
        <button onClick={row.getToggleExpandedHandler()} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1, display: "flex", alignItems: "center" }}>
          {row.getIsExpanded() ? "▼" : "►"}
        </button>
      ),
      size: 32,
    },
    {
      id: "no",
      header: "#",
      enableColumnFilter: false,
      cell: ({ row }) => <span style={{ color: "#64748b", fontWeight: 600, display: "block", textAlign: "center" }}>{row.index + 1}</span>,
      size: 44,
      enableSorting: false,
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (c: Candidate) => c.firstName + " " + c.lastName + " " + (c.email || ""),
      filterFn: "includesString" as const,
      cell: ({ row: { original: c } }) => (
        <div>
          <p style={{ fontWeight: 700, color: "#0f172a", margin: "0 0 2px", whiteSpace: "nowrap" }}>{c.firstName} {c.lastName}</p>
          <p style={{ color: "#94a3b8", fontSize: "0.7rem", margin: 0 }}>{c.email}</p>
        </div>
      ),
    },
    {
      id: "headline",
      header: "Headline",
      accessorFn: (c: Candidate) => c.headline || "",
      filterFn: "includesString" as const,
      cell: ({ row: { original: c } }) => (
        <p style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px", color: "#374151" }}>{c.headline || "—"}</p>
      ),
    },
    {
      id: "skills",
      header: "Top Skills",
      accessorFn: (c: Candidate) => (c.skills || []).map(s => s.name).join(" "),
      filterFn: "includesString" as const,
      cell: ({ row: { original: c } }) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
          {(c.skills || []).slice(0, 3).map(s => (
            <span key={s.name} style={{ padding: "2px 8px", borderRadius: "10px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.65rem", fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</span>
          ))}
          {(c.skills || []).length > 3 && <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>+{c.skills.length - 3}</span>}
        </div>
      ),
    },
    {
      id: "location",
      header: "Location",
      accessorFn: (c: Candidate) => c.location || "",
      filterFn: "includesString" as const,
      cell: ({ row: { original: c } }) => <span style={{ whiteSpace: "nowrap", color: "#64748b" }}>{c.location || "—"}</span>,
    },
    {
      id: "availability",
      header: "Availability",
      accessorFn: (c: Candidate) => c.availability?.status || "",
      filterFn: "includesString" as const,
      cell: ({ row: { original: c } }) => {
        const ac = availColor(c.availability?.status);
        return <span style={{ padding: "2px 9px", borderRadius: "20px", background: ac.bg, color: ac.color, fontSize: "0.68rem", fontWeight: 600, whiteSpace: "nowrap" }}>{c.availability?.status || "—"}</span>;
      },
    },
    {
      id: "screeningStatus",
      header: "Status",
      accessorFn: (c: Candidate) => {
        const s = screeningStepStatus(c);
        return `${s.label} ${s.title || ""}`;
      },
      filterFn: "includesString" as const,
      cell: ({ row: { original: c } }) => {
        const st = screeningStepStatus(c);
        return (
          <span
            title={st.title || st.label}
            style={{
              padding: "2px 9px",
              borderRadius: "20px",
              background: st.bg,
              color: st.color,
              fontSize: "0.65rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              maxWidth: "220px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          >
            {st.label}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableColumnFilter: false,
      cell: ({ row: { original: c } }) => {
        const r = results.find(x => (typeof x.candidateId === "object" ? (x.candidateId as Candidate)._id : x.candidateId) === c._id);
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setViewApplicant(c)}
              title="View full applicant profile"
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <Eye style={{ width: "13px", height: "13px" }} />
              View
            </button>
            {r && (
              <button
                type="button"
                onClick={() => { setSelResult(r); setAiJudgmentModal(r); }}
                title="View full AI judgment"
                style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2b72f0", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }}
              >
                AI judgment
              </button>
            )}
            <button type="button" onClick={() => deleteCandidate(c._id)} title="Delete"
              style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fff1f2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 style={{ width: "12px", height: "12px" }} />
            </button>
          </div>
        );
      },
    },
  ], [results, editCand, selResult, availColor, screeningStepStatus]);

  const filteredCandidates = useMemo(() => {
    if (!candSearch.trim()) return candidates;
    const q = candSearch.toLowerCase();
    return candidates.filter(c =>
      (c.firstName + " " + c.lastName).toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.headline || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q)
    );
  }, [candidates, candSearch]);

  const table = useReactTable({
    data: filteredCandidates,
    columns,
    state: { pagination, expanded, columnFilters },
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {!selJob ? (
        <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#2b72f0", margin: "0 0 4px" }}>Hire</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0 0 18px" }}>{jobs.length} position{jobs.length !== 1 ? "s" : ""}</p>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["all", "active", "draft", "closed"] as string[]).map(f => (
                <button key={f} onClick={() => setJobFilter(f)} style={{ padding: "6px 16px", borderRadius: "8px", border: "1.5px solid", borderColor: jobFilter === f ? "#2b72f0" : "#bfdbfe", background: jobFilter === f ? "#2b72f0" : "#fff", color: jobFilter === f ? "#fff" : "#64748b", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" as const }}>
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>
          {jobs.filter(j => jobFilter === "all" || j.status === jobFilter).length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
              <Briefcase strokeWidth={1} style={{ width: "52px", height: "52px", margin: "0 auto 12px", color: "#bfdbfe" }} />
              <p style={{ fontWeight: 600, color: "#64748b" }}>No jobs found</p>
              <p style={{ fontSize: "0.875rem" }}>Go to the Jobs tab to create a job posting.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "18px" }}>
              {jobs.filter(j => jobFilter === "all" || j.status === jobFilter).map(j => {
                const sc: Record<string, { bg: string; color: string }> = { active: { bg: "#dcfce7", color: "#16a34a" }, draft: { bg: "#fef9c3", color: "#a16207" }, closed: { bg: "#fee2e2", color: "#dc2626" } };
                const s = sc[j.status] || { bg: "#f1f5f9", color: "#64748b" };
                return (
                  <div key={j._id} onClick={() => { loadJob(j); setAddMode(null); setEditCand(null); }} style={{ background: "#fff", borderRadius: "14px", border: "1.5px solid #bfdbfe", padding: "20px 22px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 700, background: s.bg, color: s.color, textTransform: "capitalize" as const }}>{j.status}</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{j.department}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#2b72f0", margin: "0 0 3px" }}>{j.title}</h3>
                      <p style={{ color: "#64748b", fontSize: "0.78rem", margin: 0 }}>{j.experienceYears}+ yrs exp{j.educationLevel ? ` · ${j.educationLevel}` : ""}</p>
                    </div>
                    {j.requiredSkills.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {j.requiredSkills.slice(0, 4).map(sk => <span key={sk} style={{ padding: "2px 8px", borderRadius: "10px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.65rem", fontWeight: 600 }}>{sk}</span>)}
                        {j.requiredSkills.length > 4 && <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>+{j.requiredSkills.length - 4}</span>}
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2b72f0", display: "flex", alignItems: "center", gap: "4px" }}>View Candidates <ArrowRight style={{ width: "13px", height: "13px" }} /></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #bfdbfe", padding: "12px 32px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => { setSelJob(null); setSelResult(null); setAiJudgmentModal(null); setViewApplicant(null); setAddMode(null); setEditCand(null); setShowImportMore(false); setCandSearch(""); setExpanded({}); setColumnFilters([]); setHireSubTab("applicants"); }} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", border: "1.5px solid #bfdbfe", background: "#fff", color: "#2b72f0", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
              ← Back
            </button>
            <div style={{ width: "1px", height: "22px", background: "#bfdbfe", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: "1rem", color: "#2b72f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selJob.title}</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>{selJob.department} · {candidates.length} candidates · {results.length} screened</p>
            </div>
            {candidates.length === 0 && !loadingC ? (
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {([["form", "Manual", "#2b72f0"], ["csv", "CSV", "#16a34a"], ["paste", "Paste", "#7c3aed"], ["json", "JSON", "#1d4ed8"], ["zip", "ZIP CVs", "#475569"]] as [string, string, string][]).map(([id, lbl, clr]) => (
                  <button key={id} onClick={() => { setAddMode(addMode === id as any ? null : id as any); setEditCand(null); }} style={{ padding: "7px 12px", borderRadius: "8px", background: addMode === id ? clr : "#f8fafc", border: `1.5px solid ${addMode === id ? clr : "#e2e8f0"}`, color: addMode === id ? "#fff" : clr, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            ) : candidates.length > 0 ? (
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => { setAddMode(addMode === "form" ? null : "form"); setEditCand(null); setShowImportMore(false); }} style={{ padding: "7px 14px", borderRadius: "8px", background: addMode === "form" ? "#2b72f0" : "#f8fafc", border: `1.5px solid ${addMode === "form" ? "#2b72f0" : "#bfdbfe"}`, color: addMode === "form" ? "#fff" : "#2b72f0", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                  + Add Candidate
                </button>
                <button onClick={() => { setShowImportMore(v => !v); setAddMode(null); setEditCand(null); }} style={{ padding: "7px 12px", borderRadius: "8px", background: showImportMore ? "#f1f5f9" : "#f8fafc", border: "1.5px solid #e2e8f0", color: "#64748b", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                  Import {showImportMore ? "▴" : "▾"}
                </button>
                {showImportMore && ([["csv", "CSV", "#16a34a"], ["paste", "Paste", "#7c3aed"], ["json", "JSON", "#1d4ed8"], ["zip", "ZIP CVs", "#475569"]] as [string, string, string][]).map(([id, lbl, clr]) => (
                  <button key={id} onClick={() => { setAddMode(addMode === id as any ? null : id as any); setEditCand(null); }} style={{ padding: "7px 12px", borderRadius: "8px", background: addMode === id ? clr : "#f8fafc", border: `1.5px solid ${addMode === id ? clr : "#e2e8f0"}`, color: addMode === id ? "#fff" : clr, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            ) : null}
            {candidates.length > 0 && (
              <button onClick={clearAllCandidates} style={{ padding: "7px 14px", borderRadius: "8px", border: "1.5px solid #fecaca", background: "#fff1f2", color: "#ef4444", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                Clear All
              </button>
            )}
          </div>

          {/* Sub-tabs navigation */}
          <div style={{ position: "sticky", top: 56, zIndex: 9, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "8px 32px", display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => setHireSubTab("applicants")} style={{ padding: "7px 16px", borderRadius: "8px", border: "1.5px solid", borderColor: hireSubTab === "applicants" ? "#2b72f0" : "#e2e8f0", background: hireSubTab === "applicants" ? "#2b72f0" : "#fff", color: hireSubTab === "applicants" ? "#fff" : "#64748b", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
              <Users style={{ width: "14px", height: "14px" }} />
              Applicants ({candidates.length})
            </button>
            <button onClick={() => setHireSubTab("screening")} disabled={candidates.length === 0} style={{ padding: "7px 16px", borderRadius: "8px", border: "1.5px solid", borderColor: hireSubTab === "screening" ? "#2b72f0" : "#e2e8f0", background: hireSubTab === "screening" ? "#2b72f0" : "#fff", color: hireSubTab === "screening" ? "#fff" : candidates.length === 0 ? "#94a3b8" : "#64748b", fontSize: "0.78rem", fontWeight: 700, cursor: candidates.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
              <Layers style={{ width: "14px", height: "14px" }} />
              AI Screening Playground
            </button>
          </div>
        {selJob && hireSubTab === "applicants" && (() => {
          const topSkills = Object.entries(candidates.flatMap(c => c.skills || []).reduce((acc: Record<string, number>, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
          const availData = Object.entries(candidates.reduce((acc: Record<string, number>, c) => { const s = c.availability?.status || "Unknown"; acc[s] = (acc[s] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
          const levelData = [{ name: "Beginner", count: 0 }, { name: "Intermediate", count: 0 }, { name: "Advanced", count: 0 }, { name: "Expert", count: 0 }].map(d => ({ ...d, count: candidates.flatMap(c => c.skills || []).filter(s => s.level === d.name).length }));
          const eduData = Object.entries(candidates.reduce((acc: Record<string, number>, c) => { const d = c.education?.[0]?.degree || "Unknown"; acc[d] = (acc[d] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
          const AVAIL_COLORS: Record<string, string> = { "Available": "#22c55e", "Open to Opportunities": "#f59e0b", "Not Available": "#ef4444", "Unknown": "#94a3b8" };
          const LEVEL_COLORS = ["#bfdbfe", "#60a5fa", "#2b72f0", "#1d4ed8"];
          const thStyle: React.CSSProperties = { padding: "11px 14px", fontSize: "0.65rem", fontWeight: 700, color: "#fff", textAlign: "left", letterSpacing: "0.08em", background: "#2b72f0", border: "1px solid #bfdbfe", whiteSpace: "nowrap" };
          const tdStyle: React.CSSProperties = { padding: "11px 14px", fontSize: "0.8rem", color: "#0f172a", verticalAlign: "middle", border: "1px solid #bfdbfe" };
          return (
            <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "28px" }}>

              {screenMsg && <div style={{ display: "flex", alignItems: "center", gap: "8px", color: screenMsg.startsWith("Error") ? "#dc2626" : "#16a34a", fontSize: "0.875rem", padding: "10px 14px", background: "#fff", borderRadius: "10px", border: `1px solid ${screenMsg.startsWith("Error") ? "#fecaca" : "#bbf7d0"}` }}>{screenMsg.startsWith("Error") ? <X style={{ width: "14px", height: "14px", flexShrink: 0 }} /> : <Check style={{ width: "14px", height: "14px", flexShrink: 0 }} />}{screenMsg}</div>}

              {/* ── 2. Inline Forms ── */}
              {(addMode || editCand) && (
                <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${editCand ? "#fbbf24" : "#bfdbfe"}`, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  {addMode === "form" && (
                    <form onSubmit={addCandidate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Add Candidate Manually</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                        {([["First Name *", "firstName", "Jane"], ["Last Name *", "lastName", "Doe"], ["Email *", "email", "jane@acme.com"]] as [string, string, string][]).map(([lbl, k, ph]) => (
                          <div key={k}><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{lbl}</label><input required={lbl.endsWith("*")} placeholder={ph} value={(addForm as any)[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }} /></div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {([["Headline *", "headline", "Backend Engineer – Node.js"], ["Location", "location", "Kigali, Rwanda"]] as [string, string, string][]).map(([lbl, k, ph]) => (
                          <div key={k}><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{lbl}</label><input required={lbl.endsWith("*")} placeholder={ph} value={(addForm as any)[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }} /></div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "10px" }}>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Skills (comma-sep)</label><input placeholder="Python, SQL, React" value={addForm.skills} onChange={e => setAddForm(f => ({ ...f, skills: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }} /></div>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Level</label><select value={addForm.skillLevel} onChange={e => setAddForm(f => ({ ...f, skillLevel: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.8rem", outline: "none" }}>{["Beginner", "Intermediate", "Advanced", "Expert"].map(l => <option key={l}>{l}</option>)}</select></div>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Avail. Status</label><select value={addForm.availStatus} onChange={e => setAddForm(f => ({ ...f, availStatus: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.78rem", outline: "none" }}>{["Available", "Open to Opportunities", "Not Available"].map(l => <option key={l}>{l}</option>)}</select></div>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Avail. Type</label><select value={addForm.availType} onChange={e => setAddForm(f => ({ ...f, availType: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.78rem", outline: "none" }}>{["Full-time", "Part-time", "Contract"].map(l => <option key={l}>{l}</option>)}</select></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                        {([["Role", "role", "Software Engineer"], ["Company", "company", "Acme Corp"], ["Institution", "institution", "MIT"], ["Field of Study", "fieldOfStudy", "Computer Science"]] as [string, string, string][]).map(([lbl, k, ph]) => (
                          <div key={k}><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{lbl}</label><input placeholder={ph} value={(addForm as any)[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #93c5fd", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }} /></div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => setAddMode(null)} style={{ padding: "9px 20px", borderRadius: "8px", background: "#f1f5f9", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ padding: "9px 20px", borderRadius: "8px", background: "#2b72f0", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>{saving ? "Saving…" : "Save Candidate"}</button>
                      </div>
                    </form>
                  )}
                  {addMode === "csv" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Upload CSV file</p>
                      <p style={{ fontSize: "0.68rem", color: "#94a3b8", margin: 0 }}>Columns: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px" }}>firstName, lastName, email, headline, location, skills (;-sep), role, company, degree, institution, availabilityStatus, availabilityType</code></p>
                      <input type="file" accept=".csv,text/csv" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => { const rows = parseCSV(ev.target?.result as string); setCsvRows(rows); setCsvErr(rows.length ? "" : "No valid rows found."); }; reader.readAsText(file); }} />
                      {csvRows.length > 0 && <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "10px 12px", border: "1px solid #86efac" }}><p style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600, margin: "0 0 4px" }}>{csvRows.length} candidates ready</p>{csvRows.slice(0, 3).map((r: any, i: number) => <p key={i} style={{ fontSize: "0.7rem", color: "#374151", margin: 0 }}>{r.firstName} {r.lastName} · {r.email}</p>)}{csvRows.length > 3 && <p style={{ fontSize: "0.68rem", color: "#94a3b8", margin: 0 }}>+{csvRows.length - 3} more…</p>}</div>}
                      {csvErr && <p style={{ color: "#dc2626", fontSize: "0.75rem", margin: 0 }}>{csvErr}</p>}
                      {csvUploading && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #86efac" }}>
                          <Loader2 style={{ width: "15px", height: "15px", color: "#16a34a", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: 600 }}>Uploading {csvRows.length} candidates… please wait.</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setAddMode(null); setCsvRows([]); setCsvErr(""); }} disabled={csvUploading} style={{ padding: "9px 20px", borderRadius: "8px", background: "#f1f5f9", border: "none", cursor: csvUploading ? "not-allowed" : "pointer", fontSize: "0.8rem", color: "#475569", fontWeight: 600, opacity: csvUploading ? 0.5 : 1 }}>Cancel</button>
                        <button onClick={csvUpload} disabled={!csvRows.length || csvUploading} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", borderRadius: "8px", background: "#16a34a", color: "#fff", border: "none", cursor: !csvRows.length || csvUploading ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 600, opacity: !csvRows.length ? 0.5 : 1 }}>{csvUploading && <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />}{csvUploading ? "Uploading…" : `Import ${csvRows.length || ""}`}</button>
                      </div>
                    </div>
                  )}
                  {addMode === "paste" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Paste from spreadsheet</p>
                      <p style={{ fontSize: "0.68rem", color: "#94a3b8", margin: 0 }}>Columns: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px" }}>FirstName, LastName, Email, Headline, Location, Skills(;sep), Role, Company</code></p>
                      <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={5} disabled={pasteUploading} placeholder={"Jane\tDoe\tjane@acme.com\tBackend Engineer\tKigali,Rwanda\tPython;SQL\tEngineer\tAcme"} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d8b4fe", fontSize: "0.78rem", outline: "none", fontFamily: "monospace", boxSizing: "border-box", resize: "vertical", opacity: pasteUploading ? 0.5 : 1 }} />
                      {pasteErr && <p style={{ color: "#dc2626", fontSize: "0.75rem", margin: 0 }}>{pasteErr}</p>}
                      {pasteUploading && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "8px", background: "#f5f3ff", border: "1px solid #d8b4fe" }}>
                          <Loader2 style={{ width: "15px", height: "15px", color: "#7c3aed", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.75rem", color: "#6d28d9", fontWeight: 600 }}>Uploading candidates…</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setAddMode(null); setPasteText(""); setPasteErr(""); }} disabled={pasteUploading} style={{ padding: "9px 20px", borderRadius: "8px", background: "#f1f5f9", border: "none", cursor: pasteUploading ? "not-allowed" : "pointer", fontSize: "0.8rem", color: "#475569", fontWeight: 600, opacity: pasteUploading ? 0.5 : 1 }}>Cancel</button>
                        <button onClick={pasteUpload} disabled={pasteUploading || !pasteText.trim()} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", borderRadius: "8px", background: "#7c3aed", color: "#fff", border: "none", cursor: pasteUploading || !pasteText.trim() ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 600, opacity: !pasteText.trim() ? 0.5 : 1 }}>{pasteUploading && <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />}{pasteUploading ? "Uploading…" : "Import"}</button>
                      </div>
                    </div>
                  )}
                  {addMode === "json" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Paste or load JSON</p>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1px dashed #fed7aa", cursor: jsonUploading ? "not-allowed" : "pointer", fontSize: "0.75rem", color: "#ea580c", fontWeight: 600, width: "fit-content", opacity: jsonUploading ? 0.5 : 1 }}><Upload style={{ width: "13px", height: "13px" }} />Load .json file<input type="file" accept=".json" disabled={jsonUploading} style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setJsonText(ev.target?.result as string); r.readAsText(f); }} /></label>
                      <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={6} disabled={jsonUploading} placeholder={'{"applicants": [{"firstName":"...","email":"...",...}]}'} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #fed7aa", fontSize: "0.75rem", outline: "none", fontFamily: "monospace", boxSizing: "border-box", resize: "vertical", opacity: jsonUploading ? 0.5 : 1 }} />
                      {jsonErr && <p style={{ color: "#dc2626", fontSize: "0.75rem", margin: 0 }}>{jsonErr}</p>}
                      {jsonUploading && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "8px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
                          <Loader2 style={{ width: "15px", height: "15px", color: "#ea580c", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.75rem", color: "#c2410c", fontWeight: 600 }}>Uploading candidates… this may take a moment for large files.</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setAddMode(null); setJsonText(""); setJsonErr(""); }} disabled={jsonUploading} style={{ padding: "9px 20px", borderRadius: "8px", background: "#f1f5f9", border: "none", cursor: jsonUploading ? "not-allowed" : "pointer", fontSize: "0.8rem", color: "#475569", fontWeight: 600, opacity: jsonUploading ? 0.5 : 1 }}>Cancel</button>
                        <button onClick={bulkUpload} disabled={jsonUploading || !jsonText.trim()} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", borderRadius: "8px", background: jsonUploading ? "#f97316" : "#ea580c", color: "#fff", border: "none", cursor: jsonUploading || !jsonText.trim() ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 600, opacity: !jsonText.trim() ? 0.5 : 1 }}>{jsonUploading && <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />}{jsonUploading ? "Uploading…" : "Upload"}</button>
                      </div>
                    </div>
                  )}
                  {addMode === "zip" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>ZIP archive of PDF CVs</p>
                      <p style={{ fontSize: "0.68rem", color: "#94a3b8", margin: 0 }}>Upload a <code>.zip</code> of PDF resumes — OpenAI parses each CV automatically.</p>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "6px", padding: "20px", borderRadius: "10px", border: zipFile ? "1px solid #f0abfc" : "2px dashed #f0abfc", cursor: "pointer", background: zipFile ? "#fdf2f8" : "#fff" }}><Archive style={{ width: "24px", height: "24px", color: "#a21caf" }} /><span style={{ fontSize: "0.78rem", color: "#a21caf", fontWeight: 600 }}>{zipFile ? zipFile.name : "Click to select .zip file"}</span>{zipFile && <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{(zipFile.size / 1024 / 1024).toFixed(1)} MB</span>}<input type="file" accept=".zip" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0] || null; setZipFile(f); setZipResult(null); setZipErr(""); }} /></label>
                      {zipResult && <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "10px 12px", border: "1px solid #86efac" }}><p style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 700, margin: "0 0 4px" }}>{zipResult.imported} imported · {zipResult.failed} failed / {zipResult.total} PDFs</p>{zipResult.results?.slice(0, 5).map((r: any, i: number) => <p key={i} style={{ fontSize: "0.68rem", color: r.status === "ok" ? "#374151" : "#dc2626", margin: 0 }}>{r.status === "ok" ? "✓" : "✗"} {r.name || r.file}</p>)}</div>}
                      {zipErr && <p style={{ color: "#dc2626", fontSize: "0.75rem", margin: 0 }}>{zipErr}</p>}
                      {zipUploading && <p style={{ fontSize: "0.75rem", color: "#a21caf", fontWeight: 600, margin: 0 }}>Parsing CVs with OpenAI — this may take a minute…</p>}
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setAddMode(null); setZipFile(null); setZipResult(null); setZipErr(""); }} style={{ padding: "9px 20px", borderRadius: "8px", background: "#f1f5f9", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>Close</button>
                        <button onClick={zipUpload} disabled={!zipFile || zipUploading} style={{ padding: "9px 20px", borderRadius: "8px", background: "#a21caf", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, opacity: !zipFile || zipUploading ? 0.5 : 1 }}>{zipUploading ? "Parsing…" : "Parse & Import"}</button>
                      </div>
                    </div>
                  )}
                  {editCand && (
                    <form onSubmit={updateCandidate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e", margin: 0 }}>✏️ Editing: {editCand.firstName} {editCand.lastName}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                        {([["First Name", "firstName"], ["Last Name", "lastName"], ["Email", "email"]] as [string, string][]).map(([lbl, k]) => (
                          <div key={k}><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{lbl}</label><input value={(addForm as any)[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #fbbf24", fontSize: "0.8rem", outline: "none", boxSizing: "border-box", background: "#fff" }} /></div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {([["Headline", "headline"], ["Location", "location"]] as [string, string][]).map(([lbl, k]) => (
                          <div key={k}><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{lbl}</label><input value={(addForm as any)[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #fbbf24", fontSize: "0.8rem", outline: "none", boxSizing: "border-box", background: "#fff" }} /></div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "10px" }}>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Skills (comma-sep)</label><input value={addForm.skills} onChange={e => setAddForm(f => ({ ...f, skills: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #fbbf24", fontSize: "0.8rem", outline: "none", boxSizing: "border-box", background: "#fff" }} /></div>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Level</label><select value={addForm.skillLevel} onChange={e => setAddForm(f => ({ ...f, skillLevel: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #fbbf24", fontSize: "0.78rem", outline: "none", background: "#fff" }}>{["Beginner", "Intermediate", "Advanced", "Expert"].map(l => <option key={l}>{l}</option>)}</select></div>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Avail. Status</label><select value={addForm.availStatus} onChange={e => setAddForm(f => ({ ...f, availStatus: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #fbbf24", fontSize: "0.78rem", outline: "none", background: "#fff" }}>{["Available", "Open to Opportunities", "Not Available"].map(l => <option key={l}>{l}</option>)}</select></div>
                        <div><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Avail. Type</label><select value={addForm.availType} onChange={e => setAddForm(f => ({ ...f, availType: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #fbbf24", fontSize: "0.78rem", outline: "none", background: "#fff" }}>{["Full-time", "Part-time", "Contract"].map(l => <option key={l}>{l}</option>)}</select></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {([["Role", "role"], ["Company", "company"]] as [string, string][]).map(([lbl, k]) => (
                          <div key={k}><label style={{ fontSize: "0.6rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{lbl}</label><input value={(addForm as any)[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #fbbf24", fontSize: "0.8rem", outline: "none", boxSizing: "border-box", background: "#fff" }} /></div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => { setEditCand(null); setAddForm(blankForm); }} style={{ padding: "9px 20px", borderRadius: "8px", background: "#f1f5f9", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ padding: "9px 20px", borderRadius: "8px", background: "#d97706", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>{saving ? "Saving…" : "Update Candidate"}</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ── 3. Applicant Analytics ── */}
              {candidates.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <BarChart2 style={{ width: "17px", height: "17px", color: "#2b72f0" }} />
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Applicant Analytics</h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                    {[
                      { label: "Total Applicants", value: candidates.length, color: "#2b72f0" },
                      { label: "Available Now",    value: candidates.filter(c => c.availability?.status === "Available").length, color: "#16a34a" },
                      { label: "With Projects",    value: candidates.filter(c => (c.projects?.length ?? 0) > 0).length, color: "#1e3a8a" },
                      { label: "AI Screened",      value: results.length, color: "#1d4ed8" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #bfdbfe" }}>
                        <p style={{ fontSize: "1.9rem", fontWeight: 800, color: s.color, lineHeight: 1, margin: "0 0 4px" }}>{s.value}</p>
                        <p style={{ fontSize: "0.65rem", fontWeight: 600, color: "#64748b", margin: 0 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                    <div style={{ background: "#fff", borderRadius: "10px", padding: "18px 16px", border: "1px solid #bfdbfe" }}>
                      <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", marginBottom: "12px" }}>TOP SKILLS</p>
                      {topSkills.length > 0 ? <ResponsiveContainer width="100%" height={190}><BarChart data={topSkills} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}><XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} width={80} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontSize: "0.75rem", borderRadius: "8px" }} /><Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={18}>{topSkills.map((_, i) => <Cell key={i} fill={(["#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#2563eb","#2b72f0","#1d4ed8","#1e3a8a"][i]) || "#2b72f0"} />)}</Bar></BarChart></ResponsiveContainer> : <p style={{ color: "#94a3b8", fontSize: "0.78rem", textAlign: "center", padding: "40px 0" }}>No skill data yet</p>}
                    </div>
                    <div style={{ background: "#fff", borderRadius: "10px", padding: "18px 16px", border: "1px solid #bfdbfe" }}>
                      <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", marginBottom: "12px" }}>AVAILABILITY STATUS</p>
                      {availData.length > 0 ? <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={availData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={72} paddingAngle={4}>{availData.map((entry, i) => <Cell key={i} fill={AVAIL_COLORS[entry.name] || "#94a3b8"} />)}</Pie><Tooltip contentStyle={{ fontSize: "0.75rem", borderRadius: "8px" }} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.7rem" }} /></PieChart></ResponsiveContainer> : <p style={{ color: "#94a3b8", fontSize: "0.78rem", textAlign: "center", padding: "40px 0" }}>No data yet</p>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div style={{ background: "#fff", borderRadius: "10px", padding: "18px 16px", border: "1px solid #bfdbfe" }}>
                      <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", marginBottom: "12px" }}>SKILL PROFICIENCY LEVELS</p>
                      <ResponsiveContainer width="100%" height={150}><BarChart data={levelData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontSize: "0.75rem", borderRadius: "8px" }} /><Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={40}>{levelData.map((_, i) => <Cell key={i} fill={LEVEL_COLORS[i]} />)}</Bar></BarChart></ResponsiveContainer>
                    </div>
                    <div style={{ background: "#fff", borderRadius: "10px", padding: "18px 16px", border: "1px solid #bfdbfe" }}>
                      <p style={{ fontSize: "0.63rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", marginBottom: "12px" }}>EDUCATION LEVELS</p>
                      {eduData.length > 0 ? <ResponsiveContainer width="100%" height={150}><BarChart data={eduData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 9, fill: "#374151" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontSize: "0.75rem", borderRadius: "8px" }} /><Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={40} fill="#2b72f0" /></BarChart></ResponsiveContainer> : <p style={{ color: "#94a3b8", fontSize: "0.78rem", textAlign: "center", padding: "40px 0" }}>No education data</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4. Candidates Table ── */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <Users style={{ width: "17px", height: "17px", color: "#2b72f0" }} />
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Applicants</h3>
                  <span style={{ padding: "2px 10px", borderRadius: "20px", background: "#eff6ff", color: "#2b72f0", fontSize: "0.72rem", fontWeight: 700 }}>{candidates.length}</span>
                </div>
                {loadingC ? (
                  <div style={{ padding: "40px", textAlign: "center" }}><Loader2 style={{ width: "28px", height: "28px", color: "#2b72f0", animation: "spin 1s linear infinite" }} /></div>
                ) : candidates.length === 0 ? (
                  <div style={{ background: "#fff", borderRadius: "10px", padding: "48px", textAlign: "center", color: "#94a3b8", border: "1px solid #bfdbfe" }}>
                    <Users strokeWidth={1} style={{ width: "40px", height: "40px", margin: "0 auto 10px", color: "#bfdbfe" }} />
                    <p style={{ fontWeight: 600, marginBottom: "4px", color: "#64748b" }}>No applicants yet</p>
                    <p style={{ fontSize: "0.875rem" }}>Use the Add buttons above to add candidates.</p>
                  </div>
                ) : (
                  <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #bfdbfe" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <select value={pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))} style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none", cursor: "pointer" }}>
                          {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>entries per page</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Search:</span>
                        <input value={candSearch} onChange={e => { setCandSearch(e.target.value); table.setPageIndex(0); }} style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none", width: "180px" }} />
                      </div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id} style={{ borderBottom: "2px solid #e2e8f0" }}>
                              {hg.headers.map(h => (
                                <th key={h.id} style={{ padding: "8px 14px 8px", fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", textAlign: "left", whiteSpace: "nowrap", verticalAlign: "top" }}>
                                  <div style={{ marginBottom: h.column.getCanFilter() ? "6px" : 0 }}>
                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                  </div>
                                  {h.column.getCanFilter() && (
                                    <input
                                      value={(h.column.getFilterValue() as string) ?? ""}
                                      onChange={e => { h.column.setFilterValue(e.target.value || undefined); table.setPageIndex(0); }}
                                      style={{ width: "100%", padding: "3px 7px", borderRadius: "5px", border: "1px solid #e2e8f0", fontSize: "0.72rem", fontWeight: 400, outline: "none", background: "#fff", color: "#374151", minWidth: "60px" }}
                                    />
                                  )}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody>
                          {table.getRowModel().rows.flatMap(row => {
                            const c = row.original;
                            const r = results.find(x => (typeof x.candidateId === "object" ? (x.candidateId as Candidate)._id : x.candidateId) === c._id);
                            const rows = [
                              <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9", background: editCand?._id === c._id ? "#fffbeb" : "transparent" }}>
                                {row.getVisibleCells().map(cell => (
                                  <td key={cell.id} style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#374151", verticalAlign: "middle" }}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                ))}
                              </tr>
                            ];
                            if (row.getIsExpanded()) rows.push(
                              <tr key={row.id + "-exp"} style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                <td colSpan={table.getAllColumns().length} style={{ padding: "14px 20px 14px 52px" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                                    {c.headline && <div><p style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", margin: "0 0 3px" }}>HEADLINE</p><p style={{ fontSize: "0.8rem", color: "#374151", margin: 0 }}>{c.headline}</p></div>}
                                    {c.experience?.[0] && <div><p style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", margin: "0 0 3px" }}>EXPERIENCE</p><p style={{ fontSize: "0.8rem", color: "#374151", margin: 0 }}>{c.experience[0].role} @ {c.experience[0].company}</p></div>}
                                    {c.education?.[0] && <div><p style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", margin: "0 0 3px" }}>EDUCATION</p><p style={{ fontSize: "0.8rem", color: "#374151", margin: 0 }}>{c.education[0].degree} · {c.education[0].institution}</p></div>}
                                    {r && <div><p style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", margin: "0 0 3px" }}>AI SCORE</p><p style={{ fontSize: "1rem", fontWeight: 800, color: scoreColor(r.overallScore), margin: 0 }}>{r.overallScore}/100</p></div>}
                                    {(c.socialLinks?.linkedin || c.socialLinks?.github) && <div><p style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", margin: "0 0 4px" }}>LINKS</p><div style={{ display: "flex", gap: "10px" }}>{c.socialLinks?.linkedin && <a href={c.socialLinks.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "#2b72f0", textDecoration: "none" }}>LinkedIn ↗</a>}{c.socialLinks?.github && <a href={c.socialLinks.github} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "#2b72f0", textDecoration: "none" }}>GitHub ↗</a>}</div></div>}
                                  </div>
                                </td>
                              </tr>
                            );
                            return rows;
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "0.78rem", color: "#2b72f0" }}>
                        Showing {table.getFilteredRowModel().rows.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1} to {Math.min((pagination.pageIndex + 1) * pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length} entries{(candSearch || columnFilters.length > 0) ? ` (filtered from ${candidates.length} total)` : ""}
                      </span>
                      <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                        <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} style={{ padding: "5px 9px", borderRadius: "5px", border: "1px solid #e2e8f0", background: "transparent", color: !table.getCanPreviousPage() ? "#cbd5e1" : "#374151", cursor: !table.getCanPreviousPage() ? "default" : "pointer", fontSize: "0.8rem" }}>«</button>
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} style={{ padding: "5px 9px", borderRadius: "5px", border: "1px solid #e2e8f0", background: "transparent", color: !table.getCanPreviousPage() ? "#cbd5e1" : "#374151", cursor: !table.getCanPreviousPage() ? "default" : "pointer", fontSize: "0.8rem" }}>‹</button>
                        {(() => {
                          const total = table.getPageCount();
                          const cur = pagination.pageIndex;
                          const pages: (number | "…")[] = [];
                          for (let i = 0; i < total; i++) {
                            if (i === 0 || i === total - 1 || (i >= cur - 2 && i <= cur + 2)) {
                              pages.push(i);
                            } else if (pages[pages.length - 1] !== "…") {
                              pages.push("…");
                            }
                          }
                          return pages.map((p, idx) =>
                            p === "…"
                              ? <span key={"el" + idx} style={{ padding: "0 4px", color: "#94a3b8", fontSize: "0.85rem", lineHeight: "30px" }}>…</span>
                              : <button key={p} onClick={() => table.setPageIndex(p as number)} style={{ width: "30px", height: "30px", borderRadius: "5px", border: "1px solid", borderColor: (p as number) === cur ? "#2b72f0" : "#e2e8f0", background: (p as number) === cur ? "#2b72f0" : "transparent", color: (p as number) === cur ? "#fff" : "#374151", cursor: "pointer", fontSize: "0.78rem", fontWeight: (p as number) === cur ? 700 : 400 }}>{(p as number) + 1}</button>
                          );
                        })()}
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} style={{ padding: "5px 9px", borderRadius: "5px", border: "1px solid #e2e8f0", background: "transparent", color: !table.getCanNextPage() ? "#cbd5e1" : "#374151", cursor: !table.getCanNextPage() ? "default" : "pointer", fontSize: "0.8rem" }}>›</button>
                        <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} style={{ padding: "5px 9px", borderRadius: "5px", border: "1px solid #e2e8f0", background: "transparent", color: !table.getCanNextPage() ? "#cbd5e1" : "#374151", cursor: !table.getCanNextPage() ? "default" : "pointer", fontSize: "0.8rem" }}>»</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {/* ── AI Screening Playground (Separate Tab) ── */}
        {selJob && hireSubTab === "screening" && (() => {
          const currentStageIdx = pipeline?.currentStageIndex || 0;
          const viewingStageIdx = Math.min(activeStageIndex, currentStageIdx);
          const activeStage = pipeline?.stages?.[viewingStageIdx];
          const isCurrentStage = viewingStageIdx === currentStageIdx;
          const isPastStage = viewingStageIdx < currentStageIdx;
          // Get candidates for this stage: prefer saved candidateIds, then fall back to
          // deriving the pool from the previous stage's shortlist (handles legacy data
          // where candidateIds was not persisted, or newly created pending stages).
          const candidatesInStage = activeStage
            ? (activeStage.candidateIds?.length
                ? activeStage.candidateIds
                : viewingStageIdx === 0
                  ? candidates.map(c => c._id)
                  : pipeline?.stages[viewingStageIdx - 1]?.shortlistedIds || [])
            : [];
          // Convert to strings for reliable comparison (handles ObjectId vs string mismatch)
          const candidatesInStageStr = candidatesInStage.map(id => String(id));
          // Show results for done stages (and past stages regardless of status flag).
          // Using candidatesInStageStr to scope results to this stage's candidate pool.
          const stageResults = (activeStage?.status === "done" || isPastStage) && candidatesInStageStr.length > 0
            ? results.filter(r => {
                const cid = typeof r.candidateId === "string" ? r.candidateId : r.candidateId?._id;
                return candidatesInStageStr.includes(String(cid));
              })
            : [];
          const sortedStageResults = stageResults.sort((a, b) => b.overallScore - a.overallScore);
          const stageConfirmed = activeStage?.status === "done" && activeStage?.shortlistedIds && activeStage.shortlistedIds.length > 0;

          const saveHrInputs = async (idx: number) => {
            const inputs = unsavedHr[idx];
            if (!inputs) return;
            try {
              await api.patch(`/pipeline/${selJob!._id}/stage/${idx}/hr-inputs`, { ...pipeline!.stages[idx].hrInputs, ...inputs });
              setPipeline(prev => {
                if (!prev) return prev;
                const stages = [...prev.stages];
                stages[idx] = { ...stages[idx], hrInputs: { ...stages[idx].hrInputs, ...inputs } };
                return { ...prev, stages };
              });
              setUnsavedHr(prev => { const copy = { ...prev }; delete copy[idx]; return copy; });
            } catch { alert("Failed to save HR guidance"); }
          };

          const stopRunPolling = () => {
            if (runPollingRef.current) { clearInterval(runPollingRef.current); runPollingRef.current = null; }
          };

          const finishRun = async (statusData: any, idx: number) => {
            stopRunPolling();
            setStageRunProgress(null);
            // Re-fetch pipeline + results after background job finished
            const [pipelineRes, newResults, candRes] = await Promise.all([
              api.get(`/pipeline/${selJob!._id}`),
              api.get(`/screening/results/${selJob!._id}`),
              api.get(`/candidates?jobId=${selJob!._id}`),
            ]);
            if (pipelineRes.data.success) {
              const freshPipeline: IPipeline = pipelineRes.data.data;
              setPipeline(freshPipeline);
              const shortlistIds = (freshPipeline.stages[idx]?.shortlistedIds || []).map(String);
              setStageShortlist(prev => ({ ...prev, [idx]: shortlistIds }));
              const tc = freshPipeline.stages[idx]?.hrInputs?.targetCount ?? 0;
              const n = shortlistIds.length;
              const failedNote = (statusData?.failed ?? 0) > 0 ? ` (${statusData.failed} failed — check console)` : "";
              setPipelineMsg(
                tc > 0
                  ? `Done — AI pre-selected ${n} of ${statusData?.total ?? "?"} candidate(s) for shortlist (target ${tc}).${failedNote} Review & confirm.`
                  : `Done — screened ${statusData?.processed ?? "?"}/${statusData?.total ?? "?"} candidates.${failedNote} Select your shortlist and confirm.`
              );
            }
            setResults(newResults.data.data);
            setCandidates(candRes.data.data);
            setPipelineRunning(false);
            setTimeout(() => setPipelineMsg(""), 8000);
          };

          const runStage = async (idx: number) => {
            await saveHrInputs(idx);
            stopRunPolling();
            setPipelineRunning(true);
            setStageRunProgress(null);
            setPipelineMsg("Starting AI screening…");
            try {
              const { data } = await api.post(`/pipeline/${selJob!._id}/stage/${idx}/run`);
              if (!data.success) { setPipelineMsg("Error starting run."); setPipelineRunning(false); return; }

              if (data.data.alreadyRunning) {
                setPipelineMsg(`Run already in progress (${data.data.total} candidates)…`);
              } else {
                setStageRunProgress({ processed: 0, total: data.data.total, failed: 0 });
                setPipelineMsg(`Screening ${data.data.total} candidates…`);
              }

              // Poll /run/status every 2.5s
              runPollingRef.current = setInterval(async () => {
                try {
                  const { data: s } = await api.get(`/pipeline/${selJob!._id}/stage/${idx}/run/status`);
                  if (!s.success) return;
                  const st = s.data;
                  if (st.idle && st.alreadyDone) {
                    await finishRun(null, idx);
                    return;
                  }
                  if (st.idle) return;
                  setStageRunProgress({ processed: st.processed, total: st.total, failed: st.failed });
                  setPipelineMsg(`Screening ${st.processed}/${st.total} candidates…${st.failed > 0 ? ` (${st.failed} failed)` : ""}`);
                  if (st.done) { await finishRun(st, idx); }
                } catch { /* transient network error — keep polling */ }
              }, 2500);

            } catch (e: any) {
              setPipelineMsg("Error: " + (e.response?.data?.error || e.message));
              setPipelineRunning(false);
              setStageRunProgress(null);
              setTimeout(() => setPipelineMsg(""), 5000);
            }
          };

          const confirmShortlist = async (idx: number) => {
            const ids = stageShortlist[idx] || [];
            try {
              const { data } = await api.post(`/pipeline/${selJob!._id}/stage/${idx}/shortlist`, { shortlistedIds: ids });
              if (data.success) {
                setPipeline(data.data);
                setActiveStageIndex(data.data.currentStageIndex);
                const { data: candData } = await api.get(`/candidates?jobId=${selJob!._id}`);
                setCandidates(candData.data);
                setPipelineMsg(`Shortlist confirmed — ${data.data.stages[idx].name} complete.`);
              }
            } catch { alert("Failed to confirm shortlist"); }
            finally { setTimeout(() => setPipelineMsg(""), 4000); }
          };

          const confirmShortlistAndAdvance = async (idx: number) => {
            await confirmShortlist(idx);
            // Auto-advance to next stage if available
            if (pipeline && idx < pipeline.stages.length - 1) {
              setActiveStageIndex(idx + 1);
            }
          };

          return (
            <div style={{ padding: "24px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Layers style={{ width: "18px", height: "18px", color: "#2b72f0" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#2b72f0", margin: 0 }}>AI Screening Playground</h3>
                {pipelineLoading && <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />}
                {pipelineMsg && <span style={{ fontSize: "0.75rem", color: pipelineRunning ? "#2b72f0" : "#16a34a", fontWeight: 600 }}>{pipelineMsg}</span>}
              {stageRunProgress && (() => {
                const pct = stageRunProgress.total > 0 ? Math.round((stageRunProgress.processed / stageRunProgress.total) * 100) : 0;
                // ETA: based on elapsed time and remaining candidates
                const startedAt = (stageRunProgress as any).startedAt;
                let etaStr = "";
                if (startedAt && stageRunProgress.processed > 0 && pct < 100) {
                  const elapsedMs = Date.now() - new Date(startedAt).getTime();
                  const msPerCandidate = elapsedMs / stageRunProgress.processed;
                  const remaining = stageRunProgress.total - stageRunProgress.processed;
                  const etaSec = Math.round((msPerCandidate * remaining) / 1000);
                  etaStr = etaSec > 60 ? ` · ~${Math.round(etaSec / 60)}m left` : ` · ~${etaSec}s left`;
                }
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: 160, height: 7, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: "#2b72f0", width: `${pct}%`, transition: "width 0.5s ease" }} />
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {stageRunProgress.processed}/{stageRunProgress.total} ({pct}%){etaStr}
                      {stageRunProgress.failed > 0 && <span style={{ color: "#ef4444" }}> · {stageRunProgress.failed} failed</span>}
                    </span>
                  </div>
                );
              })()}
                {rollbackMsg && !rollbackConfirmIdx && <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>{rollbackMsg}</span>}
              </div>

              {/* Stage stepper - sequential workflow */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "18px", overflowX: "auto", paddingBottom: "6px" }}>
                {pipeline?.stages.map((s, i) => {
                  const isLocked = i > currentStageIdx;
                  const isActive = i === viewingStageIdx;
                  const isDone = s.status === "done";
                  const isCurrent = i === currentStageIdx;
                  return (
                    <button key={i} onClick={() => !isLocked && setActiveStageIndex(i)} disabled={isLocked} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1.5px solid", borderColor: isActive ? "#2b72f0" : isDone ? "#16a34a" : isLocked ? "#e2e8f0" : "#cbd5e1", background: isActive ? "#2b72f0" : isLocked ? "#f8fafc" : "#fff", color: isActive ? "#fff" : isDone ? "#16a34a" : isLocked ? "#94a3b8" : "#64748b", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.6 : 1 }}>
                      {isDone ? <CheckCircle style={{ width: "12px", height: "12px" }} /> : isCurrent ? <PlayCircle style={{ width: "12px", height: "12px" }} /> : isLocked ? <Lock style={{ width: "12px", height: "12px" }} /> : <div style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid currentColor" }} />}
                      {s.name}
                      {isDone && <span style={{ marginLeft: "4px", padding: "1px 6px", borderRadius: "10px", background: "#dcfce7", color: "#16a34a", fontSize: "0.62rem" }}>{s.shortlistedIds?.length || 0}</span>}
                      {isCurrent && !isDone && <span style={{ marginLeft: "4px", padding: "1px 6px", borderRadius: "10px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.62rem" }}>CURRENT</span>}
                    </button>
                  );
                })}
              </div>

              {!activeStage ? (
                <div style={{ background: "#fff", borderRadius: "14px", padding: "48px", textAlign: "center", color: "#94a3b8", border: "1px solid #bfdbfe" }}>
                  <Layers strokeWidth={1} style={{ width: "44px", height: "44px", margin: "0 auto 12px", color: "#c084fc" }} />
                  <p style={{ fontWeight: 600, marginBottom: "4px" }}>Pipeline not loaded</p>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #bfdbfe", overflow: "hidden" }}>
                  {/* Stage header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{activeStage.name}</h4>
                        {isPastStage && <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#f1f5f9", color: "#64748b", fontSize: "0.62rem", fontWeight: 600 }}>ARCHIVED</span>}
                        {isCurrentStage && activeStage.status !== "done" && <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.62rem", fontWeight: 700 }}>CURRENT STAGE</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>{activeStage.description}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {activeStage.status === "done" ? (
                        <span style={{ padding: "4px 12px", borderRadius: "20px", background: "#dcfce7", color: "#16a34a", fontSize: "0.72rem", fontWeight: 700 }}>✓ Completed — {activeStage.shortlistedIds?.length || 0} shortlisted</span>
                      ) : activeStage.status === "running" ? (
                        <span style={{ padding: "4px 12px", borderRadius: "20px", background: "#fef9c3", color: "#a16207", fontSize: "0.72rem", fontWeight: 700 }}>Running…</span>
                      ) : (
                        <span style={{ padding: "4px 12px", borderRadius: "20px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.72rem", fontWeight: 700 }}>Pending</span>
                      )}
                      {/* Rollback button — only for done stages */}
                      {activeStage.status === "done" && (
                        <button
                          onClick={() => { setRollbackMsg(""); setRollbackConfirmIdx(viewingStageIdx); }}
                          title={`Roll back to "${activeStage.name}" and redo from here`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: "8px", background: "#FEF9C3", border: "1px solid #FDE68A", color: "#92400E", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          <RotateCcw style={{ width: 11, height: 11 }} />
                          Roll Back
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sequential workflow info banner */}
                  {isPastStage && (
                    <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <Info style={{ width: "14px", height: "14px", color: "#64748b", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Archived stage. Current active stage: <strong>{pipeline?.stages[currentStageIdx]?.name}</strong></span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        <button onClick={() => setActiveStageIndex(currentStageIdx)} style={{ padding: "4px 10px", borderRadius: "6px", background: "#2b72f0", color: "#fff", border: "none", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer" }}>Go to Current</button>
                      </div>
                    </div>
                  )}

                  {/* HR Inputs Form - editable only for current stage, hidden for practical and ai_interview */}
                  {activeStage.type !== "practical" && activeStage.type !== "ai_interview" && <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: isPastStage ? "#f8fafc" : "#fafafa" }}>
                    {isPastStage ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                        <Lock style={{ width: "14px", height: "14px" }} />
                        <span style={{ fontSize: "0.75rem" }}>HR inputs are locked for archived stages. <strong>Target:</strong> {activeStage.hrInputs.targetCount || "Not set"} · <strong>Preferences:</strong> {activeStage.hrInputs.preferences || "None"} · <strong>Criteria:</strong> {activeStage.hrInputs.criteria || "None"}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>TARGET SHORTLIST COUNT</label>
                            <input type="number" min={0} value={unsavedHr[viewingStageIdx]?.targetCount ?? activeStage.hrInputs.targetCount} onChange={e => setUnsavedHr(prev => ({ ...prev, [viewingStageIdx]: { ...prev[viewingStageIdx], targetCount: parseInt(e.target.value) || 0 } }))} style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>HR PREFERENCES (e.g., women favored)</label>
                            <input type="text" placeholder="e.g., prioritize female candidates with 5+ years" value={unsavedHr[viewingStageIdx]?.preferences ?? activeStage.hrInputs.preferences} onChange={e => setUnsavedHr(prev => ({ ...prev, [viewingStageIdx]: { ...prev[viewingStageIdx], preferences: e.target.value } }))} style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>ADDITIONAL CRITERIA</label>
                            <input type="text" placeholder="e.g., must have AWS certification" value={unsavedHr[viewingStageIdx]?.criteria ?? activeStage.hrInputs.criteria} onChange={e => setUnsavedHr(prev => ({ ...prev, [viewingStageIdx]: { ...prev[viewingStageIdx], criteria: e.target.value } }))} style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>NOTES FOR AI</label>
                            <input type="text" placeholder="Any context AI should consider" value={unsavedHr[viewingStageIdx]?.notes ?? activeStage.hrInputs.notes} onChange={e => setUnsavedHr(prev => ({ ...prev, [viewingStageIdx]: { ...prev[viewingStageIdx], notes: e.target.value } }))} style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                          </div>
                        </div>
                        {Object.keys(unsavedHr[viewingStageIdx] || {}).length > 0 && (
                          <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                            <button onClick={() => saveHrInputs(viewingStageIdx)} style={{ padding: "5px 12px", borderRadius: "6px", background: "#2b72f0", color: "#fff", border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>Save Guidance</button>
                            <button onClick={() => setUnsavedHr(prev => { const copy = { ...prev }; delete copy[viewingStageIdx]; return copy; })} style={{ padding: "5px 12px", borderRadius: "6px", background: "#f1f5f9", color: "#64748b", border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>Discard</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>}


                  {/* Action bar - sequential workflow controls */}
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {isPastStage ? "Stage completed and archived" :
                       activeStage.type === "practical" || activeStage.type === "ai_interview" ? "" :
                       activeStage.status === "pending" ? `Ready to screen ${candidatesInStage.length} candidates` :
                       activeStage.status === "done" ? `${activeStage.shortlistedIds?.length || 0} candidates shortlisted — confirm to proceed` : "Screening in progress…"}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {isCurrentStage && activeStage.status === "pending" && activeStage.type !== "practical" && activeStage.type !== "ai_interview" && (
                        <button onClick={() => runStage(viewingStageIdx)} disabled={pipelineRunning || candidatesInStage.length === 0} style={{ padding: "8px 16px", borderRadius: "8px", background: pipelineRunning || candidatesInStage.length === 0 ? "#94a3b8" : "#2b72f0", color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: pipelineRunning || candidatesInStage.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                          {pipelineRunning ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <PlayCircle style={{ width: "14px", height: "14px" }} />}
                          {pipelineRunning ? "Running…" : "Run This Stage"}
                        </button>
                      )}
                      {isCurrentStage && activeStage.status === "done" && currentStageIdx < (pipeline?.stages.length || 1) - 1 && (
                        <button onClick={() => confirmShortlistAndAdvance(viewingStageIdx)} disabled={(stageShortlist[viewingStageIdx] || []).length === 0} style={{ padding: "8px 16px", borderRadius: "8px", background: (stageShortlist[viewingStageIdx] || []).length === 0 ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: (stageShortlist[viewingStageIdx] || []).length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                          Confirm & Proceed <ArrowRight style={{ width: "14px", height: "14px" }} />
                        </button>
                      )}
                      {isCurrentStage && activeStage.status === "done" && currentStageIdx === (pipeline?.stages.length || 1) - 1 && (
                        <span style={{ padding: "6px 14px", borderRadius: "8px", background: "#dcfce7", color: "#16a34a", fontSize: "0.72rem", fontWeight: 700 }}>🎉 Pipeline Complete</span>
                      )}
                    </div>
                  </div>

                  {/* Results / Shortlist Table — AI-screened stages only (not practical or ai_interview) */}
                  {activeStage.status === "done" && sortedStageResults.length > 0 && activeStage.type !== "practical" && activeStage.type !== "ai_interview" && (
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <h5 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                          {isPastStage ? "Stage Results — Final Shortlist" : "Stage Results — Select Shortlist"}
                        </h5>
                        {!isPastStage && (
                          <button onClick={() => confirmShortlist(viewingStageIdx)} disabled={(stageShortlist[viewingStageIdx] || []).length === 0} style={{ padding: "6px 14px", borderRadius: "6px", background: (stageShortlist[viewingStageIdx] || []).length === 0 ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", fontSize: "0.72rem", fontWeight: 700, cursor: (stageShortlist[viewingStageIdx] || []).length === 0 ? "not-allowed" : "pointer" }}>
                            Confirm Shortlist ({(stageShortlist[viewingStageIdx] || []).length})
                          </button>
                        )}
                      </div>
                      <div style={{ overflowX: "auto", border: "1px solid #f1f5f9", borderRadius: "10px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                              <th style={{ padding: "10px 12px", textAlign: "left" }}>
                                {!isPastStage && (
                                  <input type="checkbox" checked={sortedStageResults.length > 0 && (stageShortlist[viewingStageIdx] || []).length === sortedStageResults.length} onChange={e => setStageShortlist(prev => ({ ...prev, [viewingStageIdx]: e.target.checked ? sortedStageResults.map(r => typeof r.candidateId === "string" ? r.candidateId : r.candidateId?._id).filter(Boolean) : [] }))} style={{ cursor: "pointer" }} />
                                )}
                              </th>
                              <th style={{ padding: "10px 12px", textAlign: "left" }}>Rank</th>
                              <th style={{ padding: "10px 12px", textAlign: "left" }}>Candidate</th>
                              <th style={{ padding: "10px 12px", textAlign: "left" }}>Score</th>
                              <th style={{ padding: "10px 12px", textAlign: "left" }}>Rec</th>
                              <th style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>Status</th>
                              <th style={{ padding: "10px 12px", textAlign: "left" }}>Explanation</th>
                              <th style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>AI judgment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedStageResults.map((r, i) => {
                              const c = typeof r.candidateId === "object" ? r.candidateId : candidates.find(x => x._id === r.candidateId);
                              const cid = c?._id || (typeof r.candidateId === "string" ? r.candidateId : r.candidateId?._id);
                              const checked = (stageShortlist[viewingStageIdx] || []).includes(cid);
                              const wasShortlisted = (activeStage.shortlistedIds || []).some(id => String(id) === String(cid));
                              const advancesToNext = isPastStage
                                ? wasShortlisted
                                : (stageShortlist[viewingStageIdx] || []).length > 0
                                  ? checked
                                  : wasShortlisted;
                              const nextStage = pipeline?.stages[viewingStageIdx + 1];
                              const nextName = nextStage?.name || "next step";
                              const stageOutcome = advancesToNext
                                ? {
                                    label: nextStage ? `Shortlisted for ${nextName}` : "In final pool",
                                    title: nextStage
                                      ? `HR shortlist includes this candidate to proceed to “${nextName}”.`
                                      : "Included in the final stage shortlist.",
                                    bg: "#dcfce7",
                                    color: "#15803d",
                                  }
                                : {
                                    label: nextStage ? `Not selected for ${nextName}` : "Not selected",
                                    title: nextStage
                                      ? `Not shortlisted to proceed to “${nextName}” after “${activeStage.name}”.`
                                      : "Not selected at this stage.",
                                    bg: "#fee2e2",
                                    color: "#b91c1c",
                                  };
                              const badge = recBadge(r.recommendation);
                              return (
                                <tr key={r._id} style={{ borderBottom: "1px solid #f1f5f9", background: wasShortlisted ? "#f0fdf4" : "transparent" }}>
                                  <td style={{ padding: "10px 12px" }}>
                                    {!isPastStage ? (
                                      <input type="checkbox" checked={checked} onChange={e => setStageShortlist(prev => ({ ...prev, [viewingStageIdx]: e.target.checked ? [...(prev[viewingStageIdx] || []), cid] : (prev[viewingStageIdx] || []).filter(id => id !== cid) }))} style={{ cursor: "pointer" }} />
                                    ) : (
                                      wasShortlisted ? <CheckCircle style={{ width: "14px", height: "14px", color: "#16a34a" }} /> : <span style={{ color: "#cbd5e1" }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#2b72f0" }}>#{i + 1}</td>
                                  <td style={{ padding: "10px 12px" }}>
                                    <div><span style={{ fontWeight: 600 }}>{c?.firstName} {c?.lastName}</span></div>
                                    <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{c?.email}</div>
                                  </td>
                                  <td style={{ padding: "10px 12px" }}><span style={{ fontWeight: 800, color: scoreColor(r.overallScore) }}>{r.overallScore}</span></td>
                                  <td style={{ padding: "10px 12px" }}><span style={{ padding: "2px 8px", borderRadius: "12px", background: badge.bg, color: badge.color, fontSize: "0.68rem", fontWeight: 700 }}>{badge.label}</span></td>
                                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap", maxWidth: "200px" }}>
                                    <span
                                      title={stageOutcome.title}
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        background: stageOutcome.bg,
                                        color: stageOutcome.color,
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                        display: "inline-block",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: "190px",
                                      }}
                                    >
                                      {stageOutcome.label}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", color: "#475569", maxWidth: "280px" }}><p style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.aiExplanation}</p></td>
                                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                                    <button
                                      type="button"
                                      onClick={() => setAiJudgmentModal(r)}
                                      style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2b72f0", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                    >
                                      <Sparkles style={{ width: "14px", height: "14px" }} />
                                      View AI judgment
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {isPastStage && (
                        <p style={{ margin: "12px 0 0", fontSize: "0.72rem", color: "#64748b", lineHeight: 1.5 }}>
                          <CheckCircle style={{ width: "12px", height: "12px", display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                          Status uses HR’s confirmed shortlist for this stage: <strong>Shortlisted for {pipeline?.stages[viewingStageIdx + 1]?.name || "next step"}</strong> vs <strong>Not selected for {pipeline?.stages[viewingStageIdx + 1]?.name || "next step"}</strong>. Green row highlight = in the shortlist.
                        </p>
                      )}

                      {(activeStage.type === "deep_review" || activeStage.type === "cv_screen") && activeStage.status === "done" && (activeStage.shortlistedIds?.length != null) && (() => {
                        const sentLog = activeStage.emailLog || [];
                        const alreadySent = sentLog.length > 0;
                        const isCvScreen = activeStage.type === "cv_screen";
                        return (
                          <div style={{ marginTop: "18px", padding: "16px", borderRadius: "10px", border: `1px dashed ${alreadySent ? "#bbf7d0" : "#c4b5fd"}`, background: alreadySent ? "#f0fdf4" : "#faf5ff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                              <Mail style={{ width: "16px", height: "16px", color: alreadySent ? "#15803d" : "#7c3aed" }} />
                              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>
                                {alreadySent ? `Emails sent (${sentLog.length})` : "Outcome emails"}
                              </span>
                              {alreadySent && <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#dcfce7", color: "#15803d", fontSize: "0.62rem", fontWeight: 700 }}>✓ DONE</span>}
                            </div>

                            {alreadySent ? (
                              /* ── Sent log view ── */
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "280px", overflowY: "auto" }}>
                                {sentLog.map((log: any, li: number) => (
                                  <div key={li} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: log.kind === "advance" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${log.kind === "advance" ? "#bbf7d0" : "#fecaca"}` }}>
                                    <CheckCircle style={{ width: "12px", height: "12px", color: log.kind === "advance" ? "#15803d" : "#b91c1c", flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.to}</p>
                                      <p style={{ margin: 0, fontSize: "0.62rem", color: "#64748b" }}>{log.subject}</p>
                                    </div>
                                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: log.kind === "advance" ? "#15803d" : "#b91c1c", flexShrink: 0, textTransform: "uppercase" }}>{log.kind}</span>
                                    <span style={{ fontSize: "0.58rem", color: "#94a3b8", flexShrink: 0 }}>{new Date(log.sentAt).toLocaleDateString()}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              /* ── Draft & send UI ── */
                              <>
                                <p style={{ fontSize: "0.72rem", color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                                  {isCvScreen
                                    ? <>Generate AI-drafted regret emails for the <strong style={{ color: "#b91c1c" }}>rejected candidates</strong> at this stage. Shortlisted candidates will be contacted when they reach the next step.</>
                                    : <>Generate AI drafts for everyone in this pool:
                                        <br />• <strong style={{ color: "#15803d" }}>Shortlisted</strong> — congratulations + practical assessment invitation.
                                        <br />• <strong style={{ color: "#b91c1c" }}>Rejected</strong> — warm, professional decline.</>
                                  }
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                                  <button
                                    type="button"
                                    onClick={draftApplicantEmails}
                                    disabled={emailDraftBusy}
                                    style={{ padding: "8px 14px", borderRadius: "8px", background: emailDraftBusy ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 700, cursor: emailDraftBusy ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                  >
                                    {emailDraftBusy ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: "14px", height: "14px" }} />}
                                    Generate email drafts
                                  </button>
                                  <button
                                    type="button"
                                    onClick={sendApplicantEmails}
                                    disabled={emailSendBusy || !emailDrafts?.length}
                                    style={{ padding: "8px 14px", borderRadius: "8px", background: emailSendBusy || !emailDrafts?.length ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 700, cursor: emailSendBusy || !emailDrafts?.length ? "not-allowed" : "pointer" }}
                                  >
                                    {emailSendBusy ? "Sending…" : "Send emails"}
                                  </button>
                                  {emailOpsMsg ? <span style={{ fontSize: "0.7rem", color: "#15803d" }}>{emailOpsMsg}</span> : null}
                                </div>
                                {emailDrafts && emailDrafts.length > 0 && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "360px", overflowY: "auto" }}>
                                    {emailDrafts.map((d, di) => (
                                      <div key={d.candidateId} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e9d5ff", background: d.kind === "advance" ? "#f0fdf4" : "#fef2f2" }}>
                                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                                          {d.to} · <span style={{ color: d.kind === "advance" ? "#15803d" : "#b91c1c" }}>{d.kind === "advance" ? "Advance" : "Regret"}</span>
                                        </div>
                                        <label style={{ fontSize: "0.62rem", color: "#64748b" }}>Subject</label>
                                        <input
                                          value={d.subject}
                                          onChange={e => { const copy = [...emailDrafts]; copy[di] = { ...copy[di], subject: e.target.value }; setEmailDrafts(copy); }}
                                          style={{ width: "100%", marginBottom: "8px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem" }}
                                        />
                                        <label style={{ fontSize: "0.62rem", color: "#64748b" }}>Body</label>
                                        <textarea
                                          value={d.body}
                                          onChange={e => { const copy = [...emailDrafts]; copy[di] = { ...copy[di], body: e.target.value }; setEmailDrafts(copy); }}
                                          rows={5}
                                          style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem", resize: "vertical" }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  )}

                  {/* Practical stage — submissions, grading, ranking */}
                  {activeStage.type === "practical" && (
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Note: practical stage status is pending until after grading + shortlist confirmation — this is expected */}

                      {/* Warning: assessment not published */}
                      {(() => {
                        const def = pipeline?.stages[screeningViewIdx]?.assessmentDefinition;
                        const hasAssessment = !!(def?.questions?.length || def?.sections?.length || def?.projectInstructions?.trim());
                        if (hasAssessment) return null;
                        return (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "#fee2e2", border: "1px solid #fecaca" }}>
                            <AlertCircle style={{ width: "14px", height: "14px", color: "#b91c1c", flexShrink: 0, marginTop: "2px" }} />
                            <p style={{ margin: 0, fontSize: "0.72rem", color: "#991b1b", lineHeight: 1.6 }}>
                              <strong>Assessment not published.</strong> Go to the <strong>Jobs</strong> tab and set up the Practical Assessment template before candidates can access their exam.
                            </p>
                          </div>
                        );
                      })()}

                      {/* Info banner */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                        <Info style={{ width: "14px", height: "14px", color: "#0369a1", flexShrink: 0, marginTop: "2px" }} />
                        <p style={{ margin: 0, fontSize: "0.72rem", color: "#0c4a6e", lineHeight: 1.6 }}>
                          Assessment invitations were included in the <strong>Deep Profile Review</strong> outcome emails (congratulations + personal link + deadline). Candidates access their assessment at <code style={{ fontSize: "0.65rem", background: "#e0f2fe", padding: "1px 4px", borderRadius: "3px" }}>/assessment?jobId=…&amp;email=…</code>
                          {" "}To change the assessment template, go to the <strong>Jobs</strong> tab.
                        </p>
                      </div>

                      {/* Assessment template summary — read only */}
                      {(() => {
                        const def = pipeline?.stages[screeningViewIdx]?.assessmentDefinition;
                        if (!def?.title) return null;
                        const hasSections = !!(def.sections?.length);
                        const hasProject = !!(def.projectInstructions?.trim());
                        const totalQ = hasSections
                          ? def.sections!.reduce((a: number, s: { questions: unknown[] }) => a + s.questions.length, 0)
                          : (def.questions?.length || 0);
                        const kindLabel = hasSections && hasProject ? "Form + Project" : hasSections ? "Form Q&A" : hasProject ? "Project" : "Custom";
                        const kindBg   = hasSections && hasProject ? "#eef2ff" : hasSections ? "#eff6ff" : "#f5f3ff";
                        const kindColor = hasSections && hasProject ? "#4338ca" : hasSections ? "#1d4ed8" : "#6d28d9";
                        return (
                          <div style={{ padding: "12px 14px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <FileText style={{ width: "14px", height: "14px", color: "#64748b", flexShrink: 0, marginTop: "2px" }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{def.title}</span>
                                <span style={{ padding: "1px 8px", borderRadius: "10px", background: kindBg, color: kindColor, fontSize: "0.62rem", fontWeight: 700 }}>{kindLabel}</span>
                                {hasSections && <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{def.sections!.length} section{def.sections!.length !== 1 ? "s" : ""} · {totalQ} question{totalQ !== 1 ? "s" : ""}</span>}
                                {hasProject && <span style={{ fontSize: "0.65rem", color: "#64748b" }}>project scenario</span>}
                                {(def.resources?.length || 0) > 0 && <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{def.resources!.length} resource{def.resources!.length !== 1 ? "s" : ""}</span>}
                              </div>
                              {hasSections && (
                                <p style={{ margin: 0, fontSize: "0.65rem", color: "#94a3b8" }}>
                                  {def.sections!.map((s: { title: string }) => s.title).join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Submissions & grading */}
                      <div style={{ padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                          <div>
                            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>Submissions &amp; AI grading</span>
                            {practicalSubs.length > 0 && (
                              <span style={{ marginLeft: "8px", fontSize: "0.65rem", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                                {practicalSubs.filter(s => s.score != null).length}/{practicalSubs.length} graded
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <button type="button" onClick={loadPracticalSubmissions} disabled={practicalSubsLoading} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
                              {practicalSubsLoading ? "Loading…" : "↻ Refresh"}
                            </button>
                            <button type="button" onClick={runGradePractical} disabled={gradingPractical || practicalSubs.length === 0} style={{ padding: "6px 14px", borderRadius: "6px", background: gradingPractical || practicalSubs.length === 0 ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", fontSize: "0.72rem", fontWeight: 700, cursor: gradingPractical || practicalSubs.length === 0 ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              {gradingPractical ? <><Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> Grading…</> : <><Sparkles style={{ width: "12px", height: "12px" }} /> Grade &amp; rank all</>}
                            </button>
                          </div>
                        </div>
                        {practicalSubs.length === 0 ? (
                          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>No submissions yet. Candidates were invited via their personal link in the Deep Profile Review outcome emails.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {practicalSubs.map((row, ri) => {
                              const cand = row.candidateId as { firstName?: string; lastName?: string; email?: string } | undefined;
                              const name = cand ? `${cand.firstName || ""} ${cand.lastName || ""}`.trim() : "—";
                              const subId = String(row._id || ri);
                              const isExpanded = expandedSubId === subId;
                              const score = row.score as number | undefined;
                              const isGraded = score != null;
                              const scoreBg = !isGraded ? "#f1f5f9" : score >= 70 ? "#dcfce7" : score >= 40 ? "#fef9c3" : "#fee2e2";
                              const scoreColor = !isGraded ? "#94a3b8" : score >= 70 ? "#15803d" : score >= 40 ? "#92400e" : "#b91c1c";
                              const candId = String((row.candidateId as { _id?: string } | undefined)?._id || row.candidateId || "");

                              let parsedAnswers: Record<string, string> = {};
                              try {
                                const parsed = JSON.parse(String(row.answers || "{}"));
                                parsedAnswers = parsed.textAnswers || parsed || {};
                              } catch { parsedAnswers = {}; }

                              const asmDef = pipeline?.stages[screeningViewIdx]?.assessmentDefinition;
                              const allQs: { id: string; label: string }[] = asmDef?.sections
                                ? asmDef.sections.flatMap((s: { questions: { id: string; label: string }[] }) => s.questions)
                                : (asmDef?.questions || []);

                              return (
                                <div key={subId} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                                  {/* Row header */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer" }} onClick={() => setExpandedSubId(isExpanded ? null : subId)}>
                                    <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, color: "#64748b", flexShrink: 0 }}>
                                      {row.compareRank != null ? `#${row.compareRank}` : `${ri + 1}`}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{name}</p>
                                      <p style={{ margin: 0, fontSize: "0.65rem", color: "#94a3b8" }}>{cand?.email} · Submitted {row.submittedAt ? new Date(String(row.submittedAt)).toLocaleDateString() : "—"}</p>
                                    </div>
                                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 700, background: scoreBg, color: scoreColor, flexShrink: 0 }}>
                                      {isGraded ? `${score}/100` : "Not graded"}
                                    </span>
                                    {!isGraded && (
                                      <button
                                        type="button"
                                        disabled={gradingSubId === subId}
                                        onClick={e => { e.stopPropagation(); gradeOneSub(subId); }}
                                        style={{ padding: "4px 10px", borderRadius: "6px", background: gradingSubId === subId ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", fontSize: "0.68rem", fontWeight: 700, cursor: gradingSubId === subId ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "4px" }}
                                      >
                                        {gradingSubId === subId ? <><Loader2 style={{ width: "11px", height: "11px", animation: "spin 1s linear infinite" }} /> Grading…</> : <><Sparkles style={{ width: "11px", height: "11px" }} /> Grade</>}
                                      </button>
                                    )}
                                    <ChevronDown style={{ width: "14px", height: "14px", color: "#94a3b8", flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                                  </div>

                                  {/* Expanded: feedback + answers */}
                                  {isExpanded && (
                                    <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px", background: "#fafafa" }}>
                                      {isGraded && (
                                        <div style={{ marginBottom: "12px", padding: "10px 12px", borderRadius: "8px", background: scoreBg, border: `1px solid ${scoreColor}30` }}>
                                          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: scoreColor, margin: "0 0 4px", letterSpacing: "0.05em" }}>AI FEEDBACK — {score}/100</p>
                                          <p style={{ margin: 0, fontSize: "0.78rem", color: "#334155", lineHeight: 1.6 }}>{String(row.feedback || "—")}</p>
                                          {!!row.comparisonSummary && <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#64748b", fontStyle: "italic" }}>Ranking note: {String(row.comparisonSummary)}</p>}
                                        </div>
                                      )}
                                      {Object.keys(parsedAnswers).length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                          <p style={{ margin: "0 0 4px", fontSize: "0.63rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em" }}>CANDIDATE ANSWERS</p>
                                          {Object.entries(parsedAnswers).map(([qId, answer]) => {
                                            const q = allQs.find(q => q.id === qId);
                                            return (
                                              <div key={qId} style={{ padding: "8px 10px", borderRadius: "6px", background: "#fff", border: "1px solid #e2e8f0" }}>
                                                <p style={{ margin: "0 0 4px", fontSize: "0.68rem", fontWeight: 700, color: "#475569" }}>{q?.label || qId}</p>
                                                <p style={{ margin: 0, fontSize: "0.78rem", color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{String(answer) || "—"}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: 0 }}>No structured answers available for preview.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Practical shortlist picker */}
                      {practicalSubs.some(s => s.score != null) && activeStage.status !== "done" && (
                        <div style={{ padding: "16px", borderRadius: "10px", border: "1px dashed #86efac", background: "#f0fdf4" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <CheckCircle style={{ width: "16px", height: "16px", color: "#16a34a" }} />
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>Select candidates to advance to AI Interview</span>
                          </div>
                          <p style={{ fontSize: "0.72rem", color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                            Pick who moves to the AI Interview stage. Confirming will generate unique interview links for shortlisted candidates. Unselected candidates will receive regret emails.
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                            {[...practicalSubs]
                              .filter(s => s.score != null)
                              .sort((a, b) => ((a.compareRank as number) || 999) - ((b.compareRank as number) || 999))
                              .map(row => {
                                const cand = row.candidateId as { _id?: string; firstName?: string; lastName?: string; email?: string } | undefined;
                                const candId = String(cand?._id || row.candidateId || "");
                                const name = cand ? `${cand.firstName || ""} ${cand.lastName || ""}`.trim() : "—";
                                const score = row.score as number;
                                const checked = practicalPickIds.has(candId);
                                const scoreBg = score >= 70 ? "#dcfce7" : score >= 40 ? "#fef9c3" : "#fee2e2";
                                const scoreColor = score >= 70 ? "#15803d" : score >= 40 ? "#92400e" : "#b91c1c";
                                return (
                                  <label key={candId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "8px", background: checked ? "#dcfce7" : "#fff", border: checked ? "1.5px solid #86efac" : "1px solid #e2e8f0", cursor: "pointer" }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => setPracticalPickIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(candId)) next.delete(candId); else next.add(candId);
                                        return next;
                                      })}
                                      style={{ accentColor: "#16a34a", width: "15px", height: "15px" }}
                                    />
                                    <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a", flex: 1 }}>
                                      {row.compareRank != null ? `#${row.compareRank} ` : ""}{name}
                                      <span style={{ marginLeft: "6px", fontSize: "0.65rem", color: "#64748b", fontWeight: 400 }}>{cand?.email}</span>
                                    </span>
                                    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: 700, background: scoreBg, color: scoreColor }}>{score}/100</span>
                                    {!!row.comparisonSummary && <span style={{ fontSize: "0.62rem", color: "#64748b", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(row.comparisonSummary)}</span>}
                                  </label>
                                );
                              })}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <button
                              type="button"
                              onClick={confirmPracticalShortlist}
                              disabled={practicalPickIds.size === 0}
                              style={{ padding: "8px 18px", borderRadius: "8px", background: practicalPickIds.size === 0 ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: practicalPickIds.size === 0 ? "not-allowed" : "pointer" }}
                            >
                              Confirm &amp; Advance {practicalPickIds.size > 0 ? `(${practicalPickIds.size})` : ""}
                            </button>
                            <button type="button" onClick={() => setPracticalPickIds(new Set(practicalSubs.filter(s => s.score != null).map(s => String((s.candidateId as { _id?: string } | undefined)?._id || s.candidateId || ""))))} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #86efac", background: "#fff", color: "#15803d", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>Select all</button>
                            <button type="button" onClick={() => setPracticalPickIds(new Set())} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>Clear</button>
                          </div>
                        </div>
                      )}

                      {/* Outcome emails after practical shortlist is confirmed (when next is ai_interview) */}
                      {activeStage.status === "done" && (() => {
                        const nextSt = pipeline?.stages[screeningViewIdx + 1];
                        if (nextSt?.type !== "ai_interview") return null;
                        return (
                          <div style={{ padding: "16px", borderRadius: "10px", border: "1px dashed #c4b5fd", background: "#faf5ff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                              <Mail style={{ width: "16px", height: "16px", color: "#7c3aed" }} />
                              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>Outcome emails + AI Interview invitations</span>
                            </div>
                            <p style={{ fontSize: "0.72rem", color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                              Generate AI drafts for all practical stage candidates:
                              <br />• <strong style={{ color: "#15803d" }}>Shortlisted ({activeStage.shortlistedIds?.length || 0})</strong> — congratulations + their unique personal AI Interview link.
                              <br />• <strong style={{ color: "#b91c1c" }}>Not selected</strong> — warm, professional regret email.
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                              <button
                                type="button"
                                onClick={draftApplicantEmails}
                                disabled={emailDraftBusy}
                                style={{ padding: "8px 14px", borderRadius: "8px", background: emailDraftBusy ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 700, cursor: emailDraftBusy ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                              >
                                {emailDraftBusy ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: "14px", height: "14px" }} />}
                                Generate outcome email drafts
                              </button>
                              <button
                                type="button"
                                onClick={sendApplicantEmails}
                                disabled={emailSendBusy || !emailDrafts?.length}
                                style={{ padding: "8px 14px", borderRadius: "8px", background: emailSendBusy || !emailDrafts?.length ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 700, cursor: emailSendBusy || !emailDrafts?.length ? "not-allowed" : "pointer" }}
                              >
                                {emailSendBusy ? "Sending…" : "Send emails"}
                              </button>
                              {emailOpsMsg ? <span style={{ fontSize: "0.7rem", color: "#15803d" }}>{emailOpsMsg}</span> : null}
                            </div>
                            {emailDrafts && emailDrafts.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "360px", overflowY: "auto" }}>
                                {emailDrafts.map((d, di) => (
                                  <div key={d.candidateId} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e9d5ff", background: d.kind === "advance" ? "#f0fdf4" : "#fef2f2" }}>
                                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                                      {d.to} · <span style={{ color: d.kind === "advance" ? "#15803d" : "#b91c1c" }}>{d.kind === "advance" ? "Advance + Interview Link" : "Regret"}</span>
                                    </div>
                                    <label style={{ fontSize: "0.62rem", color: "#64748b" }}>Subject</label>
                                    <input
                                      value={d.subject}
                                      onChange={e => {
                                        const copy = [...(emailDrafts || [])];
                                        copy[di] = { ...copy[di], subject: e.target.value };
                                        setEmailDrafts(copy);
                                      }}
                                      style={{ width: "100%", marginBottom: "8px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem" }}
                                    />
                                    <label style={{ fontSize: "0.62rem", color: "#64748b" }}>Body</label>
                                    <textarea
                                      value={d.body}
                                      onChange={e => {
                                        const copy = [...(emailDrafts || [])];
                                        copy[di] = { ...copy[di], body: e.target.value };
                                        setEmailDrafts(copy);
                                      }}
                                      rows={5}
                                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem", resize: "vertical" }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* ── AI Interview stage ── */}
                  {activeStage.type === "ai_interview" && (
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

                      {/* Info banner */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "8px", background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                        <Info style={{ width: "14px", height: "14px", color: "#0369a1", flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 700, color: "#0c4a6e" }}>Interview invitations sent via Practical Assessment emails</p>
                          <p style={{ margin: 0, fontSize: "0.72rem", color: "#0369a1", lineHeight: 1.5 }}>
                            Shortlisted candidates received their unique AI Interview link in the Practical Assessment outcome email. Track their progress below — each candidate&apos;s interview is recorded and scored automatically.
                          </p>
                        </div>
                        <button onClick={loadInterviewSessions} disabled={interviewLoading} style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #bae6fd", background: "#fff", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          {interviewLoading ? "Loading…" : "↻ Refresh"}
                        </button>
                      </div>

                      {/* Sessions list */}
                      {interviewSessions.length === 0 ? (
                        <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0 }}>No interviews started yet. Candidates access their interview using the link sent in their outcome email.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#475569" }}>
                              {interviewSessions.filter((s: any) => s.status === "completed").length} / {interviewSessions.length} completed
                            </p>
                          </div>
                          {interviewSessions.map((session: any) => {
                            const cand = session.candidate as { name?: string; email?: string } | undefined;
                            const score = session.score;
                            const isExpanded = interviewExpandedSession === String(session._id);
                            const isPicked = interviewPickIds.has(String((session.candidate as any)?._id || ""));
                            const statusColors: Record<string, string> = { completed: "#22c55e", in_progress: "#f59e0b", pending: "#94a3b8", expired: "#ef4444" };
                            const statusColor = statusColors[session.status] || "#94a3b8";
                            return (
                              <div key={String(session._id)} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => setInterviewExpandedSession(isExpanded ? null : String(session._id))}>
                                  {session.status === "completed" && (
                                    <input type="checkbox" checked={isPicked} onChange={e => { e.stopPropagation(); const id = String((session.candidate as any)?._id || ""); setInterviewPickIds(prev => { const next = new Set(prev); e.target.checked ? next.add(id) : next.delete(id); return next; }); }} style={{ cursor: "pointer", flexShrink: 0 }} onClick={e => e.stopPropagation()} />
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{cand?.name || "Candidate"}</p>
                                    <p style={{ margin: 0, fontSize: "0.7rem", color: "#64748b" }}>{cand?.email}</p>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    {score && <span style={{ fontSize: "0.72rem", fontWeight: 700, color: score.overall >= 75 ? "#22c55e" : score.overall >= 55 ? "#f59e0b" : "#ef4444" }}>{score.overall}/100</span>}
                                    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700, background: `${statusColor}20`, color: statusColor }}>
                                      {session.status === "in_progress" ? "In Progress" : session.status === "completed" ? "Completed" : session.status === "expired" ? "Expired" : "Pending"}
                                    </span>
                                    {session.hasRecording && (
                                      <button onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const token = localStorage.getItem("umuranga_token");
                                          const resp = await fetch(`${publicApiBaseUrl}/pipeline/${selJob?._id}/stage/${screeningViewIdx}/interview/sessions/${session._id}/recording`, {
                                            headers: { Authorization: `Bearer ${token}` },
                                          });
                                          if (!resp.ok) throw new Error("Failed to load recording");
                                          const blob = await resp.blob();
                                          const url = URL.createObjectURL(blob);
                                          setVideoModal({ url, name: cand?.name || "Candidate", transcript: session.transcript || [] });
                                        } catch { alert("Could not load recording."); }
                                      }} style={{ padding: "3px 8px", borderRadius: "6px", background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="23 7 16 12 23 17 23 7"/><rect x={1} y={5} width={15} height={14} rx={2}/></svg> Watch
                                      </button>
                                    )}
                                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px" }}>
                                    {/* Score breakdown */}
                                    {score ? (
                                      <div style={{ marginBottom: "14px" }}>
                                        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                                          {[
                                            { label: "Confidence", value: score.confidence, color: "#2B72F0" },
                                            { label: "Communication", value: score.communication, color: "#8b5cf6" },
                                            { label: "Accuracy", value: score.accuracy, color: "#0ea5e9" },
                                            { label: "Attitude", value: score.attitude, color: "#22c55e" },
                                          ].map(d => {
                                            const r = 22, circ = 2 * Math.PI * r;
                                            const offset = circ - (d.value / 100) * circ;
                                            return (
                                              <div key={d.label} style={{ textAlign: "center" }}>
                                                <svg width={58} height={58}>
                                                  <circle cx={29} cy={29} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
                                                  <circle cx={29} cy={29} r={r} fill="none" stroke={d.color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 29 29)" />
                                                  <text x={29} y={33} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0f172a">{d.value}</text>
                                                </svg>
                                                <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 600, color: "#64748b" }}>{d.label}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        {score.feedback && <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#334155", lineHeight: 1.6, background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>{score.feedback}</p>}
                                        <div style={{ display: "flex", gap: "10px" }}>
                                          {score.strengths?.length > 0 && (
                                            <div style={{ flex: 1, background: "#f0fdf4", borderRadius: "8px", padding: "8px 10px", border: "1px solid #bbf7d0" }}>
                                              <p style={{ margin: "0 0 4px", fontSize: "0.6rem", fontWeight: 700, color: "#15803d" }}>STRENGTHS</p>
                                              {score.strengths.map((s: string, i: number) => <p key={i} style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#166534" }}>• {s}</p>)}
                                            </div>
                                          )}
                                          {score.improvements?.length > 0 && (
                                            <div style={{ flex: 1, background: "#fef9c3", borderRadius: "8px", padding: "8px 10px", border: "1px solid #fde68a" }}>
                                              <p style={{ margin: "0 0 4px", fontSize: "0.6rem", fontWeight: 700, color: "#92400e" }}>AREAS TO IMPROVE</p>
                                              {score.improvements.map((s: string, i: number) => <p key={i} style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#78350f" }}>• {s}</p>)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <p style={{ margin: "0 0 12px", fontSize: "0.72rem", color: "#94a3b8" }}>
                                        {session.status === "completed" ? "Grading in progress…" : session.status === "pending" ? "Waiting for candidate to start." : "Interview in progress."}
                                      </p>
                                    )}

                                    {/* Transcript */}
                                    {Array.isArray(session.transcript) && session.transcript.length > 0 && (
                                      <div style={{ background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", maxHeight: 280, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <p style={{ margin: "0 0 6px", fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em" }}>INTERVIEW TRANSCRIPT</p>
                                        {session.transcript.map((turn: any, ti: number) => (
                                          <div key={ti} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: turn.speaker === "ai" ? "#2B72F0" : "#22c55e", width: 60, flexShrink: 0, paddingTop: 2 }}>{turn.speaker === "ai" ? "AI" : "CANDIDATE"}</span>
                                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#334155", lineHeight: 1.6 }}>{turn.text}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Shortlist controls */}
                      {interviewPickIds.size > 0 && (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "12px 14px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                          <button onClick={confirmInterviewShortlist} style={{ padding: "8px 18px", borderRadius: "8px", background: "#16a34a", color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                            Confirm &amp; Advance ({interviewPickIds.size})
                          </button>
                          <button onClick={() => setInterviewPickIds(new Set())} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>Clear</button>
                          <span style={{ fontSize: "0.72rem", color: "#16a34a" }}>{interviewPickIds.size} candidate(s) selected to advance</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Final stage (Final Selection) ── */}
                  {activeStage.type === "final" && (
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "8px", background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                        <Sparkles style={{ width: "14px", height: "14px", color: "#7c3aed", flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 4px", fontSize: "0.78rem", fontWeight: 700, color: "#4c1d95" }}>Final AI Selection</p>
                          <p style={{ margin: 0, fontSize: "0.72rem", color: "#7c3aed", lineHeight: 1.5 }}>
                            The AI synthesises every screening stage — CV review, deep review, practical assessment, and AI interview — to produce a holistic final verdict for each candidate.
                          </p>
                        </div>
                        <button onClick={runFinalSelection} disabled={finalSelLoading} style={{ padding: "6px 14px", borderRadius: "6px", background: finalSelLoading ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", fontSize: "0.72rem", fontWeight: 700, cursor: finalSelLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {finalSelLoading ? <><Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} /> Analysing…</> : <><Sparkles style={{ width: "12px", height: "12px" }} /> Run Final Selection</>}
                        </button>
                      </div>

                      {finalSelMsg && <p style={{ margin: 0, fontSize: "0.72rem", color: "#7c3aed", fontWeight: 600 }}>{finalSelMsg}</p>}

                      {finalSelResults.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {finalSelResults.map((r: any) => {
                            const isExp = finalSelExpanded === r.candidateId;
                            const decisionStyle: Record<string, { bg: string; color: string; label: string }> = {
                              hire: { bg: "#dcfce7", color: "#16a34a", label: "Hire" },
                              maybe: { bg: "#fef9c3", color: "#a16207", label: "Maybe" },
                              pass: { bg: "#fee2e2", color: "#dc2626", label: "Pass" },
                            };
                            const ds = decisionStyle[r.hiringDecision] || decisionStyle.maybe;
                            return (
                              <div key={r.candidateId} style={{ border: "1px solid #e9d5ff", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => setFinalSelExpanded(isExp ? null : r.candidateId)}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{r.candidateName || "Candidate"}</p>
                                    <p style={{ margin: 0, fontSize: "0.7rem", color: "#64748b" }}>{r.email}</p>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: r.finalScore >= 75 ? "#22c55e" : r.finalScore >= 55 ? "#f59e0b" : "#ef4444" }}>{r.finalScore}/100</span>
                                    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700, background: ds.bg, color: ds.color }}>{ds.label}</span>
                                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2} style={{ transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                  </div>
                                </div>
                                {isExp && (
                                  <div style={{ borderTop: "1px solid #f3e8ff", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#334155", lineHeight: 1.6, background: "#faf5ff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e9d5ff" }}><strong>AI Conclusion:</strong> {r.conclusion}</p>
                                    {r.recommendation && <p style={{ margin: 0, fontSize: "0.72rem", color: "#475569", fontStyle: "italic" }}>"{r.recommendation}"</p>}
                                    <div style={{ display: "flex", gap: "10px" }}>
                                      {r.strengths?.length > 0 && (
                                        <div style={{ flex: 1, background: "#f0fdf4", borderRadius: "8px", padding: "8px 10px", border: "1px solid #bbf7d0" }}>
                                          <p style={{ margin: "0 0 4px", fontSize: "0.6rem", fontWeight: 700, color: "#15803d" }}>STRENGTHS</p>
                                          {r.strengths.map((s: string, i: number) => <p key={i} style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#166534" }}>• {s}</p>)}
                                        </div>
                                      )}
                                      {r.concerns?.length > 0 && (
                                        <div style={{ flex: 1, background: "#fef9c3", borderRadius: "8px", padding: "8px 10px", border: "1px solid #fde68a" }}>
                                          <p style={{ margin: "0 0 4px", fontSize: "0.6rem", fontWeight: 700, color: "#92400e" }}>CONCERNS</p>
                                          {r.concerns.map((s: string, i: number) => <p key={i} style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#78350f" }}>• {s}</p>)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {finalSelResults.length === 0 && !finalSelLoading && (
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>Click "Run Final Selection" to synthesise all screening stages and get a comprehensive AI verdict for each candidate.</p>
                      )}
                    </div>
                  )}

                  {activeStage.status === "done" && sortedStageResults.length === 0 && activeStage.type !== "practical" && activeStage.type !== "ai_interview" && activeStage.type !== "final" && (
                    <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>
                      <AlertCircle style={{ width: "32px", height: "32px", margin: "0 auto 8px" }} />
                      <p style={{ margin: 0, fontSize: "0.85rem" }}>No results found for this stage.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        </div>
      )}

      <AiJudgmentModal
        result={aiJudgmentModal}
        candidate={aiJudgmentModal ? getCand(aiJudgmentModal) : null}
        job={selJob}
        onClose={() => setAiJudgmentModal(null)}
      />
      <ApplicantDetailModal candidate={viewApplicant} job={selJob} onClose={() => setViewApplicant(null)} />

      {/* ── Rollback confirmation modal ── */}
      {rollbackConfirmIdx !== null && pipeline && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", maxWidth: 420, width: "100%", boxShadow: "0 12px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#FEF9C3", border: "1px solid #FDE68A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <RotateCcw style={{ width: 20, height: 20, color: "#92400E" }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Roll back to this stage?</h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                  <strong>{pipeline.stages[rollbackConfirmIdx]?.name}</strong>
                </p>
              </div>
            </div>
            <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#78350F", lineHeight: 1.6 }}>
                All progress from <strong>{pipeline.stages[rollbackConfirmIdx]?.name}</strong> onward will be cleared:
              </p>
              <ul style={{ margin: "8px 0 0 16px", padding: 0, fontSize: "0.78rem", color: "#92400E", lineHeight: 1.8 }}>
                {pipeline.stages.slice(rollbackConfirmIdx).map((s, i) => (
                  <li key={i}>{s.name} — results, shortlists, emails</li>
                ))}
              </ul>
              <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#92400E", fontWeight: 600 }}>
                Candidates will be returned to this stage&apos;s pool so you can re-screen them.
              </p>
            </div>
            {rollbackMsg && (
              <p style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>{rollbackMsg}</p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setRollbackConfirmIdx(null); setRollbackMsg(""); }}
                disabled={rollbackBusy}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#374151", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => doRollback(rollbackConfirmIdx)}
                disabled={rollbackBusy}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#f59e0b", border: "none", color: "#fff", fontSize: "0.875rem", fontWeight: 700, cursor: rollbackBusy ? "not-allowed" : "pointer", opacity: rollbackBusy ? 0.7 : 1 }}
              >
                {rollbackBusy ? "Rolling back…" : "Yes, Roll Back"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video Recording Modal ── */}
      {videoModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => { URL.revokeObjectURL(videoModal.url); setVideoModal(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.25)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#2b72f0" strokeWidth={2}><polygon points="23 7 16 12 23 17 23 7"/><rect x={1} y={5} width={15} height={14} rx={2}/></svg>
                <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>{videoModal.name} — Interview Recording</span>
              </div>
              <button onClick={() => { URL.revokeObjectURL(videoModal.url); setVideoModal(null); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
                <X style={{ width: 18, height: 18, color: "#64748b" }} />
              </button>
            </div>
            {/* Body */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              {/* Video */}
              <div style={{ flex: 2, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <video src={videoModal.url} controls autoPlay style={{ width: "100%", maxHeight: "60vh", outline: "none" }} />
              </div>
              {/* Transcript */}
              {videoModal.transcript.length > 0 && (
                <div style={{ flex: 1, minWidth: 240, maxWidth: 320, borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <p style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em" }}>TRANSCRIPT</p>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {videoModal.transcript.map((turn: any, i: number) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: turn.speaker === "ai" ? "#2b72f0" : "#22c55e" }}>
                          {turn.speaker === "ai" ? "AI Interviewer" : "Candidate"}
                        </span>
                        <p style={{ margin: 0, fontSize: "0.72rem", color: "#334155", lineHeight: 1.55, background: turn.speaker === "ai" ? "#f0f9ff" : "#f0fdf4", padding: "6px 10px", borderRadius: 8, border: `1px solid ${turn.speaker === "ai" ? "#dbeafe" : "#dcfce7"}` }}>
                          {turn.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("umuranga_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then(r => { setUser(r.data.user); return api.get("/jobs"); })
      .then(r => setJobs(r.data.data))
      .catch(() => localStorage.removeItem("umuranga_token"))
      .finally(() => setLoading(false));
  }, []);

  const onAuth = useCallback(async (u: AuthUser) => {
    setUser(u);
    try { const { data } = await api.get("/jobs"); setJobs(data.data); } catch { /* ignore */ }
  }, []);

  const logout = () => { localStorage.removeItem("umuranga_token"); setUser(null); setJobs([]); setTab("overview"); };

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Loader2 style={{ width: "36px", height: "36px", color: "#2b72f0", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!user) return <AuthGate onAuth={onAuth} />;

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f1f5f9" }}>
        <Sidebar tab={tab} setTab={setTab} user={user} onLogout={logout} />
        <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {tab === "overview" && <OverviewTab jobs={jobs} user={user} />}
          {tab === "jobs"     && <JobsTab jobs={jobs} onCreated={j => setJobs(prev => [j, ...prev])} onUpdated={j => setJobs(prev => prev.map(x => x._id === j._id ? j : x))} onDeleted={id => setJobs(prev => prev.filter(x => x._id !== id))} />}
          {tab === "hire"     && <HireTab jobs={jobs} />}
        </main>
      </div>
    </>
  );
}
