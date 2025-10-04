#!/usr/bin/env python3
"""
CBIT-AiForge 服务器测试脚本
Server Testing Script

测试本地服务器是否正常运行

© 2025 Reneverland, CBIT, CUHK
"""

import requests
import time
import sys

BASE_URL = "http://localhost:5003"

def test_endpoint(url, name):
    """测试单个端点"""
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print(f"✅ {name}: OK")
            return True
        else:
            print(f"❌ {name}: 状态码 {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: 连接失败（服务器可能未启动）")
        return False
    except Exception as e:
        print(f"❌ {name}: {e}")
        return False

def main():
    print("=" * 60)
    print("  🧪 CBIT-AiForge 服务器测试")
    print("  Server Testing")
    print("=" * 60)
    print()
    print(f"🌐 测试服务器: {BASE_URL}")
    print()
    
    # 等待服务器启动
    print("⏳ 等待服务器启动...")
    time.sleep(2)
    print()
    
    # 测试各个端点
    results = []
    
    print("📝 测试端点:")
    print("-" * 60)
    results.append(test_endpoint(f"{BASE_URL}/", "根路径"))
    results.append(test_endpoint(f"{BASE_URL}/health", "健康检查"))
    results.append(test_endpoint(f"{BASE_URL}/docs", "API 文档"))
    results.append(test_endpoint(f"{BASE_URL}/api/knowledge-bases", "知识库列表"))
    results.append(test_endpoint(f"{BASE_URL}/api/models", "模型列表"))
    print("-" * 60)
    print()
    
    # 总结
    passed = sum(results)
    total = len(results)
    
    print("📊 测试结果:")
    print(f"   通过: {passed}/{total}")
    print()
    
    if passed == total:
        print("🎉 所有测试通过！")
        return 0
    else:
        print("⚠️  部分测试失败")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n👋 测试已取消")
        sys.exit(0)

