import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import * as z from 'zod'
import { sValidator } from '@hono/standard-validator'
import type { Context, Next } from 'hono'
import * as fs from 'fs'
import * as path from 'path'
import './db.js' // Inicializuje databázu
import { registerUser, loginUser, getUserById } from './auth.js'
import {
  createServer,
  getUserServers,
  getServerById,
  getServerChannels,
  createChannel,
  getChannelMessages,
  sendMessage,
  deleteMessage,
} from './serverOperations.js'
import type { AppVariables } from './types.js'

// Vytvor priečinok na súbory ak neexistuje
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const app = new Hono<{ Variables: AppVariables }>()
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
}))

// SESSION STORAGE (v produkcii použite Redis alebo DB)
const sessions = new Map<string, number>() // sessionId -> userId

// AUTENTIFIKÁCIA

app.post('/api/register', sValidator('json', z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
})), async (c) => {
  const { email, username, password } = c.req.valid('json')
  const result = registerUser(email, username, password)
  
  if (!result.success) {
    return c.json({ error: result.error }, 400)
  }
  
  return c.json({ message: 'Registrácia úspešná', userId: result.userId })
})

app.post('/api/login', sValidator('json', z.object({
  email: z.string().email(),
  password: z.string(),
})), async (c) => {
  const { email, password } = c.req.valid('json')
  const result = loginUser(email, password)
  
  if (!result.success || !result.user) {
    return c.json({ error: result.error }, 401)
  }
  
  // Vytvor session
  const sessionId = Math.random().toString(36).substring(7)
  sessions.set(sessionId, result.user.id)
  
  return c.json({ 
    message: 'Prihlásenie úspešné',
    sessionId,
    user: result.user 
  })
})

app.post('/api/logout', async (c) => {
  const sessionId = c.req.header('X-Session-Id')
  if (sessionId) {
    sessions.delete(sessionId)
  }
  return c.json({ message: 'Odhlásenie úspešné' })
})

// Middleware na kontrolu prihlásenia
async function authMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
  const sessionId = c.req.header('X-Session-Id')
  
  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ error: 'Neprihlásený' }, 401)
  }
  
  const userId = sessions.get(sessionId)
  if (userId) {
    c.set('userId', userId)
  }
  await next()
}

// SERVERY

app.get('/api/servers', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const servers = getUserServers(userId)
  return c.json(servers)
})

app.post('/api/servers', authMiddleware, sValidator('json', z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
})), async (c) => {
  const userId = c.get('userId')
  const { name, icon } = c.req.valid('json')
  const server = createServer(name, userId, icon)
  return c.json(server)
})

app.get('/api/servers/:id', authMiddleware, async (c) => {
  const serverId = parseInt(c.req.param('id'))
  const server = getServerById(serverId)
  
  if (!server) {
    return c.json({ error: 'Server neexistuje' }, 404)
  }
  
  return c.json(server)
})

// KANÁLY

app.get('/api/servers/:id/channels', authMiddleware, async (c) => {
  const serverId = parseInt(c.req.param('id'))
  const channels = getServerChannels(serverId)
  return c.json(channels)
})

app.post('/api/servers/:id/channels', authMiddleware, sValidator('json', z.object({
  name: z.string().min(1),
})), async (c) => {
  const serverId = parseInt(c.req.param('id'))
  const { name } = c.req.valid('json')
  const channel = createChannel(serverId, name)
  return c.json(channel)
})

// SPRÁVY

app.get('/api/channels/:id/messages', authMiddleware, async (c) => {
  const channelId = parseInt(c.req.param('id'))
  const messages = getChannelMessages(channelId)
  return c.json(messages)
})

// UPLOAD SÚBOROV

app.post('/api/upload', authMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'Žiadny súbor nebol nahraný' }, 400)
    }
    
    // Vygeneruj náhodný názov súboru
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const filepath = path.join(uploadsDir, filename)
    
    // Ulož súbor
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filepath, buffer)
    
    return c.json({ 
      url: `/api/uploads/${filename}`,
      filename: file.name,
      type: file.type,
      size: file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Chyba pri nahrávaní súboru' }, 500)
  }
})

// Stiahnutie súborov
app.get('/api/uploads/:filename', async (c) => {
  const filename = c.req.param('filename')
  const filepath = path.join(uploadsDir, filename)
  
  if (!fs.existsSync(filepath)) {
    return c.json({ error: 'Súbor neexistuje' }, 404)
  }
  
  const file = fs.readFileSync(filepath)
  return new Response(file)
})

app.post('/api/channels/:id/messages', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const channelId = parseInt(c.req.param('id'))
  
  try {
    const body = await c.req.parseBody()
    console.log('📩 Received message body:', body)
    
    const content = (body['content'] as string || '').trim()
    const attachmentUrl = body['attachmentUrl'] as string || undefined
    const attachmentType = body['attachmentType'] as string || undefined
    const attachmentName = body['attachmentName'] as string || undefined
    
    console.log('📝 Parsed data:', { content, attachmentUrl, attachmentType, attachmentName })
    
    if (!content && !attachmentUrl) {
      console.log('❌ Validation failed: no content and no attachment')
      return c.json({ error: 'Správa musí obsahovať text alebo prílohu' }, 400)
    }
    
    console.log('✅ Validation passed, saving message...')
    const message = sendMessage(channelId, userId, content, attachmentUrl, attachmentType, attachmentName)
    console.log('✅ Message saved:', message)
    return c.json(message)
  } catch (error) {
    console.error('❌ Message send error:', error)
    return c.json({ error: 'Chyba pri posielaní správy' }, 500)
  }
})

// Zmaž správu
app.delete('/api/messages/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const messageId = parseInt(c.req.param('id'))
  
  const result = deleteMessage(messageId, userId)
  
  if (!result.success) {
    return c.json({ error: result.error }, 403)
  }
  
  return c.json({ message: 'Správa zmazaná' })
})

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`✅ Talkspace API server beží na http://localhost:${info.port}`)
  },
)
