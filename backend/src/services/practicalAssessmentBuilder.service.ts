import { openaiChatText } from "../config/openai";
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
      ? `\nThe following datasets will be provided to candidates for this project:\n\n${
          datasetMeta.map((d, i) =>
            `Dataset ${i + 1}: ${d.filename}\n  Description: ${d.description}\n  Columns: ${d.columns.join(", ")}`
          ).join("\n\n")
        }\n\nYour project brief MUST explicitly reference these exact filenames and column names in the tasks and analytical questions.`
      : "";

    return `You are writing a professional, senior-manager-level take-home PROJECT assessment for the role of "${job.title}" (${job.department} department).

Job description:
${desc}

Required skills: ${skills}
HR hints: ${hint || "none"}
${datasetBlock}

Write a highly detailed, directive, and structured project brief. It must feel like a real business assignment — not vague. Follow this exact structure in the projectInstructions field:

## Business Context
Introduce the fictional company, its industry, the specific business problem they are facing, and why this analysis/project matters strategically. Make it feel real and immersive (2–3 sentences).

## Your Mission
State exactly what the candidate is being asked to do — one clear mission statement.

## The Datasets${datasetMeta?.length ? ` (provided for download)` : ""}
${datasetMeta?.length
  ? datasetMeta.map(d =>
      `- **${d.filename}**: ${d.description} — key columns include: ${d.columns.slice(0, 6).join(", ")}${d.columns.length > 6 ? ", and more" : ""}.`
    ).join("\n")
  : "Describe what data the candidate will work with."}
Explain how the datasets relate to each other and how candidates should use them.

## Tasks
List 6–8 numbered, specific technical tasks the candidate must complete. Each task should:
- Reference specific column names or file names where relevant
- Be concrete and measurable (not vague like "analyze the data")
- Include at least 2 tasks that require building/training a model or writing code
- Include at least 2 tasks requiring data visualizations with specific requirements (e.g. "plot the distribution of X grouped by Y")
- Include 1 task requiring a written interpretation of findings with business implications

## Analytical Questions to Answer
List 4–6 specific data questions the candidate must answer in their report. These should be answerable from the datasets and require actual analysis (not opinions). Example format: "What is the churn rate by customer segment? Which segment has the highest retention?"

## Deliverables
State exactly what must be submitted:
- Code: format, structure, documentation requirements
- Report: sections required, max length
- Visualizations: minimum number and format
- Any additional items (e.g. demo video, README)

## Evaluation Criteria
List 5 criteria with approximate weight/priority:
1. Technical correctness and code quality (%)
2. Depth and accuracy of analysis (%)
3. Quality of visualizations (%)
4. Clarity and structure of the written report (%)
5. Business insight and recommendations (%)

## Timeline
Recommend a realistic deadline (e.g. 5–7 days from receipt) and advise candidates to start early.

IMPORTANT RULES:
- Write projectInstructions as a single multi-paragraph string using \\n for line breaks and ## for headings
- Be specific — use actual column names from the datasets where available
- Every task and question must be answerable with the provided data
- Do not be vague. Each instruction must be actionable and unambiguous.

Return ONLY valid JSON (no markdown fence):
{
  "mode": "project",
  "title": "<short, specific project title>",
  "projectInstructions": "<full detailed instructions — use ## headings and \\n line breaks>",
  "sections": [],
  "questions": [
    { "id": "repo", "label": "Repository / live demo URL (GitHub, Colab, etc.)", "inputType": "textarea", "options": [] },
    { "id": "approach", "label": "Summarize your approach: key decisions, challenges faced, and what you would improve with more time", "inputType": "textarea", "options": [] },
    { "id": "insight", "label": "What is the single most important business insight from your analysis? How would you recommend acting on it?", "inputType": "textarea", "options": [] },
    { "id": "files", "label": "Upload your deliverables (PDF report, zipped code, notebooks, etc.)", "inputType": "file", "options": [] }
  ],
  "maxFiles": 5,
  "maxFileMb": 15
}`;
  })();

  const raw = await openaiChatText(prompt, { maxRetries: 3 });
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
   Returns CSV content + optional XLSX buffer per dataset
   ──────────────────────────────────────────────────────────── */
export async function aiGenerateDatasets(
  job: IJob,
  projectInstructions: string
): Promise<IGeneratedDataset[]> {
  const desc  = String(job.description || "").slice(0, 3000);
  const instr = projectInstructions.slice(0, 2000);
  const skills = (job.requiredSkills || []).join(", ") || "not specified";

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

  const raw = await openaiChatText(prompt, { maxRetries: 2 });
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
