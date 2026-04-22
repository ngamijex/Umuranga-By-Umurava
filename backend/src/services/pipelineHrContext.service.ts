import mongoose from "mongoose";
import { Pipeline } from "../models/Pipeline.model";

/**
 * Builds the same HR narrative block used by pipeline stage runs, so standalone
 * screening (/screening/run, /screening/run-all) always includes job + candidate + HR inputs
 * when a pipeline exists. Uses stage 0 (Initial CV Screen) by default.
 */
export async function buildHrContextStringForJob(
  jobId: mongoose.Types.ObjectId | string,
  stageIndex = 0
): Promise<string> {
  const pipeline = await Pipeline.findOne({ jobId });
  if (!pipeline) {
    return [
      "## Pipeline / HR inputs",
      "No pipeline record exists for this job yet (or it was not created). HR preferences, criteria, and notes are **not configured** in the system.",
      "Evaluate the candidate using **Job Requirements** and **Score Weights** only. In your HR assessment fields, state clearly that pipeline HR inputs were not available.",
    ].join("\n");
  }

  const idx = Math.max(0, Math.min(stageIndex, pipeline.stages.length - 1));
  const stage = pipeline.stages[idx];
  const { preferences, criteria, notes, targetCount } = stage.hrInputs;

  const parts: string[] = [
    `Current hiring stage: ${stage.name} (${stage.type})`,
    `Stage focus: ${stage.description}`,
  ];
  if (preferences?.trim()) parts.push(`HR Preferences: ${preferences}`);
  else parts.push(`HR Preferences: (none provided — note this in your HR alignment analysis)`);

  if (criteria?.trim()) parts.push(`Additional Criteria: ${criteria}`);
  else parts.push(`Additional Criteria: (none provided)`);

  if (notes?.trim()) parts.push(`HR Notes: ${notes}`);
  else parts.push(`HR Notes: (none provided)`);

  if (targetCount) {
    parts.push(
      `Target shortlist size: **top ${targetCount} candidates** should advance to the next hiring step after this stage. Calibrate overallScore and recommendation so the best ${targetCount} applicants (by fit) stand out in ranking.`
    );
  }

  return parts.join("\n");
}
