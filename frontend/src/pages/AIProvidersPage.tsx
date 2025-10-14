import { useState, useEffect } from 'react'
import {
  Key,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Server,
  Globe
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

interface Provider {
  id: string
  name: string
  base_url: string
  default_model: string
  models: string[]
  configured: boolean
}

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/api/ai-providers/providers`)
      setProviders(res.data.providers || [])
    } catch (error) {
      console.error('Failed to load providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyApiKey = async (providerId: string) => {
    if (!apiKey.trim()) {
      alert('请输入API密钥！')
      return
    }

    try {
      setVerifying(true)
      setVerifyMessage('')
      
      const res = await axios.post(`${API_BASE}/api/ai-providers/providers/verify`, {
        provider: providerId,
        api_key: apiKey,
        base_url: customBaseUrl || null
      })

      if (res.data.valid) {
        setVerified(true)
        setVerifyMessage(res.data.message)
        setAvailableModels(res.data.models || [])
      } else {
        setVerified(false)
        setVerifyMessage(res.data.message)
        setAvailableModels([])
      }
    } catch (error: any) {
      setVerified(false)
      setVerifyMessage(`验证失败：${error.response?.data?.detail || error.message}`)
      setAvailableModels([])
    } finally {
      setVerifying(false)
    }
  }

  const configureProvider = async (providerId: string) => {
    if (!apiKey.trim()) {
      alert('请输入API密钥！')
      return
    }

    if (!verified) {
      alert('请先验证API密钥！')
      return
    }

    try {
      const res = await axios.post(`${API_BASE}/api/ai-providers/providers/configure`, {
        provider: providerId,
        api_key: apiKey,
        base_url: customBaseUrl || null
      })

      const modelCount = res.data.models?.length || 0
      alert(`✅ ${providerId} 配置成功！${modelCount > 0 ? `\n找到 ${modelCount} 个可用模型` : ''}`)
      
      setConfiguring(null)
      setApiKey('')
      setCustomBaseUrl('')
      setVerified(false)
      setVerifyMessage('')
      setAvailableModels([])
      loadProviders()
    } catch (error: any) {
      alert(`配置失败：${error.response?.data?.detail || error.message}`)
    }
  }

  const removeConfig = async (providerId: string) => {
    if (!confirm(`确定要删除 ${providerId} 的配置吗？`)) return

    try {
      await axios.delete(`${API_BASE}/api/ai-providers/providers/${providerId}/config`)
      alert('✅ 配置已删除')
      loadProviders()
    } catch (error: any) {
      alert(`删除失败：${error.response?.data?.detail || error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">AI提供商配置</h2>
            <p className="text-blue-200 mt-1">配置多个AI模型提供商的API密钥</p>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-blue-200 mt-4">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:shadow-2xl transition-all"
            >
              {/* Provider Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    provider.configured 
                      ? 'bg-green-500/20' 
                      : 'bg-gray-500/20'
                  }`}>
                    <Server className={`w-5 h-5 ${
                      provider.configured
                        ? 'text-green-300'
                        : 'text-gray-300'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{provider.name}</h3>
                    <p className="text-blue-200 text-xs">{provider.id}</p>
                  </div>
                </div>
                
                {provider.configured ? (
                  <div className="flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs">
                    <CheckCircle className="w-3 h-3" />
                    <span>已配置</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-gray-500/20 text-gray-300 px-2 py-1 rounded-lg text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>未配置</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="text-blue-200">
                  <span className="font-medium">Base URL:</span>
                  <p className="text-xs truncate mt-1 bg-white/5 px-2 py-1 rounded">{provider.base_url}</p>
                </div>
                <div className="text-blue-200">
                  <span className="font-medium">默认模型:</span>
                  <p className="text-xs mt-1">{provider.default_model}</p>
                </div>
                <div className="text-blue-200">
                  <span className="font-medium">可用模型:</span>
                  <p className="text-xs mt-1">{provider.models.length} 个</p>
                </div>
              </div>

              {/* Configure Form */}
              {configuring === provider.id ? (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setVerified(false)
                      setVerifyMessage('')
                    }}
                    placeholder="输入API密钥"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
                  />
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => {
                      setCustomBaseUrl(e.target.value)
                      setVerified(false)
                      setVerifyMessage('')
                    }}
                    placeholder="自定义Base URL（可选）"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
                  />
                  
                  {/* Verify Button */}
                  <button
                    onClick={() => verifyApiKey(provider.id)}
                    disabled={verifying || !apiKey.trim()}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-gray-500/20 text-blue-300 disabled:text-gray-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                        <span>验证中...</span>
                      </>
                    ) : (
                      <span>验证API密钥</span>
                    )}
                  </button>
                  
                  {/* Verify Message */}
                  {verifyMessage && (
                    <div className={`text-xs p-2 rounded-lg ${
                      verified 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {verifyMessage}
                      {verified && availableModels.length > 0 && (
                        <div className="mt-1">找到 {availableModels.length} 个可用模型</div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => configureProvider(provider.id)}
                      disabled={!verified}
                      className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:bg-gray-500/20 text-green-300 disabled:text-gray-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      保存配置
                    </button>
                    <button
                      onClick={() => {
                        setConfiguring(null)
                        setApiKey('')
                        setCustomBaseUrl('')
                        setVerified(false)
                        setVerifyMessage('')
                        setAvailableModels([])
                      }}
                      className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setConfiguring(provider.id)}
                    className={`flex-1 ${
                      provider.configured
                        ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                    } px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
                  >
                    {provider.configured ? (
                      <>
                        <Edit className="w-4 h-4" />
                        <span>重新配置</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>配置</span>
                      </>
                    )}
                  </button>
                  
                  {provider.configured && (
                    <button
                      onClick={() => removeConfig(provider.id)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Models List */}
              {provider.configured && provider.models.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-blue-200 text-xs mb-2">可用模型 ({provider.models.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {provider.models.map((model) => (
                      <div key={model} className="text-xs bg-white/5 px-2 py-1 rounded text-blue-200 truncate" title={model}>
                        {model}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {provider.configured && provider.models.length === 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-yellow-300 text-xs">暂未获取模型列表，但API密钥已配置</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Key className="w-5 h-5" />
          如何获取API密钥
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-200">
          <div>
            <p className="font-medium mb-1">OpenAI:</p>
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              platform.openai.com/api-keys
            </a>
          </div>
          <div>
            <p className="font-medium mb-1">OpenRouter:</p>
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              openrouter.ai/keys
            </a>
          </div>
          <div>
            <p className="font-medium mb-1">Google Gemini:</p>
            <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              makersuite.google.com/app/apikey
            </a>
          </div>
          <div>
            <p className="font-medium mb-1">Anthropic Claude:</p>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              console.anthropic.com/settings/keys
            </a>
          </div>
          <div>
            <p className="font-medium mb-1">DeepSeek:</p>
            <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              platform.deepseek.com/api_keys
            </a>
          </div>
          <div>
            <p className="font-medium mb-1">Qwen (通义千问):</p>
            <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              dashscope.console.aliyun.com/apiKey
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
