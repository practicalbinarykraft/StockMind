import { useState, useEffect, useCallback, useMemo } from "react"

// HeyGen domains that need proxying for video
const HEYGEN_DOMAINS = [
  'files.heygen.ai',
  'files2.heygen.ai',
  'resource.heygen.ai',
  'api.heygen.com'
]

export interface UseProxiedVideoReturn {
  /** Proxied URL for video playback */
  videoUrl: string | null
  /** Proxied URL for downloading */
  downloadUrl: string | null
  /** Whether the video is currently loading */
  isLoading: boolean
  /** Whether the video loaded successfully */
  isLoaded: boolean
  /** Whether there was an error loading the video */
  hasError: boolean
  /** Error message if any */
  errorMessage: string | null
  /** Mark video as loaded (called by video onLoadedData) */
  onVideoLoaded: () => void
  /** Mark video as error (called by video onError) */
  onVideoError: (message?: string) => void
  /** Trigger download of the video */
  downloadVideo: (filename?: string) => void
}

/**
 * Hook to manage video loading through proxy with loading state
 * @param originalUrl - Original HeyGen video URL
 */
export function useProxiedVideo(originalUrl: string | undefined): UseProxiedVideoReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Generate proxied URLs
  const { videoUrl, downloadUrl } = useMemo(() => {
    if (!originalUrl) {
      return { videoUrl: null, downloadUrl: null }
    }

    try {
      const url = new URL(originalUrl)
      if (HEYGEN_DOMAINS.includes(url.hostname)) {
        // Proxy through backend to avoid CORS/hotlinking issues
        const playbackParams = new URLSearchParams({ url: originalUrl })
        const downloadParams = new URLSearchParams({ url: originalUrl, download: 'true' })
        
        return {
          videoUrl: `/api/heygen/video-proxy?${playbackParams.toString()}`,
          downloadUrl: `/api/heygen/video-proxy?${downloadParams.toString()}`
        }
      }
    } catch {
      // If URL parsing fails, use original
    }
    
    return { videoUrl: originalUrl, downloadUrl: originalUrl }
  }, [originalUrl])

  // Reset state when URL changes
  useEffect(() => {
    if (originalUrl) {
      setIsLoading(true)
      setIsLoaded(false)
      setHasError(false)
      setErrorMessage(null)
    } else {
      setIsLoading(false)
      setIsLoaded(false)
      setHasError(false)
      setErrorMessage(null)
    }
  }, [originalUrl])

  // Called when video metadata/data is loaded
  const onVideoLoaded = useCallback(() => {
    setIsLoading(false)
    setIsLoaded(true)
    setHasError(false)
    setErrorMessage(null)
  }, [])

  // Called when video fails to load
  const onVideoError = useCallback((message?: string) => {
    setIsLoading(false)
    setIsLoaded(false)
    setHasError(true)
    setErrorMessage(message || 'Failed to load video')
  }, [])

  // Download video file
  const downloadVideo = useCallback((filename?: string) => {
    if (!downloadUrl) return

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'heygen-video.mp4'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [downloadUrl])

  return {
    videoUrl,
    downloadUrl,
    isLoading,
    isLoaded,
    hasError,
    errorMessage,
    onVideoLoaded,
    onVideoError,
    downloadVideo
  }
}

