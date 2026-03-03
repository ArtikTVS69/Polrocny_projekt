import { db } from './db.js'

// SERVERY

// Vytvor nový server
export function createServer(name: string, ownerId: number, icon?: string) {
  const result = db.prepare(`
    INSERT INTO servers (name, owner_id, icon)
    VALUES (?, ?, ?)
  `).run(name, ownerId, icon || null)
  
  const serverId = result.lastInsertRowid
  
  // Automaticky pridaj vlastníka ako člena
  db.prepare(`
    INSERT INTO server_members (server_id, user_id)
    VALUES (?, ?)
  `).run(serverId, ownerId)
  
  // Vytvor predvolený kanál "general"
  db.prepare(`
    INSERT INTO channels (server_id, name)
    VALUES (?, 'general')
  `).run(serverId)
  
  return { serverId, name }
}

// Získaj všetky servery používateľa
export function getUserServers(userId: number) {
  return db.prepare(`
    SELECT s.id, s.name, s.icon, s.owner_id
    FROM servers s
    INNER JOIN server_members sm ON s.id = sm.server_id
    WHERE sm.user_id = ?
    ORDER BY s.created_at DESC
  `).all(userId)
}

// Získaj server podľa ID
export function getServerById(serverId: number) {
  return db.prepare(`
    SELECT id, name, icon, owner_id FROM servers WHERE id = ?
  `).get(serverId)
}

// KANÁLY

// Získaj všetky kanály servera
export function getServerChannels(serverId: number) {
  return db.prepare(`
    SELECT id, name, type FROM channels WHERE server_id = ?
    ORDER BY created_at ASC
  `).all(serverId)
}

// Vytvor nový kanál
export function createChannel(serverId: number, name: string) {
  const result = db.prepare(`
    INSERT INTO channels (server_id, name)
    VALUES (?, ?)
  `).run(serverId, name)
  
  return { channelId: result.lastInsertRowid, name }
}

// SPRÁVY

// Získaj správy z kanála (posledných 50)
export function getChannelMessages(channelId: number, limit: number = 50) {
  return db.prepare(`
    SELECT m.id, m.content, m.attachment_url, m.attachment_type, m.attachment_name, m.created_at,
           u.id as user_id, u.username
    FROM messages m
    INNER JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(channelId, limit)
}

// Pošli správu
export function sendMessage(
  channelId: number, 
  userId: number, 
  content: string, 
  attachmentUrl?: string,
  attachmentType?: string,
  attachmentName?: string
) {
  const result = db.prepare(`
    INSERT INTO messages (channel_id, user_id, content, attachment_url, attachment_type, attachment_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(channelId, userId, content || null, attachmentUrl || null, attachmentType || null, attachmentName || null)
  
  return { messageId: result.lastInsertRowid }
}

// Zmaž správu
export function deleteMessage(messageId: number, userId: number) {
  // Skontroluj či správa existuje a patrí užívateľovi
  const message = db.prepare(`
    SELECT id, user_id FROM messages WHERE id = ?
  `).get(messageId) as any
  
  if (!message) {
    return { success: false, error: 'Správa neexistuje' }
  }
  
  if (message.user_id !== userId) {
    return { success: false, error: 'Nemáte oprávnenie zmazať túto správu' }
  }
  
  db.prepare(`DELETE FROM messages WHERE id = ?`).run(messageId)
  return { success: true }
}
