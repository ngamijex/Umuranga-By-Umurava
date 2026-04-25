import { geminiChatText } from "../config/gemini";
import type { IJob } from "../models/Job.model";
import type { IPracticalAssessmentDefinition, IAssessmentResource } from "../models/assessmentDefinition";

export interface IGeneratedDataset {
  filename: string;       // e.g. "customers.csv"
  description: string;   // shown to candidates
  headers: string[];     // column names — used to write a dataset-aware project brief
  csvContent: string;    // raw CSV text
  xlsxBuffer?: Buffer;   // optional binary Excel buffer
}

/** Lightweight descriptor passed to the brief-generation prompt */
export interface IDatasetMeta {
  filename: string;
  description: string;
  columns: string[];
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return t;
}

const VALID_INPUT_TYPES = ["text", "textarea", "file", "multiple_choice"];

function sanitiseQuestion(q: any, idFallback: string) {
  if (!q.id) q.id = idFallback;
  if (!q.label) q.label = "Question";
  if (!VALID_INPUT_TYPES.includes(q.inputType)) q.inputType = "textarea";
  if (q.inputType === "multiple_choice") {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      q.options = ["Option A", "Option B", "Option C", "Option D"];
    }
  } else {
    q.options = [];
  }
  return q;
}

/**
 * AI-generated practical assessment: either structured sectioned form or a project brief with file uploads.
 */
