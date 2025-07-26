# 句读项目服务器部署方案 - AI开发提示

## 项目背景

句读（SentenCease）是一个英语词汇学习应用，目前需要配置生产环境部署，以便让用户通过网络访问，特别是移动设备访问。

项目技术栈：
- 前端：React、Vite、TailwindCSS
- 后端：Go（Gin框架）
- 数据库：PostgreSQL
- 容器化：Docker和Docker Compose

## 当前部署配置

目前的docker-compose.yml配置：

```yaml
services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=sentencease
    ports:
      - "5432:5432"
    volumes:
      - ./.postgres-data:/var/lib/postgresql/data
      - ./backend/db/migrations:/docker-entrypoint-initdb.d

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://user:password@postgres:5432/sentencease?sslmode=disable
      - JWT_SECRET_KEY=supersecretjwtkey
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.frontend
      args:
        VITE_API_URL: http://localhost:8080/api/v1
    ports:
      - "5173:80"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend 
```

## 目标

创建安全、可靠、可扩展的生产环境部署配置，满足以下要求：
1. 通过HTTPS提供安全访问
2. 实现域名配置
3. 配置自动备份
4. 强化安全性
5. 提供监控和日志记录
6. 支持CI/CD流程

## 实施任务

### 1. 优化Docker配置

需要更新的内容：
- 使用环境变量替代硬编码的敏感信息
- 调整容器安全配置
- 配置数据库备份策略
- 优化容器资源分配

### 2. 设置Nginx反向代理

需要创建的配置：
- HTTPS配置
- 域名路由
- 静态资源缓存策略
- 安全相关HTTP头

### 3. SSL证书配置

实现事项：
- 使用Let's Encrypt获取免费SSL证书
- 配置证书自动续期
- 实现HTTPS重定向

### 4. 数据库优化

安全加固和性能优化：
- 数据库用户权限管理
- 配置定期备份策略
- 添加适当索引提升性能

### 5. 后端API安全加固

安全增强措施：
- 移除调试路由
- 配置适当的CORS策略
- 实现请求速率限制
- 加强JWT配置安全性

## 技术要求

- 部署方案应适用于主流云服务提供商（AWS、阿里云、腾讯云等）
- 配置文件应使用环境变量而非硬编码敏感信息
- 应包含备份和恢复策略
- 提供基本的监控方案
- 符合网络安全最佳实践

## 交付物

1. 更新的docker-compose.yml文件
2. Nginx配置文件
3. SSL证书配置脚本
4. 环境变量模板(.env.example)
5. 数据库备份脚本
6. 详细的部署步骤文档

## 服务器需求规格

推荐的最低服务器配置：
- CPU: 2核心
- 内存: 4GB RAM
- 磁盘: 40GB SSD
- 操作系统: Ubuntu 20.04/22.04 LTS

## 实施步骤建议

请提供详细的部署实施步骤，包括：
1. 服务器初始化配置
2. Docker环境设置
3. 应用部署流程
4. SSL证书获取和配置
5. 数据库初始化和迁移
6. 系统验证和测试步骤

请包含所有必要的命令、配置文件和脚本，以及适当的说明和注释。 