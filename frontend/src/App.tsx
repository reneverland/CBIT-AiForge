import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { Database, FileText, Brain, Cpu, TestTube, Settings } from 'lucide-react'
import HomePage from './pages/HomePage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import FineTunePage from './pages/FineTunePage'
import ModelsPage from './pages/ModelsPage'
import InferencePage from './pages/InferencePage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    cbitXForge
                  </h1>
                  <p className="text-xs text-gray-500">计算与推理大模型服务平台</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                © 2025 Reneverland, CBIT, CUHK
              </div>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="container mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <nav className="bg-white rounded-lg shadow-sm p-4 space-y-1">
                <NavItem to="/" icon={<Settings />} label="控制台" />
                <NavItem to="/knowledge-bases" icon={<Database />} label="知识库管理" />
                <NavItem to="/fine-tune" icon={<FileText />} label="模型微调" />
                <NavItem to="/models" icon={<Cpu />} label="模型管理" />
                <NavItem to="/inference" icon={<TestTube />} label="推理测试" />
              </nav>

              {/* Quick Info */}
              <div className="mt-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm p-4 text-white">
                <h3 className="font-semibold mb-2">快速开始</h3>
                <ul className="text-sm space-y-1 opacity-90">
                  <li>1️⃣ 创建知识库</li>
                  <li>2️⃣ 上传文档</li>
                  <li>3️⃣ 微调模型</li>
                  <li>4️⃣ 开始推理</li>
                </ul>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/knowledge-bases" element={<KnowledgeBasePage />} />
                <Route path="/fine-tune" element={<FineTunePage />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/inference" element={<InferencePage />} />
              </Routes>
            </main>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="container mx-auto px-6 py-4 text-center text-sm text-gray-600">
            <p>
              Powered by <strong>cbitXForge</strong> | 
              <a href="http://cbit.cuhk.edu.cn" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                CBIT, CUHK
              </a>
            </p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-600 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      <span className="w-5 h-5">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default App