export async function aiGeneratePracticalAssessment(
  job: IJob,
  mode: "form" | "project",
  hrHint?: string,
  datasetMeta?: IDatasetMeta[]
): Promise<IPracticalAssessmentDefinition> {
  const hint = hrHint?.trim() || "";
  const skills = (job.requiredSkills || []).join(", ") || "not specified";
  const desc = String(job.description).slice(0, 5000);

  const prompt = mode === "form"
    ? `You are designing a comprehensive hiring assessment FORM for the role of "${job.title}" (${job.department} department).

Job description excerpt:
${desc}

Required skills: ${skills}
HR hints: ${hint || "none"}

Create a form with exactly 5 SECTIONS, each with exactly 4 questions (20 questions total). Each section targets a different dimension:
1. Technical Knowledge & Skills — use a MIX of multiple-choice (test concrete concepts) and written (explain/demonstrate)
2. Experience & Projects — open-ended written questions asking candidates to describe real projects, decisions, outcomes
3. Problem Solving & Thinking — scenario-based MCQ + 1 written question asking them to think aloud
4. About You & Your Story — open-ended questions to understand background, passion, what drives them, what they are most proud of
5. Aspirations & Culture Fit — questions about career goals, working style, why this role, what they value in a team

Rules:
- Each section: EXACTLY 4 questions (total must be 20 across all sections)
- MCQ: always provide exactly 4 meaningful options (not trivial "none of the above")
- Written questions: open-ended, encourage storytelling and self-reflection, NOT yes/no
- Self-reflection questions should feel like conversations: "Tell us about...", "Describe a time...", "What excites you about...", "Walk us through..."
- Use ids like s1q1, s1q2, s2q1, s2q2, etc.

Return ONLY valid JSON (no markdown fence):
{
  "mode": "form",
  "title": "<short assessment title>",
  "sections": [
    {
      "title": "<section name>",
      "description": "<one sentence describing what this section assesses>",
      "questions": [
        { "id": "s1q1", "label": "<question text>", "inputType": "multiple_choice", "options": ["A...", "B...", "C...", "D..."] },
        { "id": "s1q2", "label": "<open-ended question>", "inputType": "textarea", "options": [] }
      ]
    }
  ],
  "questions": [],
  "projectInstructions": "",
  "maxFiles": 2,
  "maxFileMb": 10
}`

    : (() => {
    // Build dataset context block when datasets are already known
    const datasetBlock = datasetMeta?.length
      ? `\nThe following datasets/files will be provided to candidates for this project:\n\n${
          datasetMeta.map((d, i) =>
            `File ${i + 1}: ${d.filename}\n  Description: ${d.description}\n  Columns: ${d.columns.join(", ")}`
          ).join("\n\n")
        }\n\nYour project brief MUST explicitly reference these exact filenames and column names in the tasks.`
      : `\nIMPORTANT: No files or datasets are being provided for this project. Do NOT invent or reference any specific filenames (e.g. "sales_data.csv"). If the role involves data work, the candidate should be instructed to source or create their own sample data, or work with a fictional scenario that doesn't require a pre-provided file.`;

    return `You are writing a professional take-home PROJECT assessment for the role of "${job.title}" (${job.department} department).

Job description:
${desc}

Required skills: ${skills}
HR hints: ${hint || "none"}
${datasetBlock}

CRITICAL RULE — ROLE-APPROPRIATE PROJECT:
First, identify what type of professional this role is. Then design a project that reflects their ACTUAL daily work.

- A Data Scientist / Analyst → data analysis, modelling, visualizations, datasets
- A Software Engineer / Developer → build a feature, API, or mini-system; code deliverables
- A DevOps / Cloud Engineer → infrastructure design, CI/CD pipeline plan, deployment setup
- A Designer (UI/UX, Graphic) → create mockups, wireframes, or brand materials
- A HR Manager / Talent Specialist → workforce plan, recruitment strategy, policy document
- An Operations Manager → process improvement plan, SOP, operational report
- A Finance / Accounting professional → financial model, budget analysis, report
- A Sales / Business Development person → sales strategy, pitch deck, market analysis
- A Marketing professional → campaign plan, content strategy, go-to-market
- A Legal / Compliance professional → compliance framework, risk assessment document
- A Healthcare professional → clinical protocol, patient pathway, care plan
- An Airport / Transport / Logistics professional → operational plan, safety procedure, scheduling model

DO NOT assign data analysis or coding tasks to roles that don't do data work.
DO NOT assign irrelevant deliverables. Match the project to what the role ACTUALLY does.

Write a highly detailed, directive, and structured project brief using this exact structure in the projectInstructions field:

## Background
2–3 sentences: introduce a realistic fictional organization/scenario that this professional would actually work in. Make it feel real and role-relevant.

## Your Mission
1–2 sentences: state clearly and concisely what the candidate must accomplish.

## Context & Materials
Describe what information, constraints, or starting materials the candidate has to work with. If datasets/files are provided, reference them here. If it's a management/strategy role, describe the scenario details they must work from.

## Tasks
List 5–7 numbered, specific tasks the candidate must complete. Rules:
- Every task must be directly relevant to this specific role's real responsibilities
- Tasks must be concrete and measurable — not vague
- Tasks should progressively build toward the final deliverable
- For technical roles: include implementation + documentation tasks
- For strategy/management roles: include analysis + recommendation + planning tasks
- For creative roles: include briefing understanding + creation + rationale tasks

## Deliverables
State EXACTLY what must be submitted — formatted for this role:
- For data/technical roles: code files, reports, visualizations
- For management/strategy roles: written documents, plans, proposals, presentations
- For creative roles: design files, portfolios, written rationale
- Every deliverable must be realistic for this role

## Evaluation Criteria
List 5 criteria with approximate weight — tailored to this role:
1. [Role-relevant criterion 1] (~%)
2. [Role-relevant criterion 2] (~%)
3. [Role-relevant criterion 3] (~%)
4. Quality and clarity of written communication (~%)
5. Professional judgement and role-readiness (~%)

## Timeline
Recommend a realistic deadline (3–7 days depending on scope) and any tips for the candidate.

IMPORTANT RULES:
- Write projectInstructions as a single multi-paragraph string using \\n for line breaks and ## for headings
- Be specific and role-authentic — every task must reflect real work for this job title
- Never default to "analyze data" or "build a model" unless the job genuinely requires it
- The project should feel like something a real manager at this company would actually assign

Return ONLY valid JSON (no markdown fence):
{
  "mode": "project",
  "title": "<short, specific project title relevant to the role>",
  "projectInstructions": "<full detailed instructions — use ## headings and \\n line breaks>",
  "sections": [],
  "questions": [
    { "id": "q1", "label": "<role-relevant opening question: e.g. 'Walk us through your approach and the key decisions you made'>", "inputType": "textarea", "options": [] },
    { "id": "q2", "label": "<role-relevant challenge question: e.g. 'What was the hardest part of this project and how did you handle it?'>", "inputType": "textarea", "options": [] },
    { "id": "q3", "label": "<role-relevant insight question: e.g. 'What would you improve with more time or resources?'>", "inputType": "textarea", "options": [] },
    { "id": "files", "label": "Upload your deliverables (documents, files, presentations, code, etc.)", "inputType": "file", "options": [] }
  ],
  "maxFiles": 5,
  "maxFileMb": 15
}`;
  })();

  const raw = await geminiChatText(prompt, { maxRetries: 3 });
  let parsed: IPracticalAssessmentDefinition;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("AI returned invalid JSON for assessment definition.");
  }

  parsed.mode = mode;
  if (!parsed.title) parsed.title = `${job.title} — Practical Assessment`;
  if (typeof parsed.maxFiles !== "number") parsed.maxFiles = mode === "project" ? 5 : 2;
  if (typeof parsed.maxFileMb !== "number") parsed.maxFileMb = mode === "project" ? 15 : 10;
  if (!Array.isArray(parsed.questions)) parsed.questions = [];
  if (!Array.isArray(parsed.sections)) parsed.sections = [];

  parsed.questions = parsed.questions.map((q, i) => sanitiseQuestion(q, `q${i + 1}`));

  for (const [si, sec] of (parsed.sections).entries()) {
    if (!sec.title) sec.title = `Section ${si + 1}`;
    if (!Array.isArray(sec.questions)) sec.questions = [];
    sec.questions = sec.questions.map((q, qi) => sanitiseQuestion(q, `s${si + 1}q${qi + 1}`));
  }

  return parsed;
}

