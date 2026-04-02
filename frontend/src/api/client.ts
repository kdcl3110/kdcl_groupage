import axios from 'axios'
import { startLoading, stopLoading } from '@/stores/loading'

const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  startLoading()
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => { stopLoading(); return res },
  (err) => {
    stopLoading()
    // 401 sur un endpoint /auth/ = mauvaises credentials → laisser le composant gérer l'erreur
    // 401 ailleurs = session expirée → redirection forcée
    if (err.response?.status === 401 && !err.config?.url?.startsWith('/auth/')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
