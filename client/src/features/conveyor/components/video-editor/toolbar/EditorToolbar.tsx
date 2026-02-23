/**
 * Правая панель инструментов с вкладками
 * Содержит вкладки: Визуалы, Текст, Аудио, Композиция
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card } from "@/shared/ui/card";
import { VisualsTab } from "./VisualsTab";
import { TextTab } from "./TextTab";
import { AudioTab } from "./AudioTab";
import { CompositionTab } from "./CompositionTab";
import { Image, Type, Music, Layout, Save } from "lucide-react";
import {
  useCompositionStore,
  selectHasChanges,
} from "../../../stores/composition";
import type { ScriptMedia } from "../../../services/scriptMediaService";

interface EditorToolbarProps {
  className?: string;
  scriptId?: string;
  media?: ScriptMedia | null;
}

export function EditorToolbar({
  className,
  scriptId,
  media,
}: EditorToolbarProps) {
  const hasChanges = useCompositionStore(selectHasChanges);

  return (
    <Card className={`${className ?? ""} min-w-0`}>
      <Tabs defaultValue="visuals" className="w-full min-w-0">
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

        {hasChanges && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <Save className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Есть несохранённые изменения.</span>
          </div>
        )}

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
  );
}