/* ────────────────────────────────────────────────────────────
   AI-generated datasets for project assessments
   Only generates datasets when the role genuinely involves data work.
   Returns empty array for management, creative, operational, etc. roles.
   ──────────────────────────────────────────────────────────── */
export async function aiGenerateDatasets(
  job: IJob,
  projectInstructions: string
): Promise<IGeneratedDataset[]> {
  const desc  = String(job.description || "").slice(0, 3000);
  const instr = projectInstructions.slice(0, 2000);
  const skills = (job.requiredSkills || []).join(", ") || "not specified";

  // Keyword-based fast-path: always needs datasets for clearly data-centric roles
  const titleLower = (job.title || "").toLowerCase();
  const DATA_KEYWORDS = [
    "data analyst", "data scientist", "data engineer", "business intelligence",
    "bi analyst", "bi developer", "analytics engineer", "machine learning",
    "ml engineer", "ai engineer", "data manager", "quantitative analyst",
    "research analyst", "reporting analyst", "insights analyst", "database",
    "statistician", "econometrician", "data specialist",
  ];
  const NON_DATA_KEYWORDS = [
    "hr ", "human resource", "talent", "recruiter", "operations manager",
    "sales manager", "marketing manager", "product manager", "project manager",
    "legal", "compliance", "accountant", "finance manager", "graphic design",
    "ux designer", "ui designer", "content writer", "copywriter", "logistics",
    "airport", "transport", "supply chain", "procurement", "office manager",
  ];

  let needsDatasets: boolean;

  const isObviouslyData = DATA_KEYWORDS.some(kw => titleLower.includes(kw));
  const isObviouslyNonData = NON_DATA_KEYWORDS.some(kw => titleLower.includes(kw));

  if (isObviouslyData) {
    needsDatasets = true;
    console.log(`[datasets] Role "${job.title}": needsDatasets=true (keyword match)`);
  } else if (isObviouslyNonData) {
    needsDatasets = false;
    console.log(`[datasets] Role "${job.title}": needsDatasets=false (keyword match)`);
  } else {
    // Ambiguous role — ask Gemini
    const roleCheckPrompt = `You are assessing whether a take-home project assessment for the role of "${job.title}" (${job.department} department) should include sample datasets for candidates to analyse.

Job description: ${desc.slice(0, 1000)}
Required skills: ${skills}
Project brief excerpt: ${instr.slice(0, 600)}

Answer with ONLY a JSON object — no other text:
{ "needsDatasets": true, "reason": "<one sentence>" }

Answer true ONLY if this is genuinely a data/analytics/BI/ML/engineering role where candidates would be expected to process structured data. Answer false for management, HR, operations, sales, marketing, creative, legal, finance planning, logistics scheduling, or any role where the project deliverable is a document, plan, or strategy rather than data analysis.`;

    try {
      const checkRaw = await geminiChatText(roleCheckPrompt, { maxRetries: 2 });
      const checkParsed = JSON.parse(stripJsonFence(checkRaw));
      needsDatasets = checkParsed.needsDatasets === true;
      console.log(`[datasets] Role "${job.title}": needsDatasets=${needsDatasets} — ${checkParsed.reason}`);
    } catch {
      // If Gemini check fails for an ambiguous role, look at the description keywords
      const descLower = desc.toLowerCase();
      needsDatasets = DATA_KEYWORDS.some(kw => descLower.includes(kw));
      console.log(`[datasets] Role "${job.title}": Gemini check failed, fallback needsDatasets=${needsDatasets}`);
    }
  }

  if (!needsDatasets) return [];

  const prompt = `You are preparing sample datasets for a take-home project assessment for the role of "${job.title}" (${job.department || "General"} department).

Project instructions:
${instr}

Job description:
${desc}

Required skills: ${skills}

Generate 1–3 realistic datasets that candidates will need to complete the project. Rules:
- Each dataset: 20–40 rows of realistic, varied data (no trivial patterns)
- Column names: snake_case, self-explanatory
- Include numeric, categorical, and date-like columns where relevant
- For analytics/data science tasks: include a clear target/outcome variable
- Data should reflect real-world noise (missing-ish values, varied distributions)
- Filenames: descriptive snake_case ending in .csv

Return ONLY valid JSON — no markdown fence, no explanation:
[
  {
    "filename": "dataset_name.csv",
    "description": "One sentence explaining what this dataset is and what candidates should do with it.",
    "headers": ["col1", "col2", "col3"],
    "rows": [
      ["val1", 42, "2024-01-15"],
      ["val2", 37, "2024-02-03"]
    ]
  }
]`;

  const raw = await geminiChatText(prompt, { maxRetries: 2 });
  let parsed: Array<{
    filename: string;
    description: string;
    headers: string[];
    rows: (string | number | null)[][];
  }>;

  try {
    parsed = JSON.parse(stripJsonFence(raw));
    if (!Array.isArray(parsed)) throw new Error("not an array");
  } catch {
    throw new Error("AI returned invalid JSON for datasets.");
  }

  // Convert each dataset to CSV + Excel
  let XLSX: typeof import("xlsx") | null = null;
  try { XLSX = require("xlsx"); } catch { /* xlsx optional */ }

  return parsed.map(d => {
    const safeName = (d.filename || "dataset.csv").replace(/[^a-zA-Z0-9._-]/g, "_");

    // CSV serialisation — properly quoted
    const escapeCell = (v: string | number | null | undefined): string => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const csvLines = [
      d.headers.map(escapeCell).join(","),
      ...(d.rows || []).map(row => row.map(escapeCell).join(",")),
    ];
    const csvContent = csvLines.join("\n");

    // Excel (xlsx) generation — one sheet named after the file stem
    let xlsxBuffer: Buffer | undefined;
    if (XLSX) {
      try {
        const wb = XLSX.utils.book_new();
        const wsData = [d.headers, ...(d.rows || [])];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, safeName.replace(/\.csv$/i, "").slice(0, 31));
        xlsxBuffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
      } catch {
        // non-fatal — still return CSV
      }
    }

    return {
      filename: safeName,
      description: d.description || "",
      headers: d.headers || [],
      csvContent,
      xlsxBuffer,
    };
  });
}
