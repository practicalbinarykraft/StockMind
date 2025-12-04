// Main composition file - re-export everything

// Base constants and types
export * from "./base/constants";
export * from "./base/types";

// Basic AI services
export * from "./score-news";
export * from "./score-reel";
export * from "./score-text";
export * from "./analyze-script";
export * from "./generate-prompt";
export * from "./scene-recommendations";

// Article potential analysis (Level 2)
export * from "./analyze-article-potential";

// Advanced multi-agent analysis (Level 3 - for scripts only)
export * from "./advanced";

// Individual agents (if needed for direct access)
export { analyzeHook } from "./agents/hook.agent";
export { analyzeStructure } from "./agents/structure.agent";
export { analyzeEmotionalImpact } from "./agents/emotional.agent";
export { analyzeCTA } from "./agents/cta.agent";
export { synthesizeAnalysis } from "./agents/architect.agent";
