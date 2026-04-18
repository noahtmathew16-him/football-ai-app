import 'dotenv/config'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import chatRouter from './routes/chat.js'
import feedbackRouter from './routes/feedback.js'
import {
  chatRateLimiter,
  corsMiddleware,
  feedbackRateLimiter,
  requireAppAccess,
} from './middleware/expressSecurity.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3000
const isProduction = process.env.NODE_ENV === 'production'

app.set('trust proxy', 1)

app.use(helmet())
app.use(morgan(isProduction ? 'combined' : 'dev'))
app.use(corsMiddleware())
app.use(express.json({ limit: '12mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/chat', chatRateLimiter(), requireAppAccess, chatRouter)
app.use('/api/feedback', feedbackRateLimiter(), requireAppAccess, feedbackRouter)

if (isProduction) {
  const clientPath = path.join(__dirname, '../../client')
  app.use(express.static(clientPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'))
  })
}

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[express] unhandled error', err)
    if (res.headersSent) return
    res.status(500).json({ error: 'Something went wrong' })
  },
)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
