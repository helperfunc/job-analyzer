# Research Module Design

## 功能概述

Research模块旨在帮助用户分析职位与学术研究的关系，主要包括：

1. **职位-论文关联分析**
   - 分析公司发表的论文与其招聘职位的关系
   - 识别对申请特定职位有帮助的开源项目和论文

2. **个人见解管理**
   - 用户可以对每个职位添加个人看法和笔记
   - 收集和整理对申请有帮助的资源

3. **能力差距分析**
   - 分析用户当前能力与职位要求的差距
   - 生成个性化的学习路径和项目建议

4. **项目推荐系统**
   - 基于能力差距推荐具体的项目
   - 提供项目模板和实施指导

## 数据模型

### 1. research_papers（研究论文表）
```sql
- id: UUID
- title: TEXT
- authors: JSONB
- publication_date: DATE
- abstract: TEXT
- url: TEXT
- arxiv_id: TEXT
- github_url: TEXT
- company: TEXT (OpenAI, Anthropic, etc.)
- tags: JSONB
- created_at: TIMESTAMP
```

### 2. job_paper_relations（职位-论文关联表）
```sql
- id: UUID
- job_id: UUID (FK to jobs)
- paper_id: UUID (FK to research_papers)
- relevance_score: FLOAT (0-1)
- relevance_reason: TEXT
- created_at: TIMESTAMP
```

### 3. user_insights（用户见解表）
```sql
- id: UUID
- job_id: UUID (FK to jobs)
- user_id: TEXT (暂时用session/email标识)
- insight_type: ENUM ('note', 'resource', 'experience')
- content: TEXT
- resources: JSONB (links, papers, etc.)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 4. skill_gaps（技能差距表）
```sql
- id: UUID
- job_id: UUID (FK to jobs)
- user_id: TEXT
- required_skills: JSONB
- current_skills: JSONB
- gap_analysis: JSONB
- created_at: TIMESTAMP
```

### 5. project_recommendations（项目推荐表）
```sql
- id: UUID
- skill_gap_id: UUID (FK to skill_gaps)
- project_name: TEXT
- description: TEXT
- difficulty: ENUM ('beginner', 'intermediate', 'advanced')
- estimated_time: TEXT
- resources: JSONB
- implementation_guide: TEXT
- created_at: TIMESTAMP
```

## API 接口设计

### 1. 论文相关
- `GET /api/research/papers` - 获取论文列表
- `GET /api/research/papers/:jobId` - 获取与职位相关的论文
- `POST /api/research/papers` - 添加新论文
- `POST /api/research/relate-paper` - 关联论文与职位

### 2. 用户见解
- `GET /api/research/insights/:jobId` - 获取职位的所有见解
- `POST /api/research/insights` - 添加新见解
- `PUT /api/research/insights/:id` - 更新见解
- `DELETE /api/research/insights/:id` - 删除见解

### 3. 技能差距分析
- `POST /api/research/analyze-gap` - 分析技能差距
- `GET /api/research/gaps/:jobId` - 获取差距分析结果
- `POST /api/research/recommend-projects` - 获取项目推荐

## UI 组件设计

### 1. Research Dashboard
- 显示职位与论文的关联图表
- 技能差距可视化
- 项目推荐列表

### 2. Paper Explorer
- 论文搜索和过滤
- 论文详情展示
- 快速关联到职位

### 3. Insights Panel
- 个人笔记编辑器
- 资源链接管理
- 经验分享

### 4. Gap Analysis View
- 技能雷达图
- 差距详细说明
- 学习路径建议

### 5. Project Recommendations
- 项目卡片展示
- 难度和时间估算
- 实施指南