# Context
File name: 2024-07-17_1_initial-setup.md
Created at: 2024-07-17_10:00:00
Created by: user
Main branch: main
Task Branch: task/senten-cease-initial-setup_2024-07-17_1
Yolo Mode: Off

# Task Description
开发一个名为“句读 (SentenCease)”的语境化背单词Web应用。这个应用的核心理念是通过包含目标单词的完整句子来学习词汇，而不是孤立地记单词和释义。

项目将采用前后端分离架构：
- 后端：使用 Go (Golang) 语言开发，负责所有业务逻辑和API接口。
- 前端：使用 React 框架开发，负责用户界面和交互。

所有用户数据和学习进度都需要通过后端服务进行中心化管理，以实现多设备间的无缝同步。

## 核心功能
- **用户认证系统**：用户可以通过邮箱和密码进行注册与登录。后端使用 JWT (JSON Web Tokens) 进行会话管理和API保护。
- **语境化学习界面**：应用主界面展示一个包含高亮目标词的句子。
- **间隔重复系统 (SRS - Spaced Repetition System)**：用户在看完句子后，通过点击三个按钮（“认识”、“模糊”、“不认识”）进行自我评估。这个选择将用于更新用户对该词的学习进度，并由后端SRS算法决定下一次复习的时间。
- **一词多义处理**：同一个单词（如"run"）的不同词义，将被视为独立的学习项，每个词义都配有专属的例句。
- **学习进度云同步**：用户的全部学习记录（如单词掌握状态、复习阶段、下次复习日期等）都存储在后端的PostgreSQL数据库中，保证在任何设备登录后数据一致。

## 技术栈
- **后端**：Go (推荐使用 Gin 或 Echo 框架处理Web路由)
- **前端**：React (推荐使用 Vite 或 Create React App 初始化项目)
- **数据库**：PostgreSQL
- **用户认证方案**：JWT (JSON Web Tokens)

## 后端API设计 (Go)
所有需要用户登录才能访问的接口，都必须进行JWT校验。

- **POST /api/auth/register**
  - 请求体: `{ "email": "...", "password": "..." }`
  - 成功响应: `{ "message": "注册成功" }`

- **POST /api/auth/login**
  - 请求体: `{ "email": "...", "password": "..." }`
  - 成功响应: `{ "token": "一长串JWT字符串" }`

- **GET /api/learn/next** (需认证)
  - 功能: 为当前登录用户获取下一个应复习的单词（基于SRS算法）。
  - 成功响应: `{ "meaningId": 123, "lemma": "run", "definition": "to manage or control something", "exampleSentence": "She runs a small business from home." }`

- **POST /api/learn/review** (需认证)
  - 请求体: `{ "meaningId": 123, "userChoice": "认识" | "模糊" | "不认识" }`
  - 功能: 根据用户的选择，更新其在该词义上的学习进度。
  - 成功响应: `{ "message": "学习进度已更新" }`

## 数据库表结构设计 (PostgreSQL)

- **users (用户表):**
  ```sql
  CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- **words (单词表):**
  ```sql
  CREATE TABLE words (
      id SERIAL PRIMARY KEY,
      lemma VARCHAR(100) UNIQUE NOT NULL -- 单词的原型, e.g., "run"
  );
  ```

- **meanings (词义表):**
  ```sql
  CREATE TABLE meanings (
      id SERIAL PRIMARY KEY,
      word_id INT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      part_of_speech VARCHAR(50),
      definition TEXT NOT NULL,
      example_sentence TEXT NOT NULL,
      example_sentence_translation TEXT,
      UNIQUE(word_id, definition) -- 确保一个单词下不会有重复的词义
  );
  ```

- **user_progress (用户学习进度表):**
  ```sql
  CREATE TABLE user_progress (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      meaning_id INT NOT NULL REFERENCES meanings(id) ON DELETE CASCADE,
      srs_stage INT NOT NULL DEFAULT 0, -- SRS阶段，例如 0=新词, 1, 2, 3...
      last_reviewed_at TIMESTAMPTZ,
      next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- 下次复习时间
      PRIMARY KEY (user_id, meaning_id) -- 联合主键，确保一个用户对一个词义只有一条进度记录
  );
  ```

# Project Overview
本项目是一个名为“句读 (SentenCease)”的全栈Web应用，旨在通过语境化学习和间隔重复系统 (SRS) 帮助用户高效记忆单词。项目采用Go语言开发后端API，React开发前端界面，并使用PostgreSQL存储所有用户数据和学习进度。

⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️
[This section should contain a summary of the core RIPER-5 protocol rules, ensuring they can be referenced throughout execution]
⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️

# Analysis
[Code investigation results]

# Proposed Solution
[Action plan]

# Current execution step: "2. Populate the task file"

# Task Progress
[Change history with timestamps]

# Final Review:
[Post-completion summary]
