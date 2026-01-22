import { type Project } from "@shared/schema"

export interface Stage3Props {
  project: Project
  stepData: any  // Stage 2 content data
  step3Data?: any  // Stage 3 cached analysis results
}

export interface AIAnalysis {
  format: string
  overallScore: number
  overallComment: string
  scenes: Array<{
    id: number
    text: string
    score: number
    variants: string[]
  }>
}
