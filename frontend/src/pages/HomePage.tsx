import { useEffect, useState } from 'react'
import { Database, FileText, Cpu, TrendingUp, Zap } from 'lucide-react'
import axios from 'axios'

export default function HomePage() {
  const [stats, setStats] = useState({
    knowledgeBases: 0,
    documents: 0,
    models: 0,
    activeModels: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [kbRes, docRes, modelRes] = await Promise.all([
        axios.get('/api/knowledge-bases'),
        axios.get('/api/documents'),
        axios.get('/api/models'),
      ])

      setStats({
        knowledgeBases: kbRes.data.total || 0,
        documents: docRes.data.total || 0,
        models: modelRes.data.total || 0,
        activeModels: modelRes.data.models?.filter((m: any) => m.status === 'active').length || 0,
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">控制台</h2>
        <p className="text-gray-600 mt-1">欢迎使用 cbitXForge 计算与推理大模型服务平台</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Database className="w-6 h-6" />}
          title="知识库"
          value={stats.knowledgeBases}
          color="blue"
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          title="文档数量"
          value={stats.documents}
          color="green"
        />
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          title="训练模型"
          value={stats.models}
          color="purple"
        />
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          title="运行中"
          value={stats.activeModels}
          color="orange"
        />
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          核心功能
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            title="RAG 检索增强"
            description="支持多知识库管理，文档自动清洗和向量化，实时检索相关内容"
            features={['多知识库管理', '自动向量化', '智能检索']}
          />
          <FeatureCard
            title="模型微调"
            description="简明的UI指引，支持多种训练模板，OpenAI辅助转换QA格式"
            features={['模板化训练', 'QA自动生成', '实时监控']}
          />
          <FeatureCard
            title="推理服务"
            description="兼容 OpenAI API 格式，支持流式输出，多模型并行服务"
            features={['OpenAI兼容', '流式输出', '多模型服务']}
          />
          <FeatureCard
            title="可视化管理"
            description="现代化的 UI 界面，实时训练进度，模型性能监控"
            features={['实时监控', '性能分析', '版本管理']}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
        <h3 className="text-xl font-semibold mb-4">快速开始</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionButton href="/knowledge-bases" label="创建知识库" />
          <ActionButton href="/fine-tune" label="微调模型" />
          <ActionButton href="/inference" label="开始推理" />
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'orange'
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  features: string[]
}

function FeatureCard({ title, description, features }: FeatureCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-semibold text-lg mb-2">{title}</h4>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <ul className="space-y-1">
        {features.map((feature, i) => (
          <li key={i} className="text-sm text-gray-700 flex items-center">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-center font-medium transition-colors"
    >
      {label}
    </a>
  )
}

