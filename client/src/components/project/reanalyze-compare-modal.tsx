import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Check, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CompareMetrics {
  overallScore: number;
  hookScore?: number;
  structureScore?: number;
  emotionalScore?: number;
  ctaScore?: number;
  predicted?: {
    retention?: string;
    saves?: string;
    shares?: string;
    viralProbability?: string;
  };
  perScene?: Array<{ sceneNumber: number; score: number }>;
}

interface CompareVersionData {
  versionId: string;
  scenes: Array<{ sceneNumber: number; text: string }>;
  metrics: CompareMetrics;
  review: string;
}

interface CompareData {
  before: CompareVersionData;
  after: CompareVersionData;
  diff: {
    overallDelta: number;
    perScene: Array<{ sceneNumber: number; delta: number }>;
  };
}

interface ReanalyzeCompareModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function ReanalyzeCompareModal({ projectId, open, onClose }: ReanalyzeCompareModalProps) {
  const [selectedChoice, setSelectedChoice] = useState<'before' | 'after' | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch comparison data
  const { data, isLoading } = useQuery<{ success: boolean; data: CompareData }>({
    queryKey: ['/api/projects', projectId, 'reanalyze/compare'],
    enabled: open,
  });

  const compareData = data?.data;

  // Choose version mutation
  const chooseMutation = useMutation({
    mutationFn: async (choice: 'before' | 'after') => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/reanalyze/choose`, { choice });
      return response;
    },
    onSuccess: (_, choice) => {
      toast({
        title: "Версия сохранена",
        description: choice === 'before' ? "Сохранена версия ДО" : "Сохранена версия ПОСЛЕ",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditAgain = () => {
    if (!selectedChoice) {
      toast({
        title: "Выберите версию",
        description: "Сначала выберите какую версию сохранить",
        variant: "destructive",
      });
      return;
    }

    chooseMutation.mutate(selectedChoice, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleGoToVoiceover = () => {
    if (!selectedChoice) {
      toast({
        title: "Выберите версию",
        description: "Сначала выберите какую версию сохранить",
        variant: "destructive",
      });
      return;
    }

    chooseMutation.mutate(selectedChoice, {
      onSuccess: () => {
        onClose();
        setLocation(`/projects/${projectId}`);
        toast({
          title: "Переход к озвучке",
          description: "Версия сохранена, можно переходить к озвучке",
        });
      },
    });
  };

  const getDeltaBadge = (delta: number) => {
    if (delta > 0) {
      return (
        <Badge variant="default" className="bg-green-600 text-white">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{delta}
        </Badge>
      );
    } else if (delta < 0) {
      return (
        <Badge variant="destructive">
          <TrendingDown className="w-3 h-3 mr-1" />
          {delta}
        </Badge>
      );
    }
    return <Badge variant="secondary">0</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-teal-600 dark:text-teal-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка сравнения...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!compareData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl">Сравнение версий</DialogTitle>
        </DialogHeader>

        {/* Overall Score Summary */}
        <div className="px-6 py-4 bg-muted/30">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">До</div>
              <div className={`text-4xl font-bold ${getScoreColor(compareData.before.metrics.overallScore)}`}>
                {compareData.before.metrics.overallScore}
              </div>
            </div>
            
            <ArrowRight className="w-8 h-8 text-muted-foreground" />
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">После</div>
              <div className={`text-4xl font-bold ${getScoreColor(compareData.after.metrics.overallScore)}`}>
                {compareData.after.metrics.overallScore}
              </div>
            </div>

            <div className="ml-4">
              {getDeltaBadge(compareData.diff.overallDelta)}
            </div>
          </div>

          {/* Breakdown Metrics */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            {['hookScore', 'structureScore', 'emotionalScore', 'ctaScore'].map((key) => {
              const label = {
                hookScore: 'Хук',
                structureScore: 'Структура',
                emotionalScore: 'Эмоции',
                ctaScore: 'CTA'
              }[key];
              
              const beforeVal = compareData.before.metrics[key as keyof CompareMetrics] as number || 0;
              const afterVal = compareData.after.metrics[key as keyof CompareMetrics] as number || 0;
              const delta = afterVal - beforeVal;

              return (
                <div key={key} className="text-center p-2 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm">{beforeVal}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-semibold">{afterVal}</span>
                    <span className="text-xs">{getDeltaBadge(delta)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Comparison Content */}
        <ScrollArea className="flex-1 px-6">
          <div className="grid grid-cols-2 gap-6 pb-6">
            {/* Before Column */}
            <div>
              <Card className={`border-2 ${selectedChoice === 'before' ? 'border-primary' : 'border-border'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>До пересчета</CardTitle>
                    <Button
                      data-testid="button-choose-before"
                      variant={selectedChoice === 'before' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedChoice('before')}
                    >
                      {selectedChoice === 'before' && <Check className="w-4 h-4 mr-2" />}
                      Сохранить ДО
                    </Button>
                  </div>
                  <CardDescription>
                    Общая оценка: {compareData.before.metrics.overallScore}/100
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scenes */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Сцены</h4>
                    <Accordion type="single" collapsible className="w-full">
                      {compareData.before.scenes.map((scene) => (
                        <AccordionItem key={scene.sceneNumber} value={`before-${scene.sceneNumber}`}>
                          <AccordionTrigger className="text-sm">
                            Сцена {scene.sceneNumber}
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-muted-foreground">{scene.text}</p>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>

                  <Separator />

                  {/* Review */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Финальная рецензия</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                      {compareData.before.review}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* After Column */}
            <div>
              <Card className={`border-2 ${selectedChoice === 'after' ? 'border-primary' : 'border-border'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>После пересчета</CardTitle>
                    <Button
                      data-testid="button-choose-after"
                      variant={selectedChoice === 'after' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedChoice('after')}
                    >
                      {selectedChoice === 'after' && <Check className="w-4 h-4 mr-2" />}
                      Сохранить ПОСЛЕ
                    </Button>
                  </div>
                  <CardDescription>
                    Общая оценка: {compareData.after.metrics.overallScore}/100
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scenes with Deltas */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Сцены</h4>
                    <Accordion type="single" collapsible className="w-full">
                      {compareData.after.scenes.map((scene) => {
                        const sceneDiff = compareData.diff.perScene.find(s => s.sceneNumber === scene.sceneNumber);
                        return (
                          <AccordionItem key={scene.sceneNumber} value={`after-${scene.sceneNumber}`}>
                            <AccordionTrigger className="text-sm">
                              <div className="flex items-center gap-2">
                                <span>Сцена {scene.sceneNumber}</span>
                                {sceneDiff && getDeltaBadge(sceneDiff.delta)}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-sm text-muted-foreground">{scene.text}</p>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>

                  <Separator />

                  {/* Review */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Финальная рецензия</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                      {compareData.after.review}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex justify-between w-full">
            <Button
              data-testid="button-back-to-editing"
              variant="outline"
              onClick={handleEditAgain}
              disabled={!selectedChoice || chooseMutation.isPending}
            >
              Вернуться к редактированию
            </Button>
            <Button
              data-testid="button-go-to-voiceover"
              onClick={handleGoToVoiceover}
              disabled={!selectedChoice || chooseMutation.isPending}
            >
              Перейти к озвучке
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
