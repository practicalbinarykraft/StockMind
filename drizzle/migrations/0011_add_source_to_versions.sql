-- Добавляем поле source в auto_script_versions
ALTER TABLE auto_script_versions 
ADD COLUMN source VARCHAR(20) DEFAULT 'conveyor';

-- Обновляем существующие записи
UPDATE auto_script_versions 
SET source = CASE 
  WHEN feedback_text IS NOT NULL AND feedback_text != '' THEN 'draft'
  ELSE 'conveyor'
END;

-- Создаем индекс
CREATE INDEX auto_script_versions_source_idx 
ON auto_script_versions(auto_script_id, source);
