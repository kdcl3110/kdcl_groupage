import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'
import type { Package, PackageStatus } from '@/types'

export interface PackagesFilters {
  search: string
  status: PackageStatus | ''
  travel_id: number | null
  client_id?: number | null
}

interface PackagesState {
  items: Package[]
  total: number
  page: number
  pageSize: number
  filters: PackagesFilters
  loading: boolean
  error: string | null
}

const initialState: PackagesState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: { search: '', status: '', travel_id: null },
  loading: false,
  error: null,
}

export const fetchPackages = createAsyncThunk(
  'packages/fetchAll',
  async (
    params: { filters: PackagesFilters; page: number; pageSize: number },
    { rejectWithValue }
  ) => {
    try {
      const offset = (params.page - 1) * params.pageSize
      const { data } = await api.get('/admin/packages', {
        params: {
          search:    params.filters.search    || undefined,
          status:    params.filters.status    || undefined,
          travel_id: params.filters.travel_id || undefined,
          client_id: params.filters.client_id || undefined,
          limit:     params.pageSize,
          offset,
        },
      })
      return data.data as { total: number; packages: Package[] }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de chargement')
    }
  }
)

export const updatePackageStatus = createAsyncThunk(
  'packages/updateStatus',
  async (params: { packageId: number; status: PackageStatus }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/packages/${params.packageId}/status`, { status: params.status })
      return data.data as Package
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de mise à jour')
    }
  }
)

export const validatePackage = createAsyncThunk(
  'packages/validate',
  async (packageId: number, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/packages/${packageId}/validate`)
      return data.data as Package
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de validation')
    }
  }
)

export const rejectPackage = createAsyncThunk(
  'packages/reject',
  async (params: { packageId: number; reason?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/packages/${params.packageId}/reject`, { reason: params.reason })
      return data.data as Package
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de rejet')
    }
  }
)

const packagesSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {
    setFilters(state, action) { state.filters = action.payload; state.page = 1 },
    setPage(state, action)    { state.page = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPackages.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.packages
        state.total = action.payload.total
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updatePackageStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p.package_id === action.payload.package_id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(validatePackage.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p.package_id === action.payload.package_id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(rejectPackage.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p.package_id === action.payload.package_id)
        if (idx !== -1) state.items[idx] = action.payload
      })
  },
})

export const { setFilters, setPage } = packagesSlice.actions
export default packagesSlice.reducer
