import { useState, useEffect } from 'react'
import { Sparkles, FileText, Settings, Play, CheckCircle2 } from 'lucide-react'
import axios from 'axios'

export default function FineTunePage() {
  const [step, setStep] = useState(1)
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('general')
  const [documents, setDocuments] = useState<any[]>([])
  const [selectedDocs, setSelectedDocs] = useState<number[]>([])
  const [useOpenAI, setUseOpenAI] = useState(true)
  const [modelName, setModelName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [generatedDataset, setGeneratedDataset] = useState<any>(null)

  useEffect(() => {
    loadTemplates()
    loadDocuments()
  }, [])

  const loadTemplates = async () => {
    try {
      const res = await axios.get('/api/training/templates')
      setTemplates(res.data.templates || [])
    } catch (error) {
      console.error('加载模板失败:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      const res = await axios.get('/api/documents')
      setDocuments(res.data.documents || [])
    } catch (error) {
      console.error('加载文档失败:', error)
    }
  }

  const handleGenerateDataset = async () => {
    try {
      const res = await axios.post('/api/training/generate-dataset', {
        document_ids: selectedDocs,
        template: selectedTemplate,
        use_openai: useOpenAI,
        questions_per_chunk: 3,
      })
      setGeneratedDataset(res.data)
      setStep(3)
    } catch (error: any) {
      alert(error.response?.data?.detail || '生成数据集失败')
    }
  }

  const handleStartTraining = async () => {
    try {
      const res = await axios.post('/api/training/start', {
        model_name: modelName,
        display_name: displayName,
        description: description,
        dataset_path: generatedDataset.dataset_path,
      })
      alert('训练任务已创建！\n' + res.data.note)
      // 重置流程
      setStep(1)
      setSelectedDocs([])
      setGeneratedDataset(null)
    } catch (error: any) {
      alert(error.response?.data?.detail || '创建训练任务失败')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">模型微调</h2>
        <p className="text-gray-600 mt-1">简明易懂的 UI 指引，一步步完成模型微调</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <StepIndicator number={1} title="选择模板" active={step >= 1} completed={step > 1} />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div
              className={`h-full bg-blue-600 transition-all ${step > 1 ? 'w-full' : 'w-0'}`}
            />
          </div>
          <StepIndicator number={2} title="上传数据" active={step >= 2} completed={step > 2} />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div
              className={`h-full bg-blue-600 transition-all ${step > 2 ? 'w-full' : 'w-0'}`}
            />
          </div>
          <StepIndicator number={3} title="配置训练" active={step >= 3} completed={step > 3} />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div
              className={`h-full bg-blue-600 transition-all ${step > 3 ? 'w-full' : 'w-0'}`}
            />
          </div>
          <StepIndicator number={4} title="开始训练" active={step >= 4} completed={step > 4} />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {step === 1 && (
          <Step1SelectTemplate
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2UploadData
            documents={documents}
            selectedDocs={selectedDocs}
            onSelectDocs={setSelectedDocs}
            useOpenAI={useOpenAI}
            onToggleOpenAI={setUseOpenAI}
            onBack={() => setStep(1)}
            onNext={handleGenerateDataset}
          />
        )}

        {step === 3 && generatedDataset && (
          <Step3Configure
            dataset={generatedDataset}
            modelName={modelName}
            setModelName={setModelName}
            displayName={displayName}
            setDisplayName={setDisplayName}
            description={description}
            setDescription={setDescription}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <Step4StartTraining
            modelName={modelName}
            displayName={displayName}
            datasetSize={generatedDataset?.total_examples}
            onBack={() => setStep(3)}
            onStart={handleStartTraining}
          />
        )}
      </div>
    </div>
  )
}

function StepIndicator({ number, title, active, completed }: any) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
          completed
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {completed ? <CheckCircle2 className="w-6 h-6" /> : number}
      </div>
      <p className={`text-sm mt-2 ${active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {title}
      </p>
    </div>
  )
}

function Step1SelectTemplate({ templates, selectedTemplate, onSelect, onNext }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
          步骤 1: 选择训练模板
        </h3>
        <p className="text-gray-600 mt-1">选择适合您使用场景的训练模板</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.key}
            onClick={() => onSelect(template.key)}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedTemplate === template.key
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-semibold text-lg">{template.name}</h4>
            <p className="text-sm text-gray-600 mt-2">{template.description}</p>
            <div className="mt-4 text-sm text-gray-500">
              <div>领域: {template.domain}</div>
              <div>学习率: {template.default_config.learning_rate}</div>
              <div>Epochs: {template.default_config.num_epochs}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          下一步
        </button>
      </div>
    </div>
  )
}

function Step2UploadData({
  documents,
  selectedDocs,
  onSelectDocs,
  useOpenAI,
  onToggleOpenAI,
  onBack,
  onNext,
}: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          步骤 2: 选择训练数据
        </h3>
        <p className="text-gray-600 mt-1">选择用于训练的文档</p>
      </div>

      <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
        {documents.map((doc: any) => (
          <label
            key={doc.id}
            className="flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedDocs.includes(doc.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectDocs([...selectedDocs, doc.id])
                } else {
                  onSelectDocs(selectedDocs.filter((id: number) => id !== doc.id))
                }
              }}
              className="w-4 h-4 text-blue-600"
            />
            <span className="ml-3 flex-1">{doc.filename}</span>
            <span className="text-sm text-gray-500">{doc.file_type}</span>
          </label>
        ))}
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={useOpenAI}
            onChange={(e) => onToggleOpenAI(e.target.checked)}
            className="w-4 h-4 text-blue-600"
          />
          <span className="ml-3 font-medium">使用 OpenAI 辅助生成 QA 格式</span>
        </label>
        <p className="text-sm text-gray-600 mt-2 ml-7">
          推荐开启，可自动将文档转换为高质量的问答对训练数据
        </p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          上一步
        </button>
        <button
          onClick={onNext}
          disabled={selectedDocs.length === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          生成数据集
        </button>
      </div>
    </div>
  )
}

function Step3Configure({
  dataset,
  modelName,
  setModelName,
  displayName,
  setDisplayName,
  description,
  setDescription,
  onBack,
  onNext,
}: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center">
          <Settings className="w-5 h-5 mr-2 text-blue-600" />
          步骤 3: 配置训练参数
        </h3>
        <p className="text-gray-600 mt-1">设置模型名称和训练参数</p>
      </div>

      <div className="bg-green-50 rounded-lg p-4">
        <p className="font-medium text-green-900">✅ 数据集生成成功</p>
        <p className="text-sm text-green-700 mt-1">
          共生成 {dataset.total_examples} 条训练数据
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            模型标识名称 *
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：math_model_v1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">显示名称 *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：数学推理模型 v1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述（可选）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="简要描述模型用途..."
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          上一步
        </button>
        <button
          onClick={onNext}
          disabled={!modelName || !displayName}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          下一步
        </button>
      </div>
    </div>
  )
}

function Step4StartTraining({
  modelName,
  displayName,
  datasetSize,
  onBack,
  onStart,
}: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold flex items-center">
          <Play className="w-5 h-5 mr-2 text-blue-600" />
          步骤 4: 开始训练
        </h3>
        <p className="text-gray-600 mt-1">确认信息并开始训练</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">模型名称:</span>
          <span className="font-medium">{displayName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">标识:</span>
          <span className="font-mono text-sm">{modelName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">训练数据:</span>
          <span className="font-medium">{datasetSize} 条</span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-900">
          ⚠️ <strong>注意</strong>: 实际训练需要在 GPU 服务器上运行。本地开发环境仅创建训练任务记录。
        </p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          上一步
        </button>
        <button
          onClick={onStart}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Play className="w-5 h-5" />
          <span>开始训练</span>
        </button>
      </div>
    </div>
  )
}

