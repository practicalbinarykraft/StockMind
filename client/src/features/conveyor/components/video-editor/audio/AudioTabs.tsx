/**
 * Табы для выбора режима аудио (Generate/Upload/Record)
 * ≤150 строк
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { AudioGenerateTab } from './AudioGenerateTab'
import { AudioUploadTab } from './AudioUploadTab'
import { AudioRecordTab } from './AudioRecordTab'

interface AudioTabsProps {
  scriptId: string
  scriptText: string
  currentMode?: 'generate' | 'upload' | 'record'
  onModeChange?: (mode: 'generate' | 'upload' | 'record') => void
}

export function AudioTabs({
  scriptId,
  scriptText,
  currentMode = 'generate',
  onModeChange,
}: AudioTabsProps) {
  return (
    <Tabs
      value={currentMode}
      onValueChange={(value) => onModeChange?.(value as any)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="generate">Сгенерировать</TabsTrigger>
        <TabsTrigger value="upload">Загрузить</TabsTrigger>
        <TabsTrigger value="record">Записать</TabsTrigger>
      </TabsList>

      <TabsContent value="generate" className="mt-6">
        <AudioGenerateTab scriptId={scriptId} scriptText={scriptText} />
      </TabsContent>

      <TabsContent value="upload" className="mt-6">
        <AudioUploadTab scriptId={scriptId} />
      </TabsContent>

      <TabsContent value="record" className="mt-6">
        <AudioRecordTab scriptId={scriptId} scriptText={scriptText} />
      </TabsContent>
    </Tabs>
  )
}
