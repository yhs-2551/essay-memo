import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
            '**/__tests__/e2e/**', // Playwright tests
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'app/**/*.{ts,tsx}',
                'components/**/*.{ts,tsx}',
                'hooks/**/*.{ts,tsx}',
                'lib/**/*.{ts,tsx}',
                'server/**/*.{ts,tsx}',
                'utils/**/*.{ts,tsx}',
            ],
            exclude: ['**/*.d.ts', '**/*.config.*', '**/node_modules/**', '**/__tests__/**', '**/dist/**', '**/.next/**'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
})
