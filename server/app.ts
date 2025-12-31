import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { rateLimit } from './middleware/rate-limit'
import { memos } from './routes/memos'
import { posts } from './routes/posts'
import { ai } from './routes/ai'
import { testLogin } from './routes/test-login'

const app = new Hono().basePath('/api')

// test-login은 rate limit 이전에 등록 (테스트 환경에서 rate limit DB 없이도 동작)
app.route('/test-login', testLogin)

// 나머지 라우트에 rate limit 적용
app.use('*', rateLimit)

const routes = app.route('/memos', memos).route('/posts', posts).route('/ai', ai)

export type AppType = typeof routes
export { app }
