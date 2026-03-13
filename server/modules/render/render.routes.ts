import type { Express } from 'express';
import { handleRender, handleDownload } from './render.controller';
import { requireAuth } from '../../middleware/jwt-auth';

export function registerRenderRoutes(app: Express) {
  // Render a final reel video from project assets
  app.post('/api/render', requireAuth, handleRender);

  // Download a rendered video
  app.get('/api/render/download/:filename', requireAuth, handleDownload);
}
