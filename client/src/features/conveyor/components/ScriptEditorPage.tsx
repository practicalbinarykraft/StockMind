/**
 * Страница редактора сценария - рефакторенная версия с модульными компонентами
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, FileArchive } from "lucide-react";
import { useScript } from "../hooks/use-scripts";
import { useConveyorEvents } from "../hooks/use-conveyor-events";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Button } from "@/shared/ui/button";
import { scriptsService } from "../services/scriptsService";
import { useToast } from "@/shared/hooks/use-toast";
import { queryClient } from "@/shared/api";
import { RecoveryBanner } from "./script-generation/RecoveryBanner";
import type { Scene } from "../types";

// Новые модульные компоненты
import { SceneListPanel } from "./editor/SceneListPanel";
import { SceneEditor } from "./editor/SceneEditor";
import { ScriptInfoPanel } from "./editor/ScriptInfoPanel";

export function ScriptEditorPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/conveyor/editor/:id");
  const scriptId = params?.id || "";
  const { toast } = useToast();

  // Определяем режим работы из query параметра
  const searchParams = new URLSearchParams(window.location.search);
  const mode = (searchParams.get("mode") as "review" | "draft") || "draft";
  const isReviewMode = mode === "review";

  const { data: script, isLoading } = useScript(scriptId);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState<string>("");
  const [lengthOption, setLengthOption] = useState<
    "keep" | "increase" | "decrease"
  >("keep");

  // Состояния для регенерации всего сценария (режим рецензии)
  const [isRegeneratingScript, setIsRegeneratingScript] = useState(false);

  // Recovery state
  const [hasRecoverableCheckpoints, setHasRecoverableCheckpoints] =
    useState(false);
  const [checkpoints, setCheckpoints] = useState<Array<any>>([]);

  // Conveyor events for regeneration tracking
  const { messages: conveyorMessages, isProcessing: isConveyorProcessing } =
    useConveyorEvents();

  const selectedScene = script?.scenes?.find(
    (s: any) => s.id === selectedSceneId,
  );

  // Проверка checkpoint'ов при загрузке
  useEffect(() => {
    const checkRecovery = async () => {
      if (!scriptId) return;

      try {
        const result = await scriptsService.getCheckpoints(scriptId);

        if (result.hasCheckpoints && result.checkpoints.length > 0) {
          setHasRecoverableCheckpoints(true);
          setCheckpoints(result.checkpoints);
        }
      } catch (error) {
        console.error("Failed to check for checkpoints:", error);
      }
    };

    checkRecovery();
  }, [scriptId]);

  // Восстановление из checkpoint
  const handleRestoreCheckpoint = async (checkpointId: string) => {
    setIsSaving(true);
    try {
      const restoredScript = await scriptsService.restoreFromCheckpoint(
        scriptId,
        checkpointId,
      );

      // Скрыть баннер recovery
      setHasRecoverableCheckpoints(false);
      setCheckpoints([]);

      // Инвалидировать кэш
      await queryClient.invalidateQueries({ queryKey: ["scripts", scriptId] });

      // Обновить UI
      if (restoredScript.scenes.length > 0) {
        setSelectedSceneId(restoredScript.scenes[0].id);
        setEditingText(restoredScript.scenes[0].text || "");
      }

      toast({
        title: "Успешно",
        description: "Изменения восстановлены",
      });
    } catch (error: any) {
      console.error("Failed to restore checkpoint:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось восстановить изменения",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const dismissCheckpoints = () => {
    setHasRecoverableCheckpoints(false);
    setCheckpoints([]);
  };

  // Инициализация при загрузке скрипта
  useEffect(() => {
    if (script?.scenes && script.scenes.length > 0 && !selectedSceneId) {
      setSelectedSceneId(script.scenes[0].id);
    }
  }, [script, selectedSceneId]);

  // Refs для автосохранения
  const prevSceneIdRef = useRef<string | null>(null);
  const editingTextRef = useRef<string>("");
  const hasUnsavedChangesRef = useRef(false);
  const isChangingSceneRef = useRef(false);
  const lastSavedScenesRef = useRef<Map<string, string>>(new Map());

  // Обновляем refs при изменении состояния
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    editingTextRef.current = editingText;
  }, [editingText]);

  // Функция сохранения текущих изменений (async)
  const saveCurrentChanges = useCallback(
    async (sceneId?: string, text?: string) => {
      const targetSceneId = sceneId || selectedSceneId;
      const targetText = text ?? editingTextRef.current;

      if (!scriptId || !targetSceneId) return false;

      // Проверяем, изменился ли текст с последнего сохранения
      const lastSavedText = lastSavedScenesRef.current.get(targetSceneId);
      if (lastSavedText === targetText) {
        console.log("[Autosave] No changes to save for scene", targetSceneId);
        return true;
      }

      try {
        const currentScript = await scriptsService.getScriptUniversal(scriptId);
        const updatedScenes = currentScript.scenes.map((scene) =>
          scene.id === targetSceneId ? { ...scene, text: targetText } : scene,
        );
        await scriptsService.updateScriptUniversal(scriptId, {
          scenes: updatedScenes,
        });

        // Запоминаем что сохранили
        lastSavedScenesRef.current.set(targetSceneId, targetText);

        console.log("[Autosave] Saved changes for scene", targetSceneId);
        return true;
      } catch (error) {
        console.error("[Autosave] Failed to save:", error);
        return false;
      }
    },
    [scriptId, selectedSceneId],
  );

  // Функция переключения сцены с автосохранением
  const handleSceneChange = useCallback(
    async (newSceneId: string) => {
      if (newSceneId === selectedSceneId || isChangingSceneRef.current) return;

      isChangingSceneRef.current = true;

      // Сохраняем текущую сцену перед переключением
      if (selectedSceneId && hasUnsavedChangesRef.current) {
        console.log(
          "[SceneChange] Saving current scene before switch:",
          selectedSceneId,
        );
        await saveCurrentChanges(selectedSceneId, editingTextRef.current);
      }

      // Переключаемся на новую сцену
      prevSceneIdRef.current = selectedSceneId;
      setSelectedSceneId(newSceneId);
      setHasUnsavedChanges(false);

      isChangingSceneRef.current = false;
    },
    [selectedSceneId, saveCurrentChanges],
  );

  // Инициализация текста для редактирования при выборе сцены
  useEffect(() => {
    if (selectedScene && !isChangingSceneRef.current && !isRegenerating) {
      const savedText = lastSavedScenesRef.current.get(selectedScene.id);
      if (savedText === undefined || savedText === selectedScene.text) {
        setEditingText(selectedScene.text);
        setHasUnsavedChanges(false);
        lastSavedScenesRef.current.set(selectedScene.id, selectedScene.text);
      }
    }
  }, [selectedSceneId]);

  // Автосохранение при выходе из редактора
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current && selectedSceneId) {
        if (navigator.sendBeacon && scriptId) {
          const data = JSON.stringify({
            scriptId,
            sceneId: selectedSceneId,
            text: editingTextRef.current,
          });
          navigator.sendBeacon("/api/scripts/autosave", data);
          console.log("[Autosave] Sent beacon on beforeunload");
        }

        e.preventDefault();
        e.returnValue =
          "У вас есть несохранённые изменения. Вы уверены, что хотите покинуть страницу?";
        return e.returnValue;
      }
    };

    const saveOnUnmount = () => {
      if (hasUnsavedChangesRef.current && scriptId && selectedSceneId) {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/scripts/autosave", false);
        xhr.setRequestHeader("Content-Type", "application/json");
        try {
          xhr.send(
            JSON.stringify({
              scriptId,
              sceneId: selectedSceneId,
              text: editingTextRef.current,
            }),
          );
          console.log("[Autosave] Saved on unmount via XHR");
        } catch (e) {
          console.error("[Autosave] Failed to save on unmount:", e);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveOnUnmount();
    };
  }, [scriptId, selectedSceneId]);

  const handleSaveScene = async (text: string) => {
    if (!selectedSceneId || !scriptId) return;

    setIsSaving(true);
    try {
      await saveCurrentChanges(selectedSceneId, text);
      setEditingText(text);
      setHasUnsavedChanges(false);

      await queryClient.invalidateQueries({ queryKey: ["scripts", scriptId] });

      toast({
        title: "Успешно",
        description: "Изменения сохранены",
      });
    } catch (error) {
      console.error("Error saving scene:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelScene = () => {
    if (selectedScene) {
      setEditingText(selectedScene.text);
      setHasUnsavedChanges(false);
    }
  };

  const handleAddScene = async () => {
    if (!script || !scriptId) return;

    try {
      setIsSaving(true);

      // Сначала сохраняем текущую сцену если есть изменения
      if (selectedSceneId && hasUnsavedChangesRef.current) {
        await saveCurrentChanges(selectedSceneId, editingTextRef.current);
      }

      // Создаем новую сцену
      const newScene = {
        id: `scene-${Date.now()}`,
        order: script.scenes.length + 1,
        text: "",
        alternatives: [],
      };

      const updatedScenes = [...script.scenes, newScene];
      await scriptsService.updateScriptUniversal(scriptId, {
        scenes: updatedScenes,
      });
      await queryClient.invalidateQueries({ queryKey: ["scripts", scriptId] });

      setSelectedSceneId(newScene.id);
      setEditingText("");
      setHasUnsavedChanges(false);

      toast({
        title: "Успешно",
        description: "Новая сцена добавлена",
      });
    } catch (error) {
      console.error("Error adding scene:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить сцену",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScene = async () => {
    if (!script || !scriptId || !selectedSceneId) return;

    // Не даем удалить последнюю сцену
    if (script.scenes.length <= 1) {
      toast({
        title: "Предупреждение",
        description: "Нельзя удалить последнюю сцену",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Удаляем сцену и пересчитываем order
      const updatedScenes = script.scenes
        .filter((scene) => scene.id !== selectedSceneId)
        .map((scene, index) => ({ ...scene, order: index + 1 }));

      await scriptsService.updateScriptUniversal(scriptId, {
        scenes: updatedScenes,
      });
      await queryClient.invalidateQueries({ queryKey: ["scripts", scriptId] });

      // Выбираем первую сцену после удаления
      if (updatedScenes.length > 0) {
        setSelectedSceneId(updatedScenes[0].id);
        setEditingText(updatedScenes[0].text);
      } else {
        setSelectedSceneId(null);
        setEditingText("");
      }
      setHasUnsavedChanges(false);

      toast({
        title: "Успешно",
        description: "Сцена удалена",
      });
    } catch (error) {
      console.error("Error deleting scene:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сцену",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorChange = useCallback((dirty: boolean) => {
    setHasUnsavedChanges(dirty);
  }, []);

  const handleSelectAlternative = async (index: number) => {
    if (!selectedScene) return;

    const alternativeText = selectedScene.alternatives[index];
    if (!alternativeText) return;

    setEditingText(alternativeText);
    setHasUnsavedChanges(true);
  };

  const handleRegenerateAlternatives = async (
    customPrompt?: string,
    lengthOpt?: "keep" | "increase" | "decrease",
  ) => {
    if (!selectedSceneId || !scriptId || !selectedScene) return;

    setIsRegenerating(true);

    try {
      const currentSceneId = selectedSceneId;
      const currentEditingText = editingTextRef.current;

      const result = await scriptsService.generateVariants({
        sourceText: selectedScene.text,
        prompt: customPrompt,
        format: "social",
        lengthOption: lengthOpt || lengthOption,
      });

      console.log("[Regenerate] Generate variants result:", result);

      let alternatives: string[] = [];

      if (result.variants && typeof result.variants === "object") {
        const firstSceneVariants = result.variants[0] || result.variants["0"];
        if (Array.isArray(firstSceneVariants)) {
          alternatives = firstSceneVariants.map((v: any) =>
            typeof v === "string" ? v : v.text,
          );
        }
      } else if (Array.isArray(result.variants)) {
        alternatives = result.variants;
      }

      await scriptsService.updateScene(scriptId, currentSceneId, {
        alternatives,
        text: currentEditingText,
      });

      lastSavedScenesRef.current.set(currentSceneId, currentEditingText);

      await queryClient.invalidateQueries({ queryKey: ["scripts", scriptId] });

      if (selectedSceneId === currentSceneId) {
        setEditingText(currentEditingText);
        setHasUnsavedChanges(false);
      }

      toast({
        title: "Успешно",
        description: `Сгенерировано ${alternatives.length || 0} вариантов`,
      });

      if (customPrompt) {
        setIsPromptModalOpen(false);
        setPromptText("");
        setLengthOption("keep");
      }
    } catch (error) {
      console.error("Error regenerating alternatives:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать альтернативы",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveToDraft = async () => {
    if (!scriptId) return;

    setIsSaving(true);
    try {
      // Сохраняем текущую сцену
      if (selectedSceneId && hasUnsavedChangesRef.current) {
        await saveCurrentChanges(selectedSceneId, editingTextRef.current);
      }

      if (isReviewMode) {
        // Режим рецензии - это гарантированно auto_script
        // Копируем в библиотеку как черновик
        console.log(
          "[SaveToDraft] Сохраняем auto_script в библиотеку как черновик",
        );
        const libraryScript = await scriptsService.saveAutoScriptToLibrary(
          scriptId,
          "draft",
        );

        // Помечаем исходный auto_script как rejected через PATCH (без reason/category)
        await scriptsService.updateAutoScript(scriptId, {
          status: "rejected" as any,
        });

        // Инвалидируем кэш для обновления UI
        await queryClient.invalidateQueries({ queryKey: ["scripts", "draft"] });
        await queryClient.invalidateQueries({
          queryKey: ["conveyor-dashboard"],
        });
        await queryClient.invalidateQueries({ queryKey: ["auto-scripts"] });
        await queryClient.invalidateQueries({ queryKey: ["scripts"] });

        toast({
          title: "Успешно",
          description: libraryScript.aiScore
            ? `Сценарий сохранён в черновики с оценкой ${libraryScript.aiScore}/100`
            : "Сценарий сохранён в черновики",
        });

        // Переходим к просмотру сохраненного черновика
        navigate(`/conveyor/editor/${libraryScript.id}?mode=draft`);
      } else {
        // Режим черновика - это library_script, просто обновляем статус
        const currentScript = await scriptsService.getScriptUniversal(scriptId);
        const updateData: any = { status: "draft" };

        // Если скрипт был изменён после анализа, помечаем для переоценки
        if (currentScript.aiScore && currentScript.analyzedAt) {
          const lastAnalyzed = new Date(currentScript.analyzedAt).getTime();
          const lastUpdated = new Date(currentScript.updatedAt).getTime();

          if (lastUpdated > lastAnalyzed) {
            console.log(
              "[SaveToDraft] Скрипт изменён после анализа, сбрасываем оценку",
            );
            updateData.aiScore = null;
            updateData.analyzedAt = null;

            toast({
              title: "Требуется переоценка",
              description:
                "Скрипт изменён. Запустите анализ для получения новой оценки.",
              variant: "default",
            });
          }
        }

        await scriptsService.updateScript(scriptId, updateData);
        await queryClient.invalidateQueries({
          queryKey: ["scripts", scriptId],
        });
        await queryClient.invalidateQueries({ queryKey: ["scripts", "draft"] });

        toast({
          title: "Успешно",
          description: "Сценарий сохранён в черновики",
        });
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving to draft:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить в черновики",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToReady = async () => {
    if (!scriptId) return;

    setIsSaving(true);
    try {
      // Сохраняем текущую сцену
      if (selectedSceneId && hasUnsavedChangesRef.current) {
        await saveCurrentChanges(selectedSceneId, editingTextRef.current);
      }

      if (isReviewMode) {
        // Режим рецензии - это гарантированно auto_script
        // Копируем в библиотеку как готовый
        console.log(
          "[SaveToReady] Сохраняем auto_script в библиотеку как готовый",
        );
        const libraryScript = await scriptsService.saveAutoScriptToLibrary(
          scriptId,
          "ready",
        );

        // Помечаем исходный auto_script как approved через PATCH
        await scriptsService.updateAutoScript(scriptId, {
          status: "approved" as any,
        });

        // Инвалидируем кэш для обновления UI
        await queryClient.invalidateQueries({ queryKey: ["scripts", "ready"] });
        await queryClient.invalidateQueries({
          queryKey: ["conveyor-dashboard"],
        });
        await queryClient.invalidateQueries({ queryKey: ["auto-scripts"] });
        await queryClient.invalidateQueries({ queryKey: ["scripts"] });

        toast({
          title: "Успешно",
          description: libraryScript.aiScore
            ? `Сценарий сохранён в готовые с оценкой ${libraryScript.aiScore}/100`
            : "Сценарий сохранён в готовые",
        });

        // Переходим к просмотру сохраненного готового сценария
        navigate(`/conveyor/editor/${libraryScript.id}?mode=draft`);
      } else {
        // Режим черновика - это library_script, просто обновляем статус
        await scriptsService.updateScript(scriptId, { status: "ready" });
        await queryClient.invalidateQueries({
          queryKey: ["scripts", scriptId],
        });
        await queryClient.invalidateQueries({ queryKey: ["scripts", "ready"] });

        toast({
          title: "Успешно",
          description: "Сценарий сохранён в готовые",
        });
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving to ready:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить в готовые",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-[280px_1fr_450px] gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass rounded-xl p-8">
          <p className="text-muted-foreground text-center mb-4">
            Сценарий не найден
          </p>
          <button
            onClick={() =>
              navigate(`${isReviewMode ? "/conveyor" : "/conveyor/drafts"}`)
            }
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recovery Banner */}
      {hasRecoverableCheckpoints && checkpoints.length > 0 && (
        <RecoveryBanner
          checkpoints={checkpoints}
          onRestore={handleRestoreCheckpoint}
          onDismiss={dismissCheckpoints}
        />
      )}

      {/* Header */}
      <div className="glass rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                navigate(`${isReviewMode ? "/conveyor" : "/conveyor/drafts"}`)
              }
              className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold gradient-text">
                Редактор сценария
              </h1>
              <p className="text-sm text-muted-foreground">{script.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(isConveyorProcessing || isRegeneratingScript) && (
              <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400 font-medium">
                  Система активна
                </span>
              </div>
            )}
            <button
              onClick={handleSaveToDraft}
              disabled={isSaving}
              className="px-4 py-2 border border-border/50 text-foreground rounded-lg font-medium hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 flex items-center gap-2"
            >
              <FileArchive className="h-4 w-4" />
              Сохранить в черновики
            </button>
            <button
              onClick={handleSaveToReady}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 flex items-center gap-2 hover-lift"
            >
              <Save className="h-4 w-4" />
              Сохранить в готовые
            </button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <Save className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Есть несохранённые изменения. Сохраните сцену или нажмите одну из
              кнопок сохранения выше.
            </span>
          </div>
        )}
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="grid grid-cols-[280px_1fr_450px] gap-6 items-start">
        {/* Left Panel - Scene List */}
        <SceneListPanel
          scenes={script.scenes}
          selectedSceneId={selectedSceneId}
          onSceneSelect={handleSceneChange}
          onAddScene={handleAddScene}
        />

        {/* Center Panel - Scene Editor */}
        <SceneEditor
          scene={selectedScene || null}
          isSaving={isSaving}
          isRegenerating={isRegenerating}
          onSave={handleSaveScene}
          onCancel={handleCancelScene}
          onDelete={handleDeleteScene}
          onSelectAlternative={handleSelectAlternative}
          onOpenPrompt={() => setIsPromptModalOpen(true)}
          onRegenerate={() => handleRegenerateAlternatives()}
          onChange={handleEditorChange}
        />

        {/* Right Panel - Script Info */}
        <ScriptInfoPanel
          version={script.version}
          status={script.status}
          createdAt={script.createdAt}
          scenes={script.scenes}
        />
      </div>

      {/* Prompt Modal */}
      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Инструкции для регенерации</DialogTitle>
            <DialogDescription>
              Опишите, как должна измениться сцена. AI сгенерирует новые
              варианты.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt-text">Промпт</Label>
              <Textarea
                id="prompt-text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="mt-2 min-h-[100px]"
                placeholder="Например: Сделать более эмоциональным, добавить конкретные примеры..."
              />
            </div>

            <div>
              <Label>Длина текста</Label>
              <RadioGroup
                value={lengthOption}
                onValueChange={(v: any) => setLengthOption(v)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep" id="keep" />
                  <Label htmlFor="keep" className="font-normal">
                    Оставить как есть
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="increase" id="increase" />
                  <Label htmlFor="increase" className="font-normal">
                    Увеличить
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="decrease" id="decrease" />
                  <Label htmlFor="decrease" className="font-normal">
                    Уменьшить
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPromptModalOpen(false);
                setPromptText("");
                setLengthOption("keep");
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={() =>
                handleRegenerateAlternatives(
                  promptText.trim() || undefined,
                  lengthOption,
                )
              }
              disabled={isRegenerating}
            >
              Перегенерировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
