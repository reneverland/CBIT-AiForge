import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  Cloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  TestTube,
  Sparkles,
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5003/api';

interface VectorDBProvider {
  id: number;
  name: string;
  provider_type: string;
  host: string;
  port: number;
  is_default: boolean;
  status: string;
}

interface Collection {
  name: string;
  vectors_count: number;
  points_count?: number;
  segments_count?: number;
  error?: string;
}

interface SyncStatus {
  total_cloud_collections: number;
  total_local_knowledge_bases: number;
  synced_count: number;
  orphan_count: number;
  missing_count: number;
}

interface SyncResult {
  provider_id: number;
  provider_name: string;
  sync_status: SyncStatus;
  orphan_collections: string[];
  missing_collections: Array<{
    kb_id: number;
    kb_name: string;
    collection_name: string;
  }>;
  synced_collections: Array<{
    kb_id: number;
    kb_name: string;
    collection_name: string;
  }>;
  recommendations: {
    orphan: string;
    missing: string;
  };
}

const VectorDBManagePage: React.FC = () => {
  const [, setProviders] = useState<VectorDBProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<VectorDBProvider | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'orphan' | 'missing' | 'synced'>('all');

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      loadCollections(selectedProvider.id);
      performSync(selectedProvider.id);
    }
  }, [selectedProvider]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/vector-db-providers`);
      setProviders(response.data.providers);
      
      if (response.data.providers.length > 0 && !selectedProvider) {
        setSelectedProvider(response.data.providers[0]);
      }
    } catch (err: any) {
      setError(`加载提供商失败: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async (providerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/vector-db-providers/${providerId}/collections`);
      setCollections(response.data.collections);
    } catch (err: any) {
      setError(`加载Collections失败: ${err.response?.data?.detail || err.message}`);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const performSync = async (providerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_URL}/vector-db-providers/${providerId}/sync`);
      setSyncResult(response.data);
      setSuccess('同步检查完成');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`同步失败: ${err.response?.data?.detail || err.message}`);
      setSyncResult(null);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphans = async (providerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_URL}/vector-db-providers/${providerId}/sync/cleanup-orphans`);
      setSuccess(response.data.message);
      setTimeout(() => setSuccess(null), 3000);
      
      await loadCollections(providerId);
      await performSync(providerId);
    } catch (err: any) {
      setError(`清理失败: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (providerId: number, collectionName: string) => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_URL}/vector-db-providers/${providerId}/collections/${collectionName}`);
      setSuccess(`成功删除Collection: ${collectionName}`);
      setTimeout(() => setSuccess(null), 3000);
      
      await loadCollections(providerId);
      if (syncResult) {
        await performSync(providerId);
      }
    } catch (err: any) {
      setError(`删除失败: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    }
  };

  const testConnection = async (providerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_URL}/vector-db-providers/test`, {
        provider_id: providerId
      });
      
      if (response.data.verification_result.valid) {
        setSuccess('连接测试成功！');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`连接测试失败: ${response.data.verification_result.message}`);
      }
    } catch (err: any) {
      setError(`连接测试失败: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedProvider) {
      loadCollections(selectedProvider.id);
      performSync(selectedProvider.id);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Cloud className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">向量数据库管理</h1>
            <p className="text-sm text-blue-200">管理云端Collections和同步状态</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-200">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
            ×
          </button>
        </div>
      )}

      {/* Provider Info & Controls */}
      <div className="bg-white/5 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {selectedProvider && (
              <>
                <div>
                  <h3 className="text-white font-semibold">{selectedProvider.name}</h3>
                  <p className="text-sm text-blue-200">{selectedProvider.provider_type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedProvider.is_default 
                    ? 'bg-blue-500/30 text-blue-200' 
                    : 'bg-gray-500/30 text-gray-300'
                }`}>
                  {selectedProvider.is_default ? '默认' : '备用'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedProvider.status === 'active'
                    ? 'bg-green-500/30 text-green-200'
                    : 'bg-red-500/30 text-red-200'
                }`}>
                  {selectedProvider.status === 'active' ? '在线' : '离线'}
                </span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading || !selectedProvider}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={() => selectedProvider && performSync(selectedProvider.id)}
              disabled={loading || !selectedProvider}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-all"
            >
              <Database className="w-4 h-4" />
              同步检查
            </button>
            <button
              onClick={() => selectedProvider && cleanupOrphans(selectedProvider.id)}
              disabled={loading || !selectedProvider || !syncResult || syncResult.sync_status.orphan_count === 0}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              清理孤儿
            </button>
            <button
              onClick={() => selectedProvider && testConnection(selectedProvider.id)}
              disabled={loading || !selectedProvider}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-all"
            >
              <TestTube className="w-4 h-4" />
              测试连接
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Cards */}
      {syncResult && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={<Cloud />}
            label="云端Collections"
            value={syncResult.sync_status.total_cloud_collections}
            color="blue"
          />
          <StatCard
            icon={<Database />}
            label="本地知识库"
            value={syncResult.sync_status.total_local_knowledge_bases}
            color="purple"
          />
          <StatCard
            icon={<CheckCircle2 />}
            label="已同步"
            value={syncResult.sync_status.synced_count}
            color="green"
          />
          <StatCard
            icon={<AlertTriangle />}
            label="孤儿Collections"
            value={syncResult.sync_status.orphan_count}
            color="orange"
          />
          <StatCard
            icon={<XCircle />}
            label="缺失Collections"
            value={syncResult.sync_status.missing_count}
            color="red"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-white/10">
        <TabButton
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          label={`所有Collections (${collections.length})`}
        />
        {syncResult && (
          <>
            <TabButton
              active={activeTab === 'orphan'}
              onClick={() => setActiveTab('orphan')}
              label={`孤儿 (${syncResult.sync_status.orphan_count})`}
            />
            <TabButton
              active={activeTab === 'missing'}
              onClick={() => setActiveTab('missing')}
              label={`缺失 (${syncResult.sync_status.missing_count})`}
            />
            <TabButton
              active={activeTab === 'synced'}
              onClick={() => setActiveTab('synced')}
              label={`已同步 (${syncResult.sync_status.synced_count})`}
            />
          </>
        )}
      </div>

      {/* Content */}
      <div className="bg-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div>
            {activeTab === 'all' && (
              <CollectionsTable
                collections={collections}
                syncResult={syncResult}
                onDelete={(name) => {
                  setCollectionToDelete(name);
                  setDeleteDialogOpen(true);
                }}
              />
            )}

            {activeTab === 'orphan' && syncResult && (
              <OrphanList
                orphans={syncResult.orphan_collections}
                recommendation={syncResult.recommendations.orphan}
                onDelete={(name) => {
                  setCollectionToDelete(name);
                  setDeleteDialogOpen(true);
                }}
              />
            )}

            {activeTab === 'missing' && syncResult && (
              <MissingList
                missing={syncResult.missing_collections}
                recommendation={syncResult.recommendations.missing}
              />
            )}

            {activeTab === 'synced' && syncResult && (
              <SyncedList synced={syncResult.synced_collections} />
            )}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">确认删除</h3>
            <p className="text-gray-300 mb-2">
              确定要删除Collection <strong className="text-white">{collectionToDelete}</strong> 吗？
            </p>
            <p className="text-red-400 text-sm mb-6">
              ⚠️ 此操作不可撤销，所有向量数据将被永久删除！
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (selectedProvider && collectionToDelete) {
                    deleteCollection(selectedProvider.id, collectionToDelete);
                  }
                }}
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
};

