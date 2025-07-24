-- 添加SSP-MMC算法所需的字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS difficulty FLOAT DEFAULT 0.5;

ALTER TABLE meanings ADD COLUMN IF NOT EXISTS difficulty FLOAT DEFAULT 0.5;

-- 添加用户进度表中的SSP-MMC相关字段
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS review_history JSONB DEFAULT '[]';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS recall_history JSONB DEFAULT '[]';
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS memory_halflife FLOAT DEFAULT 4.0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS optimal_interval FLOAT DEFAULT 4.0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS last_recall_success BOOLEAN DEFAULT FALSE;

-- 添加算法类型设置表
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加默认的SRS算法设置
INSERT INTO app_settings (key, value, description)
VALUES 
('srs_algorithm', 'sspmmc', 'The spaced repetition algorithm used by the system')
ON CONFLICT (key) DO UPDATE SET value = 'sspmmc'; 