import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Input, Select, Space, Button, Avatar, Tooltip,
  Dropdown, App,
} from 'antd'
import type { TableProps } from 'antd'
import {
  SearchOutlined, UserOutlined, EyeOutlined,
  StopOutlined, CheckCircleOutlined, MoreOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { fetchUsers, setFilters, setPage, updateUserStatus } from '@/store/slices/usersSlice'
import StatusBadge from '@/components/common/StatusBadge'
import {
  USER_ROLE_LABELS, USER_ROLE_COLORS,
  USER_STATUS_LABELS, USER_STATUS_COLORS,
} from '@/constants'
import type { User, UserRole, UserStatus } from '@/types'

const { Option } = Select

export default function UsersPage() {
  const dispatch   = useAppDispatch()
  const navigate   = useNavigate()
  const { message } = App.useApp()
  const { items, total, page, pageSize, filters, loading } = useAppSelector((s) => s.users)

  const load = useCallback(() => {
    dispatch(fetchUsers({ filters, page, pageSize }))
  }, [dispatch, filters, page, pageSize])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (userId: number, status: UserStatus) => {
    const result = await dispatch(updateUserStatus({ userId, status }))
    if (updateUserStatus.fulfilled.match(result)) {
      message.success('Statut mis à jour')
    } else {
      message.error(result.payload as string)
    }
  }

  const rowMenu = (user: User): MenuProps => ({
    items: [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Voir le détail',
        onClick: () => navigate(`/users/${user.user_id}`),
      },
      { type: 'divider' },
      user.status !== 'active' ? {
        key: 'activate',
        icon: <CheckCircleOutlined />,
        label: 'Activer',
        onClick: () => handleStatusChange(user.user_id, 'active'),
      } : null,
      user.status !== 'suspended' ? {
        key: 'suspend',
        icon: <StopOutlined />,
        label: 'Suspendre',
        danger: true,
        onClick: () => handleStatusChange(user.user_id, 'suspended'),
      } : null,
    ].filter(Boolean) as MenuProps['items'],
  })

  const columns: TableProps<User>['columns'] = [
    {
      title: 'Utilisateur',
      key: 'name',
      render: (_, u) => (
        <Space>
          <Avatar
            src={u.profile_picture ? `/uploads/${u.profile_picture}` : undefined}
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <div className="font-medium text-sm">{u.first_name} {u.last_name}</div>
            <div className="text-xs text-gray-400">{u.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Téléphone',
      dataIndex: 'phone',
      key: 'phone',
      render: (v) => v || '—',
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <StatusBadge label={USER_ROLE_LABELS[role]} color={USER_ROLE_COLORS[role]} />
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: UserStatus) => (
        <StatusBadge label={USER_STATUS_LABELS[status]} color={USER_STATUS_COLORS[status]} />
      ),
    },
    {
      title: 'Inscription',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Vérifié',
      key: 'verified',
      render: (_, u) => (
        <Space size={4}>
          <Tooltip title="Email">
            <span className={u.email_verified ? 'text-green-500' : 'text-gray-300'}>✉</span>
          </Tooltip>
          <Tooltip title="Téléphone">
            <span className={u.phone_verified ? 'text-green-500' : 'text-gray-300'}>📱</span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, user) => (
        <Dropdown menu={rowMenu(user)} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Utilisateurs</h2>
        <span className="text-sm text-gray-400">{total} au total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Nom, email…"
          value={filters.search}
          onChange={(e) =>
            dispatch(setFilters({ ...filters, search: e.target.value }))
          }
          allowClear
          className="w-60"
        />
        <Select
          value={filters.role || undefined}
          placeholder="Tous les rôles"
          onChange={(v) => dispatch(setFilters({ ...filters, role: v ?? '' }))}
          allowClear
          className="w-44"
        >
          <Option value="client">Client</Option>
          <Option value="freight_forwarder">Groupeur</Option>
          <Option value="admin">Admin</Option>
        </Select>
        <Select
          value={filters.status || undefined}
          placeholder="Tous les statuts"
          onChange={(v) => dispatch(setFilters({ ...filters, status: v ?? '' }))}
          allowClear
          className="w-44"
        >
          <Option value="active">Actif</Option>
          <Option value="inactive">Inactif</Option>
          <Option value="suspended">Suspendu</Option>
        </Select>
      </div>

      <Table
        rowKey="user_id"
        columns={columns}
        dataSource={items}
        loading={loading}
        onRow={(user) => ({ onDoubleClick: () => navigate(`/users/${user.user_id}`) })}
        pagination={{
          current:   page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => `${n} résultat${n > 1 ? 's' : ''}`,
          onChange:  (p) => dispatch(setPage(p)),
        }}
        className="bg-white rounded-lg shadow-sm"
      />
    </div>
  )
}
