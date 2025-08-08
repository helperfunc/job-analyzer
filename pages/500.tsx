export default function Custom500() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-red-500 mb-4">500</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">服务器错误</h2>
            <p className="text-gray-600 mb-6">
              服务器内部发生错误，请稍后再试。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}