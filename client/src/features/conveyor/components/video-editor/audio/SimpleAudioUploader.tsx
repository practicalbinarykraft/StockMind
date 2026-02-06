/**
 * Упрощённый загрузчик аудио для conveyor
 * ≤100 строк
 */

import { useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Upload, Loader2 } from 'lucide-react'

interface SimpleAudioUploaderProps {
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
}

export function SimpleAudioUploader({ onUpload, isUploading }: SimpleAudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Пожалуйста, выберите аудио файл')
      return
    }
    await onUpload(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
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

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Перетащите аудио файл сюда или нажмите для выбора
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Поддерживаются форматы: MP3, WAV, OGG (макс. 50MB)
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Выбрать файл
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
