import { useState, useEffect } from 'react';
import { Settings, Database, Search, Brain, Plus, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5003';

// 系统设置页面 - 统一管理Embedding、搜索、向量数据库配置
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'embedding' | 'search' | 'vectordb'>('embedding');
  
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-400" />
          系统设置
        </h1>
        <p className="text-blue-200 mt-2">配置系统全局服务：Embedding向量化、搜索服务、向量数据库</p>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white/10 rounded-xl p-1 mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('embedding')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'embedding'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-blue-200 hover:bg-white/10'
          }`}
        >
          <Brain className="w-5 h-5" />
          Embedding 向量化
        </button>
        
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'search'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-blue-200 hover:bg-white/10'
          }`}
        >
          <Search className="w-5 h-5" />
          搜索服务
        </button>
        
        <button
          onClick={() => setActiveTab('vectordb')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'vectordb'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-blue-200 hover:bg-white/10'
          }`}
        >
          <Database className="w-5 h-5" />
          向量数据库
        </button>
      </div>

      {/* 标签页内容 */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
        {activeTab === 'embedding' && <EmbeddingSettings />}
        {activeTab === 'search' && <SearchSettings />}
        {activeTab === 'vectordb' && <VectorDBSettings />}
      </div>
    </div>
  );
}

// Embedding配置组件
function EmbeddingSettings() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<any>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/embedding-providers`);
      setProviders(res.data.providers || []);
    } catch (error) {
      console.error('加载Embedding提供商失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (provider: any) => {
    setEditingProvider(provider);
    setShowAddModal(true);
  };

  const handleSetDefault = async (providerId: number) => {
    try {
      await axios.post(`${API_BASE}/api/embedding-providers/${providerId}/set-default`);
      alert('✅ 已设为默认Embedding提供商');
      loadProviders();
    } catch (error: any) {
      alert(`❌ 设置失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDeleteClick = (provider: any) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!providerToDelete) return;
    
    try {
      await axios.delete(`${API_BASE}/api/embedding-providers/${providerToDelete.id}`);
      alert('✅ 删除成功');
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      loadProviders();
    } catch (error: any) {
      alert(`❌ 删除失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Embedding 向量化配置</h2>
          <p className="text-blue-200 mt-1">配置文本向量化服务，支持OpenAI、本地模型、自定义API</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加提供商
        </button>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-300 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">配置提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>至少配置一个Embedding提供商才能使用固定Q&A和向量检索功能</li>
              <li>OpenAI提供高质量向量，但需要API密钥</li>
              <li>本地模型（如BGE）完全免费，首次使用会自动下载</li>
              <li>一个提供商可以设为默认，将用于所有新创建的知识库</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 配置列表 */}
      {loading ? (
        <div className="text-center py-12 text-blue-200">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          加载中...
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center text-blue-300 py-12">
          点击"添加提供商"配置Embedding服务
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <EmbeddingProviderCard 
              key={provider.id}
              provider={provider}
              onEdit={handleEdit}
              onSetDefault={handleSetDefault}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddEmbeddingModal 
          provider={editingProvider}
          onClose={() => {
            setShowAddModal(false);
            setEditingProvider(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingProvider(null);
            loadProviders();
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">确认删除</h3>
            <div className="text-gray-300 mb-2">
              确定要删除 Embedding 提供商 <strong className="text-white">"{providerToDelete?.name}"</strong> 吗？
            </div>
            {providerToDelete?.is_default && (
              <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 text-sm text-red-300 mb-4">
                ⚠️ 无法删除默认提供商，请先设置其他提供商为默认
              </div>
            )}
            <div className="text-sm text-gray-400 mb-6">
              此操作将从配置中移除该提供商，但不会影响已使用该提供商的知识库
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setProviderToDelete(null);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={providerToDelete?.is_default}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Embedding提供商卡片
function EmbeddingProviderCard({ provider, onEdit, onSetDefault, onDelete }: any) {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await axios.post(`${API_BASE}/api/embedding-providers/test`, {
        provider_id: provider.id,
        text: "测试文本：这是一个embedding向量化测试"
      });
      
      if (res.data.success) {
        alert(`✅ 测试成功！\n模型: ${res.data.provider.model_name}\n向量维度: ${res.data.dimension}`);
      } else {
        alert(`❌ 测试失败：${res.data.message}`);
      }
    } catch (error: any) {
      alert(`❌ 测试失败：${error.response?.data?.detail || error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
            {provider.is_default && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-400/30">
                ✓ 默认
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-300">类型：</span>
              <span className="text-white font-medium ml-1">
                {provider.provider_type === 'openai' ? 'OpenAI' : provider.provider_type === 'local' ? '本地模型' : '自定义API'}
              </span>
            </div>
            <div>
              <span className="text-blue-300">模型：</span>
              <span className="text-white font-medium ml-1">{provider.model_name}</span>
            </div>
            {provider.dimension && (
              <div>
                <span className="text-blue-300">维度：</span>
                <span className="text-white font-medium ml-1">{provider.dimension}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {!provider.is_default && (
            <button 
              onClick={() => onSetDefault(provider.id)}
              className="px-3 py-1.5 text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-colors text-sm border border-yellow-400/30"
            >
              设为默认
            </button>
          )}
          <button 
            onClick={() => onEdit(provider)}
            className="px-3 py-1.5 text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors text-sm"
          >
            编辑
          </button>
          <button 
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-green-300 hover:bg-green-500/10 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {testing ? '测试中...' : '测试'}
          </button>
          <button 
            onClick={() => onDelete(provider)}
            className="px-3 py-1.5 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm border border-red-400/30"
            title="删除此提供商"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// 添加/编辑Embedding模态框
function AddEmbeddingModal({ provider, onClose, onSuccess }: any) {
  const isEditing = !!provider;
  
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    provider_type: provider?.provider_type || 'local',
    model_name: provider?.model_name || 'BAAI/bge-small-zh-v1.5',
    api_key: provider?.api_key || '',
    base_url: provider?.base_url || '',
    dimension: provider?.dimension || 512,
  });

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // OpenAI embedding 模型列表
  const openaiEmbeddingModels = [
    'text-embedding-3-small',
    'text-embedding-3-large',
    'text-embedding-ada-002'
  ];

  // 验证 API 密钥
  const handleVerifyAPI = async () => {
    if (!formData.api_key.trim()) {
      alert('请输入 API 密钥！');
      return;
    }

    setVerifying(true);
    setVerifyMessage('');
    
    try {
      // 对于 OpenAI，直接测试 embedding API
      if (formData.provider_type === 'openai') {
        const headers: any = {
          'Authorization': `Bearer ${formData.api_key}`,
          'Content-Type': 'application/json'
        };

        // 确保 base_url 不为空，使用默认值
        const baseUrl = (formData.base_url && formData.base_url.trim()) 
          ? formData.base_url.trim() 
          : 'https://api.openai.com/v1';
        
        const response = await axios.post(
          `${baseUrl}/embeddings`,
          {
            input: 'test',
            model: formData.model_name || 'text-embedding-3-small'
          },
          { headers }
        );

        if (response.status === 200 && response.data) {
          // 安全地获取 dimension
          if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
            const embedding = response.data.data[0].embedding;
            if (embedding && Array.isArray(embedding)) {
              const dimension = embedding.length;
              setVerified(true);
              setVerifyMessage(`✅ API 验证成功！模型维度: ${dimension}`);
              setFormData({ ...formData, dimension });
              setAvailableModels(openaiEmbeddingModels);
            } else {
              throw new Error('响应格式错误：缺少 embedding 数据');
            }
          } else {
            throw new Error('响应格式错误：缺少 data 数组');
          }
        } else {
          throw new Error(`请求失败：状态码 ${response.status}`);
        }
      } else {
        // 其他类型暂时标记为已验证
        setVerified(true);
        setVerifyMessage('✅ 配置已验证');
      }
    } catch (error: any) {
      setVerified(false);
      console.error('验证失败详细信息:', error);
      
      // 更详细的错误信息
      let errorMsg = '未知错误';
      if (error.response) {
        // HTTP 错误响应
        if (error.response.data?.error?.message) {
          errorMsg = error.response.data.error.message;
        } else if (error.response.data?.message) {
          errorMsg = error.response.data.message;
        } else {
          errorMsg = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setVerifyMessage(`❌ 验证失败: ${errorMsg}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 新增时，非本地类型必须验证
    if (!isEditing && formData.provider_type !== 'local' && !verified) {
      alert('请先验证 API 密钥！');
      return;
    }

    try {
      if (isEditing) {
        // 编辑时，只发送修改的字段
        const updateData: any = {
          name: formData.name,
          model_name: formData.model_name,
          dimension: formData.dimension
        };
        
        // 只有输入了新的 API 密钥才发送
        if (formData.api_key && formData.api_key.trim()) {
          updateData.api_key = formData.api_key.trim();
        }
        
        // 处理 base_url
        if (formData.base_url !== undefined) {
          updateData.base_url = formData.base_url && formData.base_url.trim() ? formData.base_url.trim() : null;
        }
        
        await axios.put(`${API_BASE}/api/embedding-providers/${provider.id}`, updateData);
        alert('✅ 更新成功！');
      } else {
        // 新增时，发送完整数据
        const submitData = {
          ...formData,
          base_url: formData.base_url && formData.base_url.trim() ? formData.base_url.trim() : null,
          api_key: formData.api_key && formData.api_key.trim() ? formData.api_key.trim() : null
        };
        await axios.post(`${API_BASE}/api/embedding-providers`, submitData);
        alert('✅ 添加成功！');
      }
      onSuccess();
    } catch (error: any) {
      console.error('操作失败:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      alert(`❌ 操作失败：${errorMsg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? '编辑' : '添加'}Embedding提供商
          </h2>
          <p className="text-blue-200 text-sm mt-1">
            配置文本向量化服务，用于知识库检索和固定Q&A
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder="如：OpenAI Embedding"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">类型</label>
            <select
              value={formData.provider_type}
              onChange={(e) => {
                const newType = e.target.value;
                setFormData({ 
                  ...formData, 
                  provider_type: newType,
                  model_name: newType === 'openai' ? 'text-embedding-3-small' : 'BAAI/bge-small-zh-v1.5'
                });
                setVerified(false);
                setVerifyMessage('');
              }}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              disabled={isEditing}
            >
              <option value="local">本地模型（免费）</option>
              <option value="openai">OpenAI（需要API密钥）</option>
              <option value="custom">自定义API</option>
            </select>
          </div>
          
          {/* 模型选择 */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              模型名称
              {formData.provider_type === 'openai' && <span className="text-xs ml-2">(推荐: text-embedding-3-small)</span>}
            </label>
            {formData.provider_type === 'openai' && verified && availableModels.length > 0 ? (
              <select
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                required
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder={formData.provider_type === 'openai' ? 'text-embedding-3-small' : 'BAAI/bge-small-zh-v1.5'}
                required
              />
            )}
          </div>
          
          {formData.provider_type !== 'local' && (
            <>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  API密钥
                  {isEditing && <span className="text-xs text-blue-300 ml-2">(留空则不修改)</span>}
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => {
                    setFormData({ ...formData, api_key: e.target.value });
                    setVerified(false);
                    setVerifyMessage('');
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  placeholder={isEditing ? "留空则不修改" : "sk-..."}
                  required={!isEditing}
                />
              </div>
              
              {formData.provider_type === 'openai' && (
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Base URL (可选)
                  </label>
                  <input
                    type="text"
                    value={formData.base_url}
                    onChange={(e) => {
                      setFormData({ ...formData, base_url: e.target.value });
                      setVerified(false);
                      setVerifyMessage('');
                    }}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    placeholder="https://api.openai.com/v1 (留空使用默认)"
                  />
                </div>
              )}
              
              {formData.provider_type === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">Base URL</label>
                  <input
                    type="text"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    placeholder="https://your-api.com/v1"
                  />
                </div>
              )}
              
              {/* 验证按钮 */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleVerifyAPI}
                  disabled={verifying || !formData.api_key}
                  className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-gray-500/20 text-blue-300 disabled:text-gray-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>验证中...</span>
                    </>
                  ) : (
                    <span>验证 API 密钥</span>
                  )}
                </button>
                
                {verifyMessage && (
                  <div className={`text-sm p-3 rounded-lg ${
                    verified 
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                      : 'bg-red-500/20 text-red-300 border border-red-400/30'
                  }`}>
                    {verifyMessage}
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* 提示信息 */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 text-sm text-blue-200">
            <p className="font-medium mb-1">💡 模型说明：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {formData.provider_type === 'openai' && (
                <>
                  <li>text-embedding-3-small: 性价比最高，1536维</li>
                  <li>text-embedding-3-large: 质量最好，3072维</li>
                  <li>text-embedding-ada-002: 经典模型，1536维</li>
                </>
              )}
              {formData.provider_type === 'local' && (
                <>
                  <li>BAAI/bge-small-zh-v1.5: 中文优化，512维</li>
                  <li>BAAI/bge-large-zh-v1.5: 高质量，1024维</li>
                  <li>首次使用会自动下载模型</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <button 
              type="submit" 
              disabled={!isEditing && formData.provider_type !== 'local' && !verified}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {isEditing ? '保存' : '添加'}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 搜索服务配置组件
function SearchSettings() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/search-providers`);
      setProviders(res.data.providers || []);
    } catch (error) {
      console.error('加载搜索提供商失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">搜索服务配置</h2>
          <p className="text-blue-200 mt-1">配置实时联网搜索服务，支持Cbit AI搜索、Google、Serper等</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加搜索服务
        </button>
      </div>

      {/* 提示信息 */}
      <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-300 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-medium mb-1">配置提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>🌟 Cbit AI 搜索 - 为AI优化，1000次/月免费额度（推荐）</li>
              <li>Google Custom Search需要API密钥和搜索引擎ID</li>
              <li>Serper.dev提供2500次免费搜索</li>
              <li>配置后需要验证API才能保存</li>
            </ul>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-blue-200">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          加载中...
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center text-blue-300 py-12">
          <Search className="w-16 h-16 mx-auto mb-4 text-blue-400/30" />
          <p>尚未配置搜索服务</p>
          <p className="text-sm mt-2">点击"添加搜索服务"开始配置</p>
        </div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                  <p className="text-sm text-blue-200">类型: {provider.provider_type}</p>
                </div>
                {provider.is_default && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">默认</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddSearchModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadProviders();
          }}
        />
      )}
    </div>
  );
}

// 添加搜索服务模态框
function AddSearchModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    provider_type: 'tavily',
    api_key: '',
    search_engine_id: '',
    search_depth: 'basic',  // Tavily搜索深度
    daily_limit: 30,  // 每日限额
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 构建提交数据
      const submitData: any = {
        name: formData.name,
        provider_type: formData.provider_type,
        api_key: formData.api_key,
        daily_limit: formData.daily_limit,
      };

      // 添加provider特定的配置
      if (formData.provider_type === 'google') {
        submitData.search_engine_id = formData.search_engine_id;
      } else if (formData.provider_type === 'tavily') {
        submitData.config = {
          search_depth: formData.search_depth
        };
      }

      await axios.post(`${API_BASE}/api/search-providers`, submitData);
      onSuccess();
    } catch (error: any) {
      console.error('添加失败:', error);
      const errorMsg = error.response?.data?.detail || '添加失败，请检查配置';
      alert(errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">添加搜索服务</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">类型</label>
            <select
              value={formData.provider_type}
              onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="tavily">🌟 Cbit AI 搜索 (推荐)</option>
              <option value="google">Google Custom Search</option>
              <option value="serper">Serper.dev</option>
              <option value="serpapi">SerpAPI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">API密钥</label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              required
              placeholder={formData.provider_type === 'tavily' ? 'tvly-xxxxxxxxxxxxxxxxxxxxxxxx' : '输入API密钥'}
            />
            {formData.provider_type === 'tavily' && (
              <p className="text-xs text-blue-300 mt-2">
                💡 没有API密钥？<a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">前往Tavily官网注册</a>（1000次/月免费）
              </p>
            )}
          </div>
          {formData.provider_type === 'google' && (
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">搜索引擎ID</label>
              <input
                type="text"
                value={formData.search_engine_id}
                onChange={(e) => setFormData({ ...formData, search_engine_id: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="获取自Google Custom Search Console"
              />
            </div>
          )}
          {formData.provider_type === 'tavily' && (
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">搜索深度</label>
              <select
                value={formData.search_depth}
                onChange={(e) => setFormData({ ...formData, search_depth: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="basic">⚡ Basic - 快速搜索（推荐）</option>
                <option value="advanced">🔍 Advanced - 深度搜索（消耗更多配额）</option>
              </select>
              <p className="text-xs text-blue-300 mt-2">
                Basic模式适合大多数场景，Advanced模式返回更详细的结果但消耗更多API配额
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">每日限额（可选）</label>
            <input
              type="number"
              value={formData.daily_limit}
              onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder="30"
            />
            <p className="text-xs text-blue-300 mt-2">
              设置每日最大调用次数，0表示不限制
            </p>
          </div>
          <div className="flex items-center gap-3 pt-4">
            <button type="submit" className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600">
              添加
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 向量数据库配置组件
function VectorDBSettings() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<any>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/vector-db-providers`);
      setProviders(res.data.providers || []);
    } catch (error) {
      console.error('加载向量数据库提供商失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await axios.post(`${API_BASE}/api/vector-db-providers/${id}/set-default`);
      alert('✅ 已设置为默认向量数据库');
      loadProviders();
    } catch (error: any) {
      console.error('设置默认失败:', error);
      alert(`❌ 设置失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await axios.post(`${API_BASE}/api/vector-db-providers/test`, {
        provider_id: id
      });
      
      const result = res.data.verification_result;
      if (result.valid) {
        alert(`✅ 测试成功！\n${result.message}`);
      } else {
        alert(`❌ 测试失败：${result.message}`);
      }
      loadProviders();
    } catch (error: any) {
      console.error('测试失败:', error);
      alert(`❌ 测试失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleEditClick = (provider: any) => {
    setEditingProvider(provider);
    setShowAddModal(true);
  };

  const handleDeleteClick = (provider: any) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!providerToDelete) return;

    try {
      await axios.delete(`${API_BASE}/api/vector-db-providers/${providerToDelete.id}`);
      alert('✅ 删除成功');
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      loadProviders();
    } catch (error: any) {
      console.error('删除失败:', error);
      alert(`❌ 删除失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">向量数据库配置</h2>
          <p className="text-blue-200 mt-1">配置向量存储服务，支持ChromaDB、Qdrant、Pinecone等</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加数据库
        </button>
      </div>

      {/* 提示信息 */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-xl p-5 mb-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm text-purple-200">
            <p className="font-bold mb-2 text-white text-base">💡 如何选择向量数据库？</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span><strong className="text-white">点击卡片</strong>或点击"选择使用"按钮即可切换向量数据库</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span><strong className="text-white">当前使用</strong>的数据库会显示 ✓ 标记和蓝色高亮</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>所有新创建的知识库将使用选中的向量数据库</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>建议先<strong className="text-white">测试连接</strong>确保配置正确</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 配置列表 */}
      {loading ? (
        <div className="text-center py-12 text-blue-200">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          加载中...
        </div>
      ) : (
        <div className="space-y-4">
          {/* 始终显示内置ChromaDB，但只有当没有其他默认数据库时才标记为默认 */}
          <VectorDBCard 
            name="ChromaDB (内置)"
            type="chromadb"
            host="localhost"
            port={8000}
            isDefault={!providers.some(p => p.is_default)}
            status="active"
          />
          
          {/* 显示所有配置的向量数据库 */}
          {providers.map((provider) => (
            <VectorDBCard
              key={provider.id}
              id={provider.id}
              name={provider.name}
              type={provider.provider_type}
              host={provider.host || 'N/A'}
              port={provider.port || 0}
              isDefault={provider.is_default}
              status={provider.status}
              onSetDefault={handleSetDefault}
              onTest={handleTest}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
          
          {providers.length === 0 && (
            <div className="text-center text-blue-300 py-8 mt-4">
              <p className="text-sm">💡 点击"添加数据库"配置 Qdrant、Pinecone 等向量数据库</p>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddVectorDBModal 
          provider={editingProvider}
          onClose={() => {
            setShowAddModal(false);
            setEditingProvider(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingProvider(null);
            loadProviders();
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">确认删除</h3>
            <div className="text-gray-300 mb-2">
              确定要删除向量数据库配置 <strong className="text-white">"{providerToDelete?.name}"</strong> 吗？
            </div>
            {providerToDelete?.is_default && (
              <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 text-sm text-red-300 mb-4">
                ⚠️ 这是默认数据库，删除后系统将使用内置ChromaDB
              </div>
            )}
            <div className="text-sm text-gray-400 mb-6">
              此操作不会删除已存储的向量数据，但会移除配置信息
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setProviderToDelete(null);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 向量数据库卡片
function VectorDBCard(props: {
  id?: number;
  name: string;
  type: string;
  host: string;
  port: number;
  isDefault: boolean;
  status: string;
  onSetDefault?: (id: number) => void;
  onTest?: (id: number) => void;
  onEdit?: (provider: any) => void;
  onDelete?: (provider: any) => void;
}) {
  const handleSetDefault = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.id || !props.onSetDefault) return;
    props.onSetDefault(props.id);
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.id || !props.onTest) return;
    props.onTest(props.id);
  };

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.id || !props.onEdit) return;
    props.onEdit({
      id: props.id,
      name: props.name,
      provider_type: props.type,
      host: props.host,
      port: props.port,
      is_default: props.isDefault
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.id || !props.onDelete) return;
    props.onDelete({
      id: props.id,
      name: props.name,
      is_default: props.isDefault
    });
  };

  const handleCardClick = () => {
    if (!props.isDefault && props.id && props.onSetDefault) {
      props.onSetDefault(props.id);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`relative bg-white/5 border rounded-xl p-5 transition-all ${
        props.isDefault 
          ? 'border-blue-400 bg-gradient-to-r from-blue-500/10 to-purple-500/10 shadow-lg shadow-blue-500/20' 
          : 'border-white/10 hover:border-blue-400/50 hover:shadow-md cursor-pointer'
      }`}
    >
      {/* 选中指示器 */}
      {props.isDefault && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              props.isDefault 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                : 'bg-white/10'
            }`}>
              <Database className="w-5 h-5 text-white" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white">{props.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {props.isDefault && (
                  <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-xs font-bold rounded border border-blue-400/50">
                    ✓ 当前使用
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                  props.status === 'active' 
                    ? 'bg-green-500/20 text-green-300 border-green-400/50'
                    : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                }`}>
                  {props.status === 'active' ? '● 在线' : '○ 离线'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="pl-12 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-300/70 min-w-[60px]">类型：</span>
              <span className="text-white font-medium">
                {props.type === 'qdrant' ? 'Qdrant' : props.type === 'chromadb' ? 'ChromaDB' : props.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300/70 min-w-[60px]">地址：</span>
              <span className="text-white/80 font-mono text-xs truncate" title={`${props.host}:${props.port}`}>
                {props.host}:{props.port}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {!props.isDefault && props.id && (
            <button 
              onClick={handleSetDefault}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all text-sm font-medium shadow-lg hover:shadow-xl"
            >
              选择使用
            </button>
          )}
          {props.id && (
            <>
              <button 
                onClick={handleTest}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 rounded-lg transition-colors text-sm"
              >
                测试连接
              </button>
              <button 
                onClick={handleEdit}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 rounded-lg transition-colors text-sm"
              >
                编辑
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg transition-colors text-sm"
              >
                删除
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* 点击提示 */}
      {!props.isDefault && props.id && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-blue-500/80 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
            点击选择此数据库
          </div>
        </div>
      )}
    </div>
  );
}

// 添加/编辑向量数据库模态框
function AddVectorDBModal({ provider, onClose, onSuccess }: any) {
  const isEditing = !!provider;
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    provider_type: provider?.provider_type || 'qdrant',
    host: provider?.host || 'localhost',
    port: provider?.port || 6333,
    api_key: '',
  });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(isEditing);
  const [verifyMessage, setVerifyMessage] = useState(isEditing ? '✅ 编辑时无需重新验证，除非修改了连接信息' : '');

  // 根据提供商类型更新默认端口
  const handleProviderTypeChange = (type: string) => {
    let defaultPort = 6333;
    let defaultHost = 'localhost';
    
    switch(type) {
      case 'qdrant':
        defaultPort = 6333;
        break;
      case 'pinecone':
        defaultHost = '';
        defaultPort = 443;
        break;
      case 'weaviate':
        defaultPort = 8080;
        break;
      case 'milvus':
        defaultPort = 19530;
        break;
    }
    
    setFormData({ 
      ...formData, 
      provider_type: type,
      port: defaultPort,
      host: type === 'pinecone' ? '' : defaultHost
    });
    setVerified(false);
    setVerifyMessage('');
  };

  // 验证连接
  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMessage('');
    
    try {
      // 调用后端验证接口
      const response = await axios.post(`${API_BASE}/api/vector-db-providers/verify`, formData);
      
      if (response.data.success) {
        setVerified(true);
        setVerifyMessage(`✅ 连接成功！${response.data.message || ''}`);
      } else {
        setVerified(false);
        setVerifyMessage(`❌ 连接失败: ${response.data.message}`);
      }
    } catch (error: any) {
      setVerified(false);
      const errorMsg = error.response?.data?.detail || error.message;
      setVerifyMessage(`❌ 连接失败: ${errorMsg}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 新增时需要验证
    if (!isEditing && !verified) {
      alert('请先验证连接！');
      return;
    }
    
    try {
      if (isEditing) {
        // 编辑模式：只发送修改的字段
        const updateData: any = {
          name: formData.name,
          host: formData.host,
          port: formData.port
        };
        
        // 只有输入了新的 API 密钥才发送
        if (formData.api_key && formData.api_key.trim()) {
          updateData.api_key = formData.api_key.trim();
        }
        
        await axios.put(`${API_BASE}/api/vector-db-providers/${provider.id}`, updateData);
        alert('✅ 更新成功！');
      } else {
        // 新增模式：发送完整数据
        await axios.post(`${API_BASE}/api/vector-db-providers`, formData);
        alert('✅ 添加成功！');
      }
      onSuccess();
    } catch (error: any) {
      console.error(isEditing ? '更新失败' : '添加失败', error);
      const errorMsg = error.response?.data?.detail || error.message;
      alert(`❌ ${isEditing ? '更新' : '添加'}失败: ${errorMsg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{isEditing ? '编辑向量数据库' : '添加向量数据库'}</h2>
          <p className="text-blue-200 mt-1">
            {isEditing ? '更新向量数据库配置（留空API密钥则保持不变）' : '配置Qdrant、Pinecone等向量数据库服务'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder="如: Qdrant生产环境"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">类型</label>
            <select
              value={formData.provider_type}
              onChange={(e) => handleProviderTypeChange(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              disabled={isEditing}
            >
              <option value="qdrant">Qdrant</option>
              <option value="pinecone">Pinecone</option>
              <option value="weaviate">Weaviate</option>
              <option value="milvus">Milvus</option>
            </select>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-1">编辑时无法更改数据库类型</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                主机地址
                {formData.provider_type === 'qdrant' && <span className="text-xs ml-2">(本地或云端URL)</span>}
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => {
                  let host = e.target.value.trim();
                  // 移除可能的协议前缀
                  host = host.replace(/^https?:\/\//, '');
                  // 移除可能的尾部斜杠
                  host = host.replace(/\/$/, '');
                  setFormData({ ...formData, host });
                  setVerified(false);
                  setVerifyMessage('');
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder={formData.provider_type === 'qdrant' ? 'localhost 或 xxxxx.cloud.qdrant.io' : 'localhost'}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                端口
                {formData.provider_type === 'qdrant' && <span className="text-xs ml-2">(默认6333)</span>}
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 6333 })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="6333"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              API密钥
              {formData.provider_type === 'pinecone' && <span className="text-red-300 ml-1">(必填)</span>}
              {formData.provider_type === 'qdrant' && <span className="text-xs text-blue-300 ml-2">(云端版本需要)</span>}
              {isEditing && <span className="text-xs text-gray-400 ml-2">(留空则保持不变)</span>}
            </label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => {
                setFormData({ ...formData, api_key: e.target.value });
                setVerified(false);
                setVerifyMessage('');
              }}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder={isEditing ? '留空则不修改API密钥' : (formData.provider_type === 'pinecone' ? '必填' : '可选（本地部署不需要）')}
              required={!isEditing && formData.provider_type === 'pinecone'}
            />
          </div>

          {/* 验证按钮 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:bg-gray-500/20 text-green-300 disabled:text-gray-400 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>验证连接中...</span>
                </>
              ) : (
                <span>验证连接</span>
              )}
            </button>
            
            {verifyMessage && (
              <div className={`text-sm p-3 rounded-lg ${
                verified 
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                  : 'bg-red-500/20 text-red-300 border border-red-400/30'
              }`}>
                {verifyMessage}
              </div>
            )}
          </div>

          {/* 配置提示 */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 text-sm text-blue-200">
            <p className="font-medium mb-1">💡 {formData.provider_type === 'qdrant' ? 'Qdrant' : formData.provider_type} 配置说明：</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {formData.provider_type === 'qdrant' && (
                <>
                  <li>本地部署：host=localhost, port=6333，无需API密钥</li>
                  <li>Qdrant Cloud：host=xxxxx-xxxxx-xxxxx.us-east.aws.cloud.qdrant.io, port=6333，需要API密钥</li>
                  <li>⚠️ 注意：Qdrant Cloud使用HTTPS，系统会自动识别</li>
                  <li>从Qdrant Cloud控制台获取：Cluster URL 和 API Key</li>
                </>
              )}
              {formData.provider_type === 'pinecone' && (
                <>
                  <li>使用云端托管，无需端口配置</li>
                  <li>必须提供有效的API密钥</li>
                </>
              )}
              {formData.provider_type === 'weaviate' && (
                <>
                  <li>默认端口：8080</li>
                  <li>本地部署通常不需要API密钥</li>
                </>
              )}
              {formData.provider_type === 'milvus' && (
                <>
                  <li>默认端口：19530</li>
                  <li>支持本地和云端部署</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <button 
              type="submit" 
              disabled={!verified}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {isEditing ? '保存更改' : '添加'}
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
  );
}