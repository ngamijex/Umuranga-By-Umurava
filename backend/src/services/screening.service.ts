import { IJob } from "../models/Job.model";
import { ICandidate, IWorkExperience } from "../models/Candidate.model";
import type { IHrInputsAssessment, IJobRequirementComparisonRow } from "../models/ScreeningResult.model";
import { openaiChatText } from "../config/openai";
import { buildHrContextStringForJob } from "./pipelineHrContext.service";

export interface ScreeningOutput {
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
  /** Point-by-point: job needs vs what the candidate offers */
  jobRequirementComparisons: IJobRequirementComparisonRow[];
  /** Explicit alignment with HR pipeline inputs (preferences, criteria, notes) */
  hrInputsAssessment: IHrInputsAssessment;
}

const FIT_LEVELS = new Set(["strong", "partial", "weak", "missing"]);

const calcTotalYears = (exp: IWorkExperience[]): number => {
  if (!exp?.length) return 0;
  return exp.reduce((sum, e) => {
    const sy = parseInt((e.startDate || "").slice(0, 4)) || 0;
    const ey = e.isCurrent ? new Date().getFullYear() : (parseInt((e.endDate || "").slice(0, 4)) || sy);
    return sum + Math.max(0, ey - sy);
  }, 0);
};

function coerceFitLevel(v: unknown): IJobRequirementComparisonRow["fitLevel"] {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (FIT_LEVELS.has(s)) return s as IJobRequirementComparisonRow["fitLevel"];
  return "partial";
}

function normalizeScreeningOutput(raw: Record<string, unknown>): ScreeningOutput {
  const rows = Array.isArray(raw.jobRequirementComparisons) ? raw.jobRequirementComparisons : [];
  const jobRequirementComparisons: IJobRequirementComparisonRow[] = rows.map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      aspect: String(r.aspect ?? ""),
      whatJobNeeds: String(r.whatJobNeeds ?? ""),
      whatCandidateOffers: String(r.whatCandidateOffers ?? ""),
      fitLevel: coerceFitLevel(r.fitLevel),
      detail: String(r.detail ?? ""),
    };
  });

  const h = (raw.hrInputsAssessment ?? {}) as Record<string, unknown>;
  const hrInputsAssessment: IHrInputsAssessment = {
    howPreferencesApply: String(h.howPreferencesApply ?? ""),
    howCriteriaApply: String(h.howCriteriaApply ?? ""),
    howNotesApply: String(h.howNotesApply ?? ""),
    overallAlignment: String(h.overallAlignment ?? ""),
  };

  return {
    overallScore: Number(raw.overallScore) || 0,
    dimensionScores: {
      skills: Number((raw.dimensionScores as Record<string, unknown>)?.skills) || 0,
      experience: Number((raw.dimensionScores as Record<string, unknown>)?.experience) || 0,
      education: Number((raw.dimensionScores as Record<string, unknown>)?.education) || 0,
      culture: Number((raw.dimensionScores as Record<string, unknown>)?.culture) || 0,
    },
    matchedSkills: Array.isArray(raw.matchedSkills) ? (raw.matchedSkills as string[]) : [],
    missingSkills: Array.isArray(raw.missingSkills) ? (raw.missingSkills as string[]) : [],
    strengths: Array.isArray(raw.strengths) ? (raw.strengths as string[]) : [],
    gaps: Array.isArray(raw.gaps) ? (raw.gaps as string[]) : [],
    recommendation: (["strong_yes", "yes", "maybe", "no"].includes(String(raw.recommendation))
      ? raw.recommendation
      : "maybe") as ScreeningOutput["recommendation"],
    aiExplanation: String(raw.aiExplanation ?? ""),
    jobRequirementComparisons,
    hrInputsAssessment,
  };
}

const RESUME_PROMPT_CHARS = 12000;

