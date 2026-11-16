import axios from 'axios'

// The API is served from the same site under /api (Vercel function), so no base URL is needed.
export const API_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({ baseURL: API_URL })

let unauthorizedHandler = null

export function setAuthToken(token, onUnauthorized = null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
  unauthorizedHandler = onUnauthorized
}

api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && unauthorizedHandler && !url.startsWith('/api/auth/signin')) {
      unauthorizedHandler()
    }
    return Promise.reject(err)
  },
)

export function errorMessage(err, fallback = 'Something went wrong.') {
  if (err?.response?.data?.message) return err.response.data.message
  if (err?.request && !err?.response) return 'Cannot reach the server. Check your connection.'
  return fallback
}
