import { db } from './db.js'

// Pomocná funkcia na jednoduché "hashovanie" hesla (v produkcii by sme použili bcrypt!)
export function hashPassword(password: string): string {
  // Toto je len pre ukážku! V reálnej aplikácii použite bcrypt
  return Buffer.from(password).toString('base64')
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// Registrácia používateľa
export function registerUser(email: string, username: string, password: string) {
  const hashedPassword = hashPassword(password)
  
  try {
    const result = db.prepare(`
      INSERT INTO users (email, username, password)
      VALUES (?, ?, ?)
    `).run(email, username, hashedPassword)
    
    return { success: true, userId: result.lastInsertRowid }
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Email už existuje' }
    }
    return { success: false, error: 'Chyba pri registrácii' }
  }
}

// Prihlásenie používateľa
export function loginUser(email: string, password: string) {
  const user = db.prepare(`
    SELECT id, email, username, password FROM users WHERE email = ?
  `).get(email) as any
  
  if (!user) {
    return { success: false, error: 'Nesprávny email alebo heslo' }
  }
  
  if (!verifyPassword(password, user.password)) {
    return { success: false, error: 'Nesprávny email alebo heslo' }
  }
  
  // V reálnej aplikácii by sme vytvorili JWT token
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username
    }
  }
}

// Získaj používateľa podľa ID
export function getUserById(id: number) {
  return db.prepare(`
    SELECT id, email, username, created_at FROM users WHERE id = ?
  `).get(id)
}
