import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Workflow, 
  Database, 
  Layers, 
  Sparkles, 
  Settings,
  FileText,
  Zap,
  Globe,
  Boxes,
  MessageSquare,
  Cloud
} from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import AutoWorkflowPage from './pages/AutoWorkflowPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import ModelVersionsPage from './pages/ModelVersionsPage'
import InferencePage from './pages/InferencePage'
import AIProvidersPage from './pages/AIProvidersPage'
import SettingsPage from './pages/SettingsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import FixedQAPage from './pages/FixedQAPage'
import VectorDBManagePage from './pages/VectorDBManagePage'
import './App.css'

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Modern Header with glassmorphism */}
        <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-75"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    cbitXForge
                    <span className="text-xs font-normal bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">v2.0</span>
                  </h1>
                  <p className="text-xs text-blue-200">AI模型自动化训练平台</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-white">服务运行中</span>
                </div>
                <div className="text-sm text-blue-200">
                  © 2025 CBIT, CUHK
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="container mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Modern Sidebar */}
            <aside className="w-72 flex-shrink-0">
              <nav className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-3 space-y-1 border border-white/10">
                <NavItem to="/" icon={<LayoutDashboard />} label="控制台" badge="NEW" />
                <NavItem to="/auto-workflow" icon={<Workflow />} label="自动化工作流" gradient />
                <NavItem to="/knowledge-bases" icon={<Database />} label="知识库管理" />
                <NavItem to="/vector-db-manage" icon={<Cloud />} label="向量数据库管理" badge="HOT" />
                <NavItem to="/model-versions" icon={<Layers />} label="模型版本管理" />
                <NavItem to="/inference" icon={<Zap />} label="智能推理" />
                <div className="pt-2 mt-2 border-t border-white/10">
                  <NavItem to="/applications" icon={<Boxes />} label="应用实例管理" />
                  <NavItem to="/fixed-qa" icon={<MessageSquare />} label="固定Q&A管理" />
                  <NavItem to="/ai-providers" icon={<Globe />} label="AI提供商配置" />
                  <NavItem to="/settings" icon={<Settings />} label="系统设置" />
                </div>
              </nav>

              {/* Feature Card */}
              <div className="mt-6 bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-md rounded-2xl shadow-2xl p-6 text-white border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-300" />
                  <h3 className="font-semibold">自动化特性</h3>
                </div>
                <ul className="text-sm space-y-2 opacity-90">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    <span>文档智能清洗</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                    <span>自动QA生成</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                    <span>一键模型训练</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    <span>版本智能管理</span>
                  </li>
                </ul>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <StatCard icon={<FileText className="w-4 h-4" />} label="文档" value="0" />
                <StatCard icon={<Layers className="w-4 h-4" />} label="模型" value="0" />
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-h-[600px]">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/auto-workflow" element={<AutoWorkflowPage />} />
                <Route path="/knowledge-bases" element={<KnowledgeBasePage />} />
                <Route path="/vector-db-manage" element={<VectorDBManagePage />} />
                <Route path="/model-versions" element={<ModelVersionsPage />} />
                <Route path="/inference" element={<InferencePage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/fixed-qa" element={<FixedQAPage />} />
                <Route path="/ai-providers" element={<AIProvidersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  )
}

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  badge?: string
  gradient?: boolean
}

function NavItem({ to, icon, label, badge, gradient }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? gradient
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
              : 'bg-white/20 text-white font-medium shadow-lg'
            : 'text-blue-100 hover:bg-white/10 hover:scale-102'
        }`
      }
    >
      <div className="flex items-center space-x-3">
        <span className="w-5 h-5">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      {badge && (
        <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
      <div className="flex items-center gap-2 mb-1 text-blue-200">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

export default App
