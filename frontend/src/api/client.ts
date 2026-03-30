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
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
