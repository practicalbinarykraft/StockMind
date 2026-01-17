import axios from 'axios'

const KIE_API_BASE = 'https://api.kie.ai'

export interface KieVideoRequest {
  prompt: string
  model?: string
  aspectRatio?: string
  requestId?: string
}

export interface KieVideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  progress?: number
  error?: string
}

export async function generateKieVideo(
  apiKey: string,
  request: KieVideoRequest
): Promise<string> {
  try {
    console.log('🎬 Generating B-Roll with Kie.ai...')
    console.log('   Prompt:', request.prompt)
    console.log('   Model:', request.model || 'veo3_fast')

    const payload = {
      prompt: request.prompt,
      model: request.model || 'veo3_fast',
      aspectRatio: request.aspectRatio || '9:16',
      ...(request.requestId && { requestId: request.requestId })
    }

    const response = await axios.post(
      `${KIE_API_BASE}/v1/video/generate`,
      payload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    const taskId = response.data?.data?.taskId || response.data?.taskId
    if (!taskId) {
      throw new Error('No taskId returned from Kie.ai')
    }

    console.log(`✅ B-Roll generation started: ${taskId}`)
    return taskId
  } catch (error: any) {
    console.error('Kie.ai video generation error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Failed to generate video with Kie.ai')
  }
}

export async function getKieVideoStatus(
  apiKey: string,
  taskId: string
): Promise<KieVideoStatus> {
  try {
    const response = await axios.get(
      `${KIE_API_BASE}/v1/video/status/${taskId}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    const data = response.data?.data || response.data
    
    return {
      status: data?.status || 'pending',
      videoUrl: data?.videoUrl || data?.video_url,
      thumbnailUrl: data?.thumbnailUrl || data?.thumbnail_url,
      duration: data?.duration,
      progress: data?.progress,
      error: data?.error || data?.error_message
    }
  } catch (error: any) {
    console.error('Kie.ai status check error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Failed to check video status')
  }
}
