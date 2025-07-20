CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users table to store user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    lemma VARCHAR(100) UNIQUE NOT NULL -- 单词的原型, e.g., "run"
);

CREATE TABLE meanings (
    id SERIAL PRIMARY KEY,
    word_id INT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    part_of_speech VARCHAR(50),
    definition TEXT NOT NULL,
    example_sentence TEXT NOT NULL,
    example_sentence_translation TEXT,
    UNIQUE(word_id, definition) -- 确保一个单词下不会有重复的词义
);

CREATE TABLE user_progress (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meaning_id INT NOT NULL REFERENCES meanings(id) ON DELETE CASCADE,
    srs_stage INT NOT NULL DEFAULT 0, -- SRS阶段，例如 0=新词, 1, 2, 3...
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- 下次复习时间
    PRIMARY KEY (user_id, meaning_id) -- 联合主键，确保一个用户对一个词义只有一条进度记录
); 