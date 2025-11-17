[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. Verify the project is working using the screenshot tool
[x] 4. Inform user the import is completed and they can start building
[x] 5. Mark the import as completed using the complete_project_import tool

## Migration Completed: 2025-11-17 09:30 UTC
All checklist items have been verified and marked as complete.
The WAN Governance application is successfully running on port 5000.

## 功能增强完成: 2025-11-17 09:46 UTC
Successfully completed all requested feature enhancements.

## 任务完成总结

### 已完成的任务：
1. ✅ 运行 seed-admin 创建默认管理员账户
   - 用户名: admin
   - 密码: admin123
   - 角色: admin

2. ✅ 在首页提案卡片中为管理员添加公示按钮
   - 当提案状态为"pending"且需要合作伙伴资金时，显示"公示提案"按钮
   - 当提案状态为"pending"且不需要合作伙伴资金时，显示"批准并发布"按钮
   - 按钮仅对管理员可见

3. ✅ 确保已公示但资金未满足的提案显示在Soon列表中
   - 更新了状态过滤逻辑，"approved"过滤器现在包括"approved"和"publicized"两种状态
   - 用户可以在Soon标签下看到等待合作伙伴追加资金的提案

### 技术实现：
- 修改了 `client/src/components/proposal-card.tsx`
  - 添加了 publicizeMutation 和 approveMutation
  - 添加了 needsPartnerFunding() 函数来判断是否需要合作伙伴资金
  - 为管理员添加了条件渲染的按钮

- 修改了 `client/src/pages/home.tsx`
  - 更新了状态过滤逻辑，使"Soon"标签显示"approved"和"publicized"状态的提案
  - 传递了 currentUserRole 属性到 ProposalCard 组件

### 验证：
- 工作流运行正常
- 应用程序在端口 5000 上成功运行
- 所有更改已通过热重载生效

## 2025-11-17 新增功能实现：

### 1. ✅ 增强提案详情页资金信息展示
- 区分显示"Requested Amount"（申请金额 fundingRequested）和"Current Funding"（当前真实资金 fundingAmount）
- 添加Proposer Stake的视觉图标（Lock/Burn）
- 详细显示合作伙伴支持信息，包括：
  - Partner姓名
  - 支持金额
  - 支持类型（Lock/Burn）
  - 联系方式（Email/Telegram/Discord）

### 2. ✅ 添加详细投票信息列表
- 新增"Voting Details"卡片，展示所有投票者信息：
  - 投票者姓名
  - 支持/反对标识（带图标）
  - 质押金额（WAN Amount）
  - 锁定类型（Until End/6 Months/12 Months/Burn）
  - 投票权重（Voting Power）

### 3. ✅ 创建模拟数据
- 成功创建seed-examples.ts脚本
- 生成了4个示例提案：
  1. Community Education Program (Funding, Passed, vote_passed)
  2. Luxury Office Space Rental (Funding, Failed, vote_failed)
  3. Increase Voting Period to 10 Days (Parameter, Passed, vote_passed)
  4. Reduce Minimum Stake to 10 WAN (Parameter, Failed, vote_failed)
- 创建了5个测试用户：alice, bob (partners), charlie, david, eve (voters)
- 每个提案包含完整的投票和合作伙伴支持数据

### 4. ✅ 完善Claim机制UI
- 根据resolution字段区分不同的claim场景：
  - administrative_reject: 显示"Claim Now"按钮，可立即赎回
  - vote_passed/vote_failed: 显示"Apply Claim"按钮，需等待3天
- Creator和Partner在管理员拒绝时都可以立即claim
- Voter只在投票结束后可以apply claim

### 5. ✅ 更新后端Claim逻辑
- 修改shared/schema.ts，添加resolution, rejectedBy, rejectionReason, resolvedAt字段
- 更新apply claim路由：
  - 拒绝管理员拒绝的提案apply（应直接claim）
  - 只允许投票结束的提案apply claim
- 更新execute claim路由：
  - 管理员拒绝的提案可以直接execute，无需先apply
  - 投票结束的提案需要先apply，等待3天后execute
  - 支持Creator和Partner在管理员拒绝时立即赎回

### 技术改进：
- 添加resolution字段明确区分提案结束原因，提高代码可维护性
- 使用architect工具进行设计评审，确保架构合理
- 数据库schema使用db:push成功更新
- 所有测试数据成功生成并验证
