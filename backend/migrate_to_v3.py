"""
数据库迁移脚本: v2.x → v3.0
将复杂的Application表结构迁移到简化版

执行方式：
python3 migrate_to_v3.py
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.database import Base as OldBase, Application as OldApplication
from app.models.database_v3 import Base as NewBase
import json
from datetime import datetime

# 数据库路径
DB_PATH = settings.SQLITE_DB_PATH
BACKUP_PATH = f"{DB_PATH}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

print("=" * 60)
print("  🔄 CBIT-AiForge 数据库迁移工具 v2.x → v3.0")
print("=" * 60)
print(f"\n📂 数据库路径: {DB_PATH}")
print(f"💾 备份路径: {BACKUP_PATH}\n")


def backup_database():
    """备份数据库"""
    import shutil
    print("📦 正在备份数据库...")
    try:
        shutil.copy2(DB_PATH, BACKUP_PATH)
        print(f"✅ 备份完成: {BACKUP_PATH}\n")
        return True
    except Exception as e:
        print(f"❌ 备份失败: {e}")
        return False


def convert_old_config_to_mode(old_app_data: dict) -> tuple:
    """将旧配置转换为新的mode和mode_config
    
    Returns:
        (mode, mode_config) 元组
    """
    # 判断模式
    enable_fixed_qa = old_app_data.get('enable_fixed_qa', False)
    enable_vector_kb = old_app_data.get('enable_vector_kb', False)
    enable_web_search = old_app_data.get('enable_web_search', False)
    
    # 根据启用的功能判断模式
    if enable_web_search:
        mode = "enhanced"
    elif enable_vector_kb:
        mode = "standard"
    else:
        mode = "safe"
    
    # 构建mode_config
    mode_config = {}
    
    # 阈值配置
    if old_app_data.get('similarity_threshold_high'):
        mode_config['fixed_qa_threshold'] = old_app_data['similarity_threshold_high']
    if old_app_data.get('similarity_threshold_low'):
        mode_config['recommend_threshold'] = old_app_data['similarity_threshold_low']
    
    # 检索配置
    if old_app_data.get('top_k'):
        mode_config['top_k'] = old_app_data['top_k']
    
    # LLM配置
    if old_app_data.get('enable_llm_polish') is not None:
        mode_config['enable_llm_polish'] = old_app_data['enable_llm_polish']
    
    # 自定义回复
    if old_app_data.get('enable_custom_no_result_response'):
        mode_config['fallback_message'] = old_app_data.get('custom_no_result_response', '')
    
    # 联网搜索配置
    if enable_web_search:
        if old_app_data.get('web_search_auto_threshold'):
            mode_config['web_search_auto_threshold'] = old_app_data['web_search_auto_threshold']
        if old_app_data.get('web_search_domains'):
            mode_config['web_search_domains'] = old_app_data['web_search_domains']
        if old_app_data.get('search_channels'):
            mode_config['search_channels'] = old_app_data['search_channels']
    
    # 来源追溯
    if old_app_data.get('enable_source_tracking') is not None:
        mode_config['enable_source_tracking'] = old_app_data['enable_source_tracking']
    if old_app_data.get('enable_citation') is not None:
        mode_config['enable_citation'] = old_app_data['enable_citation']
    
    # 上下文配置
    if old_app_data.get('enable_context'):
        mode_config['enable_context'] = True
    
    # token限制
    if old_app_data.get('max_tokens'):
        mode_config['max_tokens'] = old_app_data['max_tokens']
    
    return mode, mode_config


def migrate_applications():
    """迁移应用实例表"""
    print("🔄 开始迁移applications表...")
    
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 检查旧表是否存在
        inspector = inspect(engine)
        if 'applications' not in inspector.get_table_names():
            print("ℹ️  applications表不存在，跳过迁移")
            return True
        
        # 读取旧数据
        result = session.execute(text("SELECT * FROM applications"))
        old_apps = result.fetchall()
        columns = result.keys()
        
        if not old_apps:
            print("ℹ️  applications表为空，跳过迁移")
            return True
        
        print(f"📊 找到 {len(old_apps)} 个应用实例")
        
        # 重命名旧表
        print("📝 重命名旧表为 applications_old...")
        session.execute(text("ALTER TABLE applications RENAME TO applications_old"))
        session.commit()
        
        # 删除可能存在的旧索引
        try:
            session.execute(text("DROP INDEX IF EXISTS ix_applications_id"))
            session.execute(text("DROP INDEX IF EXISTS ix_applications_name"))
            session.execute(text("DROP INDEX IF EXISTS ix_applications_api_key"))
            session.execute(text("DROP INDEX IF EXISTS ix_applications_endpoint_path"))
            session.commit()
            print("🗑️  已清理旧索引")
        except Exception as e:
            print(f"ℹ️  清理索引: {e}")
        
        # 创建新表结构
        print("🆕 创建新的applications表...")
        NewBase.metadata.create_all(bind=engine, tables=[NewBase.metadata.tables['applications']])
        
        # 迁移数据
        print("💾 迁移数据到新表...")
        migrated_count = 0
        
        for old_app_row in old_apps:
            # 转换为字典
            old_app_data = dict(zip(columns, old_app_row))
            
            # 转换为新格式
            mode, mode_config = convert_old_config_to_mode(old_app_data)
            
            # 插入新数据
            insert_sql = text("""
                INSERT INTO applications (
                    id, name, description, mode, mode_config,
                    ai_provider, llm_model, temperature,
                    api_key, endpoint_path, is_active,
                    total_requests, total_tokens, created_at, updated_at
                ) VALUES (
                    :id, :name, :description, :mode, :mode_config,
                    :ai_provider, :llm_model, :temperature,
                    :api_key, :endpoint_path, :is_active,
                    :total_requests, :total_tokens, :created_at, :updated_at
                )
            """)
            
            session.execute(insert_sql, {
                'id': old_app_data['id'],
                'name': old_app_data['name'],
                'description': old_app_data.get('description'),
                'mode': mode,
                'mode_config': json.dumps(mode_config, ensure_ascii=False) if mode_config else None,
                'ai_provider': old_app_data['ai_provider'],
                'llm_model': old_app_data['llm_model'],
                'temperature': old_app_data.get('temperature', 0.7),
                'api_key': old_app_data['api_key'],
                'endpoint_path': old_app_data['endpoint_path'],
                'is_active': old_app_data.get('is_active', True),
                'total_requests': old_app_data.get('total_requests', 0),
                'total_tokens': old_app_data.get('total_tokens', 0),
                'created_at': old_app_data.get('created_at'),
                'updated_at': datetime.utcnow().isoformat()
            })
            
            migrated_count += 1
            print(f"  ✓ {old_app_data['name']} → {mode}模式")
        
        session.commit()
        print(f"\n✅ 成功迁移 {migrated_count} 个应用实例\n")
        
        # 显示迁移摘要
        print("📊 迁移摘要:")
        result = session.execute(text("SELECT mode, COUNT(*) as count FROM applications GROUP BY mode"))
        for row in result:
            mode_name = {"safe": "安全模式", "standard": "标准模式", "enhanced": "增强模式"}.get(row[0], row[0])
            print(f"   {mode_name}: {row[1]} 个")
        
        print("\n💡 提示：旧表已保留为 applications_old，如需删除请手动执行：")
        print("   sqlite3 backend/app/data/forge.db \"DROP TABLE applications_old;\"")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        print("🔙 正在回滚...")
        session.rollback()
        
        # 尝试恢复
        try:
            session.execute(text("DROP TABLE IF EXISTS applications"))
            session.execute(text("ALTER TABLE applications_old RENAME TO applications"))
            session.commit()
            print("✅ 已回滚到迁移前状态")
        except:
            print("⚠️  回滚失败，请从备份恢复")
        
        return False
    finally:
        session.close()


def verify_migration():
    """验证迁移结果"""
    print("\n🔍 验证迁移结果...")
    
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 检查表结构
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('applications')]
        
        required_columns = ['id', 'name', 'mode', 'mode_config', 'ai_provider', 'llm_model']
        missing_columns = [col for col in required_columns if col not in columns]
        
        if missing_columns:
            print(f"❌ 缺少字段: {missing_columns}")
            return False
        
        # 检查数据
        result = session.execute(text("SELECT COUNT(*) FROM applications"))
        count = result.scalar()
        
        print(f"✅ 新表结构正确")
        print(f"✅ 数据完整性检查通过 ({count} 条记录)")
        
        # 显示示例
        result = session.execute(text("SELECT id, name, mode FROM applications LIMIT 3"))
        print("\n📋 迁移示例:")
        for row in result:
            print(f"   ID {row[0]}: {row[1]} ({row[2]}模式)")
        
        return True
        
    except Exception as e:
        print(f"❌ 验证失败: {e}")
        return False
    finally:
        session.close()


def main():
    """主函数"""
    # 1. 备份数据库
    if not backup_database():
        print("\n❌ 备份失败，迁移终止")
        return
    
    # 2. 迁移应用实例表
    if not migrate_applications():
        print("\n❌ 迁移失败")
        print(f"💡 可以从备份恢复: cp {BACKUP_PATH} {DB_PATH}")
        return
    
    # 3. 验证迁移
    if not verify_migration():
        print("\n⚠️  验证失败，请检查数据")
        return
    
    print("\n" + "=" * 60)
    print("  ✨ 迁移完成！")
    print("=" * 60)
    print("\n📌 重要提示:")
    print("   1. 请重启后端服务")
    print("   2. 测试所有应用实例功能")
    print("   3. 确认无误后可删除旧表和备份")
    print(f"\n📁 备份文件: {BACKUP_PATH}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  迁移已取消")
    except Exception as e:
        print(f"\n\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()

