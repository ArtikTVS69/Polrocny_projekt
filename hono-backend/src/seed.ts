import { db } from './db.js'
import { hashPassword } from './auth.js'

console.log('🌱 Začínam seedovanie databázy...')

// Vytvor fake užívateľov
const fakeUsers = [
  { email: 'admin@talkspace.sk', username: 'Admin', password: hashPassword('admin123') },
  { email: 'jozef@example.sk', username: 'Jožko', password: hashPassword('pass123') },
  { email: 'maria@example.sk', username: 'Marika', password: hashPassword('pass123') },
  { email: 'peter@example.sk', username: 'Peťo', password: hashPassword('pass123') },
  { email: 'eva@example.sk', username: 'Evka', password: hashPassword('pass123') },
  { email: 'michal@example.sk', username: 'Miško', password: hashPassword('pass123') },
  { email: 'zuzana@example.sk', username: 'Zuza', password: hashPassword('pass123') },
  { email: 'david@example.sk', username: 'Dávid', password: hashPassword('pass123') },
]

// Vymaž existujúce dáta (v opačnom poradí kvôli foreign keys)
console.log('🗑️  Mažem staré dáta...')
db.prepare('DELETE FROM messages').run()
db.prepare('DELETE FROM channels').run()
db.prepare('DELETE FROM server_members').run()
db.prepare('DELETE FROM servers').run()
db.prepare('DELETE FROM users').run()

// Pridaj užívateľov
console.log('👥 Vytváram užívateľov...')
const userIds: number[] = []
for (const user of fakeUsers) {
  const result = db.prepare(`
    INSERT INTO users (email, username, password)
    VALUES (?, ?, ?)
  `).run(user.email, user.username, user.password)
  userIds.push(result.lastInsertRowid as number)
  console.log(`   ✅ ${user.username}`)
}

// Vytvor servery
console.log('🖥️  Vytváram servery...')
const servers = [
  { name: 'Všeobecný Chat', icon: '💬', ownerId: userIds[0] },
  { name: 'Gaming Squad', icon: '🎮', ownerId: userIds[1] },
  { name: 'Študentský Server', icon: '📚', ownerId: userIds[2] },
  { name: 'Priatelia', icon: '🎉', ownerId: userIds[3] },
]

const serverIds: number[] = []
for (const server of servers) {
  const result = db.prepare(`
    INSERT INTO servers (name, icon, owner_id)
    VALUES (?, ?, ?)
  `).run(server.name, server.icon, server.ownerId)
  const serverId = result.lastInsertRowid as number
  serverIds.push(serverId)
  console.log(`   ✅ ${server.name}`)
  
  // Pridaj vlastníka ako člena
  db.prepare(`
    INSERT INTO server_members (server_id, user_id)
    VALUES (?, ?)
  `).run(serverId, server.ownerId)
  
  // Pridaj náhodných členov
  const randomMembers = userIds.filter(id => id !== server.ownerId).sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3))
  for (const memberId of randomMembers) {
    try {
      db.prepare(`
        INSERT INTO server_members (server_id, user_id)
        VALUES (?, ?)
      `).run(serverId, memberId)
    } catch (e) {
      // Ignoruj duplicity
    }
  }
}

// Vytvor kanály
console.log('📺 Vytváram kanály...')
const channelData = [
  { serverId: serverIds[0], names: ['general', 'random', 'help', 'oznamy'] },
  { serverId: serverIds[1], names: ['general', 'fortnite', 'minecraft', 'lol'] },
  { serverId: serverIds[2], names: ['general', 'matematika', 'programovanie', 'english'] },
  { serverId: serverIds[3], names: ['general', 'memes', 'hudba', 'filmy'] },
]

const channelIds: number[] = []
for (const { serverId, names } of channelData) {
  for (const name of names) {
    const result = db.prepare(`
      INSERT INTO channels (server_id, name)
      VALUES (?, ?)
    `).run(serverId, name)
    channelIds.push(result.lastInsertRowid as number)
  }
}

// Vytvor fake správy
console.log('💬 Vytváram správy...')
const messageTemplates = [
  'Ahoj všetci! 👋',
  'Dnes krásne počasie nie? ☀️',
  'Má niekto čas dnes večer?',
  'Super! 🎉',
  'Ja som za!',
  'Kto ide hrať?',
  'Skvelý nápad!',
  'Presne tak 😄',
  'Neviem, musím si to rozmyslieť',
  'Zaujímavé...',
  'Ďakujem za info!',
  'Potrebujem pomoc s úlohou',
  'Môže mi niekto poradiť?',
  'Super, ďakujem! 🙏',
  'Ideme na to! 💪',
]

// Pre každý kanál vytvor 5-15 správ
for (const channelId of channelIds) {
  const messageCount = 5 + Math.floor(Math.random() * 10)
  
  // Získaj členov servera tohto kanálu
  const channel = db.prepare(`SELECT server_id FROM channels WHERE id = ?`).get(channelId) as any
  const members = db.prepare(`
    SELECT user_id FROM server_members WHERE server_id = ?
  `).all(channel.server_id) as any[]
  
  const memberIds = members.map(m => m.user_id)
  
  for (let i = 0; i < messageCount; i++) {
    const randomUserId = memberIds[Math.floor(Math.random() * memberIds.length)]
    const randomMessage = messageTemplates[Math.floor(Math.random() * messageTemplates.length)]
    
    db.prepare(`
      INSERT INTO messages (channel_id, user_id, content, created_at)
      VALUES (?, ?, ?, ?)
    `).run(channelId, randomUserId, randomMessage, Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400))
  }
}

console.log('✅ Seedovanie dokončené!')
console.log(`
📊 Vytvorené:
   - ${userIds.length} užívateľov
   - ${serverIds.length} serverov
   - ${channelIds.length} kanálov
   - ~${channelIds.length * 10} správ

🔑 Testovací účet:
   Email: admin@talkspace.sk
   Heslo: admin123
`)
