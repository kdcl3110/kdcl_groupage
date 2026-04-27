import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'
import type { User, UserRole, UserStatus } from '@/types'

export interface UsersFilters {
  search: string
  role: UserRole | ''
  status: UserStatus | ''
}

interface UsersState {
  items: User[]
  total: number
  page: number
  pageSize: number
  filters: UsersFilters
  loading: boolean
  error: string | null
}

const initialState: UsersState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: { search: '', role: '', status: '' },
  loading: false,
  error: null,
}

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (
    params: { filters: UsersFilters; page: number; pageSize: number },
    { rejectWithValue }
  ) => {
    try {
      const offset = (params.page - 1) * params.pageSize
      const { data } = await api.get('/admin/users', {
        params: {
          search: params.filters.search || undefined,
          role:   params.filters.role   || undefined,
          status: params.filters.status || undefined,
          limit:  params.pageSize,
          offset,
        },
      })
      return data.data as { total: number; users: User[] }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de chargement')
    }
  }
)

export const updateUserStatus = createAsyncThunk(
  'users/updateStatus',
  async (params: { userId: number; status: UserStatus }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/admin/users/${params.userId}`, { status: params.status })
      return data.data as User
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de mise à jour')
    }
  }
)

export const updateUserRole = createAsyncThunk(
  'users/updateRole',
  async (params: { userId: number; role: UserRole }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/admin/users/${params.userId}`, { role: params.role })
      return data.data as User
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de mise à jour')
    }
  }
)

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = action.payload
      state.page = 1
    },
    setPage(state, action) {
      state.page = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.users
        state.total = action.payload.total
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.user_id === action.payload.user_id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.user_id === action.payload.user_id)
        if (idx !== -1) state.items[idx] = action.payload
      })
  },
})

export const { setFilters, setPage } = usersSlice.actions
export default usersSlice.reducer
