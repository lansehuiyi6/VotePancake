[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. Verify the project is working using the screenshot tool
[x] 4. Inform user the import is completed and they can start building

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
