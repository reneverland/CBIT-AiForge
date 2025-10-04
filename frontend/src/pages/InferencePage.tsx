import { useState, useEffect } from 'react'
import { Send, Sparkles, Database } from 'lucide-react'
import axios from 'axios'

export default function InferencePage() {
  const [models, setModels] = useState<any[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedKB, setSelectedKB] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadModels()
    loadKnowledgeBases()
  }, [])

  const loadModels = async () => {
    try {
      const res = await axios.get('/api/models')
      const activeModels = (res.data.models || []).filter((m: any) => m.status === 'active')
      setModels(activeModels)
      if (activeModels.length > 0) {
        setSelectedModel(activeModels[0].name)
      }
    } catch (error) {
      console.error('加载模型失败:', error)
    }
  }

  const loadKnowledgeBases = async () => {
    try {
      const res = await axios.get('/api/knowledge-bases')
      setKnowledgeBases(res.data.knowledge_bases || [])
    } catch (error) {
      console.error('加载知识库失败:', error)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !selectedModel) return

    const userMessage = { role: 'user', content: input }
    setMessages([...messages, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await axios.post('/v1/chat/completions', {
        model: selectedModel,
        messages: [...messages, userMessage],
        knowledge_base: selectedKB || undefined,
        stream: false,
      })

      const assistantMessage = {
        role: 'assistant',
        content: res.data.choices[0].message.content,
      }
      setMessages([...messages, userMessage, assistantMessage])
    } catch (error: any) {
      console.error('推理失败:', error)
      const errorMessage = {
        role: 'assistant',
        content: '抱歉，推理失败: ' + (error.response?.data?.detail || error.message),
      }
      setMessages([...messages, userMessage, errorMessage])
    }

    setLoading(false)
  }

  const handleClear = () => {
    setMessages([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">推理测试</h2>
        <p className="text-gray-600 mt-1">测试模型的推理能力，支持 RAG 检索增强</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-3">模型配置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择模型
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {models.length === 0 ? (
                    <option value="">暂无可用模型</option>
                  ) : (
                    models.map((model) => (
                      <option key={model.id} value={model.name}>
                        {model.display_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  知识库（可选）
                </label>
                <select
                  value={selectedKB}
                  onChange={(e) => setSelectedKB(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不使用知识库</option>
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.name}>
                      {kb.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <Sparkles className="w-4 h-4 mr-1 text-blue-600" />
              提示
            </h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• 选择知识库启用 RAG</li>
              <li>• 支持多轮对话</li>
              <li>• 点击清空重新开始</li>
            </ul>
          </div>

          <button
            onClick={handleClear}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            清空对话
          </button>
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm flex flex-col" style={{ height: '600px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>开始与模型对话</p>
                {selectedKB && (
                  <p className="text-sm mt-2 flex items-center justify-center">
                    <Database className="w-4 h-4 mr-1 text-blue-600" />
                    已启用知识库: {selectedKB}
                  </p>
                )}
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble key={i} role={msg.role} content={msg.content} />
              ))
            )}
            {loading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="text-sm">思考中...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
                placeholder="输入您的问题..."
                disabled={!selectedModel || loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !selectedModel || loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>发送</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-4 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  )
}

