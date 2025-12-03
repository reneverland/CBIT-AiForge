import { useState, useEffect } from 'react'
import {
  Boxes,
  Plus,
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
  MessageSquare,
  Upload,
  FileText,
  Sparkles,
  Lightbulb,
  GripVertical,
  HelpCircle
} from 'lucide-react'
import axios from 'axios'
import PresetQuestionsModal from '../components/PresetQuestionsModal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

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
  const [presetQuestionsApp, setPresetQuestionsApp] = useState<Application | null>(null)

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
              onManagePresetQuestions={() => setPresetQuestionsApp(app)}
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
        <FixedQAManagerModal
          app={qaManagerApp}
          onClose={() => setQaManagerApp(null)}
        />
      )}

      {/* 预设问题管理模态框 */}
      {presetQuestionsApp && (
        <PresetQuestionsModal
          appId={presetQuestionsApp.id}
          appName={presetQuestionsApp.name}
          onClose={() => setPresetQuestionsApp(null)}
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
  onManagePresetQuestions: () => void
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
  onManagePresetQuestions,
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
              onClick={onManagePresetQuestions}
              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
              title="常见问题"
            >
              <HelpCircle className="w-5 h-5 text-green-600" />
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
  const [systemPrompt, setSystemPrompt] = useState(
    app?.mode_config?.system_prompt || app?.full_config?.system_prompt || ''
  )
  const [kbThreshold, setKbThreshold] = useState(
    app?.mode_config?.vector_kb_threshold || app?.full_config?.vector_kb_threshold || 0.70
  )
  const [topK, setTopK] = useState(
    app?.mode_config?.top_k || app?.full_config?.top_k || 10
  )
  // QA阈值配置
  const [qaDirectThreshold, setQaDirectThreshold] = useState(
    app?.mode_config?.fusion_config?.strategy?.qa_direct_threshold || 
    app?.full_config?.fusion_config?.strategy?.qa_direct_threshold || 0.85
  )
  const [qaSuggestThreshold, setQaSuggestThreshold] = useState(
    app?.mode_config?.fusion_config?.strategy?.qa_suggest_threshold || 
    app?.full_config?.fusion_config?.strategy?.qa_suggest_threshold || 0.55
  )
  const [enableWebSearch, setEnableWebSearch] = useState(
    app?.mode_config?.allow_web_search !== undefined 
      ? app.mode_config.allow_web_search 
      : app?.full_config?.allow_web_search || false
  )

  // 加载可用模式和模型
  const [modes, setModes] = useState<ModesResponse['modes'] | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsFetchMessage, setModelsFetchMessage] = useState('')
  
  // 知识库相关
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState<any[]>([])
  const [selectedKBIds, setSelectedKBIds] = useState<number[]>(
    app?.knowledge_bases?.map((kb: any) => kb.id) || []
  )

  useEffect(() => {
    loadModes()
    loadModels(aiProvider) // 初始加载时获取默认提供商的模型
    loadKnowledgeBases() // 加载知识库列表
  }, [])

  // 当AI提供商改变时，重新加载模型列表
  useEffect(() => {
    loadModels(aiProvider)
  }, [aiProvider])

  const loadModes = async () => {
    try {
      const res = await axios.get<ModesResponse>(`${API_BASE}/api/applications/modes`)
      setModes(res.data.modes)
    } catch (error) {
      console.error('加载模式失败:', error)
    }
  }

  const loadModels = async (provider: string) => {
    try {
      setLoadingModels(true)
      setModelsFetchMessage('正在获取模型列表...')
      
      const res = await axios.get(`${API_BASE}/api/ai-providers/providers/${provider}/models`)
      
      if (res.data.models && res.data.models.length > 0) {
        setAvailableModels(res.data.models)
        setModelsFetchMessage(res.data.has_config 
          ? `✅ 已获取 ${res.data.models.length} 个可用模型` 
          : `⚠️ 未配置API密钥，显示默认模型`)
        
        // 如果当前选择的模型不在列表中，选择第一个模型
        if (!res.data.models.includes(llmModel)) {
          setLlmModel(res.data.models[0])
        }
      } else {
        setAvailableModels([])
        setModelsFetchMessage('⚠️ 未找到可用模型')
      }
    } catch (error) {
      console.error('加载模型列表失败:', error)
      setAvailableModels([])
      setModelsFetchMessage('❌ 获取模型列表失败')
    } finally {
      setLoadingModels(false)
    }
  }

  const loadKnowledgeBases = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/knowledge-bases`)
      setAvailableKnowledgeBases(res.data.knowledge_bases || [])
    } catch (error) {
      console.error('加载知识库列表失败:', error)
      setAvailableKnowledgeBases([])
    }
  }

  const toggleKBSelection = (kbId: number) => {
    setSelectedKBIds(prev => 
      prev.includes(kbId) 
        ? prev.filter(id => id !== kbId)
        : [...prev, kbId]
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('请输入应用名称')
      return
    }

    try {
      setLoading(true)
      
      // 构建mode_config（合并而不是替换）
      const existingModeConfig = app?.mode_config || {}
      const existingFusionConfig = existingModeConfig.fusion_config || {}
      const existingStrategy = existingFusionConfig.strategy || {}
      
      const newModeConfig = {
        ...existingModeConfig,
        system_prompt: systemPrompt || null,
        vector_kb_threshold: kbThreshold,
        top_k: topK,
        allow_web_search: enableWebSearch,
        // QA阈值配置
        fusion_config: {
          ...existingFusionConfig,
          strategy: {
            ...existingStrategy,
            qa_direct_threshold: qaDirectThreshold,
            qa_suggest_threshold: qaSuggestThreshold
          }
        }
      }
      
      const data: any = {
        name,
        description,
        ai_provider: aiProvider,
        llm_model: llmModel,
        temperature,
        mode,
        mode_config: newModeConfig
      }

      // 添加知识库关联（仅在创建时，编辑时需单独调用API）
      if (!isEdit && selectedKBIds.length > 0) {
        data.knowledge_bases = selectedKBIds.map(kbId => ({
          knowledge_base_id: kbId,
          priority: 1,
          weight: 1.0,
          boost_factor: 1.0
        }))
      }

      if (isEdit) {
        await axios.put(`${API_BASE}/api/applications/${app.id}`, data)
        
        // 编辑模式下，需要单独处理知识库关联
        // 获取当前关联的知识库
        const currentKBIds = app.knowledge_bases?.map((kb: any) => kb.id) || []
        
        // 找出需要添加和删除的
        const toAdd = selectedKBIds.filter(id => !currentKBIds.includes(id))
        const toRemove = currentKBIds.filter((id: number) => !selectedKBIds.includes(id))
        
        // 只有在有变化时才执行操作
        if (toAdd.length > 0 || toRemove.length > 0) {
          // 添加新关联
          for (const kbId of toAdd) {
            try {
              await axios.post(`${API_BASE}/api/applications/${app.id}/knowledge-bases/${kbId}`)
            } catch (error: any) {
              console.error(`添加知识库 ${kbId} 失败:`, error)
              // 如果是"已关联"错误，忽略它
              if (!error.response?.data?.detail?.includes('已关联')) {
                throw error
              }
            }
          }
          
          // 删除旧关联
          for (const kbId of toRemove) {
            try {
              await axios.delete(`${API_BASE}/api/applications/${app.id}/knowledge-bases/${kbId}`)
            } catch (error: any) {
              console.error(`删除知识库 ${kbId} 失败:`, error)
              // 继续执行，不要因为删除失败而中断
            }
          }
        }
        
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
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="openai" className="bg-white text-gray-900">OpenAI</option>
                    <option value="anthropic" className="bg-white text-gray-900">Anthropic</option>
                    <option value="gemini" className="bg-white text-gray-900">Google Gemini</option>
                    <option value="ollama" className="bg-white text-gray-900">Ollama (本地)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LLM模型 {loadingModels && <Loader2 className="inline w-4 h-4 ml-2 animate-spin text-blue-500" />}
                  </label>
                  <select
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    disabled={loadingModels || availableModels.length === 0}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingModels ? (
                      <option className="bg-white text-gray-900">正在加载模型...</option>
                    ) : availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <option key={model} value={model} className="bg-white text-gray-900">
                          {model}
                        </option>
                      ))
                    ) : (
                      <option className="bg-white text-gray-900">无可用模型</option>
                    )}
                  </select>
                  {modelsFetchMessage && (
                    <p className={`text-xs mt-1 ${
                      modelsFetchMessage.includes('✅') ? 'text-green-600' : 
                      modelsFetchMessage.includes('⚠️') ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {modelsFetchMessage}
                    </p>
                  )}
                  
                  {/* Ollama 刷新按钮 */}
                  {aiProvider === 'ollama' && (
                    <button
                      onClick={() => loadModels('ollama')}
                      disabled={loadingModels}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
                      <span className="text-sm">{loadingModels ? '刷新中...' : '刷新Ollama模型'}</span>
                    </button>
                  )}
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

              {/* 关联知识库 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关联知识库 <span className="text-xs text-gray-500">(可选)</span>
                </label>
                {availableKnowledgeBases.length > 0 ? (
                  <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {availableKnowledgeBases.map((kb) => (
                      <label
                        key={kb.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedKBIds.includes(kb.id)}
                          onChange={() => toggleKBSelection(kb.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{kb.name}</span>
                        <span className="text-xs text-gray-500">({kb.collection_name})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm">
                    暂无可用知识库，请先在「知识库管理」中创建知识库
                  </div>
                )}
                {selectedKBIds.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✅ 已选择 {selectedKBIds.length} 个知识库
                  </p>
                )}
              </div>

              {/* 系统提示词 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统提示词 <span className="text-xs text-gray-500">(可选)</span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="例如：你是一个专业的客服助手，负责解答用户关于我们产品和服务的问题。请保持友好、专业的态度..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 系统提示词用于定义AI助手的角色和行为方式。留空则使用默认提示词。
                </p>
              </div>

              {/* 知识库检索阈值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  知识库检索阈值 <span className="text-xs text-gray-500">({(kbThreshold * 100).toFixed(0)}%)</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.05"
                    value={kbThreshold}
                    onChange={(e) => setKbThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>20% (极宽松)</span>
                    <span>70% (推荐)</span>
                    <span>95% (严格)</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 相似度阈值越高，匹配越严格。建议值：60%-75%。
                    {kbThreshold < 0.40 && <span className="text-orange-600"> ⚠️ 当前设置极宽松，可能返回大量不相关的内容。</span>}
                    {kbThreshold < 0.60 && kbThreshold >= 0.40 && <span className="text-yellow-600"> ⚠️ 当前设置较宽松，请注意检查结果相关性。</span>}
                    {kbThreshold > 0.85 && <span className="text-orange-600"> ⚠️ 当前设置较严格，可能找不到相关内容。</span>}
                  </p>
                </div>
              </div>

              {/* Q&A直接匹配阈值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Q&A直接匹配阈值 <span className="text-xs text-gray-500">({(qaDirectThreshold * 100).toFixed(0)}%)</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0.75"
                    max="0.98"
                    step="0.01"
                    value={qaDirectThreshold}
                    onChange={(e) => setQaDirectThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>75% (宽松)</span>
                    <span>85% (推荐)</span>
                    <span>98% (严格)</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 当Q&A相似度≥此阈值时，直接返回固定答案，不走知识库。建议值：85%-90%。
                    {qaDirectThreshold < 0.80 && <span className="text-yellow-600"> ⚠️ 阈值较低，可能返回不精确的答案。</span>}
                    {qaDirectThreshold > 0.92 && <span className="text-orange-600"> ⚠️ 阈值较高，可能导致很少直接匹配。</span>}
                  </p>
                </div>
              </div>

              {/* Q&A建议阈值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Q&A建议阈值 <span className="text-xs text-gray-500">({(qaSuggestThreshold * 100).toFixed(0)}%)</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0.40"
                    max="0.80"
                    step="0.05"
                    value={qaSuggestThreshold}
                    onChange={(e) => setQaSuggestThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>40% (宽松)</span>
                    <span>55% (推荐)</span>
                    <span>80% (严格)</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 当Q&A相似度≥此阈值时，显示"相关问题"建议卡片。建议值：50%-65%。
                    {qaSuggestThreshold < 0.45 && <span className="text-yellow-600"> ⚠️ 阈值较低，可能显示不相关的建议。</span>}
                    {qaSuggestThreshold > 0.70 && <span className="text-orange-600"> ⚠️ 阈值较高，可能很少显示建议。</span>}
                  </p>
                </div>
              </div>

              {/* 检索文档数量 (top_k) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  检索文档数量 (top_k) <span className="text-xs text-gray-500">({topK} 条)</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1 条</span>
                    <span>10 条 (推荐)</span>
                    <span>30 条</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 从知识库中检索的候选文档数量。数量越多，找到相关内容的概率越大，但也会增加处理时间。建议值：5-15。
                    {topK < 5 && <span className="text-yellow-600"> ⚠️ 检索数量较少，可能遗漏相关内容。</span>}
                    {topK > 20 && <span className="text-orange-600"> ⚠️ 检索数量较多，可能增加响应时间和token消耗。</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && modes && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">选择工作模式</h3>
                <p className="text-gray-600">不同模式适用于不同的使用场景</p>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {getModeCard('safe', modes.safe)}
                {getModeCard('standard', modes.standard)}
                {getModeCard('enhanced', modes.enhanced)}
              </div>

              {/* 独立联网搜索开关 */}
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        enableWebSearch ? 'bg-blue-600' : 'bg-gray-400'
                      }`}>
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">🌐 联网搜索</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableWebSearch}
                            onChange={(e) => setEnableWebSearch(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {enableWebSearch 
                          ? '✅ 已启用 - 系统可联网获取实时信息，但需人工核实准确性' 
                          : '❌ 已禁用 - 仅使用知识库和固定Q&A，响应更快更准确'
                        }
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <span>💡 提示:</span>
                        <span>此设置独立于模式，您可以在任何模式下开启或关闭联网搜索</span>
                      </div>
                    </div>
                  </div>
                </div>
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
// 可拖拽的Q&A项组件
function SortableQAItem({ 
  qa, 
  searchQuery, 
  editingQA, 
  selectedQAIds,
  onToggleSelect,
  onEdit, 
  onDelete, 
  onToggleActive, 
  onRegenerateEmbedding, 
  onUpdate,
  onCancelEdit,
  highlightText 
}: {
  qa: FixedQA
  searchQuery: string
  editingQA: FixedQA | null
  selectedQAIds: number[]
  onToggleSelect: (id: number) => void
  onEdit: (qa: FixedQA) => void
  onDelete: (id: number, question: string) => void
  onToggleActive: (qa: FixedQA) => void
  onRegenerateEmbedding: (id: number) => void
  onUpdate: (qa: FixedQA) => void
  onCancelEdit: () => void
  highlightText: (text: string, query: string) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: qa.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 dark:bg-white/5 border rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${
        !qa.is_active ? 'opacity-50' : ''
      } ${
        selectedQAIds.includes(qa.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-white/10'
      } ${
        isDragging ? 'shadow-lg scale-105' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-start pt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="拖拽排序"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selectedQAIds.includes(qa.id)}
          onChange={() => onToggleSelect(qa.id)}
          className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
        />

        <div className="flex-1">
          {editingQA?.id === qa.id ? (
            // 编辑模式
            <div className="space-y-3">
              <input
                type="text"
                value={editingQA.question}
                onChange={(e) => onEdit({ ...editingQA, question: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
                placeholder="问题"
              />
              <textarea
                value={editingQA.answer}
                onChange={(e) => onEdit({ ...editingQA, answer: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
                placeholder="答案"
                rows={3}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingQA.category || ''}
                  onChange={(e) => onEdit({ ...editingQA, category: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
                  placeholder="分类（可选）"
                />
                <input
                  type="number"
                  value={editingQA.priority}
                  onChange={(e) => onEdit({ ...editingQA, priority: parseInt(e.target.value) })}
                  className="w-24 px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
                  placeholder="优先级"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate(qa)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  保存
                </button>
                <button
                  onClick={onCancelEdit}
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
                  <span className="text-green-600 dark:text-green-400 font-medium">Q:</span>
                  <p className="flex-1 text-gray-900 dark:text-white">{highlightText(qa.question, searchQuery)}</p>
                </div>
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">A:</span>
                  <p className="flex-1 text-gray-700 dark:text-blue-200/80 whitespace-pre-line">{highlightText(qa.answer, searchQuery)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-blue-300/70">
                  {qa.category && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded">
                      {highlightText(qa.category, searchQuery)}
                    </span>
                  )}
                  <span>优先级: {qa.priority}</span>
                  <span>点击: {qa.hit_count}次</span>
                  {qa.has_embedding ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      已向量化
                    </span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      未向量化
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleActive(qa)}
                  className={`p-2 rounded-lg transition-colors ${
                    qa.is_active
                      ? 'text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-500/10'
                      : 'text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/10'
                  }`}
                  title={qa.is_active ? '禁用' : '启用'}
                >
                  {qa.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onRegenerateEmbedding(qa.id)}
                  className="p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="重新生成向量"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(qa)}
                  className="p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(qa.id, qa.question)}
                  className="p-2 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition-colors"
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
  )
}

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
  const [viewMode, setViewMode] = useState<'paginated' | 'all'>('paginated')

  useEffect(() => {
    loadQAList()
  }, [currentPage, pageSize, viewMode])

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
      let skip = 0
      let limit = pageSize
      
      // 如果是查看全部模式，加载所有数据
      if (viewMode === 'all') {
        skip = 0
        limit = 10000 // 足够大的数字以加载所有数据
      } else {
        skip = (currentPage - 1) * pageSize
        limit = pageSize
      }
      
      const res = await axios.get(`${API_BASE}/api/fixed-qa?application_id=${app.id}&skip=${skip}&limit=${limit}`)
      setQaList(res.data.qa_pairs || [])
      setTotalCount(res.data.total || 0)
      setSelectedQAIds([]) // 重新加载后清空选择
    } catch (error) {
      console.error('加载Q&A列表失败:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleViewAll = () => {
    setViewMode('all')
    setCurrentPage(1)
  }
  
  const handleViewPaginated = () => {
    setViewMode('paginated')
    setCurrentPage(1)
  }

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8px后才激活拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = filteredQaList.findIndex((qa) => qa.id === active.id)
    const newIndex = filteredQaList.findIndex((qa) => qa.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 更新本地状态
    const newQaList = arrayMove(filteredQaList, oldIndex, newIndex)
    setFilteredQaList(newQaList)
    setQaList(newQaList)

    // 批量更新优先级
    try {
      // 根据新顺序重新计算priority（从高到低）
      const updates = newQaList.map((qa, index) => ({
        id: qa.id,
        priority: newQaList.length - index, // 顶部优先级最高
      }))

      // 批量更新
      await Promise.all(
        updates.map((update) =>
          axios.put(`${API_BASE}/api/fixed-qa/${update.id}?application_id=${app.id}`, {
            priority: update.priority,
          })
        )
      )

      console.log('✅ Q&A顺序已更新')
    } catch (error) {
      console.error('❌ 更新Q&A顺序失败:', error)
      alert('更新顺序失败，请重试')
      // 失败时重新加载
      loadQAList()
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] border border-gray-200 dark:border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <MessageSquare className="w-7 h-7 text-green-500 dark:text-green-400" />
                管理固定Q&A
              </h2>
              <p className="text-gray-600 dark:text-blue-200 text-sm mt-1">{app.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('🔘 点击添加Q&A按钮')
                  try {
                    setShowAddForm(true)
                    console.log('✅ showAddForm已设置为true')
                  } catch (error) {
                    console.error('❌ 设置showAddForm失败:', error)
                    alert('打开表单失败，请查看控制台错误信息')
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                添加Q&A
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* 搜索和批量操作栏 */}
        {!loading && qaList.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 space-y-3">
            {/* 搜索框和查看模式 */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索问题、答案或分类..."
                  className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MessageSquare className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* 查看模式切换 */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                <button
                  onClick={handleViewPaginated}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'paginated'
                      ? 'bg-white dark:bg-blue-500 text-blue-600 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  分页 ({pageSize}条/页)
                </button>
                <button
                  onClick={handleViewAll}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'all'
                      ? 'bg-white dark:bg-blue-500 text-blue-600 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  全部 ({totalCount}条)
                </button>
              </div>
            </div>

            {/* 搜索结果提示 */}
            {searchQuery && (
              <div className="text-sm">
                {viewMode === 'paginated' ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      在当前页找到 {filteredQaList.length} 个结果。
                      {filteredQaList.length < totalCount && (
                        <button
                          onClick={handleViewAll}
                          className="ml-2 underline hover:text-amber-700 dark:hover:text-amber-300"
                        >
                          查看全部{totalCount}条记录以搜索更多结果
                        </button>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="text-blue-600 dark:text-blue-400">
                    在全部{totalCount}条中找到 {filteredQaList.length} 个结果
                  </div>
                )}
              </div>
            )}

            {/* 批量操作按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-white/5 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors border border-gray-300 dark:border-white/10"
                >
                  {selectedQAIds.length === filteredQaList.length ? '取消全选' : '全选'}
                </button>
                {selectedQAIds.length > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    已选择 {selectedQAIds.length} 项
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedQAIds.length > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors flex items-center gap-2 border border-red-200 dark:border-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                    批量删除
                  </button>
                )}
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center gap-2 border border-red-200 dark:border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4" />
                  全部删除
                </button>
              </div>
            </div>

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
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-blue-300/50">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p>没有找到匹配的Q&A</p>
              <p className="text-sm mt-2">尝试其他搜索关键词</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredQaList.map((qa) => qa.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {filteredQaList.map((qa) => (
                    <SortableQAItem
                      key={qa.id}
                      qa={qa}
                      searchQuery={searchQuery}
                      editingQA={editingQA}
                      selectedQAIds={selectedQAIds}
                      onToggleSelect={handleToggleSelect}
                      onEdit={setEditingQA}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                      onRegenerateEmbedding={handleRegenerateEmbedding}
                      onUpdate={handleUpdate}
                      onCancelEdit={() => setEditingQA(null)}
                      highlightText={highlightText}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}


          {/* 分页控件 */}
          {!loading && totalCount > 0 && viewMode === 'paginated' && (
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">添加新Q&A</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setAddMode('manual')
                    setUploadedFile(null)
                    setGeneratedQAs([])
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="关闭"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* 选项卡 */}
              <div className="flex gap-2 mb-6 border-b border-white/10">
                <button
                  onClick={() => setAddMode('manual')}
                  className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                    addMode === 'manual'
                      ? 'text-green-400 border-b-2 border-green-400'
                      : 'text-blue-300 hover:text-white'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  手动输入
                </button>
                <button
                  onClick={() => setAddMode('file')}
                  className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                    addMode === 'file'
                      ? 'text-green-400 border-b-2 border-green-400'
                      : 'text-blue-300 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  文件上传（批量导入/AI生成）
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
                      {/* 🆕 说明卡片 */}
                      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-4">
                        <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          支持两种方式：
                        </h4>
                        <ul className="text-sm text-blue-200/80 space-y-1.5 ml-6">
                          <li className="list-disc">
                            <strong>方式1：结构化格式</strong> - 上传 <code className="px-1.5 py-0.5 bg-white/10 rounded text-xs">问题::答案</code> 格式的文件，自动解析
                          </li>
                          <li className="list-disc">
                            <strong>方式2：AI智能提取</strong> - 上传任意文档，AI自动从内容中生成Q&A（需配置OpenAI API）
                          </li>
                        </ul>
                      </div>

                      <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-400/50 transition-colors">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                        <p className="text-white text-lg font-medium mb-2">上传文档</p>
                        <p className="text-sm text-blue-300/70 mb-4">
                          支持 TXT、DOCX、PDF 格式 • 最大10MB
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
                          className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                        >
                          <span className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            选择文件
                          </span>
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
                            className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white rounded-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-lg"
                          >
                            {generatingFromFile ? (
                              <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>AI正在分析文档...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-6 h-6" />
                                <span>开始处理文档</span>
                              </>
                            )}
                          </button>
                          <div className="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                            <p className="text-xs text-purple-200/90 text-center">
                              💡 系统会自动识别文件格式：<br/>
                              • 如果是 <code className="px-1 py-0.5 bg-white/10 rounded">问题::答案</code> 格式，直接解析<br/>
                              • 如果是普通文档，使用 <strong>{app.ai_provider}/{app.llm_model}</strong> 智能提取
                            </p>
                          </div>
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
