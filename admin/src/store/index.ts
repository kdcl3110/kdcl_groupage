import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import usersReducer from './slices/usersSlice'
import travelsReducer from './slices/travelsSlice'
import packagesReducer from './slices/packagesSlice'

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    users:    usersReducer,
    travels:  travelsReducer,
    packages: packagesReducer,
  },
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
