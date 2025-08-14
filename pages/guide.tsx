import React from 'react'
import Link from 'next/link'

export default function Guide() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">AI Job Analyzer 使用指南</h1>
          <p className="text-gray-600">
            欢迎使用AI Job Analyzer！本指南将帮助您充分利用系统的各项功能，提升求职效率。
          </p>
        </div>

        <div className="grid gap-6">
          {/* 首页功能 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🏠 <span className="ml-2">首页 - 职位分析</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">快速开始</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>选择公司</strong>: 点击"OpenAI"或"Anthropic"按钮快速分析对应公司职位</li>
                  <li><strong>自定义爬取</strong>: 输入任何公司的招聘页面URL，支持大多数主流招聘网站</li>
                  <li><strong>职位统计</strong>: 查看职位总数、有薪资数据的职位数量</li>
                  <li><strong>薪资分析</strong>: 浏览薪资最高的职位列表</li>
                  <li><strong>技能统计</strong>: 了解最常见的技能要求</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-600 mb-2">数据管理</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>自动导入</strong>: 分析结果自动保存到数据库</li>
                  <li><strong>清除数据</strong>: 使用"🗑️ 清除所有数据"按钮清空数据库</li>
                  <li><strong>数据持久化</strong>: 所有数据存储在数据库中，刷新不丢失</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Jobs页面 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              📋 <span className="ml-2">Jobs - 职位管理</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">职位浏览与排序</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>智能排序</strong>: 默认按薪资从高到低排序，同薪资按创建时间排序</li>
                  <li><strong>多种排序</strong>: 支持按薪资高低、创建时间等多种排序方式</li>
                  <li><strong>高级筛选</strong>: 按公司、部门、薪资范围筛选职位</li>
                  <li><strong>分页显示</strong>: 支持分页浏览，提升加载速度</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-600 mb-2">职位详情</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>详细信息</strong>: 查看职位标题、公司、地点、薪资、技能要求</li>
                  <li><strong>薪资显示</strong>: 清晰展示薪资范围和格式化显示</li>
                  <li><strong>技能标签</strong>: 可点击技能标签查看相关职位</li>
                  <li><strong>原始链接</strong>: 直接跳转到公司官网职位页面</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Research Center */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🔬 <span className="ml-2">Research Center - 论文研究</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">📚 Papers & Research</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>论文爬取</strong>: 一键获取OpenAI和Anthropic的最新研究论文</li>
                  <li><strong>智能筛选</strong>: 按公司、年份、关键词搜索论文</li>
                  <li><strong>职位关联</strong>: 将论文与相关职位建立联系，便于研究</li>
                  <li><strong>多链接支持</strong>: 查看原文、arXiv、GitHub等多个链接</li>
                  <li><strong>批量管理</strong>: 支持删除单个论文或清空所有论文</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-600 mb-2">🔗 职位关联功能</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>双向关联</strong>: 从论文页面链接到职位，从职位页面链接到论文</li>
                  <li><strong>相关性评估</strong>: 系统自动评估论文与职位的相关程度</li>
                  <li><strong>便捷管理</strong>: 可随时解除或建立新的关联关系</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Resources系统 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              📚 <span className="ml-2">Resources - 资源管理</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-600 mb-2">🎯 统一资源系统</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>多类型支持</strong>: 课程、书籍、视频、文章、工具、面试准备等10种类型</li>
                  <li><strong>职位关联</strong>: 直接在职位详情页面创建和链接资源</li>
                  <li><strong>灵活管理</strong>: 可创建独立资源，也可链接到特定职位</li>
                  <li><strong>标签系统</strong>: 为资源添加标签便于分类和搜索</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">💼 在职位页面使用</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>创建资源</strong>: 点击"+ Create Resource"直接为职位创建资源</li>
                  <li><strong>链接现有资源</strong>: 使用"+ Link Existing"关联已有资源</li>
                  <li><strong>资源展示</strong>: 查看所有链接到该职位的学习材料</li>
                  <li><strong>快速访问</strong>: 一键访问资源URL或查看详细描述</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 比较分析 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🔥 <span className="ml-2">Compare - 对比分析</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">🏢 公司对比</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>全面对比</strong>: OpenAI vs Anthropic 薪资、职位、技能要求对比</li>
                  <li><strong>薪资分析</strong>: 对比两家公司的薪资水平和分布</li>
                  <li><strong>技能需求</strong>: 分析共同技能和独有技能要求</li>
                  <li><strong>职位分析</strong>: 对比职位类别和招聘重点</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 使用技巧 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg shadow-sm border border-blue-200">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              💡 <span className="ml-2">使用技巧与最佳实践</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-2">⚡ 效率提升</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li>使用快速公司按钮获取数据，避免重复输入URL</li>
                  <li>利用薪资排序快速找到高薪职位</li>
                  <li>通过技能标签探索相关职位机会</li>
                  <li>建立论文与职位的关联便于深入研究</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-2">🎯 求职策略</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li>为目标职位创建专门的学习资源库</li>
                  <li>研究公司最新论文了解技术方向</li>
                  <li>利用对比功能制定求职优先级</li>
                  <li>定期清理和更新职位数据保持时效性</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 快速导航 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🚀 <span className="ml-2">快速导航</span>
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/" className="bg-blue-100 hover:bg-blue-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">🏠</div>
                <div className="font-semibold text-blue-800">首页</div>
                <div className="text-xs text-blue-600">职位分析</div>
              </Link>
              
              <Link href="/jobs" className="bg-green-100 hover:bg-green-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-green-800">Jobs</div>
                <div className="text-xs text-green-600">职位浏览</div>
              </Link>
              
              <Link href="/research" className="bg-purple-100 hover:bg-purple-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">🔬</div>
                <div className="font-semibold text-purple-800">Research</div>
                <div className="text-xs text-purple-600">论文研究</div>
              </Link>
              
              <Link href="/resources" className="bg-orange-100 hover:bg-orange-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">📚</div>
                <div className="font-semibold text-orange-800">Resources</div>
                <div className="text-xs text-orange-600">资源管理</div>
              </Link>
            </div>
          </div>

          {/* 系统信息 */}
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">📋 系统信息</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-gray-600 mb-2">技术栈</h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>Next.js 14</li>
                  <li>TypeScript</li>
                  <li>Supabase (PostgreSQL)</li>
                  <li>Tailwind CSS</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-600 mb-2">核心功能</h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>智能职位爬取</li>
                  <li>薪资分析排序</li>
                  <li>论文研究关联</li>
                  <li>资源管理系统</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-600 mb-2">数据支持</h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>OpenAI Jobs</li>
                  <li>Anthropic Jobs</li>
                  <li>研究论文库</li>
                  <li>学习资源库</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}