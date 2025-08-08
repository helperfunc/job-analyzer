import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-blue-500 mb-4">404</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">页面未找到</h2>
            <p className="text-gray-600 mb-6">
              抱歉，您访问的页面不存在。
            </p>
            <Link
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}