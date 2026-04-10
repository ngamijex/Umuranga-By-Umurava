import { getGeminiModel } from "../config/gemini";
import { IJob } from "../models/Job.model";
import { ICandidate } from "../models/Candidate.model";

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
}

const buildPrompt = (job: IJob, candidate: ICandidate): string => `
You are an expert, unbiased AI talent screener. Evaluate the candidate below against the job requirements and return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

## Job Requirements
- Title: ${job.title}
- Department: ${job.department}
- Required Skills: ${job.requiredSkills.join(", ")}
- Preferred Skills: ${job.preferredSkills.join(", ")}
- Experience Required: ${job.experienceYears} years
- Education Level: ${job.educationLevel}
- Description: ${job.description}

## Score Weights
- Skills: ${job.weights.skills}%
- Experience: ${job.weights.experience}%
- Education: ${job.weights.education}%
- Culture/Other: ${job.weights.culture}%

## Candidate Profile
- Skills: ${candidate.profileData.skills.join(", ")}
- Years of Experience: ${candidate.profileData.experienceYears}
- Education: ${candidate.profileData.educationLevel}
- Current Role: ${candidate.profileData.currentRole || "N/A"}
${candidate.resumeText ? `- Resume Summary:\n${candidate.resumeText.slice(0, 3000)}` : ""}

## Required Output Format (JSON only)
{
  "overallScore": <number 0-100>,
  "dimensionScores": {
    "skills": <number 0-100>,
    "experience": <number 0-100>,
    "education": <number 0-100>,
    "culture": <number 0-100>
  },
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "<strong_yes|yes|maybe|no>",
  "aiExplanation": "<2-3 sentence plain-English summary of this candidate's fit>"
}
`;

export const screenCandidate = async (
  job: IJob,
  candidate: ICandidate
): Promise<ScreeningOutput> => {
  const model = getGeminiModel();
  const prompt = buildPrompt(job, candidate);

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini returned an unexpected format — no JSON found.");
  }

  const parsed: ScreeningOutput = JSON.parse(jsonMatch[0]);
  return parsed;
};