// Helper Components

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2 text-white/70">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-all ${
      active
        ? 'text-white border-b-2 border-blue-400'
        : 'text-gray-400 hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

interface CollectionsTableProps {
  collections: Collection[];
  syncResult: SyncResult | null;
  onDelete: (name: string) => void;
}

const CollectionsTable: React.FC<CollectionsTableProps> = ({ collections, syncResult, onDelete }) => {
  if (collections.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        暂无Collections
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-white/5">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Collection名称</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">向量数量</th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">状态</th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {collections.map((col) => {
          const isOrphan = syncResult?.orphan_collections.includes(col.name);
          const isSynced = syncResult?.synced_collections.some(s => s.collection_name === col.name);

          return (
            <tr key={col.name} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <code className="text-sm text-blue-300">{col.name}</code>
              </td>
              <td className="px-4 py-3 text-right text-white">
                {col.vectors_count.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-center">
                {col.error ? (
                  <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">错误</span>
                ) : isOrphan ? (
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">孤儿</span>
                ) : isSynced ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">已同步</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded text-xs">正常</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onDelete(col.name)}
                  className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all"
                  title="删除Collection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

interface OrphanListProps {
  orphans: string[];
  recommendation: string;
  onDelete: (name: string) => void;
}

const OrphanList: React.FC<OrphanListProps> = ({ orphans, recommendation, onDelete }) => (
  <div>
    <div className="p-4 bg-orange-500/10 border-b border-white/5">
      <p className="text-sm text-orange-200">{recommendation}</p>
    </div>
    {orphans.length === 0 ? (
      <div className="text-center py-12 text-gray-400">
        没有孤儿Collections
      </div>
    ) : (
      <table className="w-full">
        <thead className="bg-white/5">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Collection名称</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {orphans.map((name) => (
            <tr key={name} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <code className="text-sm text-orange-300">{name}</code>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onDelete(name)}
                  className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

interface MissingListProps {
  missing: Array<{ kb_id: number; kb_name: string; collection_name: string }>;
  recommendation: string;
}

const MissingList: React.FC<MissingListProps> = ({ missing, recommendation }) => (
  <div>
    <div className="p-4 bg-red-500/10 border-b border-white/5">
      <p className="text-sm text-red-200">{recommendation}</p>
    </div>
    {missing.length === 0 ? (
      <div className="text-center py-12 text-gray-400">
        没有缺失的Collections
      </div>
    ) : (
      <table className="w-full">
        <thead className="bg-white/5">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">知识库名称</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Collection名称</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">知识库ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {missing.map((item) => (
            <tr key={item.kb_id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 text-white">{item.kb_name}</td>
              <td className="px-4 py-3">
                <code className="text-sm text-red-300">{item.collection_name}</code>
              </td>
              <td className="px-4 py-3 text-gray-400">{item.kb_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

interface SyncedListProps {
  synced: Array<{ kb_id: number; kb_name: string; collection_name: string }>;
}

const SyncedList: React.FC<SyncedListProps> = ({ synced }) => {
  if (synced.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        没有已同步的Collections
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-white/5">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">知识库名称</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Collection名称</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">知识库ID</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {synced.map((item) => (
          <tr key={item.kb_id} className="hover:bg-white/5 transition-colors">
            <td className="px-4 py-3 text-white">{item.kb_name}</td>
            <td className="px-4 py-3">
              <code className="text-sm text-green-300">{item.collection_name}</code>
            </td>
            <td className="px-4 py-3 text-gray-400">{item.kb_id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default VectorDBManagePage;