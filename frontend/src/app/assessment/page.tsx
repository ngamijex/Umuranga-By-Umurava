"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import api from "@/lib/api";

/* ── Brand tokens ─────────────────────────────────────────── */
const C = {
  primary:       "#2B72F0",
  primaryDark:   "#1D4ED8",
  primary50:     "#EFF6FF",
  primary100:    "#DBEAFE",
  primary200:    "#BFDBFE",
  primary800:    "#1E40AF",
  primary900:    "#1E3A8A",
  white:         "#FFFFFF",
  gray50:        "#F9FAFB",
  gray100:       "#F3F4F6",
  gray200:       "#E5E7EB",
  gray300:       "#D1D5DB",
  gray400:       "#9CA3AF",
  gray500:       "#6B7280",
  gray600:       "#4B5563",
  gray700:       "#374151",
  gray800:       "#1F2937",
  gray900:       "#111827",
  success:       "#10B981",
  successBg:     "#D1FAE5",
  successBorder: "#6EE7B7",
  successDark:   "#065F46",
  warningBg:     "#FEF3C7",
  warningBorder: "#FCD34D",
  warningDark:   "#92400E",
  errorBg:       "#FEE2E2",
  errorBorder:   "#FCA5A5",
  errorDark:     "#991B1B",
};

/* ── SVG icon set ─────────────────────────────────────────── */
const Icon = {
  clipboard: (color = C.white, size = 16) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  ),
  checkCircle: (color = C.successDark, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11.5 14.5 15 10" />
    </svg>
  ),
  upload: (color = C.primary, size = 28) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  ),
  paperclip: (color = C.gray600, size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  warning: (color = C.warningDark, size = 18) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  lock: (color = C.errorDark, size = 24) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  download: (color = C.primary, size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  ),
  pin: (color = C.primary800, size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z" />
    </svg>
  ),
  arrowRight: (color = C.white, size = 16) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  clock: (color = C.warningDark, size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  format: (color = C.primary800, size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  info: (color = C.gray600, size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

/* ─────────────────────────────────────────── */

interface AssessmentQuestion {
  id: string;
  label: string;
  inputType: "text" | "textarea" | "file" | "multiple_choice";
  options?: string[];
}
interface AssessmentSection {
  title: string;
  description?: string;
  questions: AssessmentQuestion[];
}
interface AssessmentResource {
  id: string;
  name: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
}
interface AssessmentDef {
  mode: "form" | "project" | "both";
  title: string;
  questions: AssessmentQuestion[];
  sections?: AssessmentSection[];
  projectInstructions?: string;
  maxFiles?: number;
  maxFileMb?: number;
  resources?: AssessmentResource[];
}

/* ─── Question renderer ───────────────────────────────────── */
function QuestionInput({
  q, si, qi, textAnswers, setTextAnswers, fileInputs, setFileInputs,
}: {
  q: AssessmentQuestion; si: number; qi: number;
  textAnswers: Record<string, string>;
  setTextAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fileInputs: Record<string, File | null>;
  setFileInputs: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
}) {
  const sel = (opt: string) => textAnswers[q.id] === opt;

  return (
    <div style={{ paddingBottom: 24, borderBottom: `1px solid ${C.gray100}` }}>
      {/* Label */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
        <span style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
          background: C.primary, color: C.white,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.68rem", fontWeight: 800, marginTop: 1,
        }}>
          {si + 1}.{qi + 1}
        </span>
        <div>
          <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: C.gray900, lineHeight: 1.5 }}>{q.label}</p>
          {q.inputType === "multiple_choice" && (
            <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.63rem", background: C.primary100, color: C.primary800, padding: "2px 8px", borderRadius: 99, fontWeight: 700, letterSpacing: "0.04em", border: `1px solid ${C.primary200}` }}>
              SELECT ONE
            </span>
          )}
        </div>
      </div>

      {/* MCQ */}
      {q.inputType === "multiple_choice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 36 }}>
          {(q.options || []).map((opt, oi) => (
            <label key={oi} onClick={() => setTextAnswers(a => ({ ...a, [q.id]: opt }))} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", borderRadius: 8,
              border: `${sel(opt) ? "2px" : "1.5px"} solid ${sel(opt) ? C.primary : C.gray200}`,
              background: sel(opt) ? C.primary50 : C.white,
              cursor: "pointer", fontSize: "0.88rem",
              fontWeight: sel(opt) ? 600 : 400, color: sel(opt) ? C.primary800 : C.gray700,
              transition: "border-color .15s, background .15s",
            }}>
              <span style={{
                flexShrink: 0, width: 16, height: 16, borderRadius: "50%",
                border: sel(opt) ? `5px solid ${C.primary}` : `2px solid ${C.gray300}`,
                background: C.white, transition: "border .15s",
              }} />
              {opt}
            </label>
          ))}
        </div>
      )}

      {/* Textarea */}
      {q.inputType === "textarea" && (
        <textarea value={textAnswers[q.id] || ""} onChange={e => setTextAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          rows={5} placeholder="Write your answer here…"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.gray200}`, fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6, outline: "none", color: C.gray800 }}
          onFocus={e => { e.target.style.borderColor = C.primary; }}
          onBlur={e => { e.target.style.borderColor = C.gray200; }} />
      )}

      {/* Text */}
      {q.inputType === "text" && (
        <input type="text" value={textAnswers[q.id] || ""} onChange={e => setTextAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          placeholder="Your answer…"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.gray200}`, fontSize: "0.9rem", boxSizing: "border-box", outline: "none", color: C.gray800 }}
          onFocus={e => { e.target.style.borderColor = C.primary; }}
          onBlur={e => { e.target.style.borderColor = C.gray200; }} />
      )}

      {/* File */}
      {q.inputType === "file" && (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, cursor: "pointer", border: `1.5px dashed ${C.gray300}`, background: C.gray50, fontSize: "0.85rem", color: C.gray600, fontWeight: 600 }}>
          {Icon.paperclip(C.gray500, 14)}
          {fileInputs[q.id] ? fileInputs[q.id]!.name : "Choose file…"}
          <input type="file" style={{ display: "none" }} onChange={e => setFileInputs(f => ({ ...f, [q.id]: e.target.files?.[0] || null }))} />
        </label>
      )}
    </div>
  );
}

