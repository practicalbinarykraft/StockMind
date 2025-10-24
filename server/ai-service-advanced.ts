import Anthropic from "@anthropic-ai/sdk";
import type {
  AdvancedScoreResult,
  HookAnalysis,
  StructureAnalysis,
  EmotionalAnalysis,
  CTAAnalysis,
  HookBreakdown,
  StructureBreakdown,
  EmotionalBreakdown,
  CTABreakdown,
  ContentInput
} from "@shared/advanced-analysis-types";

// ============================================
// HELPER FUNCTIONS
// ============================================

async function callClaude(
  apiKey: string,
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<any> {
  const anthropic = new Anthropic({ apiKey });
  
  const message = await anthropic.messages.create({
    model: options.model || "claude-sonnet-4-5",
    max_tokens: options.maxTokens || 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Extract JSON from response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}

function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

function extractOpening(text: string, maxChars: number = 200): string {
  return text.substring(0, maxChars);
}

// ============================================
// AGENT 1: HOOK EXPERT
// ============================================

export async function analyzeHook(
  apiKey: string,
  content: string
): Promise<HookAnalysis> {
  const opening = extractOpening(content, 300);
  
  const prompt = `You are a Hook Expert analyzing the first 3-5 seconds of short-form video content (Instagram Reels, TikTok, YouTube Shorts).

Content opening: "${opening}"

Analyze the HOOK across these 5 criteria (each scored 0-100):

1. ATTENTION GRAB (0-100)
   - Does it stop the scroll immediately?
   - Is there shock value / curiosity gap / unexpected element?
   - Visual or verbal hook strength?
   
2. CLARITY (0-100)
   - Is the promise/topic instantly clear?
   - Can viewer understand value in 1 second?
   - No confusion about what this is about?
   
3. SPECIFICITY (0-100)
   - Are there specific numbers/facts/names?
   - Generic examples (low score):
     • "Как заработать деньги" (score: 20-30)
     • "Секрет успеха" (score: 25)
   - Specific examples (high score):
     • "Как я заработал $10,247 за 18 дней" (score: 90-95)
     • "3 ошибки которые стоили мне $50,000" (score: 85-90)
   
4. EMOTIONAL TRIGGER (0-100)
   - Does it trigger fear, greed, curiosity, anger, FOMO?
   - How strong is the emotional response?
   - Will viewer FEEL something immediately?
   
5. PATTERN MATCH (0-100)
   - Does it match proven viral hook patterns?
   - Known patterns: question, shocking-stat, problem-statement, curiosity-gap, personal-story

Also identify the hook TYPE and provide 2-3 IMPROVED variants.

Respond ONLY in valid JSON format:
{
  "score": <average of 5 criteria, 0-100>,
  "type": "question|stat|problem|curiosity|story|command",
  "criteria": {
    "attentionGrab": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    },
    "clarity": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    },
    "specificity": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian>"
    },
    "emotional": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    },
    "patternMatch": {
      "score": <0-100>,
      "reason": "<which patterns matched in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    }
  },
  "currentHook": "<extract the actual hook text>",
  "improvements": [
    {
      "variant": "<improved hook variant in Russian>",
      "changes": ["<change 1>", "<change 2>"],
      "expectedScore": <predicted score 0-100>,
      "reasoning": "<why this would work better in Russian>",
      "priority": "high|medium|low"
    }
  ]
}`;

  const result = await callClaude(apiKey, prompt, { maxTokens: 2048 });
  
  return {
    hookScore: result.score,
    hookType: result.type,
    breakdown: {
      score: result.score,
      type: result.type,
      criteria: result.criteria,
      currentHook: result.currentHook,
      improvements: result.improvements
    } as HookBreakdown
  };
}

// ============================================
// AGENT 2: STRUCTURE ANALYST
// ============================================

export async function analyzeStructure(
  apiKey: string,
  content: string,
  metadata?: {
    duration?: number;
    scenes?: Array<{ text: string; duration: number }>;
  }
): Promise<StructureAnalysis> {
  const wordCount = estimateWordCount(content);
  const estimatedDuration = metadata?.duration || (wordCount / 3); // ~180 WPM = 3 words/sec
  const wpm = Math.round((wordCount / estimatedDuration) * 60);

  const scenesText = metadata?.scenes
    ? metadata.scenes.map((s, i) => `Scene ${i + 1} (${s.duration}s): "${s.text}"`).join('\n')
    : `Full content: "${content}"`;

  const prompt = `You are a Structure Analyst for short-form video content.

Content analysis:
${scenesText}

Estimated duration: ${estimatedDuration} seconds
Word count: ${wordCount}
Calculated WPM: ${wpm}

Analyze STRUCTURE across these criteria:

1. PACING (0-100)
   - Words per minute evaluation:
     • 120-140 WPM = too slow, boring (score: 30-50)
     • 160-180 WPM = optimal, engaging (score: 85-95)
     • 180-200 WPM = fast, energetic (score: 75-85)
     • 200-220 WPM = very fast, risky (score: 60-75)
     • >220 WPM = too fast, overwhelming (score: 30-50)
   - Are there strategic pauses?
   
2. INFORMATION DENSITY (0-100)
   - Facts/value points per second
   - Too sparse = boring (1 fact per 10s = score 30-40)
   - Optimal = engaging (1 fact per 3-5s = score 85-95)
   - Too dense = overwhelming (3+ facts per second = score 50-60)
   
3. SCENE FLOW (0-100)
   - Logical progression (hook → body → cta)?
   - Clear structure or chaotic?
   - Build-up to climax?
   
4. OPTIMAL LENGTH (0-100)
   - For this content type, is length appropriate?
   - 7-12s = ultra-short, hook-only (score varies by content)
   - 15-25s = sweet spot for most content (score: 90-100)
   - 25-35s = acceptable if content is strong (score: 70-85)
   - 35-45s = risky, needs exceptional content (score: 50-70)
   - >45s = too long for shorts (score: 20-40)
   
5. RETENTION CURVE PREDICTION (0-100)
   - Predict viewer drop-off at key moments
   - Where will attention dip?
   - Overall predicted retention percentage

Respond ONLY in valid JSON format:
{
  "structureScore": <average of criteria, 0-100>,
  "breakdown": {
    "pacing": {
      "wpm": ${wpm},
      "rating": "too-slow|optimal|fast|too-fast",
      "score": <0-100>
    },
    "informationDensity": {
      "factsPerSecond": <estimated number>,
      "rating": "sparse|optimal|dense|overwhelming",
      "score": <0-100>
    },
    "sceneFlow": {
      "hasLogicalProgression": <true|false>,
      "structure": "<describe structure e.g. 'hook-problem-solution-cta'>",
      "score": <0-100>
    },
    "optimalLength": {
      "current": ${estimatedDuration},
      "recommended": <recommended duration in seconds>,
      "score": <0-100>
    },
    "retentionCurve": [
      {"time": 0, "retention": 100},
      {"time": 3, "retention": <predicted %>},
      {"time": 8, "retention": <predicted %>},
      {"time": 15, "retention": <predicted %>}
    ],
    "improvements": [
      "<specific improvement suggestion in Russian>",
      "<another suggestion in Russian>"
    ]
  }
}`;

  const result = await callClaude(apiKey, prompt, { maxTokens: 2048 });
  
  return {
    structureScore: result.structureScore,
    breakdown: result.breakdown as StructureBreakdown
  };
}

// ============================================
// AGENT 3: EMOTIONAL IMPACT ANALYST
// ============================================

export async function analyzeEmotionalImpact(
  apiKey: string,
  content: string
): Promise<EmotionalAnalysis> {
  const prompt = `You are an Emotional Impact Specialist analyzing viral content triggers.

Content: "${content}"

Analyze EMOTIONAL TRIGGERS:

1. PRIMARY EMOTION
   - Identify the main emotion triggered (fear, greed, curiosity, anger, joy, FOMO, pride)
   - Rate strength (0-100): weak hint vs powerful trigger
   - Is it authentic or forced?
   
2. PAIN POINTS
   - Does it touch viewer's real problems?
   - How specific is the pain point?
   - Generic (low score): "жизнь тяжелая"
   - Specific (high score): "не хватает на аренду каждый месяц"
   
3. ASPIRATION
   - Does it show desirable outcome?
   - Is aspiration credible or fantasy?
   - Can viewer see themselves achieving it?
   
4. RELATABILITY (0-100)
   - Can target audience see themselves in this?
   - Use of "ты" (direct) vs "я" (personal) vs "они" (distant)?
   - Specific details that resonate?
   
5. SHAREABILITY TRIGGERS (0-100)
   - Will people want to share this? Why?
   - Identity signaling ("I'm smart/ambitious")
   - Helping friends ("they need to see this")
   - Validation seeking ("agree with this")

Respond ONLY in valid JSON format:
{
  "emotionalScore": <0-100>,
  "breakdown": {
    "primaryEmotion": {
      "type": "fear|greed|curiosity|anger|joy|fomo|pride",
      "strength": <0-100>
    },
    "secondaryEmotion": {
      "type": "<emotion type or null>",
      "strength": <0-100 or 0>
    },
    "painPoints": [
      "<specific pain point in Russian>",
      "<another pain point in Russian>"
    ],
    "relatability": <0-100>,
    "shareabilityScore": <0-100>,
    "triggers": {
      "identified": ["<trigger 1>", "<trigger 2>"],
      "strength": <0-100>
    }
  }
}`;

  const result = await callClaude(apiKey, prompt, { maxTokens: 1536 });
  
  return {
    emotionalScore: result.emotionalScore,
    breakdown: result.breakdown as EmotionalBreakdown
  };
}

// ============================================
// AGENT 4: CTA ANALYST
// ============================================

export async function analyzeCTA(
  apiKey: string,
  content: string
): Promise<CTAAnalysis> {
  const prompt = `You are a CTA (Call-to-Action) Specialist for short-form video.

Content: "${content}"

Analyze CALL-TO-ACTION:

1. CTA PRESENCE (0-100)
   - Is there a clear ask?
   - Weak CTAs (low score 20-40):
     • "Подпишись" (generic, overused)
     • "Ставь лайк" (low intent)
   - Strong CTAs (high score 80-95):
     • "Сохрани пост → используй схему завтра утром" (specific action + benefit)
     • "Отправь другу который хочет заработать" (social, specific)
   
2. CTA PLACEMENT (0-100)
   - Too early (first 3s) = feels pushy (score: 40-50)
   - At natural climax point = perfect (score: 90-100)
   - At the end after value delivered = good (score: 80-90)
   - Missing entirely = score: 0
   
3. CTA TYPE EFFECTIVENESS
   - "Подписка" = low intent, people forget (score: 30-40)
   - "Сохранить" = high intent, people will return (score: 80-90)
   - "Поделиться с другом" = viral boost potential (score: 70-85)
   - "Комментировать" = engagement boost (score: 65-75)
   - "Перейти по ссылке" = high friction (score: 40-50)
   
4. FRICTION LEVEL
   - Low friction: "двойной тап", "сохрани", "напиши +" (score: 85-95)
   - Medium friction: "подпишись и включи уведомления" (score: 60-70)
   - High friction: "перейди в профиль → ссылка в шапке → форма" (score: 20-30)

Extract current CTA if present and suggest improvements.

Respond ONLY in valid JSON format:
{
  "ctaScore": <0-100>,
  "breakdown": {
    "presence": {
      "hasCTA": <true|false>,
      "type": "subscribe|save|share|comment|click|custom|null",
      "score": <0-100>
    },
    "placement": {
      "timing": "early|mid|end|missing",
      "isOptimal": <true|false>,
      "score": <0-100>
    },
    "effectiveness": {
      "specificity": <0-100>,
      "frictionLevel": "low|medium|high",
      "score": <0-100>
    },
    "current": "<extracted CTA text or null>",
    "improvements": [
      {
        "suggested": "<improved CTA in Russian>",
        "reasoning": "<why this works better in Russian>",
        "expectedImpact": "<predicted result e.g. '+30% saves'>",
        "priority": "high|medium|low"
      }
    ]
  }
}`;

  const result = await callClaude(apiKey, prompt, { maxTokens: 1536 });
  
  return {
    ctaScore: result.ctaScore,
    breakdown: result.breakdown as CTABreakdown
  };
}

// ============================================
// AGENT 5: ARCHITECT (SYNTHESIS)
// ============================================

export async function synthesizeAnalysis(
  apiKey: string,
  hookAnalysis: HookAnalysis,
  structureAnalysis: StructureAnalysis,
  emotionalAnalysis: EmotionalAnalysis,
  ctaAnalysis: CTAAnalysis,
  contentType: 'news' | 'instagram_reel' | 'custom_script'
): Promise<AdvancedScoreResult> {
  const prompt = `You are the Architect - master AI strategist synthesizing multi-agent content analysis.

You have received analysis from 4 specialist agents:

HOOK EXPERT:
- Score: ${hookAnalysis.hookScore}/100
- Type: ${hookAnalysis.hookType}
- Key issues: ${JSON.stringify(hookAnalysis.breakdown.currentHook)}

STRUCTURE ANALYST:
- Score: ${structureAnalysis.structureScore}/100
- WPM: ${structureAnalysis.breakdown.pacing.wpm}
- Length: ${structureAnalysis.breakdown.optimalLength.current}s

EMOTIONAL ANALYST:
- Score: ${emotionalAnalysis.emotionalScore}/100
- Primary emotion: ${emotionalAnalysis.breakdown.primaryEmotion.type}
- Relatability: ${emotionalAnalysis.breakdown.relatability}/100

CTA ANALYST:
- Score: ${ctaAnalysis.ctaScore}/100
- Has CTA: ${ctaAnalysis.breakdown.presence.hasCTA}
- Type: ${ctaAnalysis.breakdown.presence.type || 'none'}

Content type: ${contentType}

Your task:
1. Calculate OVERALL SCORE (weighted average, 0-100)
2. Assign VERDICT: viral (90+), strong (70-89), moderate (50-69), weak (<50)
3. Identify top 3 STRENGTHS
4. Identify top 3 WEAKNESSES
5. Create 3-5 prioritized RECOMMENDATIONS with specific changes
6. Match against viral PATTERNS
7. Predict performance metrics

Respond ONLY in valid JSON format:
{
  "overallScore": <0-100>,
  "verdict": "viral|strong|moderate|weak",
  "confidence": <0.0-1.0>,
  "strengths": [
    "<strength in Russian>",
    "<strength in Russian>",
    "<strength in Russian>"
  ],
  "weaknesses": [
    "<weakness in Russian>",
    "<weakness in Russian>",
    "<weakness in Russian>"
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "area": "hook|structure|emotional|cta|pacing|length",
      "current": "<current state>",
      "suggested": "<specific change in Russian>",
      "expectedImpact": "<predicted result e.g. '+15-20 points'>",
      "reasoning": "<why this matters in Russian>"
    }
  ],
  "viralPatterns": {
    "matched": [
      {"pattern": "<pattern name>", "confidence": <0-100>}
    ],
    "missing": [
      {"pattern": "<pattern name>", "potentialBoost": "<e.g. '+10-15 points'>"}
    ]
  },
  "predictedMetrics": {
    "estimatedRetention": "<e.g. '55-65%'>",
    "estimatedSaves": "<e.g. '3-5% of viewers'>",
    "estimatedShares": "<e.g. '1-2% of viewers'>",
    "viralProbability": "low|medium|medium-high|high"
  }
}`;

  const result = await callClaude(apiKey, prompt, {
    model: "claude-sonnet-4-5",  // Use Sonnet 4.5 for synthesis
    maxTokens: 3072
  });
  
  return {
    overallScore: result.overallScore,
    verdict: result.verdict,
    confidence: result.confidence,
    breakdown: {
      hook: hookAnalysis.breakdown,
      structure: structureAnalysis.breakdown,
      emotional: emotionalAnalysis.breakdown,
      cta: ctaAnalysis.breakdown
    },
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    recommendations: result.recommendations,
    viralPatterns: result.viralPatterns,
    predictedMetrics: result.predictedMetrics
  };
}

// ============================================
// MAIN ANALYSIS FUNCTIONS
// ============================================

export async function scoreNewsAdvanced(
  apiKey: string,
  title: string,
  content: string
): Promise<AdvancedScoreResult> {
  const fullContent = `${title}\n\n${content}`;
  
  // Run all agents in parallel
  const [hook, structure, emotional, cta] = await Promise.all([
    analyzeHook(apiKey, fullContent),
    analyzeStructure(apiKey, fullContent),
    analyzeEmotionalImpact(apiKey, fullContent),
    analyzeCTA(apiKey, fullContent)
  ]);
  
  // Architect synthesizes results
  return synthesizeAnalysis(apiKey, hook, structure, emotional, cta, 'news');
}

export async function scoreReelAdvanced(
  apiKey: string,
  transcription: string,
  caption: string | null
): Promise<AdvancedScoreResult> {
  const fullContent = caption
    ? `${transcription}\n\nCaption: ${caption}`
    : transcription;
  
  // Run all agents in parallel
  const [hook, structure, emotional, cta] = await Promise.all([
    analyzeHook(apiKey, fullContent),
    analyzeStructure(apiKey, fullContent),
    analyzeEmotionalImpact(apiKey, fullContent),
    analyzeCTA(apiKey, fullContent)
  ]);
  
  // Architect synthesizes results
  return synthesizeAnalysis(apiKey, hook, structure, emotional, cta, 'instagram_reel');
}

export async function scoreCustomScriptAdvanced(
  apiKey: string,
  text: string,
  format: string,
  scenes?: Array<{ text: string; duration: number }>
): Promise<AdvancedScoreResult> {
  // Run all agents in parallel
  const [hook, structure, emotional, cta] = await Promise.all([
    analyzeHook(apiKey, text),
    analyzeStructure(apiKey, text, { scenes }),
    analyzeEmotionalImpact(apiKey, text),
    analyzeCTA(apiKey, text)
  ]);
  
  // Architect synthesizes results
  return synthesizeAnalysis(apiKey, hook, structure, emotional, cta, 'custom_script');
}
