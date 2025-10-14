import { useState, useEffect } from 'react'
import { Database, Plus, Upload, Trash2, Search, FileText, Edit, Save, X, Sparkles, Loader2, CheckCircle, AlertCircle, FileUp } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([])
  const [selectedKB, setSelectedKB] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAddTextModal, setShowAddTextModal] = useState(false)
  const [showSmartSplitModal, setShowSmartSplitModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'documents' | 'texts' | 'query'>('texts')

  useEffect(() => {
    loadKnowledgeBases()
  }, [])

  const loadKnowledgeBases = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/knowledge-bases`)
      setKnowledgeBases(res.data.knowledge_bases || [])
    } catch (error) {
      console.error('加载知识库失败:', error)
    }
  }

  const handleCreate = async (name: string, description: string) => {
    try {
      await axios.post(`${API_BASE}/api/knowledge-bases`, { name, description })
      setShowCreateModal(false)
      loadKnowledgeBases()
    } catch (error: any) {
      alert(error.response?.data?.detail || '创建失败')
    }
  }

  const handleDelete = async (kbId: number) => {
    if (!confirm('确定要删除这个知识库吗？这将删除所有相关数据！')) return
    try {
      await axios.delete(`${API_BASE}/api/knowledge-bases/${kbId}`)
      loadKnowledgeBases()
      setSelectedKB(null)
    } catch (error: any) {
      alert(error.response?.data?.detail || '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">知识库管理</h2>
          <p className="text-gray-600 mt-1">管理文档、文本内容，支持 RAG 检索增强</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>新建知识库</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Knowledge Base List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            知识库列表
          </h3>
          <div className="space-y-2">
            {knowledgeBases.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">暂无知识库</p>
            ) : (
              knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => {
                    setSelectedKB(kb)
                    setActiveTab('texts')
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedKB?.id === kb.id
                      ? 'bg-blue-50 border-2 border-blue-600'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="font-medium">{kb.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {kb.document_count} 个文档
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Knowledge Base Details */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-6">
          {selectedKB ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <div>
                  <h3 className="text-2xl font-semibold">{selectedKB.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{selectedKB.description || '暂无描述'}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>上传文档</span>
                  </button>
                  <button
                    onClick={() => handleDelete(selectedKB.id)}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">文档数量</div>
                  <div className="text-2xl font-bold mt-1">{selectedKB.document_count}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">创建时间</div>
                  <div className="text-sm font-medium mt-1">
                    {new Date(selectedKB.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex space-x-6">
                  <button
                    onClick={() => setActiveTab('texts')}
                    className={`pb-3 border-b-2 transition-colors ${
                      activeTab === 'texts'
                        ? 'border-blue-600 text-blue-600 font-semibold'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    文本管理
                  </button>
                  <button
                    onClick={() => setActiveTab('query')}
                    className={`pb-3 border-b-2 transition-colors ${
                      activeTab === 'query'
                        ? 'border-blue-600 text-blue-600 font-semibold'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Search className="w-4 h-4 inline mr-2" />
                    检索测试
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'texts' && (
                <TextsManager 
                  kbId={selectedKB.id} 
                  onAddClick={() => setShowAddTextModal(true)}
                  onSmartSplitClick={() => setShowSmartSplitModal(true)}
                />
              )}
              {activeTab === 'query' && <QueryTest kbId={selectedKB.id} />}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>请选择一个知识库查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateKBModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}

      {showUploadModal && selectedKB && (
        <UploadDocumentModal
          kbId={selectedKB.id}
          onClose={() => {
            setShowUploadModal(false)
            loadKnowledgeBases()
          }}
        />
      )}

      {showAddTextModal && selectedKB && (
        <AddTextModal
          kbId={selectedKB.id}
          onClose={() => setShowAddTextModal(false)}
        />
      )}

      {showSmartSplitModal && selectedKB && (
        <SmartTextSplitModal
          kbId={selectedKB.id}
          onClose={() => {
            setShowSmartSplitModal(false)
            loadKnowledgeBases()
          }}
        />
      )}
    </div>
  )
}

// ==================== 文本管理组件 ====================
function TextsManager({ kbId, onAddClick, onSmartSplitClick }: { kbId: number, onAddClick: () => void, onSmartSplitClick: () => void }) {
  const [texts, setTexts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadTexts()
  }, [kbId, search])

  const loadTexts = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (search) params.search = search
      
      const res = await axios.get(`${API_BASE}/api/knowledge-bases/${kbId}/texts`, { params })
      setTexts(res.data.texts || [])
      setTotal(res.data.total || 0)
    } catch (error) {
      console.error('加载文本失败:', error)
    }
    setLoading(false)
  }

  const handleEdit = (text: any) => {
    setEditingId(text.id)
    setEditContent(text.content)
  }

  const handleSave = async (textId: number) => {
    try {
      await axios.put(`${API_BASE}/api/knowledge-bases/${kbId}/texts/${textId}`, {
        content: editContent
      })
      setEditingId(null)
      loadTexts()
    } catch (error: any) {
      alert(error.response?.data?.detail || '更新失败')
    }
  }

  const handleDelete = async (textId: number) => {
    if (!confirm('确定要删除这条文本吗？')) return
    try {
      await axios.delete(`${API_BASE}/api/knowledge-bases/${kbId}/texts/${textId}`)
      loadTexts()
    } catch (error: any) {
      alert(error.response?.data?.detail || '删除失败')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文本内容..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onSmartSplitClick}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md"
        >
          <Sparkles className="w-4 h-4" />
          <span>智能拆分</span>
        </button>
        <button
          onClick={onAddClick}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>手动添加</span>
        </button>
      </div>

      {/* Text Count */}
      <div className="text-sm text-gray-600">
        共 {total} 条文本
      </div>

      {/* Text List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : texts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>暂无文本内容</p>
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={onAddClick}
              className="text-blue-600 hover:underline"
            >
              手动添加文本
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {texts.map((text) => (
            <div key={text.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
              {editingId === text.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSave(text.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{text.content}</p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(text)}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(text.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>字符数: {text.char_count}</span>
                    <span>来源: {text.source || '手动添加'}</span>
                    <span>{new Date(text.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== 检索测试组件 ====================
function QueryTest({ kbId }: { kbId: number }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleQuery = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE}/api/knowledge-bases/${kbId}/query`, {
        query: query,
        n_results: 5,
      })
      setResults(res.data.results || [])
    } catch (error: any) {
      alert(error.response?.data?.detail || '检索失败')
      console.error('检索失败:', error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="输入查询内容..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleQuery}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '检索中...' : '检索'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">检索结果：</h4>
          {results.map((result, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">结果 {i + 1}</span>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  相似度: {(1 - result.distance).toFixed(3)}
                </span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.content}</p>
              {result.metadata && (
                <div className="mt-2 text-xs text-gray-500">
                  来源: {result.metadata.source || '未知'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== 创建知识库弹窗 ====================
function CreateKBModal({ onClose, onCreate }: any) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">创建知识库</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：数学题库"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="简要描述知识库用途..."
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onCreate(name, description)}
            disabled={!name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 上传文档弹窗 ====================
function UploadDocumentModal({ kbId, onClose }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)

    try {
      // 1. 上传文档
      const formData = new FormData()
      formData.append('file', file)
      formData.append('knowledge_base_id', kbId.toString())

      const uploadRes = await axios.post(`${API_BASE}/api/documents/upload`, formData)
      const docId = uploadRes.data.id

      // 2. 处理文档
      await axios.post(`${API_BASE}/api/documents/${docId}/process`)

      // 3. 添加到知识库
      await axios.post(`${API_BASE}/api/knowledge-bases/${kbId}/documents/${docId}`)

      alert('文档上传成功！')
      onClose()
    } catch (error: any) {
      alert(error.response?.data?.detail || '上传失败')
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">上传文档</h3>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.docx,.xlsx,.txt,.md"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-blue-600 hover:underline"
            >
              点击选择文件
            </label>
            <p className="text-sm text-gray-500 mt-2">
              支持 PDF, DOCX, XLSX, TXT, MD
            </p>
            {file && <p className="text-sm font-medium mt-2 text-green-600">{file.name}</p>}
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading ? '上传中...' : '上传'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 添加文本弹窗 ====================
function AddTextModal({ kbId, onClose }: { kbId: number, onClose: () => void }) {
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!content.trim()) return
    setAdding(true)

    try {
      await axios.post(`${API_BASE}/api/knowledge-bases/${kbId}/texts`, {
        texts: [content],
        metadata: { source: 'manual' }
      })
      alert('文本添加成功！')
      onClose()
      // 刷新父组件
      window.location.reload()
    } catch (error: any) {
      alert(error.response?.data?.detail || '添加失败')
    }
    setAdding(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">添加文本</h3>
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
            placeholder="输入要添加的文本内容..."
          />
          <div className="text-sm text-gray-500">
            字符数: {content.length}
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleAdd}
            disabled={!content.trim() || adding}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {adding ? '添加中...' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 智能文本拆分弹窗 ====================
function SmartTextSplitModal({ kbId, onClose }: { kbId: number, onClose: () => void }) {
  const [step, setStep] = useState<'input' | 'preview'>('input')
  const [text, setText] = useState('')
  const [strategy, setStrategy] = useState('smart')
  const [aiModels, setAiModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [splitting, setSplitting] = useState(false)
  const [chunks, setChunks] = useState<any[]>([])
  const [metadata, setMetadata] = useState<any>({})
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [splitProgress, setSplitProgress] = useState(0)

  useEffect(() => {
    loadAIModels()
  }, [])

  const loadAIModels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ai-providers/providers/models/available`)
      setAiModels(res.data.models || [])
      if (res.data.models && res.data.models.length > 0) {
        setSelectedModel(res.data.models[0].id)
      }
    } catch (error) {
      console.error('加载AI模型失败:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true)
    setSplitProgress(10)

    try {
      // 读取文件内容
      const reader = new FileReader()
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 30) + 10
          setSplitProgress(progress)
        }
      }

      reader.onload = async (e) => {
        const content = e.target?.result as string
        setText(content)
        setSplitProgress(40)
        setInputMode('text')
        setUploadingFile(false)
        setSplitProgress(0)
        alert(`文件读取成功！共 ${content.length} 字符`)
      }

      reader.onerror = () => {
        alert('文件读取失败')
        setUploadingFile(false)
        setSplitProgress(0)
      }

      // 根据文件类型选择读取方式
      if (file.type === 'application/pdf') {
        alert('PDF文件需要后端处理，功能开发中...')
        setUploadingFile(false)
        setSplitProgress(0)
        return
      }

      reader.readAsText(file, 'UTF-8')
    } catch (error) {
      alert('文件上传失败')
      setUploadingFile(false)
      setSplitProgress(0)
    }
  }

  const handleSplit = async () => {
    if (!text.trim()) {
      alert('请输入文本内容')
      return
    }

    if ((strategy === 'semantic' || strategy === 'smart') && !selectedModel) {
      alert('请选择AI模型')
      return
    }

    setSplitting(true)
    setSplitProgress(0)

    try {
      // 模拟进度更新
      setSplitProgress(10)
      
      // 解析模型ID (格式: provider/model)
      const [provider, model] = selectedModel.split('/')
      
      setSplitProgress(30)
      
      // 从AI配置中获取API密钥（简化处理，实际应从后端获取）
      const res = await axios.post(`${API_BASE}/api/knowledge-bases/${kbId}/texts/smart-split`, {
        text: text,
        strategy: strategy,
        provider: provider,
        model: model,
        chunk_size: 500,
        overlap: 50,
        min_chars: 50
      }, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / (progressEvent.total || progressEvent.loaded)) * 40) + 30
          setSplitProgress(Math.min(progress, 70))
        }
      })

      setSplitProgress(90)
      setChunks(res.data.chunks)
      setMetadata(res.data.metadata)
      setSplitProgress(100)
      
      setTimeout(() => {
        setStep('preview')
        setSplitProgress(0)
      }, 300)
    } catch (error: any) {
      alert(error.response?.data?.detail || '智能拆分失败')
      console.error('智能拆分失败:', error)
      setSplitProgress(0)
    }

    setSplitting(false)
  }

  const handleConfirm = async (confirmedChunks: any[]) => {
    try {
      await axios.post(`${API_BASE}/api/knowledge-bases/${kbId}/texts/batch`, {
        chunks: confirmedChunks,
        metadata: { source: 'smart_split' }
      })
      alert(`成功添加 ${confirmedChunks.length} 个文本片段！`)
      onClose()
    } catch (error: any) {
      alert(error.response?.data?.detail || '批量添加失败')
      console.error('批量添加失败:', error)
    }
  }

  if (step === 'preview') {
    return (
      <TextChunksPreview
        chunks={chunks}
        metadata={metadata}
        onConfirm={handleConfirm}
        onBack={() => setStep('input')}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">智能文本拆分</h3>
              <p className="text-sm text-gray-600">使用AI将长文本智能拆分成合适的片段</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 输入模式切换 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              输入方式
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  inputMode === 'text'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                文本输入
              </button>
              <button
                onClick={() => setInputMode('file')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  inputMode === 'file'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileUp className="w-4 h-4 inline mr-2" />
                文件上传
              </button>
            </div>
          </div>

          {/* 文本输入区 */}
          {inputMode === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文本内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={10}
                placeholder="粘贴或输入要拆分的长文本内容..."
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>字符数: {text.length}</span>
                <span>建议：500字符以上效果更好</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文件上传 <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <FileUp className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  accept=".txt,.md,.doc,.docx"
                  className="hidden"
                  id="file-upload-smart"
                  disabled={uploadingFile}
                />
                <label
                  htmlFor="file-upload-smart"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  {uploadingFile ? '上传中...' : '点击选择文件'}
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  支持 TXT, MD, DOC, DOCX 格式
                </p>
                {text && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ 已加载 {text.length} 字符
                  </p>
                )}
              </div>
              {uploadingFile && splitProgress > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>读取中...</span>
                    <span>{splitProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${splitProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 拆分策略选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              拆分策略
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { value: 'smart', label: '🤖 智能推荐', desc: 'AI分析最佳策略' },
                { value: 'qa_format', label: '💬 问答格式', desc: '识别::等分隔符' },
                { value: 'semantic', label: '🎯 语义拆分', desc: 'AI识别语义边界' },
                { value: 'paragraph', label: '📄 段落拆分', desc: '按自然段落分割' },
                { value: 'fixed', label: '✂️ 固定长度', desc: '按字符数分割' }
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setStrategy(item.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    strategy === item.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 问答分隔符提示 */}
          {strategy === 'qa_format' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-blue-900 mb-1">问答格式说明</div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>支持以下分隔符：</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li><code className="bg-blue-100 px-1 rounded">::</code> 双冒号（推荐）</li>
                      <li><code className="bg-blue-100 px-1 rounded">---</code> 多个短横线</li>
                      <li><code className="bg-blue-100 px-1 rounded">Q:</code> <code className="bg-blue-100 px-1 rounded">A:</code> 问答标记</li>
                    </ul>
                    <p className="mt-2">示例：<br/>
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                      问题文本::答案文本
                    </code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI模型选择（仅当需要时显示） */}
          {(strategy === 'semantic' || strategy === 'smart') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI模型 <span className="text-red-500">*</span>
              </label>
              {aiModels.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  style={{ color: '#111827' }}
                >
                  {aiModels.map((model) => (
                    <option key={model.id} value={model.id} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                      {model.display_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>暂无可用AI模型，请先在"AI提供商配置"中配置</span>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="pt-4 border-t space-y-3">
            {/* 进度条 */}
            {splitting && splitProgress > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>
                    {splitProgress < 30 ? '准备中...' : 
                     splitProgress < 70 ? '分析中...' : 
                     splitProgress < 90 ? '拆分中...' : '完成中...'}
                  </span>
                  <span>{splitProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${splitProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={splitting}
              >
                取消
              </button>
              <button
                onClick={handleSplit}
                disabled={splitting || !text.trim() || ((strategy === 'semantic' || strategy === 'smart') && !selectedModel)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {splitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>拆分中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>开始拆分</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== 文本切片预览组件 ====================
function TextChunksPreview({ 
  chunks: initialChunks, 
  metadata, 
  onConfirm, 
  onBack, 
  onClose 
}: { 
  chunks: any[], 
  metadata: any, 
  onConfirm: (chunks: any[]) => void, 
  onBack: () => void, 
  onClose: () => void 
}) {
  const [chunks, setChunks] = useState(initialChunks)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)

  const totalChars = chunks.reduce((sum, c) => sum + c.char_count, 0)
  const avgChars = Math.round(totalChars / chunks.length)

  const handleEdit = (chunk: any) => {
    setEditingId(chunk.index)
    setEditContent(chunk.content)
  }

  const handleSaveEdit = (index: number) => {
    setChunks(chunks.map((c) => 
      c.index === index 
        ? { ...c, content: editContent, char_count: editContent.length }
        : c
    ))
    setEditingId(null)
  }

  const handleDelete = (index: number) => {
    if (confirm('确定要删除这个片段吗？')) {
      setChunks(chunks.filter((c) => c.index !== index))
      selectedIds.delete(index)
      setSelectedIds(new Set(selectedIds))
    }
  }

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === chunks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(chunks.map((c) => c.index)))
    }
  }

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    if (confirm(`确定要删除选中的 ${selectedIds.size} 个片段吗？`)) {
      setChunks(chunks.filter((c) => !selectedIds.has(c.index)))
      setSelectedIds(new Set())
    }
  }

  const handleConfirmImport = async () => {
    if (chunks.length === 0) {
      alert('没有可导入的片段')
      return
    }
    setImporting(true)
    await onConfirm(chunks)
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold">拆分预览与编辑</h3>
            <p className="text-sm text-gray-600 mt-1">
              检查并编辑拆分结果，确认后导入知识库
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 统计信息 */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-gray-600">片段数量</div>
              <div className="text-lg font-semibold">{chunks.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">总字符数</div>
              <div className="text-lg font-semibold">{totalChars}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">平均长度</div>
              <div className="text-lg font-semibold">{avgChars}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">拆分策略</div>
              <div className="text-sm font-medium">{metadata.strategy || '未知'}</div>
            </div>
            {metadata.analysis?.text_type && (
              <div>
                <div className="text-xs text-gray-600">文本类型</div>
                <div className="text-sm font-medium">{metadata.analysis.text_type}</div>
              </div>
            )}
          </div>
        </div>

        {/* 批量操作栏 */}
        <div className="px-6 py-3 bg-white border-b flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === chunks.length && chunks.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">全选</span>
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>删除选中 ({selectedIds.size})</span>
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            共 {chunks.length} 个片段
          </div>
        </div>

        {/* 片段列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {chunks.map((chunk) => (
              <div 
                key={chunk.index} 
                className={`border-2 rounded-lg p-4 transition-all ${
                  selectedIds.has(chunk.index) 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(chunk.index)}
                    onChange={() => toggleSelect(chunk.index)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    {/* 片段头部 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">
                          片段 #{chunk.index + 1}
                        </span>
                        {chunk.title && (
                          <span className="text-sm text-blue-600 font-medium">
                            {chunk.title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {editingId === chunk.index ? (
                          <>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSaveEdit(chunk.index)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(chunk)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(chunk.index)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 片段内容 */}
                    {editingId === chunk.index ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={5}
                      />
                    ) : (
                      <>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 mb-2">
                          {chunk.content}
                        </div>
                        {chunk.summary && (
                          <div className="text-xs text-gray-600 italic bg-blue-50 rounded px-3 py-2">
                            💡 {chunk.summary}
                          </div>
                        )}
                      </>
                    )}

                    {/* 片段统计 */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                      <span>字符: {chunk.char_count}</span>
                      <span>词数: {chunk.word_count}</span>
                      <span>类型: {chunk.type || '未知'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← 返回修改
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={chunks.length === 0 || importing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>导入中...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>确认导入 ({chunks.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
