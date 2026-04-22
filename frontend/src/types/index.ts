export interface User {
  id: string;
  name: string;
  email: string;
  role: "recruiter" | "admin";
  createdAt: string;
}

export interface JobPost {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  profileData: {
    skills: string[];
    experienceYears: number;
    educationLevel: string;
    currentRole?: string;
    location?: string;
  };
  jobId: string;
  status: "pending" | "screened" | "shortlisted" | "rejected";
  createdAt: string;
}

export interface JobRequirementComparisonRow {
  aspect: string;
  whatJobNeeds: string;
  whatCandidateOffers: string;
  fitLevel: string;
  detail: string;
}

export interface HrInputsAssessment {
  howPreferencesApply: string;
  howCriteriaApply: string;
  howNotesApply: string;
  overallAlignment: string;
}

export interface ScreeningResult {
  id: string;
  candidateId: string;
  jobId: string;
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
  jobRequirementComparisons?: JobRequirementComparisonRow[];
  hrInputsAssessment?: HrInputsAssessment;
  rank?: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
