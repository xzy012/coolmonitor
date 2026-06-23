import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkHttp } from '@/lib/monitors/checker-http';
import { checkPort } from '@/lib/monitors/checker-ports';
import { MONITOR_STATUS } from '@/lib/monitors/types';

// 模拟代理获取函数
vi.mock('@/lib/monitors/proxy-fetch', () => ({
  proxyFetch: vi.fn(),
  standardFetch: vi.fn()
}));

// 模拟系统设置
vi.mock('@/lib/settings', () => ({
  getAllProxySettings: vi.fn().mockResolvedValue({
    'proxy.enabled': 'false'
  })
}));

describe('重试逻辑测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HTTP检查器重试逻辑', () => {
    it('当retries=0时，应该直接执行单次检查', async () => {
      const config = {
        url: 'http://example.com',
        retries: 0,
        retryInterval: 10
      };

      // 模拟网络请求失败
      const { standardFetch } = await import('@/lib/monitors/proxy-fetch');
      const mockStandardFetch = standardFetch as unknown as ReturnType<typeof vi.fn>;
      mockStandardFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkHttp(config);

      // 应该只调用一次网络请求
      expect(mockStandardFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('Network error');
    });

    it('当retries>0时，应该进行重试', async () => {
      const config = {
        url: 'http://example.com',
        retries: 2,
        retryInterval: 1 // 缩短重试间隔以加快测试
      };

      // 模拟网络请求失败
      const { standardFetch } = await import('@/lib/monitors/proxy-fetch');
      const mockStandardFetch = standardFetch as unknown as ReturnType<typeof vi.fn>;
      mockStandardFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkHttp(config);

      // 应该调用 1 + 2 = 3 次网络请求
      expect(mockStandardFetch).toHaveBeenCalledTimes(3);
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('重试2次后仍然失败');
    });

    it('当重试成功时，应该返回成功结果', async () => {
      const config = {
        url: 'http://example.com',
        retries: 2,
        retryInterval: 1
      };

      // 模拟第一次失败，第二次成功
      const { standardFetch } = await import('@/lib/monitors/proxy-fetch');
      const mockStandardFetch = standardFetch as unknown as ReturnType<typeof vi.fn>;
      mockStandardFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: () => Promise.resolve('OK')
        });

      const result = await checkHttp(config);

      // 应该调用 2 次网络请求（第一次失败，第二次成功）
      expect(mockStandardFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(MONITOR_STATUS.UP);
      expect(result.message).toContain('重试成功 (1/2)');
    });
  });

  describe('端口检查器重试逻辑', () => {
    it('当retries=0时，应该直接执行单次检查', async () => {
      const config = {
        hostname: 'example.com',
        port: 80,
        retries: 0,
        retryInterval: 10
      };

      const result = await checkPort(config);

      // 不管结果如何，应该只执行一次检查
      expect(result.status).toBeDefined();
    });

    it('当retries>0时，应该进行重试', async () => {
      const config = {
        hostname: 'nonexistent.example.com',
        port: 12345,
        retries: 2,
        retryInterval: 1
      };

      const result = await checkPort(config);

      // 应该尝试连接并失败
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('重试2次后仍然失败');
    });
  });
}); 