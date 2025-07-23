# 任务: 第三阶段 - 核心学习逻辑与受保护的端点

## 1. 概述
本任务标志着“句读 (SentenCease)”项目开发的第三阶段。在现有用户认证系统的基础上，本阶段的核心目标是实现应用的核心学习循环功能。这涉及到将项目所需的数据表结构应用到数据库中，开发一个JWT认证中间件来保护用户的私有接口，并最终实现获取学习单词和更新学习进度的API端点。完成此阶段后，应用的核心后端逻辑将基本成型。

## 2. 第一部分：数据库模式迁移 (DevOps/DB)

### 目标
在PostgreSQL数据库中创建项目所需的`users`, `words`, `meanings`, 和 `user_progress`表。我们将使用项目已有的迁移文件来完成此操作。

### 实施清单
1.  **检查迁移文件**:
    -   确认 `backend/db/migrations/0001_initial_schema.sql` 文件的内容与项目设计文档 (`.tasks/2024-07-17_1_initial-setup.md`) 中定义的表结构一致。

2.  **应用数据库迁移**:
    -   由于我们没有集成自动化的迁移工具，需要手动将SQL文件的内容应用到数据库中。
    -   通过 `docker ps` 找到正在运行的 `postgres` 容器的名称或ID。
    -   使用以下命令将 `0001_initial_schema.sql` 文件的内容通过管道传送给容器内的 `psql` 客户端执行。请将 `[CONTAINER_NAME]` 替换为你的PostgreSQL容器名，并确保 `.env` 文件中的数据库用户 (`POSTGRES_USER`) 和数据库名 (`POSTGRES_DB`) 正确无误。
        ```bash
        cat backend/db/migrations/0001_initial_schema.sql | docker exec -i [CONTAINER_NAME] psql -U [POSTGRES_USER] -d [POSTGRES_DB]
        ```

3.  **验证表结构**:
    -   执行完上述命令后，连接到数据库并检查所有表是否已成功创建。
        ```bash
        docker exec -it [CONTAINER_NAME] psql -U [POSTGRES_USER] -d [POSTGRES_DB]
        # 在 psql 命令行中，输入 \dt 来列出所有表
        ```

## 3. 第二部分：JWT认证中间件 (后端Go)

### 目标
开发一个Gin中间件，用于验证HTTP请求头中的JWT。这个中间件将用于保护所有需要用户登录才能访问的API端点，确保数据的私密性和安全性。

### 实施清单
1.  **创建 `internal/api/middleware.go` 文件**:
    -   在该文件中，创建一个名为 `AuthMiddleware` 的函数，它返回一个 `gin.HandlerFunc`。
    -   此函数接收 `JWTSecretKey` 作为参数。

2.  **实现中间件逻辑**:
    -   从 `Authorization` 请求头中提取 `Bearer` token。
    -   如果请求头不存在或格式不正确，返回 `401 Unauthorized` 错误。
    -   调用 `auth.ValidateJWT()` (你可能需要在 `internal/auth/auth.go` 中创建这个函数) 来验证token的有效性。
    -   如果token无效或已过期，返回 `401 Unauthorized` 错误。
    -   如果token有效，从token的声明(claims)中提取用户ID (`userID`)。
    -   使用 `c.Set("userID", userID)` 将用户ID存储在Gin的上下文中，以便后续的处理器函数可以获取并使用。
    -   调用 `c.Next()` 将请求传递给下一个处理器。

3.  **创建 `auth.ValidateJWT()` 函数**:
    -   在 `internal/auth/auth.go` 文件中，添加一个函数 `ValidateJWT(tokenString, secretKey string) (*Claims, error)`。
    -   这个函数负责解析并验证JWT，如果验证成功，则返回JWT的声明(claims)。

## 4. 第三部分：核心学习API实现 (后端Go)

### 目标
开发 `/api/learn/next` 和 `/api/learn/review` 这两个核心API端点，它们将由刚刚创建的JWT中间件保护。

### 实施清单
1.  **实现间隔重复算法 (`internal/srs/srs.go`)**:
    -   创建一个 `GetNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*models.Meaning, error)` 函数。此函数应查询 `user_progress` 表，为指定用户找到 `next_review_at` 时间最早的词义，并返回其详细信息。如果用户没有待复习的单词，可以返回一个新词。
    -   创建一个 `UpdateProgress(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, meaningID int, userChoice string) error` 函数。根据用户的选择 (`"认识"`, `"模糊"`, `"不认识"`)，此函数将更新 `user_progress` 表中的 `srs_stage`, `last_reviewed_at`，并计算下一次的 `next_review_at`。

2.  **实现API处理器 (`internal/api/handlers.go`)**:
    -   创建 `GetNextWord(c *gin.Context)` 处理器:
        -   从Gin上下文中获取 `userID` (`c.MustGet("userID")`)。
        -   调用 `srs.GetNextWordForReview()` 获取下一个单词。
        -   以项目设计文档中指定的JSON格式返回单词信息。
    -   创建 `ReviewWord(c *gin.Context)` 处理器:
        -   从上下文中获取 `userID`。
        -   从请求体中绑定 `meaningId` 和 `userChoice`。
        -   调用 `srs.UpdateProgress()` 更新学习进度。
        -   返回一个成功的消息。

3.  **在服务器中注册受保护的路由 (`cmd/server/main.go`)**:
    -   创建一个新的路由组: `learnRoutes := v1.Group("/learn")`。
    -   对这个路由组应用 `AuthMiddleware`: `learnRoutes.Use(api.AuthMiddleware(cfg.JWTSecretKey))`。
    -   在该路由组下注册新的API端点:
        -   `learnRoutes.GET("/next", apiHandler.GetNextWord)`
        -   `learnRoutes.POST("/review", apiHandler.ReviewWord)`

## 5. 第四部分：填充种子数据 (可选但强烈推荐)

### 目标
向 `words` 和 `meanings` 表中添加一些初始数据，以便在开发和测试期间能够方便地使用核心学习API。

### 实施清单
1.  **创建种子数据SQL脚本**:
    -   在 `backend/db/migrations` 目录下创建一个新的SQL文件，例如 `0002_seed_initial_words.sql`。
    -   在该文件中编写 `INSERT INTO` 语句，添加几个单词及其对应的词义和例句。
2.  **应用种子数据**:
    -   使用与第二部分中相同的 `docker exec ... psql` 命令来应用这个新的SQL脚本。
---
这个阶段性计划为下一步的开发提供了清晰的路线图，请按此执行。 