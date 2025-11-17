# VotePancake - WAN Governance Platform

## Overview
VotePancake is a governance platform for the WAN Ecosystem, allowing users to vote on proposals and participate in ecosystem decision-making. The project was imported from GitHub and configured to run in the Replit environment on November 14, 2025.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **UI Components**: Radix UI primitives + shadcn/ui
- **State Management**: TanStack Query
- **Authentication**: Passport.js with local strategy
- **Session Store**: PostgreSQL-backed sessions

## Project Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── lib/          # Utilities and React Query client
│   │   └── hooks/        # Custom React hooks
│   └── public/           # Static assets
├── server/               # Backend Express server
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Data access layer
│   └── vite.ts           # Vite middleware
├── shared/               # Shared TypeScript types
│   └── schema.ts         # Drizzle ORM schema
└── migrations/           # Database migrations (auto-generated)
```

## Database Schema
The application uses PostgreSQL with the following tables:
- **users**: User accounts with XP and WAN balances
- **proposals**: Governance proposals with voting periods
- **votes**: User votes on proposals
- **partner_supports**: Partner support for proposals
- **system_params**: System configuration parameters
- **session**: Express session storage

## Development
The project runs a full-stack server on port 5000 that serves both the API and the Vite dev server in development mode.

### Available Scripts
- `npm run dev` - Start development server (port 5000)
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run db:push` - Push database schema changes
- `npm run check` - TypeScript type checking

## Configuration
- **Vite**: Configured to allow all hosts (required for Replit proxy)
- **Server**: Binds to 0.0.0.0:5000 for both dev and production
- **Database**: Uses DATABASE_URL environment variable (auto-provisioned by Replit)
- **Sessions**: Stored in PostgreSQL for persistence

## Replit-Specific Setup
1. Vite dev server configured with HMR clientPort 443 for Replit's proxy
2. Server configured to accept requests from any host
3. PostgreSQL database auto-provisioned via Replit integration
4. Workflow configured to run `npm run dev` with webview on port 5000

## Recent Changes (Nov 14, 2025)
### Initial Setup
- Initial import from GitHub
- Configured Vite to allow all hosts for Replit environment
- Set up PostgreSQL database integration
- Pushed database schema using Drizzle
- Configured development workflow
- Verified application is running successfully

### Feature Enhancements
- **联系方式验证**: 提案创建时要求至少填写一个联系方式（邮箱/Telegram/Discord）
  - 前端使用 Zod schema refinement 验证
  - 后端使用 trim() 和非空检查确保数据完整性
  
- **资金请求优化**: 引入 fundingRequested 字段替代原有的 fundingAmount
  - 明确区分用户请求的资金金额和基础资金限额
  - 当请求金额超过基础限额时，Partner 可以追加资金支持
  
- **Partner 追加资金逻辑**: 
  - Partner 只能查看和支持需要追加资金的提案（fundingRequested > stakeAmount × multiplier）
  - GET /api/partner/available-proposals 和 POST /api/proposals/:id/support 使用一致的验证逻辑
  - 显示资金缺口（fundingGap）帮助 Partner 了解需要追加的金额

- **管理员用户**: 通过 seed 脚本确保默认存在 admin/admin123 管理员账户

- **提案公示功能**: 完整的提案融资工作流
  - 添加 "publicized" 状态，用于管理员公示资金不足的提案
  - 引入 fundingDeadline 字段，标记 2 周募资截止日期
  - Partner 可以对已公示提案追加资金支持（仅限 publicized 状态）
  - 自动状态转换：截止日期后，达标进入 active 投票，否则 closed
  - 重复支持时更新余额而非报错，达标立即转为 active

- **乘数计算修复**: 
  - 所有资金计算统一从系统参数读取 lockMultiplier/burnMultiplier
  - 确保前后端一致性，允许管理员动态配置
  - 修复前端/后端各处硬编码的乘数值

- **性能优化**: 
  - 实现批量查询方法 `getPartnerSupportsForProposals()`
  - GET /api/proposals 从 N+1 查询优化为仅 2 次数据库查询
  - 添加幂等性保护，避免并发请求重复更新状态
  - 未来可考虑：在 partner_supports 表添加 (proposal_id, partner_id) 复合索引

## Recent Changes (Nov 17, 2025)
### UI/UX 改进和功能完善

- **提案卡片显示优化**:
  - 修复 funding request 显示问题：现在正确显示 `fundingRequested` 字段（用户申请的资金金额）
  - 添加详细资金信息显示：
    - Creator Stake（创建者质押的 WAN 金额和类型）
    - Partner Stakes（合作伙伴质押的总 WAN 金额）
    - Total Locked/Burned（总锁定/销毁的 WAN 数量）
    - Effective Funding（基于乘数计算的有效资金额度）

- **Partner 重复支持功能**:
  - 添加 `updatePartnerSupport` 方法到 storage 接口
  - 允许 Partner 对同一提案多次追加资金支持
  - 重复支持时累加金额而非返回错误
  - 每次支持后自动检查是否达到资金要求，满足条件立即转为 active 状态

- **资金条件检查机制**:
  - Partner support 后立即检查资金条件（POST /api/proposals/:id/support）
  - GET /api/proposals 中定期检查 publicized 状态的提案
  - 到达 fundingDeadline 后：
    - 资金达标 → 自动转为 active（投票）状态
    - 资金不足 → 自动转为 closed 状态
  - 提案只有满足资金条件才会进入投票阶段

### 技术实现细节
- 修改文件：
  - `client/src/components/proposal-card.tsx`：更新显示逻辑和资金信息计算
  - `server/routes.ts`：优化 partner support 流程，移除重复代码
  - `server/storage.ts`：添加 updatePartnerSupport 方法支持更新已有支持记录

### 已知限制
- 前端资金计算目前假设所有 partner 的质押类型与创建者相同
- 如需更精确的计算（区分不同 partner 的 lock/burn 类型），需要修改 API 返回更详细的数据
