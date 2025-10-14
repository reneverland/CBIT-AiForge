import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  Play,
  Sparkles,
  Database,
  Brain,
  Zap
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

interface WorkflowStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  icon: React.ReactNode
  message?: string
}

export default function AutoWorkflowPage() {
  const [files, setFiles] = useState<File[]>([])
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: 'upload', name: '文档上传', status: 'pending', icon: <Upload className="w-5 h-5" /> },
    { id: 'clean', name: '智能清洗', status: 'pending', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'convert', name: 'QA转换', status: 'pending', icon: <FileText className="w-5 h-5" /> },
    { id: 'kb', name: '知识库构建', status: 'pending', icon: <Database className="w-5 h-5" /> },
    { id: 'train', name: '模型训练', status: 'pending', icon: <Brain className="w-5 h-5" /> },
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [modelName, setModelName] = useState('')
  const [modelDescription, setModelDescription] = useState('')
  const [selectedKB, setSelectedKB] = useState('')
  const [kbList, setKbList] = useState<any[]>([])
  const [useOpenAI, setUseOpenAI] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const updateStepStatus = (stepId: string, status: WorkflowStep['status'], message?: string) => {
    setWorkflowSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, message } : step
    ))
  }

  const startAutomatedWorkflow = async () => {
    if (files.length === 0) {
      alert('请先上传文档！')
      return
    }

    if (!modelName.trim()) {
      alert('请输入模型名称！')
      return
    }

    setIsProcessing(true)
    const documentIds: number[] = []

    try {
      // Step 1: 上传文档
      updateStepStatus('upload', 'running', '正在上传文档...')
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        if (selectedKB) {
          const kbId = kbList.find(kb => kb.name === selectedKB)?.id
          if (kbId) formData.append('knowledge_base_id', kbId.toString())
        }

        const uploadRes = await axios.post(`${API_BASE}/api/documents/upload`, formData)
        const docId = uploadRes.data.id
        documentIds.push(docId)

        // Step 2: 处理文档（清洗）
        updateStepStatus('upload', 'completed')
        updateStepStatus('clean', 'running', `正在清洗 ${file.name}...`)
        
        await axios.post(`${API_BASE}/api/documents/${docId}/process`)
      }

      updateStepStatus('clean', 'completed', `成功清洗 ${files.length} 个文档`)

      // Step 3: 生成训练数据集（QA转换）
      updateStepStatus('convert', 'running', '正在生成训练数据集...')
      
      const datasetRes = await axios.post(`${API_BASE}/api/training/generate-dataset`, {
        document_ids: documentIds,
        template: 'general',
        use_openai: useOpenAI,
        questions_per_chunk: 3
      })

      const datasetPath = datasetRes.data.dataset_path
      updateStepStatus('convert', 'completed', `生成 ${datasetRes.data.total_examples} 条训练数据`)

      // Step 4: 添加到知识库（如果选择了）
      if (selectedKB) {
        updateStepStatus('kb', 'running', '正在添加到知识库...')
        
        const kbId = kbList.find(kb => kb.name === selectedKB)?.id
        if (kbId) {
          for (const docId of documentIds) {
            await axios.post(`${API_BASE}/api/knowledge-bases/${kbId}/documents/${docId}`)
          }
          updateStepStatus('kb', 'completed', `已添加到知识库：${selectedKB}`)
        }
      } else {
        updateStepStatus('kb', 'completed', '跳过（未选择知识库）')
      }

      // Step 5: 开始训练
      updateStepStatus('train', 'running', '正在创建训练任务...')
      
      const trainRes = await axios.post(`${API_BASE}/api/training/start`, {
        model_name: modelName,
        display_name: modelName,
        description: modelDescription || `基于 ${files.length} 个文档自动训练的模型`,
        dataset_path: datasetPath,
        base_model: 'Qwen/Qwen2.5-7B-Instruct',
        config: {
          learning_rate: 2e-4,
          num_epochs: 3,
          batch_size: 4
        }
      })

      updateStepStatus('train', 'completed', `训练任务已创建 (Job ID: ${trainRes.data.job_id})`)

      alert(`🎉 自动化工作流完成！\n\n模型 "${modelName}" 已创建\n训练任务 ID: ${trainRes.data.job_id}\n\n注意：实际训练需要在GPU服务器上进行。`)

    } catch (error: any) {
      const currentStep = workflowSteps.find(s => s.status === 'running')
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error', error.response?.data?.detail || error.message)
      }
      alert(`工作流执行失败：${error.response?.data?.detail || error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 加载知识库列表
  const loadKBList = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/knowledge-bases/`)
      setKbList(res.data.knowledge_bases || [])
    } catch (error) {
      console.error('Failed to load knowledge bases:', error)
    }
  }

  useState(() => {
    loadKBList()
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">自动化工作流</h2>
            <p className="text-blue-200 mt-1">上传文档 → 自动清洗 → 生成数据集 → 训练模型</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: File Upload */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Area */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">1. 上传训练文档</h3>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-blue-400 bg-blue-500/20'
                  : 'border-white/30 hover:border-white/50 hover:bg-white/5'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-blue-300" />
              <p className="text-white font-medium mb-2">
                {isDragActive ? '释放以上传文件' : '拖拽文件到此处或点击选择'}
              </p>
              <p className="text-blue-200 text-sm">
                支持 PDF, DOCX, TXT, MD 格式
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-300" />
                      <div>
                        <p className="text-white text-sm font-medium">{file.name}</p>
                        <p className="text-blue-200 text-xs">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">2. 配置训练参数</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-blue-200 text-sm mb-2">模型名称 *</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="例如: my-model-v1"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-blue-200 text-sm mb-2">模型描述</label>
                <textarea
                  value={modelDescription}
                  onChange={(e) => setModelDescription(e.target.value)}
                  placeholder="简要描述这个模型的用途..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-blue-200 text-sm mb-2">关联知识库（可选）</label>
                <select
                  value={selectedKB}
                  onChange={(e) => setSelectedKB(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="">不关联</option>
                  {kbList.map(kb => (
                    <option key={kb.id} value={kb.name}>{kb.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="useOpenAI"
                  checked={useOpenAI}
                  onChange={(e) => setUseOpenAI(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="useOpenAI" className="text-blue-200 text-sm">
                  使用 OpenAI API 生成高质量 QA 数据集（需配置 API Key）
                </label>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startAutomatedWorkflow}
            disabled={isProcessing || files.length === 0 || !modelName.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>处理中...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>开始自动化训练</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Workflow Progress */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 sticky top-24">
            <h3 className="text-lg font-semibold text-white mb-4">工作流进度</h3>
            
            <div className="space-y-3">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute left-5 top-12 w-0.5 h-8 bg-white/20"></div>
                  )}
                  
                  <div className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    step.status === 'running' ? 'bg-blue-500/20 shadow-lg' :
                    step.status === 'completed' ? 'bg-green-500/20' :
                    step.status === 'error' ? 'bg-red-500/20' :
                    'bg-white/5'
                  }`}>
                    <div className={`p-2 rounded-lg ${
                      step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      step.status === 'completed' ? 'bg-green-500' :
                      step.status === 'error' ? 'bg-red-500' :
                      'bg-white/10'
                    }`}>
                      {step.status === 'running' ? (
                        <Loader className="w-5 h-5 text-white animate-spin" />
                      ) : step.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : step.status === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-white" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{step.name}</p>
                      {step.message && (
                        <p className={`text-xs mt-1 ${
                          step.status === 'error' ? 'text-red-300' : 'text-blue-200'
                        }`}>
                          {step.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