/* ─── Main form ───────────────────────────────────────────── */
function AssessmentForm() {
  const sp = useSearchParams();
  const jobId = sp.get("jobId") || "";
  const email = (sp.get("email") || "").trim();

  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [info, setInfo]         = useState<{
    jobTitle: string; stageName: string;
    assessmentUrl: string; assessmentFormat: string;
    submissionDeadlineAt: string; extraInstructions: string;
    assessmentDefinition: AssessmentDef | null;
    resources: AssessmentResource[]; submitted: boolean;
  } | null>(null);
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [fileInputs, setFileInputs]   = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [doneMsg, setDoneMsg]         = useState("");

  useEffect(() => {
    if (!jobId || !email) { setLoading(false); setErr("Add jobId and email to the URL, e.g. ?jobId=…&email=…"); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const { data } = await api.get(`/public/practical/${jobId}/info`, { params: { email } });
        if (!cancelled && data.success) setInfo(data.data);
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not load assessment.";
        if (!cancelled) setErr(msg);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [jobId, email]);

  const allQuestions = (): AssessmentQuestion[] => {
    const def = info?.assessmentDefinition;
    if (!def) return [];
    if (def.sections?.length) return def.sections.flatMap(s => s.questions);
    return def.questions || [];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info || info.submitted) return;
    const qs = allQuestions();
    if (qs.length) {
      for (const q of qs) {
        if (q.inputType === "file") continue;
        if (q.inputType === "multiple_choice") {
          if (!textAnswers[q.id]) { setErr(`Please select an answer for: ${q.label}`); return; }
          continue;
        }
        if (!String(textAnswers[q.id] || "").trim()) { setErr(`Please answer: ${q.label}`); return; }
      }
    } else if (!String(textAnswers.notes || "").trim() && !fileInputs.file) {
      setErr("Please provide answers and/or upload a file."); return;
    }
    setSubmitting(true); setDoneMsg(""); setErr("");
    try {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("answersJson", JSON.stringify(qs.length ? textAnswers : { notes: textAnswers.notes || "" }));
      for (const q of qs) {
        if (q.inputType === "file") { const f = fileInputs[q.id]; if (f) fd.append(`file_${q.id}`, f, f.name); }
      }
      if (!qs.length && fileInputs.file) fd.append("file_file", fileInputs.file, fileInputs.file.name);
      await api.post(`/public/practical/${jobId}/submit`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDoneMsg("Your submission was received successfully.");
      setInfo(prev => (prev ? { ...prev, submitted: true } : prev));
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Submit failed.");
    } finally { setSubmitting(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.gray200}`, borderTop: `3px solid ${C.primary}`, borderRadius: "50%", margin: "0 auto 16px", animation: "spin .8s linear infinite" }} />
        <p style={{ color: C.gray500, fontSize: "0.9rem" }}>Loading assessment…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Error ── */
  if (err && !info) return (
    <div style={{ minHeight: "100vh", background: C.gray50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 480, padding: 32, background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.errorBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {Icon.lock(C.errorDark, 22)}
        </div>
        <h1 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 8, color: C.gray900 }}>Assessment unavailable</h1>
        <p style={{ color: C.errorDark, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{err}</p>
      </div>
    </div>
  );

  const def            = info?.assessmentDefinition;
  const hasSections    = !!(def?.sections?.length);
  const hasQuestions   = !!(def?.questions?.length);
  const hasProject     = !!(def?.projectInstructions?.trim());
  const hasStructured  = hasSections || hasQuestions || hasProject;
  const allResources   = def?.resources?.length ? def.resources : (info?.resources || []);
  const totalSections  = def?.sections?.length || 0;
  const totalQuestions = allQuestions().length;

  return (
    <div style={{ minHeight: "100vh", background: C.gray50, fontFamily: "var(--font-family,'Work Sans',system-ui,sans-serif)", color: C.gray900 }}>

      {/* ── Navbar ── */}
      <div style={{ background: C.primary, height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, position: "sticky", top: 0, zIndex: 100, borderBottom: `1px solid ${C.primaryDark}` }}>
        {/* Logo — same technique as main Navbar: brightness-0 invert for white */}
        <div style={{ height: 56, width: 160, position: "relative", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Umuranga"
            style={{ height: 600, width: "auto", filter: "brightness(0) invert(1)", flexShrink: 0 }}
          />
        </div>
        <span style={{ color: "rgba(255,255,255,0.35)" }}>|</span>
        <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>Candidate Assessment Portal</span>
        {info?.submitted && (
          <span style={{ marginLeft: "auto", background: C.successBg, color: C.successDark, fontSize: "0.72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 99, border: `1px solid ${C.successBorder}` }}>
            Submitted
          </span>
        )}
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* ── Title ── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: C.primary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            {info?.stageName || "Practical Assessment"}
          </p>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 900, color: C.gray900, margin: "0 0 6px", lineHeight: 1.2 }}>
            {def?.title || info?.jobTitle || "Assessment"}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.88rem", color: C.gray500 }}>{info?.jobTitle}</span>
            {totalSections > 0 && (
              <span style={{ padding: "3px 10px", background: C.primary100, borderRadius: 99, fontSize: "0.75rem", color: C.primary800, fontWeight: 600, border: `1px solid ${C.primary200}` }}>
                {totalSections} section{totalSections !== 1 ? "s" : ""} · {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ══ TWO-PART OVERVIEW BANNER (shown when assessment has both project + questions) ══ */}
        {hasProject && (hasSections || hasQuestions) && (
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 24, overflow: "hidden" }}>
            <div style={{ background: C.primary, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              {Icon.clipboard(C.white, 16)}
              <span style={{ fontWeight: 800, color: C.white, fontSize: "0.9rem" }}>Assessment Overview</span>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: C.gray700, lineHeight: 1.7 }}>
                This assessment is made up of <strong style={{ color: C.gray900 }}>two parts</strong>. Please complete both parts fully before submitting.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* Part 1 */}
                <div style={{ flex: "1 1 240px", display: "flex", gap: 14, padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${C.primary200}`, background: C.primary50 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: C.white, fontWeight: 900, fontSize: "0.88rem" }}>1</span>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "0.82rem", fontWeight: 800, color: C.primary900, textTransform: "uppercase", letterSpacing: "0.06em" }}>Practical Project</p>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: C.primary800, lineHeight: 1.55 }}>
                      You will receive a project brief and dataset(s). Work on the project independently and upload your deliverables (report, code, files, etc.).
                    </p>
                  </div>
                </div>
                {/* Part 2 */}
                <div style={{ flex: "1 1 240px", display: "flex", gap: 14, padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${C.gray200}`, background: C.gray50 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: C.gray200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: C.gray700, fontWeight: 900, fontSize: "0.88rem" }}>2</span>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "0.82rem", fontWeight: 800, color: C.gray800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Written Questions</p>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: C.gray600, lineHeight: 1.55 }}>
                      Answer a set of {totalQuestions > 0 ? totalQuestions : ""} question{totalQuestions !== 1 ? "s" : ""} directly in this form — covering your thinking, approach, and experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ INSTRUCTIONS PANEL ══ */}
        {(info?.submissionDeadlineAt || info?.assessmentFormat || info?.extraInstructions || hasProject || allResources.length > 0) && (
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 28, overflow: "hidden" }}>

            {/* Panel header — light blue */}
            <div style={{ background: C.primary100, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.primary200}` }}>
              {Icon.clipboard(C.primary800, 16)}
              <span style={{ fontWeight: 800, color: C.primary900, fontSize: "0.9rem" }}>Before You Begin — Assessment Instructions</span>
            </div>

            <div style={{ padding: "20px 20px 8px" }}>

              {/* Deadline + Format */}
              {(info?.submissionDeadlineAt || info?.assessmentFormat) && (
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  {info?.submissionDeadlineAt && (
                    <div style={{ flex: "1 1 200px", padding: "12px 16px", background: C.warningBg, borderRadius: 8, border: `1px solid ${C.warningBorder}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        {Icon.clock(C.warningDark, 12)}
                        <p style={{ fontSize: "0.63rem", fontWeight: 800, color: C.warningDark, letterSpacing: "0.07em", margin: 0, textTransform: "uppercase" }}>Submission Deadline</p>
                      </div>
                      <p style={{ fontSize: "0.9rem", fontWeight: 700, color: C.warningDark, margin: 0 }}>
                        {new Date(info.submissionDeadlineAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  )}
                  {info?.assessmentFormat && (
                    <div style={{ flex: "1 1 200px", padding: "12px 16px", background: C.primary50, borderRadius: 8, border: `1px solid ${C.primary200}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        {Icon.format(C.primary800, 12)}
                        <p style={{ fontSize: "0.63rem", fontWeight: 800, color: C.primary800, letterSpacing: "0.07em", margin: 0, textTransform: "uppercase" }}>Format</p>
                      </div>
                      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: C.primary900, margin: 0 }}>{info.assessmentFormat}</p>
                    </div>
                  )}
                </div>
              )}

              {/* General instructions */}
              {info?.extraInstructions && (
                <div style={{ marginBottom: 16, padding: "14px 16px", background: C.gray50, borderRadius: 8, border: `1px solid ${C.gray200}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    {Icon.info(C.gray500, 13)}
                    <p style={{ fontSize: "0.63rem", fontWeight: 800, color: C.gray600, letterSpacing: "0.07em", margin: 0, textTransform: "uppercase" }}>General Instructions</p>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: C.gray700, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{info.extraInstructions}</p>
                </div>
              )}

              {/* Project brief + datasets (always together) */}
              {hasProject && (
                <div style={{ marginBottom: 16, borderRadius: 8, border: `1px solid ${C.primary200}`, overflow: "hidden" }}>

                  {/* Brief header */}
                  <div style={{ padding: "10px 16px", background: C.primary, display: "flex", alignItems: "center", gap: 8 }}>
                    {Icon.pin(C.white, 13)}
                    <span style={{ fontSize: "0.63rem", fontWeight: 800, color: C.white, letterSpacing: "0.07em", textTransform: "uppercase" }}>Project Brief</span>
                  </div>

                  {/* Brief text */}
                  <div style={{ padding: "16px 16px 14px", background: C.primary50 }}>
                    <p style={{ fontSize: "0.88rem", color: C.primary900, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{def!.projectInstructions}</p>
                  </div>

                  {/* Datasets — directly below brief */}
                  {allResources.length > 0 && (
                    <div style={{ padding: "14px 16px", background: C.white, borderTop: `1px solid ${C.primary200}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        {Icon.download(C.primary, 14)}
                        <div>
                          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 800, color: C.primary, letterSpacing: "0.07em", textTransform: "uppercase" }}>Project Datasets</p>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: C.gray500 }}>Download the files below to use in your project</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {allResources.map((r, ri) => (
                          <a key={r.storedName}
                            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/public/practical/${jobId}/resources/${r.storedName}`}
                            download={r.name} target="_blank" rel="noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: C.primary50, border: `1px solid ${C.primary200}`, textDecoration: "none" }}>
                            {/* file icon */}
                            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 6, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {Icon.download(C.white, 14)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: C.primary900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                              <p style={{ margin: 0, fontSize: "0.72rem", color: C.gray500 }}>
                                {r.mimeType === "text/csv" ? "CSV Spreadsheet" : r.mimeType.includes("spreadsheet") ? "Excel Workbook" : "File"} · {(r.sizeBytes / 1024).toFixed(0)} KB
                              </p>
                            </div>
                            <span style={{ flexShrink: 0, fontSize: "0.72rem", fontWeight: 700, color: C.primary, background: C.primary100, border: `1px solid ${C.primary200}`, padding: "3px 10px", borderRadius: 99 }}>
                              Download
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Already submitted ── */}
        {info?.submitted && (
          <div style={{ padding: "16px 20px", background: C.successBg, borderRadius: 10, border: `1px solid ${C.successBorder}`, marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 12 }}>
            {Icon.checkCircle(C.successDark, 20)}
            <div>
              <p style={{ margin: 0, fontWeight: 800, color: C.successDark }}>Submission received!</p>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: C.success }}>Your answers have been recorded. The hiring team will review them and be in touch.</p>
            </div>
          </div>
        )}

        {/* ══ FORM ══ */}
        {!info?.submitted && (
          <form onSubmit={submit}>
            {hasStructured ? (
              <>
                {/* ── Part 1 label — only when both project + questions exist ── */}
                {hasProject && (hasSections || hasQuestions) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: C.white, fontWeight: 900, fontSize: "0.78rem" }}>2</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: "0.88rem", color: C.gray900 }}>Written Questions</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: C.gray500 }}>Answer each question directly in the form below.</p>
                    </div>
                  </div>
                )}

                {/* ── Sections ── */}
                {hasSections && def!.sections!.map((sec, si) => (
                  <div key={si} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 20, overflow: "hidden" }}>
                    {/* Section header */}
                    <div style={{ padding: "14px 20px", background: C.primary50, borderBottom: `2px solid ${C.primary}`, display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: C.primary, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.88rem" }}>
                        {si + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800, color: C.gray900 }}>{sec.title}</h2>
                        {sec.description && <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: C.gray500, lineHeight: 1.5 }}>{sec.description}</p>}
                      </div>
                      <span style={{ flexShrink: 0, fontSize: "0.72rem", background: C.primary100, color: C.primary800, padding: "3px 10px", borderRadius: 99, fontWeight: 700, border: `1px solid ${C.primary200}`, whiteSpace: "nowrap" }}>
                        {sec.questions.length} Q
                      </span>
                    </div>
                    {/* Questions */}
                    <div style={{ padding: "20px 20px 4px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {sec.questions.map((q, qi) => (
                        <QuestionInput key={q.id} q={q} si={si} qi={qi}
                          textAnswers={textAnswers} setTextAnswers={setTextAnswers}
                          fileInputs={fileInputs} setFileInputs={setFileInputs} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* ── Flat questions ── */}
                {!hasSections && hasQuestions && (
                  <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", background: C.primary50, borderBottom: `2px solid ${C.primary}` }}>
                      <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800, color: C.gray900 }}>Questions</h2>
                    </div>
                    <div style={{ padding: "20px 20px 4px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {def!.questions.map((q, qi) => (
                        <QuestionInput key={q.id} q={q} si={0} qi={qi}
                          textAnswers={textAnswers} setTextAnswers={setTextAnswers}
                          fileInputs={fileInputs} setFileInputs={setFileInputs} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Part 1 label above deliverables — only when both parts exist ── */}
                {hasProject && (hasSections || hasQuestions) && (def?.mode === "project" || def?.mode === "both") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: C.white, fontWeight: 900, fontSize: "0.78rem" }}>1</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: "0.88rem", color: C.gray900 }}>Practical Project</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: C.gray500 }}>Work on the project below and upload your deliverables.</p>
                    </div>
                  </div>
                )}

                {/* ── Project deliverables ── */}
                {(def?.mode === "project" || def?.mode === "both") && (
                  <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 20, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", background: C.primary50, borderBottom: `2px solid ${C.primary}` }}>
                      <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800, color: C.gray900 }}>Project Deliverables</h2>
                      <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: C.gray500 }}>
                        Upload your files — up to {def?.maxFiles || 5} files, max {def?.maxFileMb || 10} MB each
                      </p>
                    </div>
                    <div style={{ padding: 20 }}>
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 20px", borderRadius: 10, border: `2px dashed ${C.primary200}`, background: C.primary50, cursor: "pointer", textAlign: "center", gap: 8 }}>
                        {Icon.upload(C.primary, 32)}
                        <span style={{ fontWeight: 700, color: C.primary, fontSize: "0.88rem" }}>
                          {Object.keys(fileInputs).filter(k => k.startsWith("deliverable_")).length > 0
                            ? `${Object.keys(fileInputs).filter(k => k.startsWith("deliverable_")).length} file(s) selected`
                            : "Click to upload your deliverables"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: C.gray500 }}>PDF, ZIP, code files, screenshots…</span>
                        <input type="file" multiple accept="*" style={{ display: "none" }}
                          onChange={e => {
                            const files = e.target.files; if (!files) return;
                            const updated = { ...fileInputs };
                            for (let i = 0; i < files.length; i++) updated[`deliverable_${i}`] = files[i];
                            setFileInputs(updated);
                          }} />
                      </label>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── Fallback ── */
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, marginBottom: 20, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", background: C.primary50, borderBottom: `1px solid ${C.gray200}` }}>
                  <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800, color: C.gray900 }}>Your Submission</h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: C.gray400 }}>HR has not published structured questions yet — use free text and file upload.</p>
                </div>
                <div style={{ padding: 20 }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: C.gray600, marginBottom: 8 }}>Written answers, links, explanations</label>
                  <textarea value={textAnswers.notes || ""} onChange={e => setTextAnswers({ notes: e.target.value })} rows={10}
                    placeholder="Write your answers, paste links to repos, provide explanations…"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${C.gray200}`, fontSize: "0.9rem", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", outline: "none" }} />
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: C.gray600, marginTop: 16, marginBottom: 8 }}>Attachments</label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, border: `1.5px dashed ${C.gray300}`, background: C.gray50, cursor: "pointer", fontSize: "0.85rem", color: C.gray600, fontWeight: 600 }}>
                    {Icon.paperclip(C.gray500, 14)}
                    {fileInputs.file ? fileInputs.file.name : "Choose file…"}
                    <input type="file" style={{ display: "none" }} onChange={e => setFileInputs({ file: e.target.files?.[0] || null })} />
                  </label>
                </div>
              </div>
            )}

            {/* ── Submit bar ── */}
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: C.gray900 }}>Ready to submit?</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: C.gray400 }}>Make sure you have answered all required questions before submitting.</p>
              </div>
              <button type="submit" disabled={submitting} style={{ padding: "11px 28px", borderRadius: 99, border: "none", background: submitting ? C.gray300 : C.primary, color: C.white, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 8, transition: "background .2s" }}>
                {submitting ? "Submitting…" : (
                  <>{" "}Submit Assessment{" "}{Icon.arrowRight(C.white, 15)}</>
                )}
              </button>
            </div>

            {doneMsg && (
              <div style={{ marginTop: 12, padding: "13px 18px", background: C.successBg, borderRadius: 10, border: `1px solid ${C.successBorder}`, color: C.successDark, fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 10 }}>
                {Icon.checkCircle(C.successDark, 18)}
                {doneMsg}
              </div>
            )}
            {err && (
              <div style={{ marginTop: 12, padding: "13px 18px", background: C.errorBg, borderRadius: 10, border: `1px solid ${C.errorBorder}`, color: C.errorDark, fontWeight: 600, fontSize: "0.86rem", display: "flex", alignItems: "center", gap: 10 }}>
                {Icon.warning(C.errorDark, 16)}
                {err}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6B7280", fontFamily: "system-ui" }}>Loading…</p>
      </div>
    }>
      <AssessmentForm />
    </Suspense>
  );
}
