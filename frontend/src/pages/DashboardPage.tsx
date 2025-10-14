import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Database, Cpu, Zap, FileText, TrendingUp, Activity } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:5003'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    documents: 0,
    knowledgeBases: 0,
    models: 0,
    activeModels: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [docsRes, kbRes, modelsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/documents/`),
        axios.get(`${API_BASE}/api/knowledge-bases/`),
        axios.get(`${API_BASE}/api/models/`),
      ])

      setStats({
        documents: docsRes.data.total || 0,
        knowledgeBases: kbRes.data.total || 0,
        models: modelsRes.data.total || 0,
        activeModels: modelsRes.data.models?.filter((m: any) => m.status === 'active').length || 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const chartData = [
    { name: '文档', value: stats.documents },
    { name: '知识库', value: stats.knowledgeBases },
    { name: '模型', value: stats.models },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <h2 className="text-3xl font-bold text-white mb-2">欢迎使用 cbitXForge v2.0 🎉</h2>
        <p className="text-blue-200 text-lg">AI模型自动化训练平台 - 让模型训练更简单、更高效</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          label="总文档数"
          value={stats.documents}
          color="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={<Database className="w-6 h-6" />}
          label="知识库"
          value={stats.knowledgeBases}
          color="from-purple-500 to-pink-500"
        />
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          label="训练模型"
          value={stats.models}
          color="from-orange-500 to-red-500"
        />
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          label="运行中"
          value={stats.activeModels}
          color="from-green-500 to-emerald-500"
        />
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            系统资源概览
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="name" stroke="#93c5fd" />
              <YAxis stroke="#93c5fd" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#fff'
                }}
              />
              <Bar dataKey="value" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            快速操作
          </h3>
          <div className="space-y-3">
            <QuickAction
              href="/auto-workflow"
              icon={<Zap className="w-5 h-5" />}
              title="自动化工作流"
              description="一键上传文档并自动训练模型"
              gradient="from-blue-500 to-purple-600"
            />
            <QuickAction
              href="/knowledge-bases"
              icon={<Database className="w-5 h-5" />}
              title="创建知识库"
              description="新建知识库并管理文档"
              gradient="from-purple-500 to-pink-600"
            />
            <QuickAction
              href="/model-versions"
              icon={<Cpu className="w-5 h-5" />}
              title="查看模型"
              description="管理和监控所有模型版本"
              gradient="from-orange-500 to-red-500"
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">系统状态</h3>
        <div className="flex items-center gap-3 text-green-300">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span>所有服务正常运行</span>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-gradient-to-br ${color} rounded-xl`}>
          {icon}
        </div>
      </div>
      <p className="text-blue-200 text-sm mb-1">{label}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
    </div>
  )
}

interface QuickActionProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}

function QuickAction({ href, icon, title, description, gradient }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:scale-105 group"
    >
      <div className={`p-3 bg-gradient-to-br ${gradient} rounded-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-white font-medium mb-1">{title}</p>
        <p className="text-blue-200 text-sm">{description}</p>
      </div>
    </a>
  )
}
