import { useState, useRef } from "react"
import { useMutation } from "@tanstack/react-query"

interface UseAudioUploadProps {
  onUploadSuccess: (audioUrl: string) => void
}

interface UseAudioUploadReturn {
  uploadedFile: File | null
  uploadedAudioUrl: string | null
  isDragging: boolean
  isUploadPlaying: boolean
  uploadMutation: any // UseMutationResult with specific types
  uploadAudioRef: React.RefObject<HTMLAudioElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: (file: File) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleUploadPlayPause: () => void
  handleUploadDownload: (stage4Filename?: string) => void
  setUploadedFile: (file: File | null) => void
  setUploadedAudioUrl: (url: string | null) => void
  setIsUploadPlaying: (playing: boolean) => void
}

const VALID_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-m4a', 'audio/mp4']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export function useAudioUpload({ onUploadSuccess }: UseAudioUploadProps): UseAudioUploadReturn {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploadPlaying, setIsUploadPlaying] = useState(false)
  const uploadAudioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('audio', file)

      const res = await fetch("/api/audio/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to upload audio")
      }

      return await res.json()
    },
    onSuccess: (data) => {
      onUploadSuccess(data.audioUrl)
    },
  })

  const handleFileSelect = (file: File) => {
    if (!VALID_AUDIO_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      alert('Please upload a valid audio file (MP3, WAV, or M4A)')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be less than 25MB')
      return
    }

    setUploadedFile(file)
    const url = URL.createObjectURL(file)
    setUploadedAudioUrl(url)

    uploadMutation.mutate(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUploadPlayPause = () => {
    if (!uploadAudioRef.current || !uploadedAudioUrl) return

    if (isUploadPlaying) {
      uploadAudioRef.current.pause()
      setIsUploadPlaying(false)
    } else {
      uploadAudioRef.current.play()
      setIsUploadPlaying(true)
    }
  }

  const handleUploadDownload = (stage4Filename?: string) => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile)
      const a = document.createElement('a')
      a.href = url
      a.download = uploadedFile.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (uploadedAudioUrl) {
      const a = document.createElement('a')
      a.href = uploadedAudioUrl
      a.download = stage4Filename || 'audio.mp3'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return {
    uploadedFile,
    uploadedAudioUrl,
    isDragging,
    isUploadPlaying,
    uploadMutation,
    uploadAudioRef,
    fileInputRef,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleUploadPlayPause,
    handleUploadDownload,
    setUploadedFile,
    setUploadedAudioUrl,
    setIsUploadPlaying,
  }
}
