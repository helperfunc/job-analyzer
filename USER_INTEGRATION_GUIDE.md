# 用户系统集成指南

## 当前问题

1. **外键约束错误**: job_thoughts尝试插入不存在的job_id
2. **用户系统未集成**: 虽然创建了用户API，但现有页面还没有使用

## 已完成的工作

### ✅ 后端实现
- 用户认证API（注册、登录、登出）
- 用户收藏API
- 评论系统API
- 投票系统API
- 用户资源管理API

### ✅ 认证上下文
- 创建了AuthContext在全局管理用户状态
- 更新了_app.tsx包含AuthProvider
- 更新了Navigation显示用户状态

### ✅ API更新
- job-thoughts API现在会：
  - 检查用户登录状态
  - 验证job是否存在
  - 使用真实用户ID（如果登录）或'default'

## 需要完成的工作

### 1. 在页面中添加用户功能

#### Jobs页面 (`pages/jobs.tsx`)
```tsx
// 导入useAuth
import { useAuth } from '../contexts/AuthContext'

// 在组件中使用
const { user } = useAuth()

// 添加收藏按钮
const bookmarkJob = async (jobId: string) => {
  if (!user) {
    router.push('/auth')
    return
  }
  
  const response = await fetch('/api/user/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      bookmark_type: 'job',
      job_id: jobId
    })
  })
  
  if (response.ok) {
    showToastMessage('Job bookmarked!')
  }
}
```

#### Research页面 (`pages/research.tsx`)
类似地添加论文收藏功能

### 2. 创建保护路由组件

```tsx
// components/ProtectedRoute.tsx
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading])
  
  if (loading) return <div>Loading...</div>
  if (!user) return null
  
  return children
}
```

### 3. 更新现有功能使用用户ID

所有使用'default'作为user_id的地方都应该更新：
- job_resources
- interview_resources  
- paper_insights
- skill_gaps

### 4. 添加用户界面元素

- 收藏按钮（显示收藏状态）
- 评论区域
- 投票按钮
- 用户资源创建表单

## 快速测试流程

1. **注册新用户**
   ```
   访问 http://localhost:3003/auth
   创建账户
   ```

2. **测试收藏功能**
   ```
   登录后访问 /jobs
   点击收藏按钮
   在 /dashboard 查看收藏
   ```

3. **测试评论功能**
   ```
   在job详情页添加评论
   测试回复功能
   ```

## 数据库注意事项

确保job在数据库中存在后才能：
- 添加job_thoughts
- 添加job_resources
- 创建收藏

可以在创建这些关联数据前先调用save job API。

## 下一步建议

1. 先完成基础的用户登录流程
2. 在jobs页面添加收藏功能
3. 逐步添加评论和投票功能
4. 最后实现用户资源管理

这样可以逐步验证每个功能是否正常工作。