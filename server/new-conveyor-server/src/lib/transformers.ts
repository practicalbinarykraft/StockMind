import { Script, Iteration, ScriptVersion, Review } from '../db/schema';

// Типы для фронтенда (соответствуют src/types/index.ts)
export interface NewsScript {
  id: string;
  newsTitle: string;
  newsSource: string;
  status: 'pending' | 'in_progress' | 'completed' | 'human_review';
  currentIteration: number;
  maxIterations: number;
  iterations: FrontendIteration[];
  createdAt: Date;
}

export interface FrontendIteration {
  id: string;
  version: number;
  script: FrontendScriptVersion;
  review: FrontendReview | null;
  createdAt: Date;
}

export interface FrontendScriptVersion {
  id: string;
  scenes: FrontendScriptScene[];
  generatedAt: Date;
  status: 'draft' | 'sent_for_review';
}

export interface FrontendScriptScene {
  id: string;
  number: number;
  text: string;
  visual: string;
  duration: number;
  changes?: SceneChanges;
}

export interface FrontendReview {
  id: string;
  overallScore: number;
  overallComment: string;
  sceneComments: FrontendSceneComment[];
  createdAt: Date;
}

export interface FrontendSceneComment {
  sceneId: string;
  sceneNumber: number;
  comments: FrontendReviewComment[];
}

export interface FrontendReviewComment {
  id: string;
  type: 'positive' | 'negative' | 'suggestion' | 'info';
  text: string;
}

export interface SceneChanges {
  added: string[];
  removed: string[];
  modified: boolean;
}

/**
 * Трансформация скрипта из формата БД в формат фронтенда
 */
export function transformScriptForFrontend(
  dbScript: Script & {
    iterations: Array<Iteration & {
      scriptVersion?: ScriptVersion | null;
      review?: Review | null;
    }>;
  }
): NewsScript {
  return {
    id: dbScript.id,
    newsTitle: dbScript.newsTitle || '',
    newsSource: dbScript.newsSource || '',
    status: dbScript.status as 'pending' | 'in_progress' | 'completed' | 'human_review',
    currentIteration: dbScript.currentIteration || 0,
    maxIterations: dbScript.maxIterations || 3,
    iterations: dbScript.iterations.map((iter) => transformIterationForFrontend(iter)),
    createdAt: dbScript.createdAt || new Date(),
  };
}

/**
 * Трансформация итерации из формата БД в формат фронтенда
 */
export function transformIterationForFrontend(
  dbIteration: Iteration & {
    scriptVersion?: ScriptVersion | null;
    review?: Review | null;
    previousScriptVersion?: ScriptVersion | null; // Для вычисления changes
  }
): FrontendIteration {
  const scriptVersion = dbIteration.scriptVersion;
  const review = dbIteration.review;

  // Вычисляем changes если есть предыдущая версия
  let scenes: FrontendScriptScene[] = [];
  if (scriptVersion) {
    const previousScenes = dbIteration.previousScriptVersion?.scenes || [];
    const currentScenes = (scriptVersion.scenes as any[]) || [];
    
      scenes = currentScenes.map((scene, index) => {
      // Находим предыдущую сцену с таким же номером
      const previousScene = previousScenes.find((ps: any) => ps.number === scene.number);
      const changes = calculateSceneChanges(scene, previousScene);
      
      // Добавляем changes только если есть изменения
      const hasChanges = changes.added.length > 0 || changes.removed.length > 0 || changes.modified;
      
      return {
        id: `${scriptVersion.id}-scene-${scene.number}`,
        number: scene.number,
        text: scene.text || '',
        visual: scene.visual || '',
        duration: scene.duration || 0,
        changes: hasChanges ? changes : undefined,
      };
    });
  }

  return {
    id: dbIteration.id,
    version: dbIteration.version,
    script: scriptVersion
      ? {
          id: scriptVersion.id,
          scenes,
          generatedAt: scriptVersion.generatedAt || new Date(),
          status: review ? 'sent_for_review' : 'draft',
        }
      : {
          id: '',
          scenes: [],
          generatedAt: dbIteration.createdAt || new Date(),
          status: 'draft',
        },
    review: review
      ? {
          id: review.id,
          overallScore: review.overallScore || 0,
          overallComment: review.overallComment || '',
          sceneComments: transformSceneComments(review.sceneComments as any, scriptVersion?.id || ''),
          createdAt: review.createdAt || new Date(),
        }
      : null,
    createdAt: dbIteration.createdAt || new Date(),
  };
}

