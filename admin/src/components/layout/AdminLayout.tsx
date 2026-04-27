import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Button, theme } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  InboxOutlined,
  CarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { logout } from '@/store/slices/authSlice'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Tableau de bord' },
  { key: '/users',     icon: <UserOutlined />,      label: 'Utilisateurs' },
  { key: '/travels',   icon: <CarOutlined />,        label: 'Voyages' },
  { key: '/packages',  icon: <InboxOutlined />,      label: 'Colis' },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const admin = useAppSelector((s) => s.auth.admin)
  const { token } = theme.useToken()
  const selectedKey = '/' + location.pathname.split('/')[1]

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Se déconnecter',
        danger: true,
        onClick: handleLogout,
      },
    ],
  }

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ background: token.colorBgContainer }}
        className="shadow-md"
        width={220}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-100">
          {collapsed ? (
            <span className="text-xl font-bold text-blue-600">K</span>
          ) : (
            <span className="text-lg font-bold text-blue-600">KDCL Admin</span>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-none mt-2"
        />
      </Sider>

      <Layout>
        <Header
          style={{ background: token.colorBgContainer, padding: '0 24px' }}
          className="flex items-center justify-between shadow-sm"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div className="flex items-center gap-3">
            <Button type="text" icon={<BellOutlined />} />
            <Dropdown menu={userMenu} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar icon={<UserOutlined />} size="small" />
                {admin && <span className="text-sm font-medium">{admin.name}</span>}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="m-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
