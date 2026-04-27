import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'
import type { Travel, TravelStatus, TransportType } from '@/types'

export interface TravelsFilters {
  status: TravelStatus | ''
  transport_type: TransportType | ''
}

interface TravelsState {
  items: Travel[]
  total: number
  page: number
  pageSize: number
  filters: TravelsFilters
  loading: boolean
  error: string | null
}

const initialState: TravelsState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: { status: '', transport_type: '' },
  loading: false,
  error: null,
}

export const fetchTravels = createAsyncThunk(
  'travels/fetchAll',
  async (
    params: { filters: TravelsFilters; page: number; pageSize: number },
    { rejectWithValue }
  ) => {
    try {
      const offset = (params.page - 1) * params.pageSize
      const { data } = await api.get('/travels', {
        params: {
          status:         params.filters.status         || undefined,
          transport_type: params.filters.transport_type || undefined,
          limit:          params.pageSize,
          offset,
        },
      })
      return data.data as { total: number; travels: Travel[] }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de chargement')
    }
  }
)

export const updateTravelStatus = createAsyncThunk(
  'travels/updateStatus',
  async (params: { travelId: number; status: TravelStatus }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/travels/${params.travelId}/status`, { status: params.status })
      return data.data as Travel
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Erreur de mise à jour')
    }
  }
)

const travelsSlice = createSlice({
  name: 'travels',
  initialState,
  reducers: {
    setFilters(state, action) { state.filters = action.payload; state.page = 1 },
    setPage(state, action)    { state.page = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTravels.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchTravels.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.travels
        state.total = action.payload.total
      })
      .addCase(fetchTravels.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateTravelStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.travel_id === action.payload.travel_id)
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload }
      })
  },
})

export const { setFilters, setPage } = travelsSlice.actions
export default travelsSlice.reducer
