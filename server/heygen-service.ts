import axios from 'axios'

const HEYGEN_API_BASE = 'https://api.heygen.com'

export interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  gender?: string
  preview_image_url?: string
  preview_video_url?: string
  is_public?: boolean
}

export interface HeyGenVideoRequest {
  avatar_id: string
  script: string
  audio_url?: string
  dimension?: {
    width: number
    height: number
  }
}

export interface HeyGenVideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error_message?: string
}

export async function fetchHeyGenAvatars(apiKey: string): Promise<HeyGenAvatar[]> {
  try {
    const response = await axios.get(`${HEYGEN_API_BASE}/v2/avatars`, {
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': apiKey
      }
    })

    const avatars = response.data?.data?.avatars || []
    
    // Remove duplicates by avatar_id and add is_public flag
    const uniqueAvatars = Array.from(
      new Map(avatars.map((avatar: HeyGenAvatar) => [avatar.avatar_id, avatar])).values()
    ).map((avatar: HeyGenAvatar) => ({
      ...avatar,
      is_public: avatar.avatar_id.includes('_public')
    }))
    
    return uniqueAvatars
  } catch (error: any) {
    console.error('HeyGen API error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Failed to fetch avatars from HeyGen')
  }
}

export async function generateHeyGenVideo(
  apiKey: string,
  request: HeyGenVideoRequest
): Promise<string> {
  try {
    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: request.avatar_id,
            avatar_style: 'normal'
          },
          voice: request.audio_url ? {
            type: 'audio',
            audio_url: request.audio_url
          } : {
            type: 'text',
            input_text: request.script,
            speed: 1.0
          }
        }
      ],
      dimension: request.dimension || {
        width: 1280,
        height: 720
      }
    }

    const response = await axios.post(
      `${HEYGEN_API_BASE}/v2/video/generate`,
      payload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        }
      }
    )

    const videoId = response.data?.data?.video_id
    if (!videoId) {
      throw new Error('No video_id returned from HeyGen')
    }

    return videoId
  } catch (error: any) {
    console.error('HeyGen video generation error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Failed to generate video with HeyGen')
  }
}

export async function getHeyGenVideoStatus(
  apiKey: string,
  videoId: string
): Promise<HeyGenVideoStatus> {
  try {
    const response = await axios.get(
      `${HEYGEN_API_BASE}/v1/video_status.get`,
      {
        params: { video_id: videoId },
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': apiKey
        }
      }
    )

    const data = response.data?.data
    
    return {
      status: data?.status || 'pending',
      video_url: data?.video_url,
      thumbnail_url: data?.thumbnail_url,
      duration: data?.duration,
      error_message: data?.error_message
    }
  } catch (error: any) {
    console.error('HeyGen status check error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Failed to check video status')
  }
}
