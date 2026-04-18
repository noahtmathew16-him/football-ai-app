import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import chatRouter from './routes/chat.js'
import feedbackRouter from './routes/feedback.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3000
const isProduction = process.env.NODE_ENV === 'production'

app.use(express.json({ limit: '12mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/chat', chatRouter)
app.use('/api/feedback', feedbackRouter)

if (isProduction) {
  const clientPath = path.join(__dirname, '../../client')
  app.use(express.static(clientPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
