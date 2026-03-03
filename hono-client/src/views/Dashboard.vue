<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const servers = ref([])
const channels = ref([])
const messages = ref([])
const selectedServer = ref(null)
const selectedChannel = ref(null)
const newMessage = ref('')
const showCreateServerModal = ref(false)
const newServerName = ref('')
const selectedFile = ref(null)
const uploadedAttachment = ref(null)
const fileInputRef = ref(null)

// Načítaj servery pri štarte
onMounted(async () => {
  await loadServers()
  
  // Ak sme na URL s serverom a kanálom, načítaj ich
  if (route.params.serverId) {
    selectedServer.value = parseInt(route.params.serverId)
    await loadChannels(selectedServer.value)
    
    if (route.params.channelId) {
      selectedChannel.value = parseInt(route.params.channelId)
      await loadMessages(selectedChannel.value)
    }
  }
})

async function loadServers() {
  try {
    const response = await api.get('/servers')
    servers.value = response.data
  } catch (error) {
    console.error('Chyba načítania serverov:', error)
  }
}

async function loadChannels(serverId) {
  try {
    const response = await api.get(`/servers/${serverId}/channels`)
    channels.value = response.data
    
    // Automaticky vyber prvý kanál ak nie je žiadny vybraný
    if (channels.value.length > 0 && !selectedChannel.value) {
      selectChannel(channels.value[0].id)
    }
  } catch (error) {
    console.error('Chyba načítania kanálov:', error)
  }
}

async function loadMessages(channelId) {
  try {
    const response = await api.get(`/channels/${channelId}/messages`)
    messages.value = response.data.reverse() // Najnovšie správy dole
  } catch (error) {
    console.error('Chyba načítania správ:', error)
  }
}

async function createServer() {
  if (!newServerName.value.trim()) return
  
  try {
    await api.post('/servers', { name: newServerName.value })
    await loadServers()
    newServerName.value = ''
    showCreateServerModal.value = false
  } catch (error) {
    console.error('Chyba vytvorenia servera:', error)
  }
}

function selectServer(serverId) {
  selectedServer.value = serverId
  selectedChannel.value = null
  messages.value = []
  loadChannels(serverId)
}

function selectChannel(channelId) {
  selectedChannel.value = channelId
  loadMessages(channelId)
  router.push(`/servers/${selectedServer.value}/channels/${channelId}`)
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    uploadFile(file)
  }
}

async function uploadFile(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    uploadedAttachment.value = response.data
  } catch (error) {
    console.error('Chyba uploadu súboru:', error)
    alert('Chyba pri nahrávaní súboru')
  }
}

async function sendMessage() {
  console.log('sendMessage called', { 
    newMessage: newMessage.value, 
    uploadedAttachment: uploadedAttachment.value,
    selectedChannel: selectedChannel.value 
  })
  
  if ((!newMessage.value.trim() && !uploadedAttachment.value) || !selectedChannel.value) {
    console.log('sendMessage blocked - empty message or no channel')
    return
  }
  
  try {
    const formData = new FormData()
    formData.append('content', newMessage.value)
    
    if (uploadedAttachment.value) {
      formData.append('attachmentUrl', uploadedAttachment.value.url)
      formData.append('attachmentType', uploadedAttachment.value.type)
      formData.append('attachmentName', uploadedAttachment.value.filename)
    }
    
    console.log('Sending message to API...')
    await api.post(`/channels/${selectedChannel.value}/messages`, formData)
    
    newMessage.value = ''
    selectedFile.value = null
    uploadedAttachment.value = null
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    
    console.log('Message sent, reloading...')
    await loadMessages(selectedChannel.value)
  } catch (error) {
    console.error('Chyba odoslania správy:', error)
    alert('Chyba pri odoslaní správy: ' + (error.response?.data?.error || error.message))
  }
}

async function deleteMessage(messageId) {
  if (!confirm('Naozaj chcete zmazať túto správu?')) {
    return
  }
  
  try {
    await api.delete(`/messages/${messageId}`)
    await loadMessages(selectedChannel.value)
  } catch (error) {
    console.error('Chyba pri mazaní správy:', error)
    alert('Chyba pri mazaní správy: ' + (error.response?.data?.error || error.message))
  }
}

