import { Router } from 'express';
import newsRoutes from './news.routes';
import sourcesRoutes from './sources.routes';
import scriptsRoutes from './scripts.routes';
import generationRoutes from './generation.routes';
import settingsRoutes from './settings.routes';

const router = Router();

// Подключаем все роуты
router.use('/news', newsRoutes);
router.use('/sources', sourcesRoutes);
router.use('/scripts', scriptsRoutes);
router.use('/generation', generationRoutes);
router.use('/settings', settingsRoutes);

export default router;
