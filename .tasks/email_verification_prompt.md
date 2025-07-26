# 邮件验证功能开发指南

## 1. 功能概述

开发一个完整的邮件验证系统，用于用户注册流程。该系统将允许新用户注册账户，接收验证邮件，并通过验证链接或验证码确认其电子邮件地址的有效性，从而完成账户激活过程。

---

## 2. 技术背景

**项目架构**:
- 前端: React.js, Tailwind CSS
- 后端: Go
- 数据库: PostgreSQL
- 邮件服务: SMTP服务(可选用SendGrid, AWS SES等)

**现有系统**:
- 当前已实现基本用户注册但缺少邮件验证
- 用户认证使用JWT令牌
- 已有用户模型但需要扩展

---

## 3. 详细需求

### 3.1 用户流程

1. **注册阶段**:
   - 用户输入电子邮件、密码和其他必要信息
   - 提交表单后，系统创建未激活的用户账户
   - 系统生成唯一验证令牌和过期时间(默认24小时)
   - 系统发送包含验证链接的邮件到用户邮箱

2. **验证阶段**:
   - 用户点击邮件中的验证链接
   - 系统验证令牌的有效性和是否过期
   - 验证成功后，系统激活用户账户
   - 重定向用户到登录页面并显示成功消息

3. **例外处理**:
   - 验证链接过期 → 提供重新发送验证邮件的选项
   - 验证令牌无效 → 显示适当错误信息
   - 用户尝试使用未验证账户登录 → 提示验证邮箱并提供重发选项

### 3.2 数据库模型扩展

向`users`表添加以下字段:
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP;
```

### 3.3 API端点设计

1. **注册用户**: `POST /api/auth/register`
   - 请求体: 
     ```json
     {
       "email": "user@example.com",
       "password": "securepassword",
       "username": "username"
     }
     ```
   - 响应: 
     ```json
     {
       "message": "Registration successful. Please check your email for verification.",
       "user_id": "12345"
     }
     ```

2. **验证邮箱**: `GET /api/auth/verify-email/:token`
   - 参数: `token` (验证令牌)
   - 响应: 
     ```json
     {
       "message": "Email verified successfully. You can now login."
     }
     ```

3. **重发验证邮件**: `POST /api/auth/resend-verification`
   - 请求体: 
     ```json
     {
       "email": "user@example.com"
     }
     ```
   - 响应: 
     ```json
     {
       "message": "Verification email has been sent."
     }
     ```

4. **检查邮箱验证状态**: `GET /api/auth/email-verification-status`
   - 请求头: `Authorization: Bearer {jwt_token}`
   - 响应: 
     ```json
     {
       "verified": true|false
     }
     ```

### 3.4 邮件模板设计

**验证邮件模板**:
- 主题: "请验证您的句读账号"
- 包含: 
  - 欢迎消息
  - 验证按钮/链接(指向 `{base_url}/verify-email/{token}`)
  - 验证链接的替代文本
  - 验证码有效期说明
  - 如果用户未注册，可以忽略的说明
  - 公司徽标和联系方式

---

## 4. 技术实现指南

### 4.1 后端实现 (Go)

1. **验证令牌生成**:
   - 使用安全随机函数生成32-64位令牌
   - 创建URL安全的Base64编码
   - 设置24小时后的过期时间

2. **邮件发送服务**:
   - 创建邮件发送服务接口(`EmailService`)
   - 实现SMTP发送器
   - 支持HTML邮件模板和文本备用内容
   - 实现重试机制和失败日志

3. **验证处理器**:
   - 实现令牌验证逻辑
   - 处理过期令牌
   - 更新用户验证状态
   - 生成新令牌用于重发验证邮件

4. **安全考虑**:
   - 防止时序攻击(验证令牌比较)
   - 限流以防止滥用重发机制(每小时最多3次)
   - 验证前检查令牌是否已使用

### 4.2 前端实现 (React)

1. **注册表单扩展**:
   - 添加表单验证(邮箱格式)
   - 提交后显示"检查邮箱"指示
   - 显示重发验证邮件选项

2. **验证页面**:
   - 创建`/verify-email/:token`路由
   - 实现加载状态、成功和错误状态的UI
   - 验证成功后提供登录链接

3. **登录流程扩展**:
   - 检查邮箱验证状态
   - 对未验证用户显示适当提示
   - 提供重发验证邮件的选项

---

## 5. 测试场景

1. **单元测试**:
   - 验证令牌生成与验证
   - 邮件发送服务
   - 用户验证状态更新

2. **集成测试**:
   - 完整注册流程
   - 验证令牌流程
   - 重发邮件流程

3. **边缘案例**:
   - 过期令牌处理
   - 已验证用户点击验证链接
   - 多次重发请求
   - 非法令牌格式

---

## 6. 实现计划

1. **第1阶段**: 数据库模式更新和基本后端逻辑
   - 估计时间: 1天
   - 交付物: 数据库迁移和基本验证服务

2. **第2阶段**: 邮件发送服务和API端点实现
   - 估计时间: 1-2天
   - 交付物: 功能完整的后端API

3. **第3阶段**: 前端界面和交互
   - 估计时间: 1-2天
   - 交付物: 更新的注册流程和验证页面

4. **第4阶段**: 测试和优化
   - 估计时间: 1天
   - 交付物: 测试覆盖和最终调整

---

## 7. 安全和性能考虑

- 使用HTTPS确保所有通信安全
- 实现验证链接的一次性使用
- 防止电子邮件轰炸攻击
- 验证令牌应足够长且随机以防止暴力破解
- 邮件发送应异步进行以不阻塞用户注册流程
- 考虑使用队列系统处理大量邮件发送

---

## 8. 参考资源

- [OWASP Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Go Mail Package](https://pkg.go.dev/gopkg.in/mail.v2)
- [React Email Templates](https://react.email/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/)

---

## 9. 完成标准

邮件验证功能开发完成的标准:

1. 用户可以通过点击邮件中的链接验证其电子邮件
2. 未验证用户不能访问受限功能
3. 验证令牌安全生成并正确验证
4. 过期令牌处理机制完善
5. 重发验证邮件功能正常工作
6. 所有错误情况都有适当处理和用户反馈
7. 单元测试和集成测试覆盖核心功能
8. 性能测试显示在高负载下系统稳定 