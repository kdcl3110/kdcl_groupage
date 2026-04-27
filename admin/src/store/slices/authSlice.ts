import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

interface Admin {
  id: number
  name: string
  email: string
  role: string
}

interface AuthState {
  admin: Admin | null
  token: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  admin: null,
  token: localStorage.getItem('admin_token'),
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials)
      if (!['admin', 'freight_forwarder'].includes(data.user?.role)) {
        return rejectWithValue('Accès refusé : compte non autorisé')
      }
      localStorage.setItem('admin_token', data.token)
      return data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur de connexion')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('admin_token')
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.admin = action.payload.admin
        state.token = action.payload.token
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logout.fulfilled, (state) => {
        state.admin = null
        state.token = null
      })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
