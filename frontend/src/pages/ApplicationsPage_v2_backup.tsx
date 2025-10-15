import { useState, useEffect } from 'react'
import {
  Boxes,
  Plus,
  Settings as SettingsIcon,
  Play,
  Pause,
  Copy,
  Database,
  MessageSquare,
  Globe,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingUp,
  TestTube,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Edit,
  RefreshCw,
  Upload,
  FileText,
  Sparkles,
  Zap,
  BookOpen
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

interface Application {
  id: number
  name: string
  description: string
  ai_provider: string
  llm_model: string
  enable_fixed_qa: boolean
  enable_vector_kb: boolean
  enable_web_search: boolean
  enable_context: boolean
  api_key: string
  endpoint_path: string
  is_active: boolean
  total_requests: number
  total_tokens: number
  created_at: string
  fusion_config?: any
  temperature?: number
  max_tokens?: number
  top_k?: number
  search_channels?: string[]
  system_prompt?: string
  enable_custom_no_result_response?: boolean
  custom_no_result_response?: string
  enable_llm_polish?: boolean
  // 🆕 策略模式配置（v2.0）
  strategy_mode?: string
  web_search_auto_threshold?: number
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

interface KnowledgeBase {
  id: number
  name: string
  description: string
  document_count: number
  collection_name: string
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [playgroundApp, setPlaygroundApp] = useState<Application | null>(null)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [qaManagerApp, setQaManagerApp] = useState<Application | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/api/applications`)
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
    const fullEndpoint = `${API_BASE}${endpoint}`
    navigator.clipboard.writeText(fullEndpoint)
    alert('API端点已复制到剪贴板')
  }

  const handleEdit = (app: Application) => {
    setEditingApp(app)
  }

  const handleTest = (app: Application) => {
    setPlaygroundApp(app)
  }

  const handleDelete = async (appId: number, appName: string) => {
    if (!confirm(`确定要删除应用"${appName}"吗？此操作不可撤销。`)) {
      return
    }

    try {
      await axios.delete(`${API_BASE}/api/applications/${appId}`)
      alert('删除成功')
      loadApplications()
    } catch (error: any) {
      console.error('删除应用失败:', error)
      alert(error.response?.data?.detail || '删除失败')
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Boxes className="w-8 h-8 text-blue-400" />
            应用实例管理
          </h1>
          <p className="text-blue-200 mt-2">
            创建和管理混合检索应用，组合LLM、知识库、固定Q&A、联网搜索
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          创建应用
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Boxes className="w-5 h-5" />}
          label="总应用数"
          value={applications.length.toString()}
          color="blue"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="运行中"
          value={applications.filter(a => a.is_active).length.toString()}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="总请求"
          value={applications.reduce((sum, a) => sum + a.total_requests, 0).toString()}
          color="purple"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="总Token"
          value={applications.reduce((sum, a) => sum + a.total_tokens, 0).toLocaleString()}
          color="pink"
        />
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12 text-blue-200">加载中...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16">
          <Boxes className="w-16 h-16 mx-auto mb-4 text-blue-400/50" />
          <p className="text-xl text-blue-200 mb-2">还没有应用实例</p>
          <p className="text-blue-300/70 mb-6">
            创建您的第一个应用，开始使用混合检索系统
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            创建第一个应用
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onToggleStatus={toggleApplicationStatus}
              onCopyApiKey={copyApiKey}
              onCopyEndpoint={copyEndpoint}
              onEdit={handleEdit}
              onTest={handleTest}
              onManageQA={(app) => setQaManagerApp(app)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadApplications()
          }}
        />
      )}

      {/* Edit Modal */}
      {editingApp && (
        <EditApplicationModal
          app={editingApp}
          onClose={() => setEditingApp(null)}
          onSuccess={() => {
            setEditingApp(null)
            loadApplications()
          }}
        />
      )}

      {/* Playground Modal */}
      {playgroundApp && (
        <PlaygroundModal
          app={playgroundApp}
          onClose={() => setPlaygroundApp(null)}
        />
      )}

      {/* Fixed QA Manager Modal */}
      {qaManagerApp && (
        <FixedQAManagerModal
          app={qaManagerApp}
          onClose={() => setQaManagerApp(null)}
        />
      )}
    </div>
  )
}

// StatCard组件
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-400/30',
    green: 'from-green-500/20 to-green-600/20 border-green-400/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-400/30',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-400/30',
  }[color]

  return (
    <div className={`bg-gradient-to-br ${colorClasses} backdrop-blur-md rounded-xl p-4 border`}>
      <div className="flex items-center gap-2 mb-2 text-blue-200">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  )
}

// ApplicationCard组件
function ApplicationCard({ app, onToggleStatus, onCopyApiKey, onCopyEndpoint, onEdit, onTest, onManageQA, onDelete }: {
  app: Application
  onToggleStatus: (id: number, status: boolean) => void
  onCopyApiKey: (key: string) => void
  onCopyEndpoint: (endpoint: string) => void
  onEdit: (app: Application) => void
  onTest: (app: Application) => void
  onManageQA: (app: Application) => void
  onDelete: (id: number, name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden hover:shadow-xl transition-all">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-white">{app.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                app.is_active
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-400/30'
              }`}>
                {app.is_active ? '运行中' : '已暂停'}
              </span>
            </div>
            <p className="text-blue-200/80 text-sm mb-4">{app.description}</p>

            {/* Features */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-blue-300">LLM:</span>
                <span className="text-white font-medium">{app.ai_provider}/{app.llm_model}</span>
              </div>
              {app.enable_fixed_qa && (
                <span className="flex items-center gap-1 text-green-300">
                  <MessageSquare className="w-4 h-4" />
                  固定Q&A
                </span>
              )}
              {app.enable_vector_kb && (
                <span className="flex items-center gap-1 text-blue-300">
                  <Database className="w-4 h-4" />
                  向量检索
                </span>
              )}
              {app.enable_web_search && (
                <span className="flex items-center gap-1 text-purple-300">
                  <Globe className="w-4 h-4" />
                  联网搜索
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 text-sm text-blue-200">
              <div>
                请求: <span className="text-white font-medium">{app.total_requests}</span>
              </div>
              <div>
                Token: <span className="text-white font-medium">{app.total_tokens.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTest(app)}
              className="p-2 text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
              title="测试应用"
            >
              <TestTube className="w-5 h-5" />
            </button>
            {app.enable_fixed_qa && (
              <button
                onClick={() => onManageQA(app)}
                className="p-2 text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                title="管理固定Q&A"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-blue-300 hover:bg-white/10 rounded-lg transition-colors"
              title="查看详情"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button
              onClick={() => onToggleStatus(app.id, app.is_active)}
              className={`p-2 rounded-lg transition-colors ${
                app.is_active
                  ? 'text-yellow-300 hover:bg-yellow-500/10'
                  : 'text-green-300 hover:bg-green-500/10'
              }`}
              title={app.is_active ? '暂停' : '启动'}
            >
              {app.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={() => onEdit(app)}
              className="p-2 text-blue-300 hover:bg-white/10 rounded-lg transition-colors"
              title="配置"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(app.id, app.name)}
              className="p-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-white/10 bg-white/5 p-6 space-y-4">
          {/* API Key */}
          <div>
            <label className="text-sm text-blue-300 mb-2 block">API密钥</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={app.api_key}
                readOnly
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
              />
              <button
                onClick={() => onCopyApiKey(app.api_key)}
                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                复制
              </button>
            </div>
          </div>

          {/* API Endpoint */}
          <div>
            <label className="text-sm text-blue-300 mb-2 block">API端点</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`/api/apps/${app.endpoint_path}/chat/completions`}
                readOnly
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
              />
              <button
                onClick={() => onCopyEndpoint(`/api/apps/${app.endpoint_path}/chat/completions`)}
                className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                复制
              </button>
            </div>
          </div>

          {/* Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-blue-300 mb-2 block">高阈值（直接回答）</label>
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                {app.similarity_threshold_high}
              </div>
            </div>
            <div>
              <label className="text-sm text-blue-300 mb-2 block">低阈值（提供建议）</label>
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                {app.similarity_threshold_low}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// CreateApplicationModal组件
function CreateApplicationModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ai_provider: 'openai',
    llm_model: '',
    enable_fixed_qa: false,
    enable_vector_kb: true,
    enable_web_search: false,
    enable_context: false,
    // LLM配置
    temperature: 0.7,
    max_tokens: 2000,
    system_prompt: '',
    enable_llm_polish: true,
    // 🆕 策略模式配置（v2.0）
    strategy_mode: 'safe_priority' as 'safe_priority' | 'realtime_knowledge',
    web_search_auto_threshold: 0.50,
    // 三区间阈值配置
    qa_direct_threshold: 0.90,
    qa_suggest_threshold: 0.75,
    qa_min_threshold: 0.50,
    kb_high_confidence_threshold: 0.85,
    kb_context_threshold: 0.60,
    kb_min_threshold: 0.40,
    web_search_trigger_threshold: 0.70,
    // 基础参数
    top_k: 5,
    search_channels: [] as string[],
    // 知识库选择
    knowledge_bases: [] as number[]
  })

  const [providerModels, setProviderModels] = useState<string[]>([])  // 当前provider的模型列表
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingKBs, setLoadingKBs] = useState(true)
  const [verifyMessage, setVerifyMessage] = useState('')
  const [showCustomModel, setShowCustomModel] = useState(false)
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [, setApiVerified] = useState(false)

  useEffect(() => {
    loadKnowledgeBases()
  }, [])

  useEffect(() => {
    // 当provider变化时，清空模型列表并检查配置状态
    setProviderModels([])
    setFormData(prev => ({ ...prev, llm_model: '' }))
    setApiVerified(false)
    setVerifyMessage('')
  }, [formData.ai_provider])

  const checkProviderConfig = async (provider?: string) => {
    try {
      // 从AI提供商配置检查是否已配置
      const targetProvider = provider || formData.ai_provider
      const res = await axios.get(`${API_BASE}/api/ai-providers/providers/${targetProvider}/check-config`)
      return res.data.has_api_key
    } catch (error) {
      console.error('检查提供商配置失败:', error)
      return false
    }
  }

  const autoFetchModels = async () => {
    // 自动获取模型：检查配置并获取模型列表
    try {
      setLoadingModels(true)
      setVerifyMessage('正在检查配置...')
      
      // 检查提供商是否已配置
      const hasConfig = await checkProviderConfig(formData.ai_provider)
      if (!hasConfig) {
        setVerifyMessage(`⚠️ 未配置 ${formData.ai_provider} 的API密钥，请先在AI提供商配置页面中配置`)
        setLoadingModels(false)
        return
      }
      
      setVerifyMessage('正在获取模型列表...')
      
      // 直接调用获取模型的API，后端会使用已配置的API密钥
      const res = await axios.get(`${API_BASE}/api/ai-providers/providers/${formData.ai_provider}`)
      
      if (res.data.configured) {
        // 如果已配置，获取该提供商的可用模型
        const modelsRes = await axios.get(`${API_BASE}/api/ai-providers/providers/models/available`)
        const providerModels = modelsRes.data.models
          ?.filter((m: any) => m.provider === formData.ai_provider)
          ?.map((m: any) => m.name) || []
        
        if (providerModels.length > 0) {
          setProviderModels(providerModels)
          setApiVerified(true)
          setVerifyMessage(`✅ 成功获取 ${providerModels.length} 个${formData.ai_provider}模型`)
        } else {
          // 如果没有获取到模型，尝试从默认列表获取
          const defaultModels = _getDefaultModels(formData.ai_provider)
          setProviderModels(defaultModels)
          setApiVerified(false)
          setVerifyMessage(`⚠️ 使用默认模型列表（${defaultModels.length}个），可手动输入其他模型`)
        }
      } else {
        setVerifyMessage(`⚠️ ${formData.ai_provider} 未配置`)
        setApiVerified(false)
      }
    } catch (error: any) {
      console.error('获取模型失败:', error)
      // 失败时使用默认模型列表
      const defaultModels = _getDefaultModels(formData.ai_provider)
      setProviderModels(defaultModels)
      setVerifyMessage(`⚠️ 获取失败，显示默认模型列表（${defaultModels.length}个）`)
      setApiVerified(false)
    } finally {
      setLoadingModels(false)
    }
  }

  const _getDefaultModels = (provider: string): string[] => {
    const defaults: Record<string, string[]> = {
      openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4-1106-preview', 'gpt-4-0125-preview'],
      anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'],
      gemini: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'],
      deepseek: ['deepseek-chat', 'deepseek-coder'],
      qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'],
      openrouter: ['anthropic/claude-3-opus', 'anthropic/claude-3-sonnet', 'openai/gpt-4-turbo-preview', 'google/gemini-pro']
    }
    return defaults[provider] || []
  }


  const loadKnowledgeBases = async () => {
    try {
      setLoadingKBs(true)
      const res = await axios.get(`${API_BASE}/api/knowledge-bases`)
      setKnowledgeBases(res.data.knowledge_bases || [])
    } catch (error) {
      console.error('加载知识库失败:', error)
    } finally {
      setLoadingKBs(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.llm_model) {
      alert('请选择模型')
      return
    }

    try {
      setLoading(true)
      
      // 准备请求数据
      const requestData: any = {
        name: formData.name,
        description: formData.description,
        ai_provider: formData.ai_provider,
        llm_model: formData.llm_model,
        enable_fixed_qa: formData.enable_fixed_qa,
        enable_vector_kb: formData.enable_vector_kb,
        enable_web_search: formData.enable_web_search,
        enable_context: formData.enable_context,
        // LLM配置
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
        system_prompt: formData.system_prompt,
        enable_llm_polish: formData.enable_llm_polish,
        // 🆕 策略模式配置（v2.0）
        strategy_mode: formData.strategy_mode,
        web_search_auto_threshold: formData.web_search_auto_threshold,
        // 三区间阈值配置
        qa_direct_threshold: formData.qa_direct_threshold,
        qa_suggest_threshold: formData.qa_suggest_threshold,
        qa_min_threshold: formData.qa_min_threshold,
        kb_high_confidence_threshold: formData.kb_high_confidence_threshold,
        kb_context_threshold: formData.kb_context_threshold,
        kb_min_threshold: formData.kb_min_threshold,
        web_search_trigger_threshold: formData.web_search_trigger_threshold,
        // 基础参数
        top_k: formData.top_k,
        search_channels: formData.search_channels,
      }

      // 添加知识库关联
      if (formData.enable_vector_kb && formData.knowledge_bases.length > 0) {
        requestData.knowledge_bases = formData.knowledge_bases.map((kbId, index) => ({
          knowledge_base_id: kbId,
          priority: index + 1,
          weight: 1.0,
          boost_factor: 1.0
        }))
      }

      await axios.post(`${API_BASE}/api/applications`, requestData)
      onSuccess()
    } catch (error: any) {
      console.error('创建应用失败:', error)
      alert(error.response?.data?.detail || '创建失败，请检查配置')
    } finally {
      setLoading(false)
    }
  }

  const toggleKnowledgeBase = (kbId: number) => {
    setFormData(prev => ({
      ...prev,
      knowledge_bases: prev.knowledge_bases.includes(kbId)
        ? prev.knowledge_bases.filter(id => id !== kbId)
        : [...prev.knowledge_bases, kbId]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-6 border-b border-white/10 sticky top-0 bg-slate-800 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">创建应用实例</h2>
              <p className="text-blue-200 mt-1">配置混合检索应用的基本信息和功能</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              应用名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
              placeholder="如: 客服助手"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              应用描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
              placeholder="描述这个应用的用途..."
              rows={3}
            />
          </div>

          {/* LLM配置 */}
          <div className="border border-blue-400/30 rounded-xl p-5 bg-blue-500/5 space-y-4">
            <div className="flex items-start gap-3 mb-4">
              <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-white">LLM配置</h3>
                <p className="text-sm text-blue-300/70">配置AI提供商和模型</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                AI提供商 *
              </label>
              <select
                value={formData.ai_provider}
                onChange={(e) => setFormData({ ...formData, ai_provider: e.target.value, llm_model: '' })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google Gemini</option>
                <option value="deepseek">DeepSeek</option>
                <option value="qwen">Qwen (通义千问)</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-blue-200">
                  获取可用模型 *
                </label>
                <span className="text-xs text-blue-300/70">
                  将使用系统设置中配置的API密钥
                </span>
              </div>
              <button
                type="button"
                onClick={autoFetchModels}
                disabled={loadingModels}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 rounded-lg hover:from-blue-500/30 hover:to-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {loadingModels ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    获取中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    获取 {formData.ai_provider} 的可用模型
                  </>
                )}
              </button>
              {verifyMessage && (
                <p className={`text-sm mt-2 ${
                  verifyMessage.includes('✅') ? 'text-green-400' : 
                  verifyMessage.includes('❌') ? 'text-red-400' : 
                  'text-yellow-400'
                }`}>
                  {verifyMessage}
                </p>
              )}
              {verifyMessage.includes('未配置') && (
                <p className="text-xs text-blue-300/70 mt-2">
                  💡 提示：请先在<span className="text-blue-400 font-medium"> AI提供商配置</span>页面中添加 {formData.ai_provider} 的API密钥
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-blue-200">
                  模型名称 *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomModel(!showCustomModel)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showCustomModel ? '使用下拉选择' : '自定义输入'}
                </button>
              </div>
              
              {showCustomModel ? (
                <input
                  type="text"
                  value={formData.llm_model}
                  onChange={(e) => setFormData({ ...formData, llm_model: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
                  placeholder="手动输入模型名称，如: gpt-4-turbo"
                  required
                />
              ) : providerModels.length > 0 ? (
                <select
                  value={formData.llm_model}
                  onChange={(e) => setFormData({ ...formData, llm_model: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  required
                >
                  <option value="">请选择模型</option>
                  {providerModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-4 py-2 bg-blue-500/10 border border-blue-400/30 rounded-lg text-blue-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  请先点击上方"获取可用模型"按钮
                </div>
              )}
              <p className="text-xs text-blue-300/60 mt-1">
                💡 提示：从列表选择模型，或切换到"自定义输入"手动填写任意模型名称
              </p>
            </div>

            {/* 系统提示词 */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <label className="block text-sm font-medium text-blue-200 mb-2">
                系统提示词（可选）
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50 resize-none"
                rows={4}
                placeholder="例如：你是一个专业的教育咨询助手，擅长回答学生和家长关于课程、招生等问题..."
              />
              <p className="text-xs text-blue-300/60 mt-2">
                💡 提示：设置AI的角色和行为准则，帮助生成更符合场景的回答
              </p>
            </div>

            {/* LLM润色选项 */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  checked={formData.enable_llm_polish}
                  onChange={(e) => setFormData({ ...formData, enable_llm_polish: e.target.checked })}
                  className="w-5 h-5"
                />
                <div>
                  <div className="text-white font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    启用LLM润色（推荐）
                  </div>
                  <div className="text-sm text-blue-300/70 mt-1">
                    使用LLM结合知识库生成更自然、更像真人的回答。禁用后，当置信度≥0.9时会直接返回原始检索结果。
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 功能开关 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-blue-200 mb-2">
              启用功能
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors border border-white/10">
              <input
                type="checkbox"
                checked={formData.enable_fixed_qa}
                onChange={(e) => setFormData({ ...formData, enable_fixed_qa: e.target.checked })}
                className="w-5 h-5"
              />
              <div>
                <div className="text-white font-medium">固定Q&A</div>
                <div className="text-sm text-blue-300/70">快速匹配预设问题，智能引导用户</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors border border-white/10">
              <input
                type="checkbox"
                checked={formData.enable_vector_kb}
                onChange={(e) => setFormData({ ...formData, enable_vector_kb: e.target.checked })}
                className="w-5 h-5"
              />
              <div>
                <div className="text-white font-medium">向量检索</div>
                <div className="text-sm text-blue-300/70">从知识库检索相关文档</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors border border-white/10">
              <input
                type="checkbox"
                checked={formData.enable_web_search}
                onChange={(e) => setFormData({ ...formData, enable_web_search: e.target.checked })}
                className="w-5 h-5"
              />
              <div>
                <div className="text-white font-medium">联网搜索</div>
                <div className="text-sm text-blue-300/70">实时搜索互联网信息</div>
              </div>
            </label>
          </div>

          {/* 固定Q&A配置 */}
          {formData.enable_fixed_qa && (
            <div className="border border-green-400/30 rounded-xl p-5 bg-green-500/5 space-y-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-white">固定Q&A智能匹配配置</h3>
                  <p className="text-sm text-green-300/70 mt-1">
                    配置问题匹配阈值，控制何时直接回答或显示建议
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-green-200">直接回答阈值</label>
                    <span className="text-green-300 font-mono text-sm">{formData.qa_direct_threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="0.99"
                    step="0.01"
                    value={formData.qa_direct_threshold}
                    onChange={(e) => setFormData({ ...formData, qa_direct_threshold: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-green-500/20 rounded-lg appearance-none cursor-pointer accent-green-400"
                  />
                  <p className="text-xs text-green-300/70 mt-2">
                    ✅ 相似度 ≥ <strong>{formData.qa_direct_threshold.toFixed(2)}</strong> 时，直接返回Q&A答案
                  </p>
                  <div className="flex justify-between text-xs text-green-300/50 mt-1">
                    <span>0.80 (宽松)</span>
                    <span>0.90 (推荐)</span>
                    <span>0.99 (严格)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-green-200">建议确认阈值</label>
                    <span className="text-green-300 font-mono text-sm">{formData.qa_suggest_threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.90"
                    step="0.05"
                    value={formData.qa_suggest_threshold}
                    onChange={(e) => setFormData({ ...formData, qa_suggest_threshold: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-green-500/20 rounded-lg appearance-none cursor-pointer accent-green-400"
                  />
                  <p className="text-xs text-green-300/70 mt-2">
                    💡 相似度 ≥ <strong>{formData.qa_suggest_threshold.toFixed(2)}</strong> 时，显示"您是否想问"让用户确认
                  </p>
                  <div className="flex justify-between text-xs text-green-300/50 mt-1">
                    <span>0.20 (宽松)</span>
                    <span>0.55 (推荐)</span>
                    <span>0.90 (严格)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-xs font-medium text-blue-200 mb-1">💡 工作原理</h4>
                <ul className="text-xs text-blue-300/70 space-y-1">
                  <li>• <strong>直接回答</strong>: 相似度很高时，直接给出答案</li>
                  <li>• <strong>建议确认</strong>: 相似度适中时，显示相似问题让用户选择</li>
                  <li>• <strong>忽略</strong>: 相似度过低时，不使用该Q&A</li>
                </ul>
              </div>
            </div>
          )}

          {/* 知识库参数配置 */}
          {formData.enable_vector_kb && (
            <div className="border border-blue-400/30 rounded-xl p-5 bg-blue-500/5 space-y-5">
              <div className="flex items-start gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-white">知识库参数</h3>
                  <p className="text-sm text-blue-300/70 mt-1">
                    配置知识库和检索参数，优化检索效果
                  </p>
                </div>
              </div>

              {/* 知识库选择 */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  📚 知识库选择
                </label>
                <p className="text-xs text-blue-300/70 mb-3">
                  选择一个或多个知识库作为检索来源
                </p>
                {loadingKBs ? (
                  <div className="py-4 text-center text-blue-300">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : knowledgeBases.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {knowledgeBases.map(kb => (
                      <label
                        key={kb.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.knowledge_bases.includes(kb.id)}
                          onChange={() => toggleKnowledgeBase(kb.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">{kb.name}</div>
                          <div className="text-xs text-blue-300/70">
                            文档数: {kb.document_count} | Collection: {kb.collection_name}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 px-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg text-yellow-300 text-sm">
                    还没有知识库，请先创建知识库
                  </div>
                )}
              </div>

              {/* 阈值配置 */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      相似度高阈值
                      <span className="text-xs text-gray-400 ml-2">(0-1)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.similarity_threshold_high}
                      onChange={(e) => setFormData({ ...formData, similarity_threshold_high: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">高于此值直接返回</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      相似度低阈值
                      <span className="text-xs text-gray-400 ml-2">(0-1)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.similarity_threshold_low}
                      onChange={(e) => setFormData({ ...formData, similarity_threshold_low: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">低于此值过滤掉</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Top K
                      <span className="text-xs text-gray-400 ml-2">(1-20)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.top_k}
                      onChange={(e) => setFormData({ ...formData, top_k: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">检索结果数量</p>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* 🆕 策略模式配置（v2.0） */}
          <div className="border border-blue-400/30 rounded-xl p-5 bg-blue-500/5 space-y-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">🎯 策略模式</h3>
                <p className="text-sm text-blue-300/70 mt-1">
                  选择最适合您应用场景的策略模式
                </p>
              </div>
            </div>

            {/* 策略模式选择 */}
            <div className="space-y-3">
              <div
                onClick={() => setFormData({ ...formData, strategy_mode: 'safe_priority' })}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.strategy_mode === 'safe_priority'
                    ? 'border-green-400 bg-green-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={formData.strategy_mode === 'safe_priority'}
                    onChange={() => setFormData({ ...formData, strategy_mode: 'safe_priority' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold flex items-center gap-2">
                      🛡️ 安全优先模式
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded">默认推荐</span>
                    </div>
                    <p className="text-sm text-blue-300/80 mt-1">
                      适合教育、医疗、金融等需要高准确性的场景
                    </p>
                    <div className="mt-2 text-xs text-blue-300/60 space-y-1">
                      <div>✅ <strong>高置信度</strong>: 直接返回固定Q&A答案</div>
                      <div>📚 <strong>中等置信度</strong>: 知识库 + LLM生成</div>
                      <div>⚠️ <strong>低置信度</strong>: 提示用户授权联网（明确告知风险）</div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setFormData({ ...formData, strategy_mode: 'realtime_knowledge' })}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.strategy_mode === 'realtime_knowledge'
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={formData.strategy_mode === 'realtime_knowledge'}
                    onChange={() => setFormData({ ...formData, strategy_mode: 'realtime_knowledge' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold flex items-center gap-2">
                      🌐 实时知识模式
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">追求最新</span>
                    </div>
                    <p className="text-sm text-blue-300/80 mt-1">
                      适合新闻、咨询、实时信息查询等场景
                    </p>
                    <div className="mt-2 text-xs text-blue-300/60 space-y-1">
                      <div>🌐 <strong>高中置信度</strong>: 自动后台联网补充知识库</div>
                      <div>🚫 <strong>低置信度</strong>: 自动拒绝回答（避免误导）</div>
                      <div>🔇 <strong>用户无感知</strong>: 联网过程后台进行</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 详细配置按钮 */}
            <button
              type="button"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-blue-200 text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {showAdvancedConfig ? '收起' : '展开'}详细配置
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`} />
            </button>

            {/* 详细配置面板 */}
            {showAdvancedConfig && (
              <div className="space-y-4 pt-4 border-t border-blue-400/20">
                {/* 固定Q&A阈值 */}
                {formData.enable_fixed_qa && (
                  <div className="p-4 bg-green-500/5 border border-green-400/20 rounded-lg space-y-3">
                    <h4 className="text-sm font-semibold text-green-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      固定Q&A阈值
                    </h4>
                    
                    <div>
                      <label className="text-xs text-green-200/80">直接回答阈值: {formData.qa_direct_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.80"
                        max="0.99"
                        step="0.01"
                        value={formData.qa_direct_threshold}
                        onChange={(e) => setFormData({ ...formData, qa_direct_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-green-300/60 mt-1">高于此值直接返回Q&A答案</p>
                    </div>

                    <div>
                      <label className="text-xs text-green-200/80">建议确认阈值: {formData.qa_suggest_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.20"
                        max="0.90"
                        step="0.05"
                        value={formData.qa_suggest_threshold}
                        onChange={(e) => setFormData({ ...formData, qa_suggest_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-green-300/60 mt-1">高于此值显示问题让用户确认（范围: 0.20-0.90）</p>
                    </div>

                    <div>
                      <label className="text-xs text-green-200/80">最低匹配阈值: {formData.qa_min_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.30"
                        max="0.80"
                        step="0.05"
                        value={formData.qa_min_threshold}
                        onChange={(e) => setFormData({ ...formData, qa_min_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-green-300/60 mt-1">低于此值忽略固定Q&A</p>
                    </div>
                  </div>
                )}

                {/* 知识库阈值 */}
                {formData.enable_vector_kb && (
                  <div className="p-4 bg-purple-500/5 border border-purple-400/20 rounded-lg space-y-3">
                    <h4 className="text-sm font-semibold text-purple-200 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      知识库检索阈值
                    </h4>
                    
                    <div>
                      <label className="text-xs text-purple-200/80">高置信度阈值: {formData.kb_high_confidence_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.70"
                        max="0.95"
                        step="0.05"
                        value={formData.kb_high_confidence_threshold}
                        onChange={(e) => setFormData({ ...formData, kb_high_confidence_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-purple-300/60 mt-1">高于此值直接基于检索结果回答</p>
                    </div>

                    <div>
                      <label className="text-xs text-purple-200/80">提供上下文阈值: {formData.kb_context_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.40"
                        max="0.80"
                        step="0.05"
                        value={formData.kb_context_threshold}
                        onChange={(e) => setFormData({ ...formData, kb_context_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-purple-300/60 mt-1">高于此值给LLM作为上下文</p>
                    </div>

                    <div>
                      <label className="text-xs text-purple-200/80">最低相关性: {formData.kb_min_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.20"
                        max="0.70"
                        step="0.05"
                        value={formData.kb_min_threshold}
                        onChange={(e) => setFormData({ ...formData, kb_min_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-purple-300/60 mt-1">低于此值忽略知识库结果</p>
                    </div>
                  </div>
                )}

                {/* 联网搜索阈值 */}
                {formData.enable_web_search && (
                  <div className="p-4 bg-orange-500/5 border border-orange-400/20 rounded-lg space-y-3">
                    <h4 className="text-sm font-semibold text-orange-200 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      联网搜索阈值
                    </h4>
                    
                    <div>
                      <label className="text-xs text-orange-200/80">显示联网选项阈值: {formData.web_search_trigger_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.50"
                        max="1.00"
                        step="0.05"
                        value={formData.web_search_trigger_threshold}
                        onChange={(e) => setFormData({ ...formData, web_search_trigger_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-orange-300/60 mt-1">低于此值时显示"尝试联网搜索"选项</p>
                    </div>

                    <div>
                      <label className="text-xs text-orange-200/80">自动联网阈值: {formData.web_search_auto_threshold.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.20"
                        max="0.70"
                        step="0.05"
                        value={formData.web_search_auto_threshold}
                        onChange={(e) => setFormData({ ...formData, web_search_auto_threshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-orange-300/60 mt-1">低于此值时自动联网（仅在实时知识模式生效）</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建应用'
              )}
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

// EditApplicationModal组件
function EditApplicationModal({ app, onClose, onSuccess }: {
  app: Application
  onClose: () => void
  onSuccess: () => void
}) {
  const [activeTab, setActiveTab] = useState<'basic' | 'kb' | 'qa' | 'search'>('basic')
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)  // 🔑 添加折叠配置状态
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loadingKBs, setLoadingKBs] = useState(true)
  const [formData, setFormData] = useState({
    name: app.name,
    description: app.description || '',
    is_active: app.is_active,
    temperature: app.temperature || 0.7,
    max_tokens: app.max_tokens || 2000,
    system_prompt: app.system_prompt || '',
    
    // 对话配置
    enable_context: app.enable_context || false,
    
    // 知识库参数
    enable_vector_kb: app.enable_vector_kb,
    top_k: app.top_k || 5,
    knowledge_bases: [] as number[],  // 将在useEffect中加载
    
    // QA参数
    enable_fixed_qa: app.enable_fixed_qa,
    
    // 联网搜索参数
    enable_web_search: app.enable_web_search,
    search_channels: Array.isArray(app.search_channels) ? app.search_channels : [],
    
    // 🆕 策略模式配置（v2.0）
    strategy_mode: (app.strategy_mode || 'safe_priority') as 'safe_priority' | 'realtime_knowledge',
    web_search_auto_threshold: app.web_search_auto_threshold || 0.50,
    
    // 三区间阈值配置
    qa_direct_threshold: (app.fusion_config?.strategy?.qa_direct_threshold) || 0.90,
    qa_suggest_threshold: (app.fusion_config?.strategy?.qa_suggest_threshold) || 0.75,
    qa_min_threshold: (app.fusion_config?.strategy?.qa_min_threshold) || 0.50,
    kb_high_confidence_threshold: (app.fusion_config?.strategy?.kb_high_confidence_threshold) || 0.85,
    kb_context_threshold: (app.fusion_config?.strategy?.kb_context_threshold) || 0.60,
    kb_min_threshold: (app.fusion_config?.strategy?.kb_min_threshold) || 0.40,
    web_search_trigger_threshold: (app.fusion_config?.strategy?.web_search_trigger_threshold) || 0.70,
    
    // 自定义未达阈值回复
    enable_custom_no_result_response: app.enable_custom_no_result_response || false,
    custom_no_result_response: app.custom_no_result_response || '',
    
    // LLM润色
    enable_llm_polish: app.enable_llm_polish !== undefined ? app.enable_llm_polish : true
  })
  const [loading, setLoading] = useState(false)
  
  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases()
    loadApplicationKnowledgeBases()
  }, [])
  
  const loadKnowledgeBases = async () => {
    try {
      setLoadingKBs(true)
      const res = await axios.get(`${API_BASE}/api/knowledge-bases`)
      setKnowledgeBases(res.data.knowledge_bases || [])
    } catch (error) {
      console.error('加载知识库失败:', error)
    } finally {
      setLoadingKBs(false)
    }
  }
  
  const loadApplicationKnowledgeBases = async () => {
    try {
      // 获取应用已关联的知识库ID列表
      const res = await axios.get(`${API_BASE}/api/applications/${app.id}`)
      const appData = res.data
      
      // 从关联关系中提取知识库ID
      // 假设后端返回的格式是 knowledge_bases: [{id: 1}, {id: 2}] 或类似
      if (appData.knowledge_bases && Array.isArray(appData.knowledge_bases)) {
        const kbIds = appData.knowledge_bases.map((kb: any) => 
          typeof kb === 'number' ? kb : kb.id || kb.knowledge_base_id
        )
        setFormData(prev => ({ ...prev, knowledge_bases: kbIds }))
      }
    } catch (error) {
      console.error('加载应用知识库关联失败:', error)
    }
  }
  
  const toggleKnowledgeBase = (kbId: number) => {
    setFormData(prev => ({
      ...prev,
      knowledge_bases: prev.knowledge_bases.includes(kbId)
        ? prev.knowledge_bases.filter(id => id !== kbId)
        : [...prev.knowledge_bases, kbId]
    }))
  }
  
  // 调试：在组件挂载时打印初始值
  useEffect(() => {
    console.log('📊 EditApplicationModal 初始化')
    console.log('app对象:', app)
    console.log('app.fusion_config:', app.fusion_config)
    console.log('app.fusion_config?.strategy:', app.fusion_config?.strategy)
    console.log('app.fusion_config?.strategy?.preset:', app.fusion_config?.strategy?.preset)
    console.log('app.fusion_strategy:', app.fusion_strategy)
    console.log('fusion_strategy_preset初始值:', formData.fusion_strategy_preset)
    console.log('formData完整对象:', formData)
    console.log('app.search_channels:', app.search_channels, typeof app.search_channels)
    console.log('formData.search_channels:', formData.search_channels)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      console.log('🔍 完整的提交数据 formData:', formData)
      
      // 1. 保存应用基础配置（不包含knowledge_bases）
      const { knowledge_bases, ...appConfig } = formData
      const response = await axios.put(`${API_BASE}/api/applications/${app.id}`, appConfig)
      console.log('✅ 应用配置保存成功:', response.data)
      
      // 2. 更新知识库关联
      if (formData.enable_vector_kb) {
        await updateKnowledgeBaseAssociations()
      }
      
      alert('保存成功！')
      onSuccess()
    } catch (error: any) {
      console.error('❌ 更新应用失败:', error)
      console.error('错误详情:', error.response?.data)
      alert(error.response?.data?.detail || '更新失败')
    } finally {
      setLoading(false)
    }
  }
  
  const updateKnowledgeBaseAssociations = async () => {
    try {
      // 获取当前已关联的知识库
      const res = await axios.get(`${API_BASE}/api/applications/${app.id}`)
      const currentKBs = res.data.knowledge_bases || []
      const currentKBIds = currentKBs.map((kb: any) => kb.id)
      
      const selectedKBIds = formData.knowledge_bases
      
      // 找出需要删除的关联（在currentKBIds中但不在selectedKBIds中）
      const toRemove = currentKBIds.filter((id: number) => !selectedKBIds.includes(id))
      
      // 找出需要添加的关联（在selectedKBIds中但不在currentKBIds中）
      const toAdd = selectedKBIds.filter((id: number) => !currentKBIds.includes(id))
      
      console.log('📊 知识库关联更新:', { currentKBIds, selectedKBIds, toRemove, toAdd })
      
      // 删除不再选中的知识库
      for (const kbId of toRemove) {
        try {
          await axios.delete(`${API_BASE}/api/applications/${app.id}/knowledge-bases/${kbId}`)
          console.log(`✅ 已删除知识库关联: ${kbId}`)
        } catch (error) {
          console.error(`❌ 删除知识库关联失败 (${kbId}):`, error)
        }
      }
      
      // 添加新选中的知识库
      for (const kbId of toAdd) {
        try {
          await axios.post(`${API_BASE}/api/applications/${app.id}/knowledge-bases/${kbId}`)
          console.log(`✅ 已添加知识库关联: ${kbId}`)
        } catch (error) {
          console.error(`❌ 添加知识库关联失败 (${kbId}):`, error)
        }
      }
      
      console.log('✅ 知识库关联更新完成')
    } catch (error) {
      console.error('❌ 更新知识库关联失败:', error)
      throw error
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">编辑应用配置</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          
          {/* 选项卡导航 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'basic' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              基本配置
            </button>
            <button
              onClick={() => setActiveTab('kb')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'kb' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              知识库参数
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'qa' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              固定QA参数
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'search' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              联网搜索参数
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* 基本配置 */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">应用名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">应用描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">系统提示词</label>
                  <textarea
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    placeholder="定义AI助手的角色和行为..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Temperature
                      <span className="text-xs text-gray-400 ml-2">(0-2)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">控制回答的随机性</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Max Tokens
                      <span className="text-xs text-gray-400 ml-2">(100-8000)</span>
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="8000"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">最大生成令牌数</p>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="text-white font-medium">激活应用</div>
                    <div className="text-sm text-blue-300/70">是否允许此应用接收请求</div>
                  </div>
                </label>

                {/* 上下文对话 */}
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.enable_context}
                    onChange={(e) => setFormData({ ...formData, enable_context: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="text-white font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      启用上下文对话
                    </div>
                    <div className="text-sm text-blue-300/70">
                      保留对话历史，让AI能理解连续对话的上下文。适合多轮对话场景。
                    </div>
                  </div>
                </label>

                {/* 自定义未达阈值回复 */}
                <div className="border border-white/10 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enable_custom_no_result_response}
                      onChange={(e) => setFormData({ ...formData, enable_custom_no_result_response: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="text-white font-medium">启用自定义未达阈值回复</div>
                      <div className="text-sm text-blue-300/70">当检索结果未达到阈值时，返回自定义提示文本而非回退机制</div>
                    </div>
                  </label>

                  {formData.enable_custom_no_result_response && (
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">自定义回复文本</label>
                      <textarea
                        value={formData.custom_no_result_response}
                        onChange={(e) => setFormData({ ...formData, custom_no_result_response: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50"
                        placeholder="例如：抱歉，这个问题超出我的知识范围了，请联系我们补充知识库或咨询人工客服。"
                        rows={3}
                      />
                      <p className="text-xs text-blue-300/60 mt-1">
                        💡 当所有检索结果的相似度都低于最低阈值时，将显示此文本
                      </p>
                    </div>
                  )}
                </div>

                {/* LLM润色选项 */}
                <div className="border border-white/10 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enable_llm_polish}
                      onChange={(e) => setFormData({ ...formData, enable_llm_polish: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        启用LLM润色（推荐）
                      </div>
                      <div className="text-sm text-blue-300/70 mt-1">
                        使用LLM结合知识库生成更自然、更像真人的回答。禁用后，当置信度≥0.9时会直接返回原始检索结果。
                      </div>
                      <div className="text-xs text-yellow-400/70 mt-2">
                        💡 启用润色：所有回答都经过LLM优化，更自然流畅
                        <br />
                        🎯 禁用润色：高置信度(≥0.9)直接返回知识库原文，更精确快速
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 知识库参数 */}
            {activeTab === 'kb' && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.enable_vector_kb}
                    onChange={(e) => setFormData({ ...formData, enable_vector_kb: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="text-white font-medium">启用向量知识库</div>
                    <div className="text-sm text-blue-300/70">从向量数据库检索相关文档</div>
                  </div>
                </label>

                {formData.enable_vector_kb && (
                  <>
                    {/* 📚 知识库选择 */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h4 className="text-sm font-semibold text-blue-200 mb-2">📚 选择知识库</h4>
                      <p className="text-xs text-blue-300/60 mb-3">
                        选择此应用要使用的向量知识库
                      </p>
                      {loadingKBs ? (
                        <div className="py-4 text-center text-blue-300">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        </div>
                      ) : knowledgeBases.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {knowledgeBases.map(kb => (
                            <label
                              key={kb.id}
                              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors border border-white/10"
                            >
                              <input
                                type="checkbox"
                                checked={formData.knowledge_bases.includes(kb.id)}
                                onChange={() => toggleKnowledgeBase(kb.id)}
                                className="w-4 h-4 accent-blue-500"
                              />
                              <div className="flex-1">
                                <div className="text-white font-medium">{kb.name}</div>
                                {kb.description && (
                                  <div className="text-xs text-blue-300/60 mt-0.5">{kb.description}</div>
                                )}
                                <div className="text-xs text-blue-300/50 mt-1">
                                  📄 文档数: {kb.document_count} | 🗂️ Collection: {kb.collection_name}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center border border-dashed border-white/20 rounded-lg">
                          <Database className="w-12 h-12 text-blue-300/30 mx-auto mb-3" />
                          <p className="text-blue-300/60 text-sm">
                            暂无可用的知识库
                          </p>
                          <p className="text-blue-300/40 text-xs mt-1">
                            请先在"知识库管理"页面创建知识库
                          </p>
                        </div>
                      )}
                      <div className="text-xs text-blue-300/50 mt-2">
                        ℹ️ 已选择 <span className="text-white font-medium">{formData.knowledge_bases.length}</span> 个知识库
                      </div>
                    </div>

                    {/* 🆕 策略预设选择 */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h4 className="text-sm font-semibold text-blue-200 mb-2">🎯 策略预设</h4>
                      <p className="text-xs text-blue-300/60 mb-3">
                        选择适合您场景的预设方案，系统将自动配置所有阈值参数
                      </p>
                      
                      <div
                        onClick={async () => {
                          setFormData({ ...formData, strategy_mode: 'safe_priority' })
                          // 应用预设到应用
                          try {
                            await axios.post(`${API_BASE}/api/applications/${app.id}/apply-preset`, {
                              preset_name: 'safe_priority'
                            })
                            console.log('✅ 已应用安全优先预设')
                          } catch (error) {
                            console.error('❌ 应用预设失败:', error)
                          }
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.strategy_mode === 'safe_priority'
                            ? 'border-green-400 bg-green-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={formData.strategy_mode === 'safe_priority'}
                            onChange={() => {}}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium flex items-center gap-2">
                              🛡️ 安全优先模式
                              {formData.strategy_mode === 'safe_priority' && (
                                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">当前</span>
                              )}
                            </div>
                            <p className="text-xs text-blue-300/70 mt-1">
                              宁可不答，不可乱答。高准确性，低置信度时需要用户授权联网。
                            </p>
                            <p className="text-xs text-blue-300/50 mt-1">
                              📌 适用场景：教育、医疗、法律、金融等对准确性要求高的领域
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={async () => {
                          setFormData({ ...formData, strategy_mode: 'realtime_knowledge' })
                          // 应用预设到应用
                          try {
                            await axios.post(`${API_BASE}/api/applications/${app.id}/apply-preset`, {
                              preset_name: 'realtime_knowledge'
                            })
                            console.log('✅ 已应用实时知识预设')
                          } catch (error) {
                            console.error('❌ 应用预设失败:', error)
                          }
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.strategy_mode === 'realtime_knowledge'
                            ? 'border-blue-400 bg-blue-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={formData.strategy_mode === 'realtime_knowledge'}
                            onChange={() => {}}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium flex items-center gap-2">
                              🌐 实时知识模式
                              {formData.strategy_mode === 'realtime_knowledge' && (
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">当前</span>
                              )}
                            </div>
                            <p className="text-xs text-blue-300/70 mt-1">
                              积极联网获取最新信息，知识库阈值适中，自动触发联网搜索。
                            </p>
                            <p className="text-xs text-blue-300/50 mt-1">
                              📌 适用场景：新闻资讯、实时数据查询等需要时效性的场景
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 高级配置展开/收起按钮 */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                        className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-blue-200 text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        {showAdvancedConfig ? '收起' : '展开'}详细阈值配置
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* 详细阈值配置 */}
                    {showAdvancedConfig && (
                      <div className="space-y-4 pt-4 border-t border-white/10 bg-slate-700/30 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-200">三区间阈值配置</h4>
                        
                        {/* 固定Q&A阈值 */}
                        {formData.enable_fixed_qa && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-green-200">固定Q&A阈值</div>
                            <div>
                              <label className="text-xs text-green-200/80">直接回答: {formData.qa_direct_threshold.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0.80"
                                max="0.99"
                                step="0.01"
                                value={formData.qa_direct_threshold}
                                onChange={(e) => setFormData({ ...formData, qa_direct_threshold: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-green-500/20 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-200/80">建议确认: {formData.qa_suggest_threshold.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0.20"
                                max="0.90"
                                step="0.05"
                                value={formData.qa_suggest_threshold}
                                onChange={(e) => setFormData({ ...formData, qa_suggest_threshold: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-green-500/20 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-200/80">最低匹配: {formData.qa_min_threshold.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0.30"
                                max="0.80"
                                step="0.05"
                                value={formData.qa_min_threshold}
                                onChange={(e) => setFormData({ ...formData, qa_min_threshold: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-green-500/20 rounded-lg"
                              />
                            </div>
                          </div>
                        )}

                        {/* 知识库阈值 */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-purple-200">知识库阈值</div>
                          <div>
                            <label className="text-xs text-purple-200/80">高置信度: {formData.kb_high_confidence_threshold.toFixed(2)}</label>
                            <input
                              type="range"
                              min="0.70"
                              max="0.95"
                              step="0.05"
                              value={formData.kb_high_confidence_threshold}
                              onChange={(e) => setFormData({ ...formData, kb_high_confidence_threshold: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-purple-500/20 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-purple-200/80">提供上下文: {formData.kb_context_threshold.toFixed(2)}</label>
                            <input
                              type="range"
                              min="0.40"
                              max="0.80"
                              step="0.05"
                              value={formData.kb_context_threshold}
                              onChange={(e) => setFormData({ ...formData, kb_context_threshold: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-purple-500/20 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-purple-200/80">最低相关性: {formData.kb_min_threshold.toFixed(2)}</label>
                            <input
                              type="range"
                              min="0.20"
                              max="0.70"
                              step="0.05"
                              value={formData.kb_min_threshold}
                              onChange={(e) => setFormData({ ...formData, kb_min_threshold: parseFloat(e.target.value) })}
                              className="w-full h-2 bg-purple-500/20 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* 联网搜索阈值 */}
                        {formData.enable_web_search && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-orange-200">联网搜索阈值</div>
                            <div>
                              <label className="text-xs text-orange-200/80">显示联网选项: {formData.web_search_trigger_threshold.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0.50"
                                max="1.00"
                                step="0.05"
                                value={formData.web_search_trigger_threshold}
                                onChange={(e) => setFormData({ ...formData, web_search_trigger_threshold: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-orange-500/20 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-orange-200/80">自动联网: {formData.web_search_auto_threshold.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0.20"
                                max="0.70"
                                step="0.05"
                                value={formData.web_search_auto_threshold}
                                onChange={(e) => setFormData({ ...formData, web_search_auto_threshold: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-orange-500/20 rounded-lg"
                              />
                              <p className="text-xs text-orange-300/60 mt-1">仅在实时知识模式生效</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-200 mb-2">
                          Top K
                          <span className="text-xs text-gray-400 ml-2">(1-20)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.top_k}
                          onChange={(e) => setFormData({ ...formData, top_k: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">检索结果数量</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 固定QA参数 */}
            {activeTab === 'qa' && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.enable_fixed_qa}
                    onChange={(e) => setFormData({ ...formData, enable_fixed_qa: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="text-white font-medium">启用固定Q&A</div>
                    <div className="text-sm text-blue-300/70">使用预定义的问答对进行精确匹配，响应速度快</div>
                  </div>
                </label>

                {formData.enable_fixed_qa && (
                  <>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-4">
                      <h4 className="text-sm font-semibold text-green-200 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        智能匹配配置
                      </h4>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-green-200">直接回答阈值</label>
                          <span className="text-green-300 font-mono text-sm">{formData.qa_direct_threshold?.toFixed(2) || '0.90'}</span>
                        </div>
                        <input
                          type="range"
                          min="0.80"
                          max="0.99"
                          step="0.01"
                          value={formData.qa_direct_threshold || 0.90}
                          onChange={(e) => setFormData({ ...formData, qa_direct_threshold: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-green-500/20 rounded-lg appearance-none cursor-pointer accent-green-400"
                        />
                        <p className="text-xs text-green-300/70 mt-2">
                          ✅ 相似度 ≥ <strong>{(formData.qa_direct_threshold || 0.90).toFixed(2)}</strong> 时，直接返回Q&A答案
                        </p>
                        <div className="flex justify-between text-xs text-green-300/50 mt-1">
                          <span>0.80 (宽松)</span>
                          <span>0.90 (推荐)</span>
                          <span>0.99 (严格)</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-green-200">建议确认阈值</label>
                          <span className="text-green-300 font-mono text-sm">{formData.qa_suggest_threshold?.toFixed(2) || '0.55'}</span>
                        </div>
                        <input
                          type="range"
                          min="0.20"
                          max="0.90"
                          step="0.05"
                          value={formData.qa_suggest_threshold || 0.55}
                          onChange={(e) => setFormData({ ...formData, qa_suggest_threshold: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-green-500/20 rounded-lg appearance-none cursor-pointer accent-green-400"
                        />
                        <p className="text-xs text-green-300/70 mt-2">
                          💡 相似度 ≥ <strong>{(formData.qa_suggest_threshold || 0.55).toFixed(2)}</strong> 时，显示"您是否想问"让用户确认
                        </p>
                        <div className="flex justify-between text-xs text-green-300/50 mt-1">
                          <span>0.20 (宽松)</span>
                          <span>0.55 (推荐)</span>
                          <span>0.90 (严格)</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-200 mb-2">💡 工作原理</h4>
                      <ul className="text-xs text-blue-300/70 space-y-1">
                        <li>• <strong>直接回答</strong>: 当用户问题与Q&A相似度很高时，直接给出答案</li>
                        <li>• <strong>建议确认</strong>: 当相似度适中时，显示相似问题让用户选择</li>
                        <li>• <strong>忽略</strong>: 相似度过低时，不使用该Q&A</li>
                        <li>• 💡 在应用详情页面可以管理具体的Q&A对</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 联网搜索参数 */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.enable_web_search}
                    onChange={(e) => setFormData({ ...formData, enable_web_search: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="text-white font-medium">启用联网搜索</div>
                    <div className="text-sm text-blue-300/70">从互联网获取实时信息</div>
                  </div>
                </label>

                {formData.enable_web_search && (
                  <>
                    <div className="p-4 bg-orange-500/10 border border-orange-400/20 rounded-lg space-y-4">
                      <h4 className="text-sm font-semibold text-orange-200 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        🎯 联网搜索触发策略
                      </h4>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-orange-200">触发阈值</label>
                          <span className="text-orange-300 font-mono text-sm">{formData.web_search_trigger_threshold.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.50"
                          max="1.00"
                          step="0.05"
                          value={formData.web_search_trigger_threshold}
                          onChange={(e) => setFormData({ ...formData, web_search_trigger_threshold: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-orange-500/20 rounded-lg appearance-none cursor-pointer accent-orange-400"
                        />
                        <p className="text-xs text-orange-300/70 mt-2">
                          ℹ️ 当其他知识源的最高相似度 &lt; <strong>{formData.web_search_trigger_threshold.toFixed(2)}</strong> 时，启用联网搜索获取最新信息
                        </p>
                        <div className="flex justify-between text-xs text-orange-300/50 mt-1">
                          <span>0.50 (频繁触发)</span>
                          <span>0.70 (推荐)</span>
                          <span>1.00 (很少触发)</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">搜索渠道</label>
                      <div className="space-y-2">
                        {['tavily', 'serper', 'google', 'serpapi'].map((channel) => (
                          <label key={channel} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5">
                            <input
                              type="checkbox"
                              checked={formData.search_channels.includes(channel)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    search_channels: [...formData.search_channels, channel]
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    search_channels: formData.search_channels.filter(c => c !== channel)
                                  })
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-white">{channel === 'tavily' ? 'Cbit AI 搜索' : channel}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-blue-300/70 mt-2">💡 推荐使用 Cbit AI 搜索，专为AI优化</p>
                    </div>
                  </>
                )}

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-200 mb-2">💡 提示</h4>
                  <ul className="text-xs text-blue-300/70 space-y-1">
                    <li>• 联网搜索提供最新信息，但响应速度较慢</li>
                    <li>• 适合需要实时数据的场景（如新闻、天气等）</li>
                    <li>• 建议权重低于知识库和固定Q&A</li>
                    <li>• 需要在系统设置中配置搜索引擎API</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="p-6 border-t border-white/10 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              保存更改
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

// PlaygroundModal组件
function PlaygroundModal({ app, onClose }: {
  app: Application
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Array<{role: string, content: string, metadata?: any, cbitMetadata?: any, needsConfirmation?: boolean, originalQuestion?: string}>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (skipFixedQA: boolean = false, selectedQAId: number | null = null) => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    if (!selectedQAId) {
      setInput('')
    }
    
    // 如果不是选择Q&A，则添加用户消息到列表
    if (!selectedQAId) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    }
    
    setLoading(true)

    try {
      const requestBody: any = {
        messages: [{ role: 'user', content: userMessage }],
        stream: false
      }
      
      // 添加特殊参数
      if (skipFixedQA) {
        requestBody.skip_fixed_qa = true
      }
      if (selectedQAId) {
        requestBody.selected_qa_id = selectedQAId
      }
      
      const response = await axios.post(
        `${API_BASE}/api/apps/${app.endpoint_path}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${app.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const assistantMessage = response.data.choices[0].message
      const cbitMetadata = response.data.cbit_metadata
      // 🔑 metadata 可能在 message 内部或响应顶层
      const metadata = assistantMessage.metadata || response.data.metadata
      
      // 🐛 调试日志
      console.log('📩 收到响应:', {
        content: assistantMessage.content.substring(0, 100),
        metadata: metadata,
        hasWebSearchAuth: metadata?.requires_web_search_auth
      })
      
      // 检查是否需要用户确认
      if (cbitMetadata?.needs_confirmation && cbitMetadata?.suggested_questions) {
        // 显示Q&A确认界面，保存原始问题
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',
          metadata: metadata,
          cbitMetadata: cbitMetadata,
          needsConfirmation: true,
          originalQuestion: userMessage  // 保存原始问题
        }])
      } else {
        // 正常显示回复
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage.content,
          metadata: metadata,
          cbitMetadata: cbitMetadata
        }])
      }
    } catch (error: any) {
      console.error('发送消息失败:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ 错误: ${error.response?.data?.detail || error.message || '请求失败'}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  // 处理Q&A选择
  const handleSelectQA = async (qaId: number, originalQuestion: string) => {
    setLoading(true)
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/apps/${app.endpoint_path}/chat/completions`,
        {
          messages: [{ role: 'user', content: originalQuestion }],
          stream: false,
          selected_qa_id: qaId
        },
        {
          headers: {
            'Authorization': `Bearer ${app.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const assistantMessage = response.data.choices[0].message
      const cbitMetadata = response.data.cbit_metadata
      const metadata = assistantMessage.metadata || response.data.metadata
      
      // 替换确认消息为实际答案
      setMessages(prev => {
        const updated = [...prev]
        // 移除最后一条确认消息
        updated.pop()
        // 添加答案
        updated.push({
          role: 'assistant',
          content: assistantMessage.content,
          metadata: metadata,
          cbitMetadata: cbitMetadata
        })
        return updated
      })
    } catch (error: any) {
      console.error('获取Q&A答案失败:', error)
      const errorMsg = error.response?.data?.detail || error.message || '请求失败'
      setMessages(prev => {
        const updated = [...prev]
        updated.pop()
        updated.push({
          role: 'assistant',
          content: `❌ 错误: ${errorMsg}`,
        })
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  // 处理继续思考
  const handleContinueThinking = async (originalQuestion: string) => {
    setLoading(true)

    try {
      const response = await axios.post(
        `${API_BASE}/api/apps/${app.endpoint_path}/chat/completions`,
        {
          messages: [{ role: 'user', content: originalQuestion }],
          stream: false,
          skip_fixed_qa: true
        },
        {
          headers: {
            'Authorization': `Bearer ${app.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const assistantMessage = response.data.choices[0].message
      const cbitMetadata = response.data.cbit_metadata
      const metadata = assistantMessage.metadata || response.data.metadata
      
      // 替换确认消息为实际答案
      setMessages(prev => {
        const updated = [...prev]
        updated.pop()
        updated.push({
          role: 'assistant',
          content: assistantMessage.content,
          metadata: metadata,
          cbitMetadata: cbitMetadata
        })
        return updated
      })
    } catch (error: any) {
      console.error('LLM思考失败:', error)
      const errorMsg = error.response?.data?.detail || error.message || '请求失败'
      setMessages(prev => {
        const updated = [...prev]
        updated.pop()
        updated.push({
          role: 'assistant',
          content: `❌ 错误: ${errorMsg}`,
        })
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] border border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TestTube className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">测试应用</h2>
              <p className="text-blue-200 text-sm">{app.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-blue-300/50">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>开始对话测试您的应用</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="max-w-[70%] rounded-xl p-4 bg-blue-500 text-white">
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ) : (msg as any).needsConfirmation ? (
                      // Q&A确认界面
                      <div className="max-w-[80%] rounded-xl p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-400/30">
                        <div className="text-green-300 font-medium mb-3 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          我找到了一些相关的问答，请选择您想了解的：
                        </div>
                        <div className="space-y-2 mb-4">
                          {msg.cbitMetadata?.suggested_questions?.map((suggestion: any, qIdx: number) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSelectQA(suggestion.qa_id, (msg as any).originalQuestion)}
                              disabled={loading}
                              className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-green-400/50 rounded-lg text-white transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium group-hover:text-green-300 transition-colors">
                                    {suggestion.question}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    相似度: {(suggestion.similarity * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleContinueThinking((msg as any).originalQuestion)}
                          disabled={loading}
                          className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded-lg text-purple-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Sparkles className="w-4 h-4" />
                          不，请继续思考
                        </button>
                      </div>
                    ) : (
                      // 正常回复
                      <div className="max-w-[70%] rounded-xl p-4 bg-white/10 text-white">
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        
                        {/* 🌐 安全优先模式：联网搜索授权按钮 */}
                        {msg.metadata?.requires_web_search_auth && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <button
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  '🌐 启用联网搜索\n\n将从多个可靠来源检索最新信息。\n\n是否继续？'
                                )
                                
                                if (!confirmed) return
                                
                                const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user')
                                if (!lastUserMsg) {
                                  alert('无法找到原始问题')
                                  return
                                }
                                
                                const loadingMsg = {
                                  role: 'assistant' as const,
                                  content: '🔍 正在联网搜索并重新分析...'
                                }
                                setMessages([...messages, loadingMsg])
                                setLoading(true)
                                
                                try {
                                  const response = await fetch(`${API_BASE}/api/apps/${app.endpoint_path}/chat/completions`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${app.api_key}`
                                    },
                                    body: JSON.stringify({
                                      messages: [{ role: 'user', content: lastUserMsg.content }],
                                      temperature: app.temperature || 0.7,
                                      max_tokens: app.max_tokens || 1000,
                                      stream: false,
                                      force_web_search: true
                                    })
                                  })
                                  
                                  if (!response.ok) {
                                    throw new Error(`HTTP ${response.status}`)
                                  }
                                  
                                  const data = await response.json()
                                  
                                  setMessages(prev => {
                                    const withoutLoading = prev.slice(0, -1)
                                    return [...withoutLoading, {
                                      role: 'assistant' as const,
                                      content: data.choices[0].message.content,
                                      metadata: data.choices[0].message.metadata,
                                      cbitMetadata: data.cbit_metadata
                                    }]
                                  })
                                } catch (error) {
                                  console.error('联网搜索失败:', error)
                                  setMessages(prev => {
                                    const withoutLoading = prev.slice(0, -1)
                                    return [...withoutLoading, {
                                      role: 'assistant' as const,
                                      content: '❌ 联网搜索失败，请稍后重试。'
                                    }]
                                  })
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-400/30 rounded-lg text-sm text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={loading}
                            >
                              <Globe className="w-5 h-5" />
                              {loading ? '搜索中...' : '🌐 尝试联网搜索更多信息'}
                            </button>
                            <p className="text-xs text-blue-300/60 text-center mt-2">
                              将从多个可靠来源检索最新信息
                            </p>
                          </div>
                        )}
                        
                        {msg.metadata && (
                          <div className="mt-3 pt-3 border-t border-white/10 text-xs space-y-3">
                            {/* ⚠️ 只在非准确优先策略时显示传统来源标签 */}
                            {!msg.metadata._strategy_info && !msg.metadata.requires_web_search_auth && (
                              <>
                                {/* 🔹 日常对话：不显示任何来源信息 */}
                                {msg.metadata.source === 'llm_casual' ? null : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-blue-200 font-medium">来源:</span>
                                    {msg.metadata.matched_source_display === '固定Q&A' ? (
                                      // 固定Q&A直达，不经过模型
                                      <>
                                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                          固定Q&A
                                        </span>
                                        <span className="text-green-300/70">
                                          {(msg.metadata.retrieval_confidence * 100).toFixed(1)}%
                                        </span>
                                      </>
                                    ) : (
                                      // 其他所有情况都通过模型生成
                                      <>
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                          CBIT-Training Model
                                        </span>
                                        {msg.metadata.retrieval_confidence !== undefined && msg.metadata.retrieval_confidence !== null && (
                                          <span className="text-blue-300/70">
                                            综合置信度: {(msg.metadata.retrieval_confidence * 100).toFixed(1)}%
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          
                          {/* ⭐ 准确优先策略 - OpenAI风格引用 */}
                          {msg.metadata._strategy_info && msg.metadata._strategy_info.tier && (() => {
                            const strategyInfo = msg.metadata._strategy_info;
                            const citations = strategyInfo.citations || [];
                            
                            // 限制最多3条引用，优先不同来源/时间
                            const topCitations = citations.slice(0, 3);
                            
                            return (
                              <div className="space-y-2">
                                {/* 📌 置信度小字标签（末尾，不显示数字） */}
                                <div className="text-xs text-blue-300/60">
                                  置信：{
                                    strategyInfo.tier === 'A' ? '高' :
                                    strategyInfo.tier === 'B' ? '中' :
                                    '低'
                                  }
                                </div>
                                
                                {/* 📚 脚注引用（最多3条，OpenAI风格） */}
                                {topCitations.length > 0 && (
                                  <div className="space-y-1">
                                    {topCitations.map((citation: any) => {
                                      const isKB = citation.source_name?.includes('知识库') || citation.source_type === 'kb';
                                      const isWeb = citation.source_type === 'web' || citation.source_name?.includes('Cbit AI');
                                      
                                      return (
                                        <div key={citation.id} className="text-xs text-blue-300/70 hover:text-blue-200/90 transition-colors">
                                          <span className="text-blue-400/90 font-medium">[{citation.id}]</span>
                                          {' '}
                                          {isKB ? (
                                            <>
                                              <span className="text-blue-300/60">KB —</span>
                                              {' '}
                                              <span className="text-blue-200/80">{citation.title || '文档'}</span>
                                              {citation.source_name && (
                                                <>
                                                  {' · '}
                                                  <span className="text-blue-300/60">{citation.source_name}</span>
                                                </>
                                              )}
                                            </>
                                          ) : isWeb ? (
                                            <>
                                              <span className="text-blue-300/60">Web —</span>
                                              {' '}
                                              {citation.url ? (
                                                <a 
                                                  href={citation.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="text-blue-200/80 hover:underline"
                                                  title={citation.title || citation.url}
                                                >
                                                  {citation.title || '网页'}
                                                </a>
                                              ) : (
                                                <span className="text-blue-200/80">{citation.title || '网页'}</span>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-blue-300/60">来源 —</span>
                                              {' '}
                                              <span className="text-blue-200/80">{citation.title || citation.source_name || '未知'}</span>
                                            </>
                                          )}
                                          {/* 显示相似度/相关度 */}
                                          {citation._internal_score !== undefined && citation._internal_score !== null && (
                                            <>
                                              {' · '}
                                              <span className="text-blue-400/80 font-mono">
                                                {(citation._internal_score * 100).toFixed(0)}%
                                              </span>
                                            </>
                                          )}
                                          {citation.date && (
                                            <>
                                              {' · '}
                                              <span className="text-blue-300/50">{citation.date}</span>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* 🔻 折叠解释（一行） */}
                                {strategyInfo.explanation && (
                                  <details className="group">
                                    <summary className="cursor-pointer text-blue-300/60 hover:text-blue-200/80 text-xs flex items-center gap-1 transition-colors select-none">
                                      <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                      依据说明
                                    </summary>
                                    <div className="mt-1.5 pl-4 text-xs text-blue-200/70 leading-relaxed">
                                      {(() => {
                                        // 解析 explanation 并将 URL 转换为可点击的链接
                                        const explanation = strategyInfo.explanation;
                                        // 匹配 "链接: URL" 的模式
                                        const urlRegex = /链接:\s*(https?:\/\/[^\s]+)/g;
                                        const parts = [];
                                        let lastIndex = 0;
                                        let match;
                                        
                                        while ((match = urlRegex.exec(explanation)) !== null) {
                                          // 添加URL之前的文本
                                          if (match.index > lastIndex) {
                                            parts.push(
                                              <span key={`text-${lastIndex}`}>
                                                {explanation.substring(lastIndex, match.index)}
                                              </span>
                                            );
                                          }
                                          
                                          // 添加"链接: "文本
                                          parts.push(
                                            <span key={`label-${match.index}`}>链接: </span>
                                          );
                                          
                                          // 添加可点击的URL
                                          const url = match[1];
                                          parts.push(
                                            <a
                                              key={`url-${match.index}`}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-400 hover:text-blue-300 underline"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {url}
                                            </a>
                                          );
                                          
                                          lastIndex = urlRegex.lastIndex;
                                        }
                                        
                                        // 添加剩余的文本
                                        if (lastIndex < explanation.length) {
                                          parts.push(
                                            <span key={`text-${lastIndex}`}>
                                              {explanation.substring(lastIndex)}
                                            </span>
                                          );
                                        }
                                        
                                        return parts.length > 0 ? parts : explanation;
                                      })()}
                                    </div>
                                  </details>
                                )}
                                
                                {/* B档/C档：联网授权按钮 */}
                                {strategyInfo.web_search_option && (
                                  <div className="pt-2 border-t border-white/10">
                                    <button
                                      onClick={async () => {
                                        // 确认对话框
                                        const confirmed = window.confirm(
                                          '🌐 启用联网搜索\n\n将从多个可靠来源检索最新信息，需要多源一致才会采用。\n\n是否继续？'
                                        )
                                        
                                        if (!confirmed) return
                                        
                                        // 获取当前对话的最后一个用户消息
                                        const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user')
                                        if (!lastUserMsg) {
                                          alert('无法找到原始问题')
                                          return
                                        }
                                        
                                        // 显示加载状态
                                        const loadingMsg = {
                                          role: 'assistant' as const,
                                          content: '🔍 正在联网搜索并重新分析...'
                                        }
                                        setMessages([...messages, loadingMsg])
                                        setLoading(true)
                                        
                                        try {
                                          // 发送带有强制联网标记的请求
                                          const response = await fetch(`${API_BASE}/api/apps/${app.endpoint_path}/chat/completions`, {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${app.api_key}`
                                            },
                                            body: JSON.stringify({
                                              messages: [{ role: 'user', content: lastUserMsg.content }],
                                              temperature: app.temperature || 0.7,
                                              max_tokens: app.max_tokens || 1000,
                                              stream: false,
                                              force_web_search: true  // 🔑 关键：强制启用联网搜索
                                            })
                                          })
                                          
                                          if (!response.ok) {
                                            throw new Error(`HTTP ${response.status}`)
                                          }
                                          
                                          const data = await response.json()
                                          
                                          // 移除加载消息，添加真实结果
                                          setMessages(prev => {
                                            const withoutLoading = prev.slice(0, -1)
                                            return [...withoutLoading, {
                                              role: 'assistant' as const,
                                              content: data.choices[0].message.content,
                                              metadata: data.choices[0].message.metadata,
                                              cbitMetadata: data.cbit_metadata
                                            }]
                                          })
                                        } catch (error) {
                                          console.error('联网搜索失败:', error)
                                          // 移除加载消息，显示错误
                                          setMessages(prev => {
                                            const withoutLoading = prev.slice(0, -1)
                                            return [...withoutLoading, {
                                              role: 'assistant' as const,
                                              content: '❌ 联网搜索失败，请稍后重试。'
                                            }]
                                          })
                                        } finally {
                                          setLoading(false)
                                        }
                                      }}
                                      className="w-full px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-400/30 rounded-lg text-sm text-purple-200 font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={loading}
                                    >
                                      <Globe className="w-4 h-4" />
                                      {loading ? '搜索中...' : '尝试联网搜索更多信息'}
                                    </button>
                                    <p className="text-xs text-blue-300/50 text-center mt-1">
                                      将从多个可靠来源检索最新信息（需多源一致才采用）
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          
                          {/* 性能指标 */}
                          {msg.metadata.timing && (
                            <div className="text-blue-300/70">
                              检索: {msg.metadata.timing.retrieval_ms.toFixed(0)}ms | 
                              生成: {msg.metadata.timing.generation_ms.toFixed(0)}ms
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 显示建议问题（CBIT扩展功能） */}
                      {msg.cbitMetadata?.suggested_questions && msg.cbitMetadata.suggested_questions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="text-sm text-green-300 font-medium mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            您是否想问：
                          </div>
                          <div className="space-y-2">
                            {msg.cbitMetadata.suggested_questions.map((suggestion: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setInput(suggestion.question)
                                }}
                                className="w-full text-left px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-400/30 rounded-lg text-sm text-green-200 transition-colors flex items-start gap-2"
                              >
                                <span className="text-green-400 mt-0.5">•</span>
                                <span className="flex-1">
                                  {suggestion.question}
                                  <span className="text-green-400/70 ml-2 text-xs">
                                    ({(suggestion.similarity * 100).toFixed(0)}% 相似)
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-xl p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/10">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="输入消息测试应用..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  发送
                </button>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="w-80 border-l border-white/10 bg-white/5 p-6 overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">应用信息</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-blue-300">模型</div>
                <div className="text-white">{app.ai_provider}/{app.llm_model}</div>
              </div>
              <div>
                <div className="text-blue-300">功能</div>
                <div className="space-y-1 mt-1">
                  {app.enable_fixed_qa && (
                    <div className="flex items-center gap-2 text-green-300">
                      <CheckCircle2 className="w-4 h-4" />
                      固定Q&A
                    </div>
                  )}
                  {app.enable_vector_kb && (
                    <div className="flex items-center gap-2 text-blue-300">
                      <CheckCircle2 className="w-4 h-4" />
                      向量检索
                    </div>
                  )}
                  {app.enable_web_search && (
                    <div className="flex items-center gap-2 text-purple-300">
                      <CheckCircle2 className="w-4 h-4" />
                      联网搜索
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-blue-300">统计</div>
                <div className="text-white">
                  请求: {app.total_requests} | Token: {app.total_tokens.toLocaleString()}
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <button
                  onClick={() => setMessages([])}
                  className="w-full px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  清空对话
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// FixedQAManagerModal组件
function FixedQAManagerModal({ app, onClose }: {
  app: Application
  onClose: () => void
}) {
  const [qaList, setQaList] = useState<FixedQA[]>([])
  const [filteredQaList, setFilteredQaList] = useState<FixedQA[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingQA, setEditingQA] = useState<FixedQA | null>(null)
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    priority: 0
  })
  const [addMode, setAddMode] = useState<'manual' | 'file'>('manual')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [generatedQAs, setGeneratedQAs] = useState<any[]>([])
  const [generatingFromFile, setGeneratingFromFile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedQAIds, setSelectedQAIds] = useState<number[]>([])
  const [selectedGeneratedIndices, setSelectedGeneratedIndices] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadQAList()
  }, [currentPage, pageSize])

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredQaList(qaList)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = qaList.filter(qa => 
        qa.question.toLowerCase().includes(query) ||
        qa.answer.toLowerCase().includes(query) ||
        (qa.category && qa.category.toLowerCase().includes(query))
      )
      setFilteredQaList(filtered)
    }
  }, [qaList, searchQuery])

  const loadQAList = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * pageSize
      const res = await axios.get(`${API_BASE}/api/fixed-qa?application_id=${app.id}&skip=${skip}&limit=${pageSize}`)
      setQaList(res.data.qa_pairs || [])
      setTotalCount(res.data.total || 0)
      setSelectedQAIds([]) // 重新加载后清空选择
    } catch (error) {
      console.error('加载Q&A列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 高亮搜索文本
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-300 text-gray-900 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post(`${API_BASE}/api/fixed-qa?application_id=${app.id}`, formData)
      setShowAddForm(false)
      setFormData({ question: '', answer: '', category: '', priority: 0 })
      loadQAList()
      alert('✅ 添加成功！已自动生成embedding向量')
    } catch (error: any) {
      console.error('添加Q&A失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '添加失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  const handleUpdate = async (qa: FixedQA) => {
    try {
      await axios.put(`${API_BASE}/api/fixed-qa/${qa.id}?application_id=${app.id}`, {
        question: editingQA?.question,
        answer: editingQA?.answer,
        category: editingQA?.category,
        priority: editingQA?.priority
      })
      setEditingQA(null)
      loadQAList()
      alert('✅ 更新成功！')
    } catch (error: any) {
      console.error('更新Q&A失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '更新失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  const handleDelete = async (qaId: number, question: string) => {
    if (!confirm(`确定删除这个Q&A吗？\n问题：${question}`)) return
    
    try {
      await axios.delete(`${API_BASE}/api/fixed-qa/${qaId}?application_id=${app.id}`)
      loadQAList()
      alert('✅ 删除成功')
    } catch (error: any) {
      console.error('删除Q&A失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '删除失败，请稍后重试'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  const handleToggleActive = async (qa: FixedQA) => {
    try {
      await axios.put(`${API_BASE}/api/fixed-qa/${qa.id}?application_id=${app.id}`, {
        is_active: !qa.is_active
      })
      loadQAList()
    } catch (error: any) {
      console.error('切换状态失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '切换状态失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  const handleRegenerateEmbedding = async (qaId: number) => {
    try {
      await axios.post(`${API_BASE}/api/fixed-qa/${qaId}/regenerate-embedding?application_id=${app.id}`)
      alert('✅ Embedding重新生成成功')
      loadQAList()
    } catch (error: any) {
      console.error('重新生成embedding失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '重新生成失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['.txt', '.docx', '.pdf']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validTypes.includes(fileExt)) {
      alert('仅支持 TXT、DOCX、PDF 格式的文件')
      return
    }

    setUploadedFile(file)
  }

  const handleGenerateFromFile = async () => {
    if (!uploadedFile) {
      alert('请先选择文件')
      return
    }

    try {
      setGeneratingFromFile(true)
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await axios.post(
        `${API_BASE}/api/fixed-qa/generate-from-file?application_id=${app.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      setGeneratedQAs(response.data.qa_pairs || [])
      alert(`✅ 成功生成 ${response.data.count} 个Q&A对！请预览和编辑后批量添加。`)
    } catch (error: any) {
      console.error('生成Q&A失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '生成失败，请稍后重试'
      alert(`生成Q&A失败: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`)
    } finally {
      setGeneratingFromFile(false)
    }
  }

  const handleBatchAdd = async () => {
    if (generatedQAs.length === 0) {
      alert('没有要添加的Q&A')
      return
    }

    try {
      await axios.post(`${API_BASE}/api/fixed-qa/batch?application_id=${app.id}`, {
        qa_pairs: generatedQAs
      })
      
      setShowAddForm(false)
      setGeneratedQAs([])
      setUploadedFile(null)
      setAddMode('manual')
      loadQAList()
      alert(`✅ 成功添加 ${generatedQAs.length} 个Q&A！`)
    } catch (error: any) {
      console.error('批量添加失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '批量添加失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  const handleEditGeneratedQA = (index: number, field: string, value: any) => {
    const updated = [...generatedQAs]
    updated[index][field] = value
    setGeneratedQAs(updated)
  }

  const handleDeleteGeneratedQA = (index: number) => {
    setGeneratedQAs(generatedQAs.filter((_, i) => i !== index))
    setSelectedGeneratedIndices(selectedGeneratedIndices.filter(i => i !== index))
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedQAIds.length === 0) {
      alert('请先选择要删除的Q&A')
      return
    }

    if (!confirm(`确定要删除选中的 ${selectedQAIds.length} 个Q&A吗？`)) return

    try {
      await axios.post(`${API_BASE}/api/fixed-qa/batch-delete?application_id=${app.id}`, {
        qa_ids: selectedQAIds
      })
      alert(`✅ 成功删除 ${selectedQAIds.length} 个Q&A`)
      loadQAList()
    } catch (error: any) {
      console.error('批量删除失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '批量删除失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  // 全部删除
  const handleDeleteAll = async () => {
    if (qaList.length === 0) {
      alert('当前没有Q&A可删除')
      return
    }

    if (!confirm(`⚠️ 危险操作：确定要删除所有 ${qaList.length} 个Q&A吗？此操作不可恢复！`)) return

    try {
      await axios.delete(`${API_BASE}/api/fixed-qa/all?application_id=${app.id}`)
      alert(`✅ 成功删除全部 ${qaList.length} 个Q&A`)
      loadQAList()
    } catch (error: any) {
      console.error('全部删除失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '删除失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedQAIds.length === filteredQaList.length) {
      setSelectedQAIds([])
    } else {
      setSelectedQAIds(filteredQaList.map(qa => qa.id))
    }
  }

  // 切换单个选择
  const handleToggleSelect = (qaId: number) => {
    if (selectedQAIds.includes(qaId)) {
      setSelectedQAIds(selectedQAIds.filter(id => id !== qaId))
    } else {
      setSelectedQAIds([...selectedQAIds, qaId])
    }
  }

  // 批量添加选中的生成结果
  const handleBatchAddSelected = async () => {
    if (selectedGeneratedIndices.length === 0) {
      alert('请先选择要添加的Q&A')
      return
    }

    const selectedQAs = selectedGeneratedIndices.map(idx => generatedQAs[idx])

    try {
      await axios.post(`${API_BASE}/api/fixed-qa/batch?application_id=${app.id}`, {
        qa_pairs: selectedQAs
      })
      
      // 删除已添加的项
      setGeneratedQAs(generatedQAs.filter((_, idx) => !selectedGeneratedIndices.includes(idx)))
      setSelectedGeneratedIndices([])
      loadQAList()
      alert(`✅ 成功添加 ${selectedQAs.length} 个Q&A！`)
    } catch (error: any) {
      console.error('批量添加失败:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || '批量添加失败'
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    }
  }

  // 全选/取消全选生成结果
  const handleSelectAllGenerated = () => {
    if (selectedGeneratedIndices.length === generatedQAs.length) {
      setSelectedGeneratedIndices([])
    } else {
      setSelectedGeneratedIndices(generatedQAs.map((_, idx) => idx))
    }
  }

  // 切换生成结果的单个选择
  const handleToggleGeneratedSelect = (index: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedGeneratedIndices.length > 0) {
      // Shift + Click: 范围选择
      const lastSelected = selectedGeneratedIndices[selectedGeneratedIndices.length - 1]
      const start = Math.min(lastSelected, index)
      const end = Math.max(lastSelected, index)
      const range = []
      for (let i = start; i <= end; i++) {
        if (!selectedGeneratedIndices.includes(i)) {
          range.push(i)
        }
      }
      setSelectedGeneratedIndices([...selectedGeneratedIndices, ...range])
    } else {
      // 普通点击：切换单个
      if (selectedGeneratedIndices.includes(index)) {
        setSelectedGeneratedIndices(selectedGeneratedIndices.filter(i => i !== index))
      } else {
        setSelectedGeneratedIndices([...selectedGeneratedIndices, index])
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] border border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <MessageSquare className="w-7 h-7 text-green-400" />
                管理固定Q&A
              </h2>
              <p className="text-blue-200 text-sm mt-1">{app.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                添加Q&A
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* 搜索和批量操作栏 */}
        {!loading && qaList.length > 0 && (
          <div className="px-6 py-4 border-b border-white/10 space-y-3">
            {/* 搜索框 */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索问题、答案或分类..."
                className="w-full px-4 py-2 pl-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <MessageSquare className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* 批量操作按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm bg-white/5 text-blue-300 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                >
                  {selectedQAIds.length === filteredQaList.length ? '取消全选' : '全选'}
                </button>
                {selectedQAIds.length > 0 && (
                  <span className="text-sm text-gray-400">
                    已选择 {selectedQAIds.length} 项
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedQAIds.length > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-1.5 text-sm bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2 border border-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                    批量删除
                  </button>
                )}
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-2 border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4" />
                  全部删除
                </button>
              </div>
            </div>

            {searchQuery && (
              <div className="text-sm text-gray-400">
                找到 {filteredQaList.length} 个结果
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : qaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-blue-300/50">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p>还没有添加固定Q&A</p>
              <p className="text-sm mt-2">点击"添加Q&A"开始创建</p>
            </div>
          ) : filteredQaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-blue-300/50">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p>没有找到匹配的Q&A</p>
              <p className="text-sm mt-2">尝试其他搜索关键词</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQaList.map((qa) => (
                <div
                  key={qa.id}
                  className={`bg-white/5 border rounded-xl p-4 hover:bg-white/10 transition-colors ${
                    !qa.is_active ? 'opacity-50' : ''
                  } ${
                    selectedQAIds.includes(qa.id) ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedQAIds.includes(qa.id)}
                      onChange={() => handleToggleSelect(qa.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />

                    <div className="flex-1">
                      {editingQA?.id === qa.id ? (
                    // 编辑模式
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingQA.question}
                        onChange={(e) => setEditingQA({ ...editingQA, question: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        placeholder="问题"
                      />
                      <textarea
                        value={editingQA.answer}
                        onChange={(e) => setEditingQA({ ...editingQA, answer: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        placeholder="答案"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingQA.category || ''}
                          onChange={(e) => setEditingQA({ ...editingQA, category: e.target.value })}
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                          placeholder="分类（可选）"
                        />
                        <input
                          type="number"
                          value={editingQA.priority}
                          onChange={(e) => setEditingQA({ ...editingQA, priority: parseInt(e.target.value) })}
                          className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                          placeholder="优先级"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(qa)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingQA(null)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 查看模式
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-green-400 font-medium">Q:</span>
                          <p className="flex-1 text-white">{highlightText(qa.question, searchQuery)}</p>
                        </div>
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-blue-400 font-medium">A:</span>
                          <p className="flex-1 text-blue-200/80 whitespace-pre-line">{highlightText(qa.answer, searchQuery)}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-blue-300/70">
                          {qa.category && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                              {highlightText(qa.category, searchQuery)}
                            </span>
                          )}
                          <span>优先级: {qa.priority}</span>
                          <span>点击: {qa.hit_count}次</span>
                          {qa.has_embedding ? (
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              已向量化
                            </span>
                          ) : (
                            <span className="text-yellow-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              未向量化
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(qa)}
                          className={`p-2 rounded-lg transition-colors ${
                            qa.is_active
                              ? 'text-yellow-300 hover:bg-yellow-500/10'
                              : 'text-green-300 hover:bg-green-500/10'
                          }`}
                          title={qa.is_active ? '禁用' : '启用'}
                        >
                          {qa.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleRegenerateEmbedding(qa.id)}
                          className="p-2 text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="重新生成向量"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingQA(qa)}
                          className="p-2 text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(qa.id, qa.question)}
                          className="p-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页控件 */}
          {!loading && totalCount > 0 && (
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="text-sm text-gray-400">
                共 {totalCount} 条，显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} 条
              </div>
              
              <div className="flex items-center gap-2">
                {/* 每页数量选择 */}
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={20}>20条/页</option>
                  <option value={50}>50条/页</option>
                  <option value={100}>100条/页</option>
                  <option value={200}>200条/页</option>
                </select>

                {/* 页码控制 */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    首页
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    上一页
                  </button>
                  
                  <span className="px-4 text-sm text-gray-300">
                    第 {currentPage} / {Math.ceil(totalCount / pageSize)} 页
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    下一页
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                    disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    末页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
            <div className="bg-slate-800 rounded-xl border border-white/10 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">添加新Q&A</h3>
              
              {/* 选项卡 */}
              <div className="flex gap-2 mb-6 border-b border-white/10">
                <button
                  onClick={() => setAddMode('manual')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    addMode === 'manual'
                      ? 'text-green-400 border-b-2 border-green-400'
                      : 'text-blue-300 hover:text-white'
                  }`}
                >
                  手动输入
                </button>
                <button
                  onClick={() => setAddMode('file')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    addMode === 'file'
                      ? 'text-green-400 border-b-2 border-green-400'
                      : 'text-blue-300 hover:text-white'
                  }`}
                >
                  CBIT-Training Model生成（文件上传）
                </button>
              </div>

              {/* 手动输入模式 */}
              {addMode === 'manual' && (
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">问题 *</label>
                    <input
                      type="text"
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      placeholder="用户可能会问的问题"
                      required
                    />
                    <p className="text-xs text-blue-300/70 mt-1">系统会自动为问题生成embedding向量用于语义匹配</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">答案 *</label>
                    <textarea
                      value={formData.answer}
                      onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      placeholder="对应的答案"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">分类</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        placeholder="例如: 招生、课程"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">优先级</label>
                      <input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        placeholder="0"
                      />
                      <p className="text-xs text-blue-300/70 mt-1">数字越大优先级越高</p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                    >
                      添加
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false)
                        setFormData({ question: '', answer: '', category: '', priority: 0 })
                      }}
                      className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}

              {/* 文件上传模式 */}
              {addMode === 'file' && (
                <div className="space-y-4">
                  {generatedQAs.length === 0 ? (
                    // 上传和生成阶段
                    <>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                        <p className="text-white mb-2">上传文档，AI自动生成Q&A</p>
                        <p className="text-sm text-blue-300/70 mb-4">
                          支持 TXT、DOCX、PDF 格式 • 文件大小不超过10MB
                        </p>
                        <input
                          type="file"
                          accept=".txt,.docx,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                        >
                          选择文件
                        </label>
                      </div>

                      {uploadedFile && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-green-400" />
                              <div>
                                <p className="text-white font-medium">{uploadedFile.name}</p>
                                <p className="text-sm text-blue-300/70">
                                  {(uploadedFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setUploadedFile(null)}
                              className="p-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <button
                            onClick={handleGenerateFromFile}
                            disabled={generatingFromFile}
                            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {generatingFromFile ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                AI正在生成Q&A...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" />
                                CBIT-Training Model生成Q&A
                              </>
                            )}
                          </button>
                          <p className="text-xs text-blue-300/70 mt-2 text-center">
                            使用 {app.ai_provider}/{app.llm_model} 模型生成
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    // 预览和编辑阶段
                    <>
                      <div className="mb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-bold text-white">
                            生成结果 ({generatedQAs.length} 条)
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSelectAllGenerated}
                              className="px-3 py-1.5 text-sm bg-white/5 text-blue-300 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                            >
                              {selectedGeneratedIndices.length === generatedQAs.length ? '取消全选' : '全选'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-400">
                            {selectedGeneratedIndices.length > 0 ? (
                              <span>已选择 {selectedGeneratedIndices.length} 项</span>
                            ) : (
                              <span className="text-yellow-300">💡 提示：按住Shift点击可以范围选择</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedGeneratedIndices.length > 0 && (
                              <button
                                onClick={handleBatchAddSelected}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                                添加选中 ({selectedGeneratedIndices.length})
                              </button>
                            )}
                            <button
                              onClick={handleBatchAdd}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              添加全部
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {generatedQAs.map((qa, index) => (
                          <div 
                            key={index} 
                            className={`bg-white/5 border rounded-lg p-4 ${
                              selectedGeneratedIndices.includes(index) ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'
                            }`}
                          >
                            <div className="flex gap-3">
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={selectedGeneratedIndices.includes(index)}
                                onChange={(e) => handleToggleGeneratedSelect(index, e as any)}
                                className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                              />

                              <div className="flex-1 space-y-3">
                                <input
                                  type="text"
                                  value={qa.question}
                                  onChange={(e) => handleEditGeneratedQA(index, 'question', e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                placeholder="问题"
                              />
                              <textarea
                                value={qa.answer}
                                onChange={(e) => handleEditGeneratedQA(index, 'answer', e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                placeholder="答案"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={qa.category || ''}
                                  onChange={(e) => handleEditGeneratedQA(index, 'category', e.target.value)}
                                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                  placeholder="分类"
                                />
                                <input
                                  type="number"
                                  value={qa.priority}
                                  onChange={(e) => handleEditGeneratedQA(index, 'priority', parseInt(e.target.value))}
                                  className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                  placeholder="优先级"
                                />
                                <button
                                  onClick={() => handleDeleteGeneratedQA(index)}
                                  className="p-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setGeneratedQAs([])
                        setUploadedFile(null)
                        setAddMode('manual')
                      }}
                      className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                    >
                      取消
                    </button>
                    {generatedQAs.length > 0 && (
                      <button
                        onClick={() => {
                          setGeneratedQAs([])
                          setUploadedFile(null)
                        }}
                        className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                      >
                        重新上传
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
