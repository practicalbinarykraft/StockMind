export interface ProjectContent {
  title: string
  content: string
}

export async function extractProjectContent(project: any, step2Data: any): Promise<ProjectContent> {
  let title = ''
  let content = ''

  if (project.sourceType === 'news' && project.sourceData) {
    const sourceData = project.sourceData as any
    title = sourceData.title || step2Data?.title || ''
    content = sourceData.content || step2Data?.content || ''
  } else if (project.sourceType === 'instagram' && project.sourceData) {
    const sourceData = project.sourceData as any
    title = sourceData.caption || step2Data?.caption || ''
    content = sourceData.transcription || step2Data?.transcription || ''
  } else if (project.sourceType === 'custom' && step2Data) {
    title = step2Data.title || ''
    content = step2Data.content || step2Data.text || step2Data.script || ''
  }

  return { title, content }
}

export function getRecommendedFormat(analysisResult: any): { formatId: string; name: string; reason: string } {
  if (analysisResult.breakdown?.recommendedFormat) {
    const formatMap: Record<string, { id: string; name: string }> = {
      'news_update': { id: 'news', name: 'News Update' },
      'explainer': { id: 'explainer', name: 'Explainer' },
      'story': { id: 'hook', name: 'Hook & Story' },
      'comparison': { id: 'comparison', name: 'Comparison' },
      'tutorial': { id: 'tutorial', name: 'Tutorial' },
      'trend': { id: 'trend', name: 'Trend' },
    }

    const formatId = analysisResult.breakdown.recommendedFormat.format || 'news_update'
    const formatInfo = formatMap[formatId] || formatMap['news_update']

    return {
      formatId: formatInfo.id,
      name: formatInfo.name,
      reason: analysisResult.breakdown.recommendedFormat.reasoning || 'Рекомендовано на основе анализа статьи',
    }
  }

  const formatMap: Record<string, { id: string; name: string; reason: string }> = {
    'hook_story': { id: 'hook', name: 'Hook & Story', reason: 'Внимание-захватывающее начало с повествовательной аркой' },
    'problem_solution': { id: 'problem_solution', name: 'Problem & Solution', reason: 'Формат решения проблемы для высокооцененного контента' },
    'educational': { id: 'explainer', name: 'Explainer', reason: 'Образовательный формат для сложных тем' },
  }

  let recommendedFormatId = 'hook'
  if (analysisResult.overallScore >= 80) {
    recommendedFormatId = 'problem_solution'
  } else if (analysisResult.overallScore >= 60) {
    recommendedFormatId = 'hook'
  } else {
    recommendedFormatId = 'educational'
  }

  const formatInfo = formatMap[recommendedFormatId] || formatMap['hook_story']
  return {
    formatId: formatInfo.id,
    name: formatInfo.name,
    reason: formatInfo.reason,
  }
}

export const FORMAT_NAME_MAP: Record<string, string> = {
  'hook': 'Hook & Story',
  'hook_story': 'Hook & Story',
  'explainer': 'Explainer',
  'news': 'News Update',
  'tutorial': 'Tutorial',
  'listicle': 'Top 5 List',
  'comparison': 'Before/After',
  'controversy': 'Hot Take',
  'question': 'Q&A Format',
  'story': 'Story Time',
  'reaction': 'Reaction Video',
  'challenge': 'Challenge',
  'trends': 'Trend Analysis',
  'myth': 'Myth Buster',
  'prediction': 'Future Forecast',
  'case': 'Case Study',
  'problem_solution': 'Problem & Solution',
  'educational': 'Educational',
}
