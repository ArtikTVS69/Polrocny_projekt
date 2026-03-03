import axios from 'axios'

// API klient pre komunikáciu s backendom
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Automaticky pridaj session ID do každého requestu
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('sessionId')
  console.log('🔑 Interceptor - Session ID:', sessionId)
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId
  }
  
  // Ak posielame FormData, odstráň default Content-Type aby axios nastavil správny
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  
  console.log('📤 Request config:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    dataType: config.data?.constructor?.name
  })
  
  return config
})

// Pridaj response interceptor pre debug
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response OK:', response.config.url, response.status)
    return response
  },
  (error) => {
    console.error('❌ Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    })
    return Promise.reject(error)
  }
)

export default api
