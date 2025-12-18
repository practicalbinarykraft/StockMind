import axios from 'axios'
import fs from 'fs'
import path from 'path'

const HEYGEN_API_BASE = 'https://api.heygen.com'
const HEYGEN_UPLOAD_BASE = 'https://upload.heygen.com'
const ALLOWED_AUDIO_DIR = path.join(process.cwd(), 'uploads', 'audio')

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
  voice_id?: string
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
    const startTime = Date.now()
    console.log('📡 Fetching avatars from HeyGen API...')
    
    const response = await axios.get(`${HEYGEN_API_BASE}/v2/avatars`, {
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': apiKey
      },
      timeout: 30000 // 30 second timeout
    })

    const avatars = response.data?.data?.avatars || []
    
    // Remove duplicates by avatar_id and add is_public flag
    const uniqueAvatars = Array.from(
      new Map(avatars.map((avatar: HeyGenAvatar) => [avatar.avatar_id, avatar])).values()
    ).map((avatar) => ({
      ...(avatar as HeyGenAvatar),
      is_public: (avatar as HeyGenAvatar).avatar_id.includes('_public')
    }))
    
    const duration = Date.now() - startTime
    console.log(`✅ Fetched ${uniqueAvatars.length} avatars from HeyGen in ${duration}ms`)
    
    return uniqueAvatars
  } catch (error: any) {
    console.error('HeyGen API error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Failed to fetch avatars from HeyGen')
  }
}

async function uploadAudioToHeyGen(apiKey: string, audioPath: string): Promise<string> {
  try {
    // Security: Validate that the file path is within allowed directory
    const normalizedPath = path.normalize(path.resolve(audioPath))
    const allowedDirWithSep = ALLOWED_AUDIO_DIR + path.sep
    
    console.log(`📤 Uploading audio to HeyGen:`)
    console.log(`   Original: ${audioPath}`)
    console.log(`   Normalized: ${normalizedPath}`)
    console.log(`   Allowed dir: ${ALLOWED_AUDIO_DIR}`)
    
    // Must start with allowed directory AND have path separator (or be exactly the dir)
    if (normalizedPath !== ALLOWED_AUDIO_DIR && !normalizedPath.startsWith(allowedDirWithSep)) {
      throw new Error('Invalid audio file path: access denied')
    }
    
    // Reject directories, only allow files
    if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isFile()) {
      throw new Error('Audio file not found or is not a file')
    }
    
    // Read local audio file
    const audioBuffer = fs.readFileSync(normalizedPath)
    
    // Upload to HeyGen (using upload.heygen.com domain)
    const uploadResponse = await axios.post(
      `${HEYGEN_UPLOAD_BASE}/v1/asset`,
      audioBuffer,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'audio/mpeg'
        }
      }
    )
    
    const assetId = uploadResponse.data?.data?.id
    if (!assetId) {
      throw new Error('No asset_id returned from HeyGen upload')
    }
    
    console.log(`✅ Audio uploaded to HeyGen: ${assetId}`)
    return assetId
  } catch (error: any) {
    console.error('Audio upload error:', error.response?.data || error.message)
    throw new Error('Failed to upload audio to HeyGen')
  }
}

export async function generateHeyGenVideo(
  apiKey: string,
  request: HeyGenVideoRequest
): Promise<string> {
  try {
    let voiceConfig

    if (request.audio_url) {
      console.log(`🎵 Using audio mode with file: ${request.audio_url}`)
      
      // Convert URL to absolute local path
      // /uploads/audio/proj-123.mp3 → /home/runner/workspace/uploads/audio/proj-123.mp3
      const audioPath = request.audio_url.startsWith('/')
        ? path.join(process.cwd(), request.audio_url)
        : path.join(process.cwd(), request.audio_url)
      
      console.log(`📁 Resolved audio path: ${audioPath}`)
      
      // Upload audio and get asset_id
      const audioAssetId = await uploadAudioToHeyGen(apiKey, audioPath)
      
      voiceConfig = {
        type: 'audio',
        audio_asset_id: audioAssetId
      }
    } else {
      // Fallback to text-to-speech mode
      console.log('📝 Using text-to-speech mode')
      voiceConfig = {
        type: 'text',
        input_text: request.script,
        voice_id: request.voice_id || '2d5b0e6cf36f460aa7fc47e3eee4ba54',
        speed: 1.0
      }
    }

    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: request.avatar_id,
            avatar_style: 'normal'
          },
          voice: voiceConfig
        }
      ],
      dimension: request.dimension || {
        width: 1280,
        height: 720
      }
    }

    console.log('🎬 Generating video with HeyGen...')

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

    console.log(`✅ Video generation started: ${videoId}`)
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
