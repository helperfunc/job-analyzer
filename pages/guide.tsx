import React from 'react'
import Link from 'next/link'

export default function Guide() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Job Search Assistant 使用指南</h1>

        <div className="grid gap-6">
          {/* Research Center 指南 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">🎓 Research Center</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-2">📚 Papers & Research</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>抓取论文</strong>: 点击"Fetch OpenAI Papers"或"Fetch Anthropic Papers"获取最新论文</li>
                  <li><strong>筛选功能</strong>: 按公司、年份、标签或搜索关键词过滤论文</li>
                  <li><strong>关联职位</strong>: 点击"Link to Job"将论文与特定职位建立关联</li>
                  <li><strong>查看详情</strong>: 点击论文链接查看原文或arXiv页面</li>
                  <li><strong>删除论文</strong>: 点击红色"Delete"按钮删除不需要的论文</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-600 mb-2">💡 My Insights</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Note</strong>: 记录对职位的一般性想法和理解</li>
                  <li><strong>Resource</strong>: 保存有用的学习资源链接</li>
                  <li><strong>Experience</strong>: 分享相关的工作或项目经验</li>
                  <li><strong>使用场景</strong>: 记录面试准备要点、技术要求理解等</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-2">🎯 Skill Gap Analysis</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>输入技能</strong>: 用逗号分隔你的技能，如"Python, React, Machine Learning"</li>
                  <li><strong>AI分析</strong>: 系统自动比较你的技能与职位要求</li>
                  <li><strong>查看结果</strong>: 了解技能匹配百分比和缺失技能</li>
                  <li><strong>学习建议</strong>: 获得针对性的学习建议和优先级</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-600 mb-2">🛠 Job Resources</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>资源类型</strong>: 支持视频、文章、工具、课程、书籍等</li>
                  <li><strong>评分系统</strong>: 为每个资源打分(1-5星)</li>
                  <li><strong>个人笔记</strong>: 记录使用心得和评价</li>
                  <li><strong>标签管理</strong>: 通过标签组织和分类资源</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 使用流程指南 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">🚀 推荐使用流程</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <h4 className="font-semibold">研究目标公司</h4>
                  <p className="text-sm text-gray-600">抓取OpenAI/Anthropic的最新论文，了解公司技术方向和研究重点</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <h4 className="font-semibold">分析技能差距</h4>
                  <p className="text-sm text-gray-600">使用AI分析你的技能与目标职位的差距，制定学习计划</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <h4 className="font-semibold">收集学习资源</h4>
                  <p className="text-sm text-gray-600">在Job Resources中保存相关的学习材料和工具</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <div>
                  <h4 className="font-semibold">记录学习心得</h4>
                  <p className="text-sm text-gray-600">用My Insights记录学习进度、面试准备要点和个人想法</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                <div>
                  <h4 className="font-semibold">建立知识关联</h4>
                  <p className="text-sm text-gray-600">将重要论文与目标职位关联，准备面试时的技术讨论</p>
                </div>
              </div>
            </div>
          </div>

          {/* 技巧和最佳实践 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">💡 使用技巧</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-600 mb-2">✅ 最佳实践</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  <li>定期更新论文库，跟上最新研究</li>
                  <li>为每个目标职位单独做技能分析</li>
                  <li>及时记录学习心得和面试准备要点</li>
                  <li>使用筛选功能快速找到相关论文</li>
                  <li>建立系统的资源收藏和标签体系</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-red-600 mb-2">⚠️ 注意事项</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  <li>删除论文操作不可撤销，请谨慎操作</li>
                  <li>技能分析需要OpenAI API配置</li>
                  <li>部分功能需要Supabase数据库支持</li>
                  <li>建议定期备份重要的见解和笔记</li>
                  <li>合理使用AI分析，结合实际情况判断</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 快速导航 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">🔗 快速导航</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/research" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold text-blue-600">Research Center</h3>
                <p className="text-sm text-gray-600 mt-1">论文研究和技能分析</p>
              </Link>
              
              <Link href="/" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold text-green-600">Job Analysis</h3>
                <p className="text-sm text-gray-600 mt-1">职位抓取和薪资分析</p>
              </Link>
              
              <Link href="/compare" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold text-purple-600">Company Compare</h3>
                <p className="text-sm text-gray-600 mt-1">公司职位对比</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}