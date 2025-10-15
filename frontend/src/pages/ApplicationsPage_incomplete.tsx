import { useState, useEffect } from 'react'
import {
  Boxes,
  Plus,
  Settings as SettingsIcon,
  Play,
  Pause,
  Copy,
  Activity,
  TestTube,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Edit,
  RefreshCw,
  Shield,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Database,
  MessageSquare
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

// ==================== 类型定义 ====================

interface Application {
  id: number
  name: string
  description: string
  mode: 'safe' | 'standard' | 'enhanced'
  mode_config: any
  ai_provider: string
  llm_model: string
  temperature: number
  api_key: string
  endpoint_path: string
  endpoint_url: string
  is_active: boolean
  total_requests: number
  total_tokens: number
  created_at: string
  updated_at: string
  full_config?: any
  mode_description?: {
    name: string
    subtitle: string
    features: string[]
    speed: number
    accuracy: number
    flexibility: number
    use_case: string
  }
  knowledge_bases?: KnowledgeBase[]
}

interface ModeInfo {
  name: string
  subtitle: string
  features: string[]
  speed: number
  accuracy: number
  flexibility: number
  use_case: string
}

interface ModesResponse {
  modes: {
    safe: ModeInfo
    standard: ModeInfo
    enhanced: ModeInfo
  }
}

interface KnowledgeBase {
  id: number
  name: string
  priority: number
  weight: number
  boost_factor: number
}

interface FixedQA {
  id: number
  question: string
  answer: string
  keywords?: string[]
  category?: string
  priority: number
  is_active: boolean
  hit_count: number
  last_hit_at?: string
  created_at: string
  has_embedding?: boolean
}

// ==================== 主组件 ====================

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [playgroundApp, setPlaygroundApp] = useState<Application | null>(null)
  const [qaManagerApp, setQaManagerApp] = useState<Application | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const res = await axios.get<{ applications: Application[] }>(`${API_BASE}/api/applications`)
      setApplications(res.data.applications || [])
    } catch (error) {
      console.error('加载应用失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleApplicationStatus = async (appId: number, currentStatus: boolean) => {
    try {
      await axios.put(`${API_BASE}/api/applications/${appId}`, {
        is_active: !currentStatus
      })
      loadApplications()
    } catch (error) {
      console.error('切换状态失败:', error)
      alert('切换状态失败，请稍后重试')
    }
  }

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey)
    alert('API密钥已复制到剪贴板')
  }

  const copyEndpoint = (endpoint: string) => {
    navigator.clipboard.writeText(endpoint)
    alert('API端点已复制到剪贴板')
  }

  const handleDelete = async (appId: number, appName: string) => {
    if (!confirm(`确定要删除应用"${appName}"吗？此操作不可撤销。`)) {
      return
    }

    try {
      await axios.delete(`${API_BASE}/api/applications/${appId}`)
      alert('删除成功')
      loadApplications()
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请稍后重试')
    }
  }

  // 模式图标
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'safe':
        return <Shield className="w-5 h-5 text-green-600" />
      case 'standard':
        return <Zap className="w-5 h-5 text-blue-600" />
      case 'enhanced':
        return <Globe className="w-5 h-5 text-purple-600" />
      default:
        return <Zap className="w-5 h-5 text-gray-600" />
    }
  }

  // 模式徽章
  const getModeBadge = (mode: string) => {
    const badges = {
      safe: 'bg-green-100 text-green-800',
      standard: 'bg-blue-100 text-blue-800',
      enhanced: 'bg-purple-100 text-purple-800'
    }
    const labels = {
      safe: '🔒 安全模式',
      standard: '⚡ 标准模式',
      enhanced: '🌐 增强模式'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[mode] || 'bg-gray-100 text-gray-800'}`}>
        {labels[mode] || mode}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Boxes className="w-8 h-8 mr-3 text-blue-600" />
            应用实例管理
          </h1>
          <p className="text-gray-600 mt-2">
            创建和管理您的AI应用实例，每个应用可配置不同的工作模式
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>创建新应用</span>
        </button>
      </div>

      {/* 应用列表 */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Boxes className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">还没有应用实例</h3>
          <p className="text-gray-600 mb-6">创建第一个AI应用开始使用</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            立即创建
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onToggleStatus={toggleApplicationStatus}
              onCopyApiKey={copyApiKey}
              onCopyEndpoint={copyEndpoint}
              onEdit={() => setEditingApp(app)}
              onTest={() => setPlaygroundApp(app)}
              onDelete={handleDelete}
              onManageQA={() => setQaManagerApp(app)}
              getModeIcon={getModeIcon}
              getModeBadge={getModeBadge}
            />
          ))}
        </div>
      )}

      {/* 创建/编辑模态框 */}
      {(showCreateModal || editingApp) && (
        <CreateEditAppModal
          app={editingApp}
          onClose={() => {
            setShowCreateModal(false)
            setEditingApp(null)
          }}
          onSuccess={() => {
            loadApplications()
            setShowCreateModal(false)
            setEditingApp(null)
          }}
        />
      )}

      {/* Playground模态框 */}
      {playgroundApp && (
        <PlaygroundModal
          app={playgroundApp}
          onClose={() => setPlaygroundApp(null)}
        />
      )}

      {/* Q&A管理器模态框 */}
      {qaManagerApp && (
        <QAManagerModal
          app={qaManagerApp}
          onClose={() => setQaManagerApp(null)}
        />
      )}
    </div>
  )
}

// ==================== 应用卡片组件 ====================

interface ApplicationCardProps {
  app: Application
  onToggleStatus: (id: number, status: boolean) => void
  onCopyApiKey: (key: string) => void
  onCopyEndpoint: (endpoint: string) => void
  onEdit: () => void
  onTest: () => void
  onDelete: (id: number, name: string) => void
  onManageQA: () => void
  getModeIcon: (mode: string) => JSX.Element
  getModeBadge: (mode: string) => JSX.Element
}

function ApplicationCard({
  app,
  onToggleStatus,
  onCopyApiKey,
  onCopyEndpoint,
  onEdit,
  onTest,
  onDelete,
  onManageQA,
  getModeIcon,
  getModeBadge
}: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* 卡片头部 */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {getModeIcon(app.mode)}
              <h3 className="text-xl font-bold text-gray-900">{app.name}</h3>
              {getModeBadge(app.mode)}
              <span className={`px-2 py-1 rounded text-xs font-medium ${app.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {app.is_active ? '✓ 运行中' : '○ 已停用'}
              </span>
            </div>
            {app.description && (
              <p className="text-gray-600 mb-3">{app.description}</p>
            )}
            {app.mode_description && (
              <p className="text-sm text-gray-500 italic">{app.mode_description.subtitle}</p>
            )}
            
            {/* 统计信息 */}
            <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>{app.total_requests} 次请求</span>
              </div>
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>{app.total_tokens} tokens</span>
              </div>
              <div>
                <span className="text-gray-500">AI: </span>
                <span className="font-medium">{app.llm_model}</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={onTest}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
              title="测试应用"
            >
              <TestTube className="w-5 h-5 text-blue-600" />
            </button>
            <button
              onClick={onManageQA}
              className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
              title="管理固定Q&A"
            >
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </button>
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="编辑设置"
            >
              <Edit className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => onToggleStatus(app.id, app.is_active)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={app.is_active ? '停用' : '启用'}
            >
              {app.is_active ? (
                <Pause className="w-5 h-5 text-orange-600" />
              ) : (
                <Play className="w-5 h-5 text-green-600" />
              )}
            </button>
            <button
              onClick={() => onDelete(app.id, app.name)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={expanded ? '收起' : '展开'}
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
          {/* API配置 */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">API配置</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                <div className="flex-1 mr-4 overflow-hidden">
                  <div className="text-xs text-gray-500 mb-1">API密钥</div>
                  <code className="text-sm text-gray-800 font-mono truncate block">{app.api_key}</code>
                </div>
                <button
                  onClick={() => onCopyApiKey(app.api_key)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                <div className="flex-1 mr-4 overflow-hidden">
                  <div className="text-xs text-gray-500 mb-1">API端点</div>
                  <code className="text-sm text-gray-800 font-mono truncate block">{app.endpoint_url}</code>
                </div>
                <button
                  onClick={() => onCopyEndpoint(app.endpoint_url)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* 模式特性 */}
          {app.mode_description && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">模式特性</h4>
              <div className="bg-white p-4 rounded border border-gray-200 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">响应速度</div>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-4 mx-0.5 rounded ${i < app.mode_description!.speed ? 'bg-blue-500' : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">准确性</div>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-4 mx-0.5 rounded ${i < app.mode_description!.accuracy ? 'bg-green-500' : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">灵活性</div>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-4 mx-0.5 rounded ${i < app.mode_description!.flexibility ? 'bg-purple-500' : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">功能特性</div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {app.mode_description.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">适用场景</div>
                  <div className="text-sm text-gray-700">{app.mode_description.use_case}</div>
                </div>
              </div>
            </div>
          )}

          {/* 关联知识库 */}
          {app.knowledge_bases && app.knowledge_bases.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">关联知识库</h4>
              <div className="flex flex-wrap gap-2">
                {app.knowledge_bases.map((kb) => (
                  <span
                    key={kb.id}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {kb.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== 创建/编辑应用模态框 ====================

interface CreateEditAppModalProps {
  app: Application | null
  onClose: () => void
  onSuccess: () => void
}

function CreateEditAppModal({ app, onClose, onSuccess }: CreateEditAppModalProps) {
  const isEdit = !!app
  const [step, setStep] = useState(1) // 1: 基础信息, 2: 选择模式, 3: 高级配置
  const [loading, setLoading] = useState(false)

  // 表单数据
  const [name, setName] = useState(app?.name || '')
  const [description, setDescription] = useState(app?.description || '')
  const [aiProvider, setAiProvider] = useState(app?.ai_provider || 'openai')
  const [llmModel, setLlmModel] = useState(app?.llm_model || 'gpt-4o')
  const [temperature, setTemperature] = useState(app?.temperature || 0.7)
  const [mode, setMode] = useState<'safe' | 'standard' | 'enhanced'>(app?.mode || 'standard')

  // 加载可用模式
  const [modes, setModes] = useState<ModesResponse['modes'] | null>(null)

  useEffect(() => {
    loadModes()
  }, [])

  const loadModes = async () => {
    try {
      const res = await axios.get<ModesResponse>(`${API_BASE}/api/applications/modes`)
      setModes(res.data.modes)
    } catch (error) {
      console.error('加载模式失败:', error)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('请输入应用名称')
      return
    }

    try {
      setLoading(true)
      const data = {
        name,
        description,
        ai_provider: aiProvider,
        llm_model: llmModel,
        temperature,
        mode
      }

      if (isEdit) {
        await axios.put(`${API_BASE}/api/applications/${app.id}`, data)
        alert('更新成功')
      } else {
        await axios.post(`${API_BASE}/api/applications`, data)
        alert('创建成功')
      }

      onSuccess()
    } catch (error: any) {
      console.error('操作失败:', error)
      alert(error.response?.data?.detail || '操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const getModeCard = (modeKey: 'safe' | 'standard' | 'enhanced', modeInfo: ModeInfo) => {
    const isSelected = mode === modeKey
    const icons = {
      safe: <Shield className="w-8 h-8" />,
      standard: <Zap className="w-8 h-8" />,
      enhanced: <Globe className="w-8 h-8" />
    }
    const colors = {
      safe: {
        border: 'border-green-500',
        bg: 'bg-green-50',
        icon: 'text-green-600',
        ring: 'ring-green-500'
      },
      standard: {
        border: 'border-blue-500',
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        ring: 'ring-blue-500'
      },
      enhanced: {
        border: 'border-purple-500',
        bg: 'bg-purple-50',
        icon: 'text-purple-600',
        ring: 'ring-purple-500'
      }
    }

    return (
      <button
        key={modeKey}
        onClick={() => setMode(modeKey)}
        className={`
          relative p-6 rounded-xl border-2 text-left transition-all
          ${isSelected ? `${colors[modeKey].border} ${colors[modeKey].bg} ring-4 ${colors[modeKey].ring} ring-opacity-20` : 'border-gray-200 hover:border-gray-300 bg-white'}
        `}
      >
        {isSelected && (
          <div className="absolute top-4 right-4">
            <CheckCircle2 className={`w-6 h-6 ${colors[modeKey].icon}`} />
          </div>
        )}
        <div className={`${colors[modeKey].icon} mb-3`}>
          {icons[modeKey]}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{modeInfo.name}</h3>
        <p className="text-sm text-gray-600 mb-4">{modeInfo.subtitle}</p>
        
        {/* 特性指标 */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">响应速度</span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-3 mx-0.5 rounded ${i < modeInfo.speed ? `${colors[modeKey].icon.replace('text', 'bg')}` : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">准确性</span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-3 mx-0.5 rounded ${i < modeInfo.accuracy ? 'bg-green-500' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">灵活性</span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-3 mx-0.5 rounded ${i < modeInfo.flexibility ? 'bg-purple-500' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 功能特性 */}
        <ul className="text-xs text-gray-700 space-y-1 mb-3">
          {modeInfo.features.map((feature, idx) => (
            <li key={idx}>{feature}</li>
          ))}
        </ul>

        {/* 适用场景 */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">{modeInfo.use_case}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? '编辑应用' : '创建新应用'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-center space-x-4">
            {[
              { num: 1, label: '基础信息' },
              { num: 2, label: '选择模式' }
            ].map((s) => (
              <div key={s.num} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {s.num}
                </div>
                <span className={`ml-2 text-sm ${step >= s.num ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {s.num < 2 && (
                  <div className={`w-16 h-0.5 mx-4 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  应用名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：客服机器人"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  应用描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="简单描述应用的用途..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI提供商
                  </label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LLM模型
                  </label>
                  <select
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o-mini</option>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>更精确</span>
                  <span>更创造性</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && modes && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">选择工作模式</h3>
                <p className="text-gray-600">不同模式适用于不同的使用场景</p>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {getModeCard('safe', modes.safe)}
                {getModeCard('standard', modes.standard)}
                {getModeCard('enhanced', modes.enhanced)}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <div className="flex items-center space-x-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                上一步
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                下一步
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isEdit ? '保存修改' : '创建应用'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== Playground模态框（待实现完整版本） ====================

interface PlaygroundModalProps {
  app: Application
  onClose: () => void
}

function PlaygroundModal({ app, onClose }: PlaygroundModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">测试应用 - {app.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center text-gray-500">
          Playground功能完整版待实现...
        </div>
      </div>
    </div>
  )
}

// ==================== Q&A管理器模态框（待实现完整版本） ====================

interface QAManagerModalProps {
  app: Application
  onClose: () => void
}

function QAManagerModal({ app, onClose }: QAManagerModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">固定Q&A管理 - {app.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center text-gray-500">
          Q&A管理器完整版待实现...
        </div>
      </div>
    </div>
  )
}

