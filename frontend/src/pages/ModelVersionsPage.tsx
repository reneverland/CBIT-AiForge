import { useState, useEffect } from 'react'
import {
  Layers,
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  GitBranch,
  Tag
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

interface Model {
  id: number
  name: string
  display_name: string
  description: string
  base_model: string
  model_type: string
  status: string
  created_at: string
  trained_at: string | null
}

export default function ModelVersionsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    loadModels()
  }, [selectedType])

  const loadModels = async () => {
    try {
      setLoading(true)
      const url = selectedType === 'all'
        ? `${API_BASE}/api/models/`
        : `${API_BASE}/api/models/?model_type=${selectedType}`
      const res = await axios.get(url)
      setModels(res.data.models || [])
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'training': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'inactive': return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'base': return <Layers className="w-4 h-4" />
      case 'fine-tuned': return <GitBranch className="w-4 h-4" />
      case 'rag': return <TrendingUp className="w-4 h-4" />
      default: return <Tag className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未训练'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">模型版本管理</h2>
              <p className="text-blue-200 mt-1">管理、监控和切换不同版本的模型</p>
            </div>
          </div>
          
          <button
            onClick={loadModels}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            刷新列表
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/10 flex gap-2">
        {['all', 'fine-tuned', 'base', 'rag'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              selectedType === type
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-blue-200 hover:bg-white/10'
            }`}
          >
            {type === 'all' ? '全部' : type === 'fine-tuned' ? '微调模型' : type === 'base' ? '基座模型' : 'RAG模型'}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-blue-200 mt-4">加载中...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/10 text-center">
          <Layers className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
          <p className="text-white text-lg font-medium mb-2">暂无模型</p>
          <p className="text-blue-200">请先通过自动化工作流训练模型</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:shadow-2xl hover:scale-105 transition-all group"
            >
              {/* Model Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    {getTypeIcon(model.model_type)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{model.display_name}</h3>
                    <p className="text-blue-200 text-xs">{model.name}</p>
                  </div>
                </div>
                
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(model.status)}`}>
                  {model.status}
                </span>
              </div>

              {/* Description */}
              <p className="text-blue-200 text-sm mb-4 line-clamp-2">
                {model.description || '暂无描述'}
              </p>

              {/* Info Grid */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-blue-200">
                  <Tag className="w-4 h-4" />
                  <span className="truncate">{model.base_model}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-200">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(model.trained_at || model.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-white/10">
                {model.status === 'inactive' ? (
                  <button className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <Play className="w-4 h-4" />
                    激活
                  </button>
                ) : model.status === 'active' ? (
                  <button className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <Pause className="w-4 h-4" />
                    停用
                  </button>
                ) : null}
                
                <button className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Version Tag */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-blue-200">
                  <GitBranch className="w-3 h-3" />
                  <span>版本 {model.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Layers className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-blue-200 text-sm">总模型数</p>
              <p className="text-white text-2xl font-bold">{models.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <p className="text-blue-200 text-sm">运行中</p>
              <p className="text-white text-2xl font-bold">
                {models.filter(m => m.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <GitBranch className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <p className="text-blue-200 text-sm">微调模型</p>
              <p className="text-white text-2xl font-bold">
                {models.filter(m => m.model_type === 'fine-tuned').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <p className="text-blue-200 text-sm">失败</p>
              <p className="text-white text-2xl font-bold">
                {models.filter(m => m.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
