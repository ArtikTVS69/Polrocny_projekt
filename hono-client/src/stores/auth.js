import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const sessionId = ref(null)
  const isAuthenticated = ref(false)

  // Načítaj session z localStorage pri štarte
  function init() {
    const savedSessionId = localStorage.getItem('sessionId')
    const savedUser = localStorage.getItem('user')
    
    if (savedSessionId && savedUser) {
      sessionId.value = savedSessionId
      user.value = JSON.parse(savedUser)
      isAuthenticated.value = true
    }
  }

  // Registrácia
  async function register(email, username, password) {
    try {
      const response = await api.post('/register', { email, username, password })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Chyba registrácie' }
    }
  }

  // Prihlásenie
  async function login(email, password) {
    try {
      const response = await api.post('/login', { email, password })
      
      sessionId.value = response.data.sessionId
      user.value = response.data.user
      isAuthenticated.value = true
      
      // Ulož do localStorage
      localStorage.setItem('sessionId', response.data.sessionId)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Chyba prihlásenia' }
    }
  }

  // Odhlásenie
  async function logout() {
    try {
      await api.post('/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    sessionId.value = null
    user.value = null
    isAuthenticated.value = false
    
    localStorage.removeItem('sessionId')
    localStorage.removeItem('user')
  }

  return {
    user,
    sessionId,
    isAuthenticated,
    init,
    register,
    login,
    logout,
  }
})
