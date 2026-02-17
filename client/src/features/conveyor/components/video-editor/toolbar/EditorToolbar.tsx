/**
 * Правая панель инструментов с вкладками
 * Содержит вкладки: Визуалы, Текст, Аудио, Композиция
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Card } from '@/shared/ui/card'
import { VisualsTab } from './VisualsTab'
import { TextTab } from './TextTab'
import { AudioTab } from './AudioTab'
import { CompositionTab } from './CompositionTab'
import { Image, Type, Music, Layout } from 'lucide-react'
import type { ScriptMedia } from '../../../services/scriptMediaService'

interface EditorToolbarProps {
  className?: string
  scriptId?: string
  media?: ScriptMedia | null
}

export function EditorToolbar({ className, scriptId, media }: EditorToolbarProps) {
  return (
    <Card className={className}>
      <Tabs defaultValue="visuals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visuals" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Визуалы</span>
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">Текст</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">Аудио</span>
          </TabsTrigger>
          <TabsTrigger value="composition" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Композиция</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 p-4">
          <TabsContent value="visuals" className="mt-0">
            <VisualsTab scriptId={scriptId} media={media} />
          </TabsContent>

          <TabsContent value="text" className="mt-0">
            <TextTab />
          </TabsContent>

          <TabsContent value="audio" className="mt-0">
            <AudioTab scriptId={scriptId} media={media} />
          </TabsContent>

          <TabsContent value="composition" className="mt-0">
            <CompositionTab />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}