/**
 * Трансформация комментариев к сценам
 */
function transformSceneComments(
  sceneComments: any,
  scriptVersionId: string
): FrontendSceneComment[] {
  if (!Array.isArray(sceneComments)) {
    return [];
  }

  return sceneComments.map((comment: any) => ({
    sceneId: `${scriptVersionId}-scene-${comment.sceneNumber}`,
    sceneNumber: comment.sceneNumber || 0,
    comments: Array.isArray(comment.comments)
      ? comment.comments.map((c: any, index: number) => ({
          id: c.id || `${comment.sceneNumber}-comment-${index}`,
          type: c.type || 'info',
          text: c.text || '',
        }))
      : [],
  }));
}

/**
 * Вычисление изменений между сценами (для diff)
 * Формат: { added: string[], removed: string[], modified: boolean }
 */
export function calculateSceneChanges(
  currentScene: any,
  previousScene: any | undefined
): SceneChanges {
  // Если предыдущей сцены нет - это новая сцена
  if (!previousScene) {
    return {
      added: ['text', 'visual', 'duration'],
      removed: [],
      modified: false,
    };
  }

  // Если текущей сцены нет - сцена удалена
  if (!currentScene) {
    return {
      added: [],
      removed: ['text', 'visual', 'duration'],
      modified: false,
    };
  }

  // Сравниваем поля сцены
  const added: string[] = [];
  const removed: string[] = [];
  let modified = false;

  // Проверяем изменения в тексте
  if (currentScene.text !== previousScene.text) {
    if (currentScene.text && !previousScene.text) {
      added.push('text');
    } else if (!currentScene.text && previousScene.text) {
      removed.push('text');
    } else {
      modified = true;
    }
  }

  // Проверяем изменения в визуале
  if (currentScene.visual !== previousScene.visual) {
    if (currentScene.visual && !previousScene.visual) {
      added.push('visual');
    } else if (!currentScene.visual && previousScene.visual) {
      removed.push('visual');
    } else {
      modified = true;
    }
  }

  // Проверяем изменения в длительности
  if (currentScene.duration !== previousScene.duration) {
    modified = true;
  }

  return {
    added,
    removed,
    modified,
  };
}

/**
 * Трансформация данных из формата БД в формат для GET /api/scripts/:id
 */
export function transformScriptResponse(
  script: Script,
  iterations: Array<{
    iteration: Iteration;
    scriptVersion?: ScriptVersion | null;
    review?: Review | null;
    previousScriptVersion?: ScriptVersion | null;
  }>
): NewsScript {
  // Сортируем итерации по версии
  const sortedIterations = iterations
    .map((item) => {
      return transformIterationForFrontend({
        ...item.iteration,
        scriptVersion: item.scriptVersion || null,
        review: item.review || null,
        previousScriptVersion: item.previousScriptVersion || null,
      });
    })
    .sort((a, b) => a.version - b.version);

  return {
    id: script.id,
    newsTitle: script.newsTitle || '',
    newsSource: script.newsSource || '',
    status: script.status as 'pending' | 'in_progress' | 'completed' | 'human_review',
    currentIteration: script.currentIteration || 0,
    maxIterations: script.maxIterations || 3,
    iterations: sortedIterations,
    createdAt: script.createdAt || new Date(),
  };
}