function logout() {
  authStore.logout()
  router.push('/login')
}

const currentServerName = computed(() => {
  if (!selectedServer.value) return 'Vyberte server'
  const server = servers.value.find(s => s.id === selectedServer.value)
  return server ? server.name : 'Server'
})

const currentChannelName = computed(() => {
  if (!selectedChannel.value) return 'Vyberte kanál'
  const channel = channels.value.find(c => c.id === selectedChannel.value)
  return channel ? channel.name : 'Kanál'
})

const canSendMessage = computed(() => {
  return (newMessage.value.trim().length > 0 || uploadedAttachment.value !== null)
})
</script>

<template>
  <div class="h-screen flex bg-gray-900 text-white">
    <!-- SIDEBAR - Zoznam serverov -->
    <div class="w-20 bg-gray-950 flex flex-col items-center py-3 space-y-2">
      <!-- Home button -->
      <div class="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center cursor-pointer hover:rounded-2xl transition-all duration-200">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
      </div>

      <div class="w-8 h-0.5 bg-gray-700 rounded-full"></div>

      <!-- Server list -->
      <div
        v-for="server in servers"
        :key="server.id"
        @click="selectServer(server.id)"
        :class="[
          'w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200',
          selectedServer === server.id
            ? 'bg-indigo-600 rounded-2xl'
            : 'bg-gray-700 hover:bg-indigo-600 hover:rounded-2xl'
        ]"
      >
        <span class="font-bold text-lg">{{ server.name[0].toUpperCase() }}</span>
      </div>

      <!-- Add server button -->
      <div
        @click="showCreateServerModal = true"
        class="w-12 h-12 rounded-full bg-gray-700 hover:bg-green-600 hover:rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
      </div>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Logout button -->
      <div
        @click="logout"
        class="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 hover:rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200"
        title="Odhlásiť sa"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      </div>
    </div>

    <!-- CHANNELS SIDEBAR -->
    <div class="w-60 bg-gray-800 flex flex-col">
      <div class="h-12 px-4 flex items-center justify-between border-b border-gray-700 shadow-md">
        <h2 class="font-bold truncate">{{ currentServerName }}</h2>
        <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
        </svg>
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="selectedServer">
          <div class="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">
            Textové kanály
          </div>
          <div
            v-for="channel in channels"
            :key="channel.id"
            @click="selectChannel(channel.id)"
            :class="[
              'px-2 py-2 my-0.5 rounded cursor-pointer flex items-center group',
              selectedChannel === channel.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            ]"
          >
            <span class="mr-2">#</span>
            <span class="flex-1">{{ channel.name }}</span>
          </div>
        </div>
        <div v-else class="text-center text-gray-500 mt-8">
          <p>Vyberte server</p>
        </div>
      </div>

      <!-- User info -->
      <div class="h-14 px-2 flex items-center bg-gray-900 border-t border-gray-700">
        <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <span class="font-bold text-sm">{{ authStore.user?.username[0].toUpperCase() }}</span>
        </div>
        <div class="ml-2 flex-1">
          <div class="text-sm font-semibold">{{ authStore.user?.username }}</div>
          <div class="text-xs text-gray-400">Online</div>
        </div>
      </div>
    </div>

    <!-- MAIN CHAT AREA -->
    <div class="flex-1 flex flex-col">
      <!-- Chat header -->
      <div class="h-12 px-4 flex items-center border-b border-gray-700 shadow-md bg-gray-800">
        <span class="text-gray-400 mr-2">#</span>
        <h3 class="font-semibold">{{ currentChannelName }}</h3>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="messages.length === 0" class="text-center text-gray-500 mt-8">
          <p v-if="!selectedChannel">Vyberte kanál pre zobrazenie správ</p>
          <p v-else>Ešte tu nie sú žiadne správy. Buďte prvý!</p>
        </div>

        <div
          v-for="message in messages"
          :key="message.id"
          class="flex items-start group hover:bg-gray-800/50 px-2 py-1 rounded"
        >
          <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span class="font-bold">{{ message.username[0].toUpperCase() }}</span>
          </div>
          <div class="ml-3 flex-1">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="font-semibold mr-2">{{ message.username }}</span>
                <span class="text-xs text-gray-500">
                  {{ new Date(message.created_at * 1000).toLocaleString('sk-SK') }}
                </span>
              </div>
              <!-- Delete button - zobrazí sa len pre vlastné správy -->
              <button
                v-if="message.user_id === authStore.user?.id"
                @click="deleteMessage(message.id)"
                class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition p-1"
                title="Zmazať správu"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
            <div class="text-gray-300" v-if="message.content">{{ message.content }}</div>
            
            <!-- Zobrazenie obrázkov a GIFov -->
            <div v-if="message.attachment_url && message.attachment_type?.startsWith('image')" class="mt-2">
              <img 
                :src="`http://localhost:3000${message.attachment_url}`" 
                :alt="message.attachment_name"
                class="max-w-md max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition"
                @click="window.open(`http://localhost:3000${message.attachment_url}`, '_blank')"
              />
              <div class="text-xs text-gray-500 mt-1">{{ message.attachment_name }}</div>
            </div>
            
            <!-- Zobrazenie videí -->
            <div v-else-if="message.attachment_url && message.attachment_type?.startsWith('video')" class="mt-2">
              <video 
                :src="`http://localhost:3000${message.attachment_url}`"
                controls
                class="max-w-2xl max-h-96 rounded-lg"
              >
                Váš prehliadač nepodporuje video prehrávanie.
              </video>
              <div class="text-xs text-gray-500 mt-1">{{ message.attachment_name }}</div>
            </div>
            
            <!-- Zobrazenie ostatných súborov -->
            <div v-else-if="message.attachment_url" class="mt-2 inline-flex items-center bg-gray-700 rounded px-3 py-2">
              <svg class="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <a 
                :href="`http://localhost:3000${message.attachment_url}`"
                :download="message.attachment_name"
                class="text-indigo-400 hover:text-indigo-300 underline"
                target="_blank"
              >
                {{ message.attachment_name }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Message input -->
      <div class="p-4" v-if="selectedChannel">
        <!-- Preview uploadnutého súboru -->
        <div v-if="uploadedAttachment" class="mb-2 p-2 bg-gray-700 rounded-lg flex items-center">
          <svg class="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="flex-1 text-sm text-gray-300">{{ uploadedAttachment.filename }}</span>
          <button
            type="button"
            @click="uploadedAttachment = null; selectedFile = null; fileInputRef.value = ''"
            class="text-red-400 hover:text-red-300"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <form @submit.prevent="sendMessage" class="flex items-center bg-gray-700 rounded-lg px-4 py-3">
          <!-- File input button -->
          <input
            ref="fileInputRef"
            type="file"
            @change="handleFileSelect"
            class="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z"
          />
          <button
            type="button"
            @click="fileInputRef.click()"
            class="mr-2 p-2 hover:bg-gray-600 rounded-lg transition"
            title="Priložiť súbor"
          >
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
          
          <input
            v-model="newMessage"
            type="text"
            placeholder="Napíšte správu alebo priložte súbor..."
            class="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
          />
          <button
            type="submit"
            class="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canSendMessage"
          >
            Odoslať
          </button>
        </form>
      </div>
    </div>

    <!-- CREATE SERVER MODAL -->
    <div
      v-if="showCreateServerModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="showCreateServerModal = false"
    >
      <div
        @click.stop
        class="bg-gray-800 rounded-lg p-6 w-full max-w-md"
      >
        <h3 class="text-xl font-bold mb-4">Vytvoriť nový server</h3>
        <form @submit.prevent="createServer">
          <input
            v-model="newServerName"
            type="text"
            placeholder="Názov servera"
            class="w-full px-4 py-2 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            required
          />
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showCreateServerModal = false"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
            >
              Vytvoriť
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
