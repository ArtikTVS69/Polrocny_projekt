<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  
  // Validácia
  if (password.value !== confirmPassword.value) {
    error.value = 'Heslá sa nezhodujú'
    return
  }
  
  if (password.value.length < 6) {
    error.value = 'Heslo musí mať aspoň 6 znakov'
    return
  }
  
  loading.value = true
  
  const result = await authStore.register(email.value, username.value, password.value)
  
  loading.value = false
  
  if (result.success) {
    // Po úspešnej registrácii prihlásiť
    const loginResult = await authStore.login(email.value, password.value)
    if (loginResult.success) {
      router.push('/')
    }
  } else {
    error.value = result.error
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Talkspace</h1>
        <p class="text-gray-600 dark:text-gray-300">Vytvorte si účet</p>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
        {{ error }}
      </div>

      <!-- Register Form -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="vas@email.com"
          />
        </div>

        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Používateľské meno
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            minlength="3"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="vasemeno"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Heslo
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Potvrdenie hesla
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg shadow-lg transition duration-200 transform hover:scale-105"
        >
          {{ loading ? 'Registrácia...' : 'Zaregistrovať sa' }}
        </button>
      </form>

      <!-- Login link -->
      <div class="mt-6 text-center">
        <p class="text-gray-600 dark:text-gray-300">
          Už máte účet?
          <router-link to="/login" class="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
            Prihláste sa
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
