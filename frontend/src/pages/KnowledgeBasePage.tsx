import { useState, useEffect } from 'react'
import { Database, Plus, Upload, Trash2, Search, FileText } from 'lucide-react'
import axios from 'axios'

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([])
  const [selectedKB, setSelectedKB] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    loadKnowledgeBases()
  }, [])

  const loadKnowledgeBases = async () => {
    try {
      const res = await axios.get('/api/knowledge-bases')
      setKnowledgeBases(res.data.knowledge_bases || [])
    } catch (error) {
      console.error('加载知识库失败:', error)
    }
  }

  const handleCreate = async (name: string, description: string) => {
    try {
      await axios.post('/api/knowledge-bases', { name, description })
      setShowCreateModal(false)
      loadKnowledgeBases()
    } catch (error: any) {
      alert(error.response?.data?.detail || '创建失败')
    }
  }

  const handleDelete = async (kbId: number) => {
    if (!confirm('确定要删除这个知识库吗？')) return
    try {
      await axios.delete(`/api/knowledge-bases/${kbId}`)
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
          <p className="text-gray-600 mt-1">创建和管理多个知识库，支持 RAG 检索增强</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>新建知识库</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  onClick={() => setSelectedKB(kb)}
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
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {selectedKB ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">{selectedKB.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{selectedKB.description}</p>
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

              {/* Query Test */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Search className="w-5 h-5 mr-2 text-blue-600" />
                  检索测试
                </h4>
                <QueryTest kbId={selectedKB.id} />
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>请选择一个知识库查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateKBModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedKB && (
        <UploadDocumentModal
          kbId={selectedKB.id}
          onClose={() => {
            setShowUploadModal(false)
            loadKnowledgeBases()
          }}
        />
      )}
    </div>
  )
}

function QueryTest({ kbId }: { kbId: number }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleQuery = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await axios.post(`/api/knowledge-bases/${kbId}/query`, {
        query: query,
        n_results: 3,
      })
      setResults(res.data.results || [])
    } catch (error) {
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
        <div className="space-y-2">
          {results.map((result, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">结果 {i + 1}</span>
                <span className="text-xs text-gray-500">
                  相似度: {(1 - result.distance).toFixed(3)}
                </span>
              </div>
              <p className="text-sm text-gray-600">{result.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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

      const uploadRes = await axios.post('/api/documents/upload', formData)
      const docId = uploadRes.data.id

      // 2. 处理文档
      await axios.post(`/api/documents/${docId}/process`)

      // 3. 添加到知识库
      await axios.post(`/api/knowledge-bases/${kbId}/documents/${docId}`)

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
            {file && <p className="text-sm font-medium mt-2">{file.name}</p>}
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

