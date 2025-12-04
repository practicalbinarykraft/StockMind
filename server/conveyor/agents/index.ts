/**
 * Conveyor Agents Index
 * Exports all pipeline agents
 */

// Base classes
export { BaseAgent, BaseAIAgent } from "./base-agent";
export type { AgentContext } from "./base-agent";

// Agent #1: Scout (no AI)
export { ScoutAgent, scoutAgent } from "./scout-agent";
export type { ScoutInput, ScoutOutput } from "./scout-agent";

// Agent #2: Scorer (AI)
export { ScorerAgent, scorerAgent } from "./scorer-agent";
export type { ScorerInput, ScorerOutput } from "./scorer-agent";

// Agent #3: Analyst (AI)
export { AnalystAgent, analystAgent } from "./analyst-agent";
export type { AnalystInput, AnalystOutput } from "./analyst-agent";

// Agent #4: Architect (AI)
export { ArchitectAgent, architectAgent } from "./architect-agent";
export type { ArchitectInput, ArchitectOutput } from "./architect-agent";

// Agent #5: Writer (AI)
export { WriterAgent, writerAgent } from "./writer-agent";
export type { WriterInput, WriterOutput } from "./writer-agent";

// Agent #6: QC (AI - multi-agent)
export { QCAgent, qcAgent } from "./qc-agent";
export type { QCInput, QCOutput } from "./qc-agent";

// Agent #7: Optimizer (AI)
export { OptimizerAgent, optimizerAgent } from "./optimizer-agent";
export type { OptimizerInput, OptimizerOutput } from "./optimizer-agent";

// Agent #8: Gate (no AI)
export { GateAgent, gateAgent } from "./gate-agent";
export type { GateInput, GateOutput } from "./gate-agent";

// Agent #9: Delivery (no AI)
export { DeliveryAgent, deliveryAgent } from "./delivery-agent";
export type { DeliveryInput, DeliveryOutput } from "./delivery-agent";

// Stage numbers for reference
export const STAGES = {
  SCOUT: 1,
  SCORER: 2,
  ANALYST: 3,
  ARCHITECT: 4,
  WRITER: 5,
  QC: 6,
  OPTIMIZER: 7,
  GATE: 8,
  DELIVERY: 9,
} as const;
