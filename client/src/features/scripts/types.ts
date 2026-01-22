export type ScriptStatus = 'all' | 'draft' | 'analyzed' | 'ready' | 'in_production';

export interface Script {
  id: string;
  title: string;
  content: string;
  format: string;
  status: ScriptStatus;
  sourceType?: string;
  sourceId?: string;
  analysisData?: any;
  createdAt: string;
  updatedAt: string;
}
