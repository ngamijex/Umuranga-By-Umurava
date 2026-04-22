/** Shared: practical assessment shown to candidates + used for AI grading. */

export interface IAssessmentQuestion {
  id: string;
  label: string;
  inputType: "text" | "textarea" | "file" | "multiple_choice";
  options?: string[];
}

export interface IAssessmentSection {
  title: string;
  description?: string;
  questions: IAssessmentQuestion[];
}

export interface IAssessmentResource {
  id: string;
  name: string;       // original filename shown to candidate
  storedName: string; // sanitized server-side filename
  mimeType: string;
  sizeBytes: number;
}

export interface IPracticalAssessmentDefinition {
  mode: "form" | "project" | "both";
  title: string;
  /** Flat list — used for project mode or legacy form mode */
  questions: IAssessmentQuestion[];
  /** Sectioned form questions (primary structure for form mode) */
  sections?: IAssessmentSection[];
  /** For mode === "project" — overall instructions (repos, PDFs, zip, etc.) */
  projectInstructions?: string;
  maxFiles?: number;
  maxFileMb?: number;
  /** HR-uploaded reference materials candidates can download */
  resources?: IAssessmentResource[];
}
