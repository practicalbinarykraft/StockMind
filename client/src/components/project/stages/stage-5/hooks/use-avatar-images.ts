import { useState, useEffect, useCallback, useMemo } from "react"

// HeyGen domains that need proxying
const HEYGEN_DOMAINS = [
  'files.heygen.ai',
  'files2.heygen.ai',
  'resource.heygen.ai',
  'api.heygen.com'
]

export interface AvatarImageState {
  status: 'loading' | 'loaded' | 'error'
  proxiedUrl: string | null
}

interface UseAvatarImagesOptions {
  /** Number of images to preload initially (for skeleton display) */
  preloadCount?: number
}

/**
 * Hook to manage avatar image loading through proxy
 * Tracks loading state for each image and provides overall loading status
 */
export function useAvatarImages(
  imageUrls: Array<{ id: string; url: string | undefined }>,
  options: UseAvatarImagesOptions = {}
) {
  const { preloadCount = 9 } = options
  
  // Track image states by avatar ID
  const [imageStates, setImageStates] = useState<Map<string, AvatarImageState>>(new Map())
  
  // Generate proxied URLs for all images
  const proxiedUrls = useMemo(() => {
    const map = new Map<string, string | null>()
    
    for (const { id, url } of imageUrls) {
      if (!url) {
        map.set(id, null)
        continue
      }
      
      try {
        const parsedUrl = new URL(url)
        if (HEYGEN_DOMAINS.includes(parsedUrl.hostname)) {
          // Proxy through backend to avoid CORS/hotlinking issues
          map.set(id, `/api/heygen/image-proxy?url=${encodeURIComponent(url)}`)
        } else {
          map.set(id, url)
        }
      } catch {
        // If URL parsing fails, use original
        map.set(id, url)
      }
    }
    
    return map
  }, [imageUrls])
  
  // Get proxied URL for specific avatar
  const getProxiedUrl = useCallback((avatarId: string): string | null => {
    return proxiedUrls.get(avatarId) ?? null
  }, [proxiedUrls])
  
  // Mark image as loaded
  const markLoaded = useCallback((avatarId: string) => {
    setImageStates(prev => {
      const next = new Map(prev)
      const proxiedUrl = proxiedUrls.get(avatarId) ?? null
      next.set(avatarId, { status: 'loaded', proxiedUrl })
      return next
    })
  }, [proxiedUrls])
  
  // Mark image as error
  const markError = useCallback((avatarId: string) => {
    setImageStates(prev => {
      const next = new Map(prev)
      next.set(avatarId, { status: 'error', proxiedUrl: null })
      return next
    })
  }, [])
  
  // Get state for specific avatar
  const getImageState = useCallback((avatarId: string): AvatarImageState => {
    return imageStates.get(avatarId) ?? { status: 'loading', proxiedUrl: getProxiedUrl(avatarId) }
  }, [imageStates, getProxiedUrl])
  
  // Check if image failed
  const isImageFailed = useCallback((avatarId: string): boolean => {
    return imageStates.get(avatarId)?.status === 'error'
  }, [imageStates])
  
  // Calculate overall loading progress
  const loadingProgress = useMemo(() => {
    // Only track first N images for initial display
    const trackingIds = imageUrls.slice(0, preloadCount).map(item => item.id)
    const urlsWithImages = trackingIds.filter(id => proxiedUrls.get(id) !== null)
    
    if (urlsWithImages.length === 0) {
      return { loaded: 0, total: 0, allLoaded: true, percentage: 100 }
    }
    
    const loadedCount = urlsWithImages.filter(id => {
      const state = imageStates.get(id)
      return state?.status === 'loaded' || state?.status === 'error'
    }).length
    
    return {
      loaded: loadedCount,
      total: urlsWithImages.length,
      allLoaded: loadedCount >= urlsWithImages.length,
      percentage: Math.round((loadedCount / urlsWithImages.length) * 100)
    }
  }, [imageUrls, imageStates, proxiedUrls, preloadCount])
  
  // Clean up old image states that are no longer visible
  useEffect(() => {
    const currentIds = new Set(imageUrls.map(img => img.id))
    setImageStates(prev => {
      const next = new Map(prev)
      // Keep only states for currently visible images (plus a small buffer)
      for (const [id] of prev) {
        if (!currentIds.has(id)) {
          next.delete(id)
        }
      }
      return next.size !== prev.size ? next : prev
    })
  }, [imageUrls])

  // Preload visible images with controlled concurrency and debounce
  useEffect(() => {
    // Debounce image loading to prevent rapid requests when data changes
    const timeoutId = setTimeout(() => {
      const imagesToPreload = imageUrls.slice(0, preloadCount)
      const newImagesToLoad: Array<{ id: string; url: string }> = []
      
      for (const { id, url } of imagesToPreload) {
        // Skip if already tracked or no URL
        if (imageStates.has(id) || !url) continue
        
        const proxiedUrl = proxiedUrls.get(id)
        if (!proxiedUrl) continue
        
        newImagesToLoad.push({ id, url: proxiedUrl })
      }
      
      if (newImagesToLoad.length === 0) return
      
      console.log(`🖼️ Loading ${newImagesToLoad.length} avatar images (2 at a time, with rate limiting)...`)
    
    // Batch initialize all new images as loading
    setImageStates(prev => {
      const next = new Map(prev)
      for (const { id, url } of newImagesToLoad) {
        if (!next.has(id)) {
          next.set(id, { status: 'loading', proxiedUrl: url })
        }
      }
      return next
    })
    
    // Load images with controlled concurrency (2 at a time) to avoid overwhelming the server
    const CONCURRENT_LOADS = 2
    let currentIndex = 0
    
    const loadNextBatch = () => {
      const batch = newImagesToLoad.slice(currentIndex, currentIndex + CONCURRENT_LOADS)
      if (batch.length === 0) return
      
      currentIndex += CONCURRENT_LOADS
      
      batch.forEach(({ id, url }, index) => {
        const loadImage = (retryCount = 0) => {
          const img = new Image()
          const startTime = Date.now()
          
          img.onload = () => {
            const duration = Date.now() - startTime
            console.log(`✅ Loaded avatar image ${id} in ${duration}ms`)
            markLoaded(id)
            // Continue loading next batch
            if (currentIndex < newImagesToLoad.length) {
              loadNextBatch()
            }
          }
          
          img.onerror = () => {
            const duration = Date.now() - startTime
            console.warn(`❌ Failed to load avatar image ${id} after ${duration}ms (attempt ${retryCount + 1}/3)`)
            
            // Retry up to 2 times with exponential backoff
            // If server is rate limiting (429), use longer delays
            if (retryCount < 2) {
              const baseDelay = Math.pow(2, retryCount) * 1000 // 1s, 2s
              const delay = baseDelay * 2 // Double delay for rate limit scenarios
              console.log(`🔄 Retrying image ${id} in ${delay}ms...`)
              setTimeout(() => loadImage(retryCount + 1), delay)
            } else {
              markError(id)
              // Continue loading next batch even on error
              if (currentIndex < newImagesToLoad.length) {
                // Add extra delay before next batch if we're hitting errors
                setTimeout(() => loadNextBatch(), 500)
              }
            }
          }
          
          // Add delay between images in the same batch to spread load
          setTimeout(() => {
            img.src = url
          }, index * 200) // 200ms delay between each image in batch
        }
        
        loadImage()
      })
    }
    
      // Start initial batch loads
      loadNextBatch()
    }, 300) // 300ms debounce to prevent rapid loading on data changes
    
    return () => clearTimeout(timeoutId)
  }, [imageUrls, preloadCount, proxiedUrls, imageStates, markLoaded, markError])
  
  return {
    /** Get proxied URL for an avatar */
    getProxiedUrl,
    /** Get full state for an avatar image */
    getImageState,
    /** Check if image failed to load */
    isImageFailed,
    /** Mark image as successfully loaded */
    markLoaded,
    /** Mark image as failed */
    markError,
    /** Overall loading progress for initial display */
    loadingProgress,
    /** Whether all initial images are loaded */
    allImagesLoaded: loadingProgress.allLoaded
  }
}

