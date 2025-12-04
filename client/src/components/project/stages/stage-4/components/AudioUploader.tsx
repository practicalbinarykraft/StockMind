import { forwardRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Play, Pause, Download } from "lucide-react"

interface DropZoneProps {
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
}

function DropZone({ isDragging, onDragOver, onDragLeave, onDrop, onClick }: DropZoneProps) {
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center hover-elevate cursor-pointer transition-all ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      data-testid="dropzone-upload"
    >
      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-lg font-medium mb-2">Drag & Drop Audio File</p>
      <p className="text-sm text-muted-foreground mb-4">
        or click to browse (MP3, WAV, M4A - max 25MB)
      </p>
    </div>
  )
}

interface UploadedAudioPreviewProps {
  audioUrl: string
  fileName: string
  fileSize?: number
  isPlaying: boolean
  onPlayPause: () => void
  onDownload: () => void
  onChangeFile: () => void
  audioRef: React.RefObject<HTMLAudioElement | null>
  onEnded: () => void
}

function UploadedAudioPreview({
  audioUrl,
  fileName,
  fileSize,
  isPlaying,
  onPlayPause,
  onDownload,
  onChangeFile,
  audioRef,
  onEnded,
}: UploadedAudioPreviewProps) {
  const fileSizeFormatted = fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB` : ""

  return (
    <>
      <audio ref={audioRef as React.RefObject<HTMLAudioElement>} src={audioUrl} onEnded={onEnded} />
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Audio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={onPlayPause}
              data-testid="button-play-uploaded"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full bg-primary transition-all ${isPlaying ? 'w-full' : 'w-0'}`} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span className="truncate max-w-[300px]" data-testid="text-uploaded-filename">
                  {fileName}
                </span>
                <span>{fileSizeFormatted}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={onDownload}
              data-testid="button-download-uploaded"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={onChangeFile} data-testid="button-change-file">
              Change File
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

interface AudioUploaderProps {
  uploadedFile: File | null
  uploadedAudioUrl: string | null
  savedFilename?: string
  savedFilesize?: number
  isDragging: boolean
  isPlaying: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPlayPause: () => void
  onDownload: () => void
  onChangeFile: () => void
  onEnded: () => void
}

export const AudioUploader = forwardRef<
  { audioRef: HTMLAudioElement | null; fileInputRef: HTMLInputElement | null },
  AudioUploaderProps
>(function AudioUploader(
  {
    uploadedFile,
    uploadedAudioUrl,
    savedFilename,
    savedFilesize,
    isDragging,
    isPlaying,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileInputChange,
    onPlayPause,
    onDownload,
    onChangeFile,
    onEnded,
  },
  ref
) {
  const audioRef = { current: null as HTMLAudioElement | null }
  const fileInputRef = { current: null as HTMLInputElement | null }

  // Expose refs to parent via forwarded ref
  if (typeof ref === 'function') {
    ref({ audioRef: audioRef.current, fileInputRef: fileInputRef.current })
  } else if (ref) {
    ref.current = { audioRef: audioRef.current, fileInputRef: fileInputRef.current }
  }

  const hasUpload = uploadedFile || uploadedAudioUrl
  const fileName = uploadedFile?.name || savedFilename || "Uploaded Audio"
  const fileSize = uploadedFile?.size || savedFilesize

  return (
    <>
      {!hasUpload ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Audio File</CardTitle>
          </CardHeader>
          <CardContent>
            <DropZone
              isDragging={isDragging}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              ref={(el) => { fileInputRef.current = el }}
              type="file"
              className="hidden"
              accept="audio/mpeg,audio/wav,audio/mp3,audio/x-m4a,audio/mp4,.mp3,.wav,.m4a"
              onChange={onFileInputChange}
              data-testid="input-upload-file"
            />
          </CardContent>
        </Card>
      ) : uploadedAudioUrl ? (
        <UploadedAudioPreview
          audioUrl={uploadedAudioUrl}
          fileName={fileName}
          fileSize={fileSize}
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onDownload={onDownload}
          onChangeFile={onChangeFile}
          audioRef={audioRef as any}
          onEnded={onEnded}
        />
      ) : null}
    </>
  )
})
