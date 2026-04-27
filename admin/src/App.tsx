import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import frFR from 'antd/locale/fr_FR'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import UsersPage from '@/pages/users/UsersPage'
import UserDetailPage from '@/pages/users/UserDetailPage'
import TravelsPage from '@/pages/travels/TravelsPage'
import TravelDetailPage from '@/pages/travels/TravelDetailPage'
import PackagesPage from '@/pages/packages/PackagesPage'
import PackageDetailPage from '@/pages/packages/PackageDetailPage'

export default function App() {
  return (
    <ConfigProvider
      locale={frFR}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"             element={<DashboardPage />} />
              <Route path="users"                 element={<UsersPage />} />
              <Route path="users/:id"             element={<UserDetailPage />} />
              <Route path="travels"               element={<TravelsPage />} />
              <Route path="travels/:id"           element={<TravelDetailPage />} />
              <Route path="packages"              element={<PackagesPage />} />
              <Route path="packages/:id"          element={<PackageDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