const buildPrompt = (job: IJob, candidate: ICandidate, hrContext: string, _stageType?: string): string => {
  const totalYears = calcTotalYears(candidate.experience || []);
  const skillsSummary = (candidate.skills || []).map(s => `${s.name} (${s.level}, ${s.yearsOfExperience}yr)`).join(", ") || "None listed";
  const expSummary = (candidate.experience || []).map(e => `${e.role} at ${e.company} (${e.startDate}–${e.isCurrent ? "Present" : e.endDate}): ${e.description || ""} [${(e.technologies || []).join(", ")}]`).join(" | ") || "No experience listed";
  const eduSummary = (candidate.education || []).map(e => `${e.degree} in ${e.fieldOfStudy} — ${e.institution} (${e.startYear}–${e.endYear})`).join(" | ") || "No education listed";
  const projSummary = (candidate.projects || []).map(p => `${p.name}: ${p.description} [${(p.technologies || []).join(", ")}]`).join(" | ") || "No projects listed";
  const certSummary = (candidate.certifications || []).map(c => `${c.name} by ${c.issuer}`).join(", ") || "None";
  const langSummary = (candidate.languages || []).map(l => `${l.name} (${l.proficiency})`).join(", ") || "Not specified";
  const resumeSlice = candidate.resumeText
    ? candidate.resumeText.slice(0, RESUME_PROMPT_CHARS)
    : "";
  const bioLine = candidate.bio?.trim() ? `- Professional bio: ${candidate.bio}` : "";

  return `
You are an expert AI talent screener. You must evaluate the **whole person** using the job, HR context, structured profile fields, **and** the resume/CV narrative below — not keyword-matching alone.

Return ONLY a valid JSON object (no markdown fences, no text outside JSON).

## Job Requirements
- Title: ${job.title}
- Department: ${job.department}
- Required Skills: ${job.requiredSkills.join(", ")}
- Preferred Skills: ${job.preferredSkills.join(", ")}
- Minimum Experience: ${job.experienceYears} years
- Education Level Required: ${job.educationLevel}
- Job Description: ${job.description}

## HR Guidelines & Pipeline Context (you MUST factor these into scores and written analysis)
${hrContext}

## Score Weights (use as priorities when judging overall fit)
- Skills Match: ${job.weights.skills}%
- Experience Depth: ${job.weights.experience}%
- Education Fit: ${job.weights.education}%
- Culture/Projects/Other: ${job.weights.culture}%

## Candidate Profile (structured)
- Name: ${candidate.firstName} ${candidate.lastName}
- Headline: ${candidate.headline}
- Location: ${candidate.location}
- Total Experience (approx.): ~${totalYears} years
${bioLine}
- Skills: ${skillsSummary}
- Work Experience: ${expSummary}
- Education: ${eduSummary}
- Projects: ${projSummary}
- Certifications: ${certSummary}
- Languages: ${langSummary}
- Availability: ${candidate.availability?.status || "Unknown"} · ${candidate.availability?.type || "Unknown"}

## Resume / CV text (primary source for holistic judgment — read carefully)
${resumeSlice ? `Use this text together with the structured fields above. Up to ${RESUME_PROMPT_CHARS} characters:\n${resumeSlice}` : "No raw resume text was stored for this candidate — rely on structured fields only and state this limitation in aiExplanation if it matters."}

## Holistic judgment (required mindset)
- Form a **general, balanced view** of the applicant: career trajectory, consistency, depth vs breadth, relevance of past roles, evidence of outcomes/impact where visible, and professionalism implied by the CV.
- **Do not** judge fit from job-title keyword overlap alone. Weigh transferable experience, adjacent skills, and narrative from the CV against what the role actually needs.
- If the resume is thin or missing detail, reflect that honestly in scores and gaps — do not invent experience.
- When HR sets a **target shortlist size** in the pipeline context, your **overallScore** and **recommendation** should help rank this candidate fairly against others (strong evidence → higher scores; clear mismatches → lower).

## Instructions for your analysis
1. **jobRequirementComparisons**: Produce **at least 5 rows**. Each row compares ONE concrete job need (from required skills, preferred skills, experience bar, education, or critical themes in the job description) to **specific evidence** from the candidate profile **and/or** resume text above. Use fitLevel: strong | partial | weak | missing.
2. **hrInputsAssessment**: Write **detailed** strings explaining how the candidate aligns or conflicts with **HR Preferences**, **Additional Criteria**, and **HR Notes** from the pipeline context above. If HR fields were empty/not configured, say so explicitly in each sub-field and in overallAlignment.
3. **dimensionScores** and **overallScore** must reflect the evidence in your comparisons, holistic read of the CV, and HR assessment.
4. **aiExplanation**: 4–6 sentences: overall judgment, how the CV supports or weakens the case beyond skill lists, tradeoffs, and any HR-specific takeaway.

## Required JSON shape (exact keys)
{
  "overallScore": <number 0-100>,
  "dimensionScores": { "skills": <0-100>, "experience": <0-100>, "education": <0-100>, "culture": <0-100> },
  "matchedSkills": ["..."],
  "missingSkills": ["..."],
  "strengths": ["..."],
  "gaps": ["..."],
  "recommendation": "strong_yes|yes|maybe|no",
  "aiExplanation": "<string>",
  "jobRequirementComparisons": [
    {
      "aspect": "<short label, e.g. Required: TypeScript>",
      "whatJobNeeds": "<quote or paraphrase from job>",
      "whatCandidateOffers": "<specific evidence from candidate>",
      "fitLevel": "strong|partial|weak|missing",
      "detail": "<one or two sentences explaining the match gap>"
    }
  ],
  "hrInputsAssessment": {
    "howPreferencesApply": "<detailed paragraph>",
    "howCriteriaApply": "<detailed paragraph>",
    "howNotesApply": "<detailed paragraph>",
    "overallAlignment": "<detailed paragraph on HR + job fit together>"
  }
}
`;
};

/**
 * Screens one candidate. If \`hrContext\` is omitted, loads HR text from Pipeline stage 0 (Initial CV Screen),
 * or a clear fallback when no pipeline exists — so **job + candidate + HR** is always included in the prompt.
 * When running a specific pipeline stage, pass the stage-specific \`hrContext\` from the route (same as today).
 */
export const screenCandidate = async (
  job: IJob,
  candidate: ICandidate,
  hrContext?: string,
  stageType?: string
): Promise<ScreeningOutput> => {
  let combinedHr = hrContext;
  if (combinedHr === undefined || combinedHr === null) {
    combinedHr = await buildHrContextStringForJob(job._id, 0);
  }

  const prompt = buildPrompt(job, candidate, combinedHr, stageType);

  try {
    const text = await openaiChatText(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("OpenAI returned an unexpected format — no JSON found.");
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return normalizeScreeningOutput(parsed);
  } catch (error: any) {
    console.error("[screenCandidate] OpenAI API full error:", JSON.stringify(error.response?.data, null, 2) || error.message);
    console.error("[screenCandidate] URL used:", `https://api.openai.com/v1/chat/completions`);
    console.error("[screenCandidate] Status:", error.response?.status);
    throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
  }
};
