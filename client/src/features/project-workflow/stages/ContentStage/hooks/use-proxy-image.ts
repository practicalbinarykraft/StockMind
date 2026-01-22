import { useState, useEffect } from "react";

/**
 * Hook for proxying Instagram images through our backend to avoid CORS issues
 * Returns proxy URL and loading state
 */
export function useProxyImage(originalUrl: string | null | undefined) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!originalUrl) {
      setIsLoading(false);
      return;
    }

    // Reset states when URL changes
    setIsLoading(true);
    setError(false);

    // Create a temporary image to preload
    const img = new Image();
    
    const proxyUrl = `/api/instagram/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    
    img.onload = () => {
      setIsLoading(false);
      setError(false);
    };
    
    img.onerror = () => {
      setIsLoading(false);
      setError(true);
    };
    
    img.src = proxyUrl;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [originalUrl]);

  const getProxyUrl = () => {
    if (!originalUrl) return null;
    return `/api/instagram/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  };

  return {
    proxyUrl: getProxyUrl(),
    isLoading,
    error,
  };
}
