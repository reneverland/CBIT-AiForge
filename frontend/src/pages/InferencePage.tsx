import { AlertCircle } from 'lucide-react'

export default function InferencePage() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">智能推理 Playground</h2>
        <p className="text-blue-200 max-w-md mx-auto">
          请前往"应用实例管理"页面创建应用，然后点击"进入 Playground"按钮进行智能推理测试。
        </p>
        <div className="pt-4">
          <a 
            href="/applications" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            前往应用管理
          </a>
        </div>
      </div>
    </div>
  )
}
