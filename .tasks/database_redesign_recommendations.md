 # 句读系统数据库重构建议

## 1. 当前数据库设计分析

经过对现有数据库结构的分析，发现当前设计存在以下几个问题：

### 1.1 数据模型的不足

1. **数据冗余与一致性问题**：
   - 单词难度（difficulty）同时存在于words和meanings表中，可能导致数据不一致
   - unit信息被添加到meanings表，但单词单元应该是来源相关的特性，而非特定于某个词义
   - Meaning结构中包含了不属于数据库字段的Lemma，表明数据模型与API模型混合使用

2. **实体关系设计混乱**：
   - daily_plan_words表和后来添加的daily_plan_items表功能重复，造成数据冗余
   - 核心实体（单词、用户）与派生实体（学习计划、进度）之间的关系不清晰

3. **日期和时间处理不统一**：
   - 同时使用TIMESTAMPTZ和TIMESTAMP WITH TIME ZONE两种类型
   - 用户进度的时间跟踪分散在多个字段中

### 1.2 可扩展性问题

1. **缺乏课程和教材体系结构**：
   - 当前仅有source和unit概念，无法支持更复杂的学习内容组织
   - 无法灵活添加新的词汇来源和分类系统

2. **用户数据不完整**：
   - 用户表过于简单，缺乏必要的个人信息和设置
   - 没有角色和权限管理

3. **SRS算法耦合到数据库**：
   - SSP-MMC算法的参数直接嵌入到数据模型中，难以切换或优化算法

### 1.3 性能和可维护性问题

1. **缺乏必要索引**：
   - 只有source字段有索引，其他常用查询字段缺乏索引

2. **数据迁移混乱**：
   - 迁移文件中包含了业务逻辑和数据修改的混合
   - 缺乏版本控制和回滚机制

3. **查询复杂度高**：
   - 获取单词及其词义需要多级JOIN，影响性能
   - 用户进度计算逻辑过于复杂

## 2. 重构建议

### 2.1 核心数据模型优化

#### 用户模型增强
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- 用户设置表
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_word_goal INT DEFAULT 20,
    srs_algorithm VARCHAR(50) DEFAULT 'sspmmc',
    interface_language VARCHAR(10) DEFAULT 'zh_CN',
    notification_enabled BOOLEAN DEFAULT TRUE,
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 词汇体系重构
```sql
-- 词汇来源表
CREATE TABLE vocabulary_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    level VARCHAR(50), -- 如'初级'，'中级'，'高级'
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 章节/单元表
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    source_id INT REFERENCES vocabulary_sources(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sequence_number INT NOT NULL, -- 用于排序
    description TEXT,
    UNIQUE(source_id, name),
    UNIQUE(source_id, sequence_number)
);

-- 词汇表重构
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    lemma VARCHAR(100) NOT NULL,
    phonetic VARCHAR(100), -- 增加音标字段
    audio_url VARCHAR(255), -- 增加发音音频URL
    difficulty FLOAT DEFAULT 0.5,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 词义表重构
CREATE TABLE meanings (
    id SERIAL PRIMARY KEY,
    word_id INT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    part_of_speech VARCHAR(50),
    definition TEXT NOT NULL,
    translation TEXT, -- 定义的翻译
    example_sentence TEXT,
    example_translation TEXT,
    difficulty FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 单词-单元关联表（多对多）
CREATE TABLE word_unit_mappings (
    word_id INT REFERENCES words(id) ON DELETE CASCADE,
    unit_id INT REFERENCES units(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL, -- 在单元中的顺序
    PRIMARY KEY (word_id, unit_id)
);
```

#### 学习进度系统重构
```sql
-- 用户学习计划表
CREATE TABLE learning_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id INT REFERENCES vocabulary_sources(id),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    target_words_per_day INT DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 计划内容表
CREATE TABLE plan_items (
    id SERIAL PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    word_id INT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed
    UNIQUE (plan_id, word_id)
);

-- 学习进度表（更清晰的设计）
CREATE TABLE learning_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id INT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    meaning_id INT REFERENCES meanings(id) ON DELETE SET NULL,
    srs_stage INT NOT NULL DEFAULT 0,
    memory_factor FLOAT DEFAULT 2.5, -- SM-2算法参数
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reviewed_at TIMESTAMPTZ,
    review_count INT DEFAULT 0,
    correct_streak INT DEFAULT 0,
    algorithm_data JSONB DEFAULT '{}'::jsonb, -- 存储算法特定数据
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, word_id, meaning_id)
);

-- 复习历史表
CREATE TABLE review_history (
    id SERIAL PRIMARY KEY,
    progress_id INT NOT NULL REFERENCES learning_progress(id) ON DELETE CASCADE,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    response VARCHAR(50) NOT NULL, -- 认识、模糊、不认识
    response_time_ms INT, -- 响应时间（毫秒）
    previous_srs_stage INT NOT NULL,
    new_srs_stage INT NOT NULL,
    algorithm_data JSONB DEFAULT '{}'::jsonb -- 算法特定数据
);

-- 日学习记录表
CREATE TABLE daily_study_records (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    study_date DATE NOT NULL DEFAULT CURRENT_DATE,
    words_reviewed INT DEFAULT 0,
    new_words_learned INT DEFAULT 0,
    words_mastered INT DEFAULT 0,
    study_time_minutes INT DEFAULT 0,
    UNIQUE (user_id, study_date)
);
```

