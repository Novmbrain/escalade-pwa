import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // 单元测试使用 node 环境，组件测试使用 jsdom
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // 组件测试需要的 setup
    setupFiles: ['./src/test/setup.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
      exclude: [
        'src/lib/mongodb.ts',
        'src/lib/db/**',
        'src/test/**',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
