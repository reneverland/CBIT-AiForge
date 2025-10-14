import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Upload,
  Search,
  Tag,
  TrendingUp
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

interface FixedQAPair {
  id: number
  application_id: number
  question: string
  answer: string
  keywords: string[]
  category: string
  priority: number
  is_active: boolean
  hit_count: number
  last_hit_at: string | null
  created_at: string
}

export default function FixedQAPage() {
  const [qaPairs, setQaPairs] = useState<FixedQAPair[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApp, setSelectedApp] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (selectedApp) {
      loadQAPairs()
    }
  }, [selectedApp])

  const loadQAPairs = async () => {
    if (!selectedApp) return
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/api/fixed-qa?application_id=${selectedApp}`)
      setQaPairs(res.data.qa_pairs || [])
    } catch (error) {
      console.error('加载Q&A失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteQAPair = async (id: number) => {
    if (!confirm('确定要删除这个Q&A对吗？')) return
    try {
      await axios.delete(`${API_BASE}/api/fixed-qa/${id}`)
      loadQAPairs()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await axios.patch(`${API_BASE}/api/fixed-qa/${id}`, {
        is_active: !currentStatus
      })
      loadQAPairs()
    } catch (error) {
      console.error('切换状态失败:', error)
    }
  }

  const filteredQAPairs = qaPairs.filter(qa =>
    qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qa.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qa.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-green-400" />
            固定Q&A管理
          </h1>
          <p className="text-blue-200 mt-2">
            管理预设问答对，实现快速精准匹配
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
            title="导入"
          >
            <Upload className="w-5 h-5" />
            批量导入
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all"
            disabled={!selectedApp}
          >
            <Plus className="w-5 h-5" />
            添加Q&A
          </button>
        </div>
      </div>

      {/* App Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-blue-200 mb-2">
          选择应用实例
        </label>
        <select
          value={selectedApp || ''}
          onChange={(e) => setSelectedApp(Number(e.target.value))}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
        >
          <option value="">请选择应用...</option>
          {/* 这里应该从API加载应用列表 */}
        </select>
      </div>

      {!selectedApp ? (
        <div className="text-center py-16">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-green-400/50" />
          <p className="text-xl text-blue-200 mb-2">请先选择一个应用</p>
          <p className="text-blue-300/70">
            选择应用后即可管理该应用的固定Q&A对
          </p>
        </div>
      ) : (
        <>
          {/* Search and Stats */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索问题、答案或分类..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-blue-200">
              <div className="px-4 py-3 bg-white/5 rounded-xl">
                总计: <span className="text-white font-bold">{qaPairs.length}</span>
              </div>
              <div className="px-4 py-3 bg-white/5 rounded-xl">
                激活: <span className="text-green-300 font-bold">{qaPairs.filter(q => q.is_active).length}</span>
              </div>
            </div>
          </div>

          {/* Q&A List */}
          {loading ? (
            <div className="text-center py-12 text-blue-200">加载中...</div>
          ) : filteredQAPairs.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-green-400/50" />
              <p className="text-xl text-blue-200 mb-2">
                {searchTerm ? '没有找到匹配的Q&A' : '还没有Q&A对'}
              </p>
              <p className="text-blue-300/70 mb-6">
                {searchTerm ? '尝试其他搜索词' : '添加第一个Q&A对开始使用'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                >
                  添加第一个Q&A
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQAPairs.map((qa) => (
                <QACard
                  key={qa.id}
                  qa={qa}
                  onDelete={deleteQAPair}
                  onToggleActive={toggleActive}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && selectedApp && (
        <CreateQAModal
          applicationId={selectedApp}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadQAPairs()
          }}
        />
      )}
    </div>
  )
}

// QACard组件
function QACard({ qa, onDelete, onToggleActive }: {
  qa: FixedQAPair
  onDelete: (id: number) => void
  onToggleActive: (id: number, status: boolean) => void
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:shadow-xl transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Question */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-300">问题</span>
              {qa.category && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                  {qa.category}
                </span>
              )}
              {qa.priority > 0 && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                  优先级: {qa.priority}
                </span>
              )}
            </div>
            <p className="text-white font-medium">{qa.question}</p>
          </div>

          {/* Answer */}
          <div className="mb-4">
            <span className="text-sm font-medium text-blue-300 block mb-2">答案</span>
            <p className="text-blue-100">{qa.answer}</p>
          </div>

          {/* Keywords */}
          {qa.keywords && qa.keywords.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Tag className="w-4 h-4 text-blue-300" />
              {qa.keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-blue-300">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              命中: {qa.hit_count}次
            </div>
            {qa.last_hit_at && (
              <div>
                最后命中: {new Date(qa.last_hit_at).toLocaleString('zh-CN')}
              </div>
            )}
            <div className={`px-2 py-1 rounded-full text-xs ${
              qa.is_active
                ? 'bg-green-500/20 text-green-300'
                : 'bg-gray-500/20 text-gray-300'
            }`}>
              {qa.is_active ? '已激活' : '已禁用'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onToggleActive(qa.id, qa.is_active)}
            className={`p-2 rounded-lg transition-colors ${
              qa.is_active
                ? 'text-yellow-300 hover:bg-yellow-500/10'
                : 'text-green-300 hover:bg-green-500/10'
            }`}
            title={qa.is_active ? '禁用' : '启用'}
          >
            {qa.is_active ? '禁用' : '启用'}
          </button>
          <button
            className="p-2 text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(qa.id)}
            className="p-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// CreateQAModal组件
function CreateQAModal({ applicationId, onClose, onSuccess }: {
  applicationId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    keywords: '',
    category: '',
    priority: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post(`${API_BASE}/api/fixed-qa`, {
        application_id: applicationId,
        question: formData.question,
        answer: formData.answer,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        category: formData.category || null,
        priority: formData.priority,
      })
      onSuccess()
    } catch (error) {
      console.error('创建Q&A失败:', error)
      alert('创建失败，请检查输入')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">添加Q&A对</h2>
          <p className="text-blue-200 mt-1">创建新的固定问答对</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              问题 *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
              placeholder="用户可能会问的问题..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              答案 *
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
              placeholder="标准答案..."
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              关键词（逗号分隔）
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
              placeholder="退款, 价格, 优惠"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                分类
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
                placeholder="如: 售后服务"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                优先级
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              创建Q&A
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
