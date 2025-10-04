import { useState, useEffect } from 'react'
import { Cpu, Play, Square, Trash2 } from 'lucide-react'
import axios from 'axios'

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<any>(null)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const res = await axios.get('/api/models')
      setModels(res.data.models || [])
    } catch (error) {
      console.error('加载模型失败:', error)
    }
  }

  const handleActivate = async (modelId: number) => {
    try {
      await axios.post(`/api/models/${modelId}/activate`)
      alert('模型已激活')
      loadModels()
    } catch (error: any) {
      alert(error.response?.data?.detail || '激活失败')
    }
  }

  const handleDeactivate = async (modelId: number) => {
    try {
      await axios.post(`/api/models/${modelId}/deactivate`)
      alert('模型已停用')
      loadModels()
    } catch (error: any) {
      alert(error.response?.data?.detail || '停用失败')
    }
  }

  const handleDelete = async (modelId: number) => {
    if (!confirm('确定要删除这个模型吗？')) return
    try {
      await axios.delete(`/api/models/${modelId}`)
      loadModels()
      setSelectedModel(null)
    } catch (error: any) {
      alert(error.response?.data?.detail || '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">模型管理</h2>
        <p className="text-gray-600 mt-1">管理和部署训练好的模型</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <Cpu className="w-5 h-5 mr-2 text-blue-600" />
            模型列表
          </h3>
          <div className="space-y-2">
            {models.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">暂无模型</p>
            ) : (
              models.map((model) => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedModel?.id === model.id
                      ? 'bg-blue-50 border-2 border-blue-600'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{model.display_name}</div>
                    <StatusBadge status={model.status} />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{model.model_type}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Model Details */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {selectedModel ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">{selectedModel.display_name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{selectedModel.description}</p>
                </div>
                <StatusBadge status={selectedModel.status} large />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoCard label="模型标识" value={selectedModel.name} />
                <InfoCard label="基座模型" value={selectedModel.base_model.split('/').pop()} />
                <InfoCard label="模型类型" value={selectedModel.model_type} />
                <InfoCard
                  label="服务端口"
                  value={selectedModel.port || '未分配'}
                />
              </div>

              {selectedModel.training_config && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">训练配置</h4>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">学习率:</span>
                      <span className="ml-2 font-medium">
                        {selectedModel.training_config.learning_rate}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Epochs:</span>
                      <span className="ml-2 font-medium">
                        {selectedModel.training_config.num_epochs}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Batch Size:</span>
                      <span className="ml-2 font-medium">
                        {selectedModel.training_config.batch_size}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">LoRA Rank:</span>
                      <span className="ml-2 font-medium">
                        {selectedModel.training_config.lora_r}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                {selectedModel.status === 'inactive' ? (
                  <button
                    onClick={() => handleActivate(selectedModel.id)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>激活模型</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeactivate(selectedModel.id)}
                    className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    <span>停用模型</span>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedModel.id)}
                  disabled={selectedModel.status === 'active'}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除模型</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Cpu className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>请选择一个模型查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const config: any = {
    active: { label: '运行中', color: 'bg-green-100 text-green-700' },
    inactive: { label: '未激活', color: 'bg-gray-100 text-gray-700' },
    training: { label: '训练中', color: 'bg-blue-100 text-blue-700' },
    failed: { label: '失败', color: 'bg-red-100 text-red-700' },
  }

  const cfg = config[status] || config.inactive

  return (
    <span
      className={`${cfg.color} px-2 py-1 rounded text-xs font-medium ${
        large ? 'text-sm px-3 py-1.5' : ''
      }`}
    >
      {cfg.label}
    </span>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="font-medium mt-1 truncate">{value}</div>
    </div>
  )
}

