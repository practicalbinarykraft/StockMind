import { apiRequest } from '@/shared/api'

export const workflowService = {
  /**
   * Get project details
   */
  getProject: async (id: string) => {
    const response = await apiRequest('GET', `/api/projects/${id}`)
    return response.json()
  },

  /**
   * Update project stage
   */
  updateStage: async (id: string, stage: number) => {
    const response = await apiRequest('PATCH', `/api/projects/${id}`, {
      currentStage: stage,
    })
    return response.json()
  },

  /**
   * Update project with stage data
   */
  updateStageData: async (id: string, stage: number, data: any) => {
    const response = await apiRequest('POST', `/api/projects/${id}/steps`, {
      stepNumber: stage,
      data,
      completedAt: new Date().toISOString(),
    })
    return response.json()
  },

  /**
   * Generate script from content
   */
  generateScript: async (projectId: string, data: {
    type: 'news' | 'instagram' | 'custom'
    content?: string
    newsId?: string
    instagramItemId?: string
  }) => {
    const response = await apiRequest('POST', `/api/projects/${projectId}/generate-script`, data)
    return response.json()
  },

  /**
   * Generate voice from script
   */
  generateVoice: async (projectId: string, script: string, voice: string) => {
    const response = await apiRequest('POST', `/api/projects/${projectId}/generate-voice`, {
      script,
      voice,
    })
    return response.json()
  },

  /**
   * Generate video with avatar
   */
  generateVideo: async (projectId: string, audioUrl: string, avatarId: string) => {
    const response = await apiRequest('POST', `/api/projects/${projectId}/generate-video`, {
      audioUrl,
      avatarId,
    })
    return response.json()
  },

  /**
   * Complete project
   */
  completeProject: async (id: string) => {
    const response = await apiRequest('PATCH', `/api/projects/${id}`, {
      status: 'completed',
    })
    return response.json()
  },
}
