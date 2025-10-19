/**
 * 前端配置文件
 * 根据环境自动选择API地址
 */

// 判断是否为生产环境（Docker）
const isProduction = import.meta.env.PROD

// 生产环境使用空字符串（通过nginx代理）
// 开发环境使用本地端口
export const API_BASE_URL = isProduction ? '' : 'http://localhost:5003'

// 导出默认配置
export default {
  API_BASE_URL
}