### 2.2 索引优化

```sql
-- 词汇查询索引
CREATE INDEX idx_words_lemma ON words(lemma);
CREATE INDEX idx_meanings_word_id ON meanings(word_id);
CREATE INDEX idx_word_unit_mappings_unit_id ON word_unit_mappings(unit_id);
CREATE INDEX idx_word_unit_mappings_word_id ON word_unit_mappings(word_id);

-- 用户进度索引
CREATE INDEX idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX idx_learning_progress_next_review ON learning_progress(user_id, next_review_at);
CREATE INDEX idx_review_history_progress_id ON review_history(progress_id);
CREATE INDEX idx_review_history_reviewed_at ON review_history(reviewed_at);

-- 学习计划索引
CREATE INDEX idx_learning_plans_user_id ON learning_plans(user_id);
CREATE INDEX idx_plan_items_plan_id ON plan_items(plan_id);
CREATE INDEX idx_plan_items_word_id ON plan_items(word_id);
```

### 2.3 视图和函数

```sql
-- 用户当日学习视图
CREATE OR REPLACE VIEW user_daily_review_queue AS
SELECT 
    lp.id AS progress_id,
    lp.user_id,
    w.id AS word_id,
    w.lemma,
    m.id AS meaning_id,
    m.definition,
    m.part_of_speech,
    lp.srs_stage,
    lp.next_review_at
FROM learning_progress lp
JOIN words w ON lp.word_id = w.id
LEFT JOIN meanings m ON lp.meaning_id = m.id
WHERE lp.next_review_at <= now()
ORDER BY lp.next_review_at ASC;

-- 用户词汇掌握度计算函数
CREATE OR REPLACE FUNCTION calculate_user_mastery(user_id UUID)
RETURNS TABLE (
    total_words BIGINT,
    started_words BIGINT,
    mastered_words BIGINT,
    mastery_percentage FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(DISTINCT pi.word_id) AS total,
            COUNT(DISTINCT lp.word_id) AS started,
            COUNT(DISTINCT CASE WHEN lp.srs_stage >= 5 THEN lp.word_id END) AS mastered
        FROM plan_items pi
        LEFT JOIN learning_plans p ON pi.plan_id = p.id
        LEFT JOIN learning_progress lp ON lp.user_id = p.user_id AND lp.word_id = pi.word_id
        WHERE p.user_id = $1 AND p.is_active = TRUE
    )
    SELECT
        stats.total,
        stats.started,
        stats.mastered,
        CASE WHEN stats.total > 0 THEN stats.mastered::FLOAT / stats.total * 100 ELSE 0 END
    FROM stats;
END;
$$ LANGUAGE plpgsql;
```

## 3. 数据迁移策略

### 3.1 迁移步骤

1. **数据库备份**
```bash
pg_dump -U postgres -d sentencease > sentencease_backup_$(date +%Y%m%d).sql
```

2. **分阶段迁移**
   - 创建新表结构但保留旧表
   - 编写数据转换脚本
   - 验证数据完整性
   - 切换到新表结构
   - 根据观察调整

3. **回滚机制**
   - 为每个迁移创建对应的回滚脚本
   - 实现版本控制系统

### 3.2 实施计划

1. **前期准备** (1-2天)
   - 确认新设计
   - 创建测试数据库
   - 编写迁移脚本

2. **开发环境迁移** (1天)
   - 执行迁移
   - 调整应用代码
   - 进行测试

3. **生产环境迁移** (1天)
   - 选择低峰时段
   - 执行带监控的迁移
   - 切换系统并验证

## 4. 结语

当前数据库设计随着功能添加变得越来越复杂且不一致。通过本文提出的重构建议，我们可以建立一个更加清晰、灵活且可扩展的数据库结构，为未来功能开发打下坚实基础。重构过程虽然需要投入一定的时间和精力，但长期来看将大大降低维护成本和bug出现的可能性，提高系统整体性能和用户体验。