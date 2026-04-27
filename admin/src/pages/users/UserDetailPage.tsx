import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Avatar, Button, Descriptions, Select, Space,
  Spin, Alert, App, Divider, Badge,
} from 'antd'
import {
  ArrowLeftOutlined, UserOutlined, MailOutlined,
  PhoneOutlined, EnvironmentOutlined, CalendarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '@/services/api'
import { useAppDispatch } from '@/hooks/redux'
import { updateUserStatus, updateUserRole } from '@/store/slices/usersSlice'
import StatusBadge from '@/components/common/StatusBadge'
import {
  USER_ROLE_LABELS, USER_ROLE_COLORS,
  USER_STATUS_LABELS, USER_STATUS_COLORS,
} from '@/constants'
import type { User, UserStatus, UserRole } from '@/types'

const { Option } = Select

export default function UserDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const dispatch    = useAppDispatch()
  const { message } = App.useApp()

  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get(`/admin/users/${id}`)
      .then((res) => setUser(res.data.data))
      .catch(() => setError('Impossible de charger cet utilisateur'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (status: UserStatus) => {
    if (!user) return
    const result = await dispatch(updateUserStatus({ userId: user.user_id, status }))
    if (updateUserStatus.fulfilled.match(result)) {
      setUser(result.payload)
      message.success('Statut mis à jour')
    } else {
      message.error(result.payload as string)
    }
  }

  const handleRoleChange = async (role: UserRole) => {
    if (!user) return
    const result = await dispatch(updateUserRole({ userId: user.user_id, role }))
    if (updateUserRole.fulfilled.match(result)) {
      setUser(result.payload)
      message.success('Rôle mis à jour')
    } else {
      message.error(result.payload as string)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>
  if (error)   return <Alert type="error" message={error} className="m-6" />
  if (!user)   return null

  return (
    <div className="max-w-3xl mx-auto">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/users')}
        className="mb-4"
      >
        Retour
      </Button>

      {/* Header */}
      <Card className="mb-4 shadow-sm">
        <div className="flex items-center gap-5">
          <Avatar
            src={user.profile_picture ? `/uploads/${user.profile_picture}` : undefined}
            icon={<UserOutlined />}
            size={72}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold m-0">
                {user.first_name} {user.last_name}
              </h2>
              <StatusBadge label={USER_ROLE_LABELS[user.role]}   color={USER_ROLE_COLORS[user.role]} />
              <StatusBadge label={USER_STATUS_LABELS[user.status]} color={USER_STATUS_COLORS[user.status]} />
            </div>
            <div className="text-gray-500 text-sm mt-1">{user.email}</div>
          </div>
        </div>
      </Card>

      {/* Actions rapides */}
      <Card title="Actions" className="mb-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <div className="text-xs text-gray-400 mb-1">Statut du compte</div>
            <Select value={user.status} onChange={handleStatusChange} className="w-44">
              <Option value="active">Actif</Option>
              <Option value="inactive">Inactif</Option>
              <Option value="suspended">Suspendu</Option>
            </Select>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Rôle</div>
            <Select value={user.role} onChange={handleRoleChange} className="w-44">
              <Option value="client">Client</Option>
              <Option value="freight_forwarder">Groupeur</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Informations */}
      <Card title="Informations" className="shadow-sm">
        <Descriptions column={2} size="small" labelStyle={{ color: '#6b7280' }}>
          <Descriptions.Item label={<Space><MailOutlined /> Email</Space>}>
            {user.email}
            {user.email_verified
              ? <Badge status="success" text="vérifié" className="ml-2" />
              : <Badge status="default" text="non vérifié" className="ml-2" />}
          </Descriptions.Item>
          <Descriptions.Item label={<Space><PhoneOutlined /> Téléphone</Space>}>
            {user.phone || '—'}
            {user.phone_verified
              ? <Badge status="success" text="vérifié" className="ml-2" />
              : <Badge status="default" text="non vérifié" className="ml-2" />}
          </Descriptions.Item>
          <Descriptions.Item label={<Space><EnvironmentOutlined /> Adresse</Space>}>
            {[user.street, user.city, user.postal_code, user.country].filter(Boolean).join(', ') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<Space><CalendarOutlined /> Inscription</Space>}>
            {dayjs(user.createdAt).format('DD MMMM YYYY')}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Button
          onClick={() => navigate(`/packages?client_id=${user.user_id}`)}
          type="default"
          className="mr-2"
        >
          Voir les colis
        </Button>
        {user.role === 'freight_forwarder' && (
          <Button onClick={() => navigate(`/travels?created_by=${user.user_id}`)} type="default">
            Voir les voyages
          </Button>
        )}
      </Card>
    </div>
  )
}
