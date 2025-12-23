import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { memos } from './routes/memos'
import { posts } from './routes/posts'
import { ai } from './routes/ai'

const app = new Hono().basePath('/api')

const routes = app
  .route('/memos', memos)
  .route('/posts', posts)
  .route('/ai', ai)

export type AppType = typeof routes
export { app }
