import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Col, Row, Statistic, Spin, Tag, Button,
} from 'antd'
import {
  UserOutlined, InboxOutlined, CarOutlined, DollarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import api from '@/services/api'
import {
  USER_ROLE_LABELS, USER_ROLE_COLORS,
  PACKAGE_STATUS_LABELS, PACKAGE_STATUS_COLORS,
} from '@/constants'
import type { AdminStats } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then((res) => setStats(res.data.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>
  if (!stats)  return null

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Tableau de bord</h2>

      {/* KPI cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/users')}
          >
            <Statistic
              title="Utilisateurs"
              value={stats.users_count}
              prefix={<UserOutlined className="text-blue-500" />}
            />
            <Button type="link" size="small" className="p-0 mt-2" icon={<ArrowRightOutlined />}>
              Gérer
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/travels')}
          >
            <Statistic
              title="Voyages"
              value={stats.travels_count}
              prefix={<CarOutlined className="text-green-500" />}
            />
            <Button type="link" size="small" className="p-0 mt-2" icon={<ArrowRightOutlined />}>
              Gérer
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/packages')}
          >
            <Statistic
              title="Colis"
              value={stats.packages_count}
              prefix={<InboxOutlined className="text-orange-500" />}
            />
            <Button type="link" size="small" className="p-0 mt-2" icon={<ArrowRightOutlined />}>
              Gérer
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Revenus totaux"
              value={stats.total_revenue_usd}
              prefix={<DollarOutlined className="text-purple-500" />}
              precision={2}
              suffix="USD"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Répartition utilisateurs par rôle */}
        <Col xs={24} lg={12}>
          <Card title="Utilisateurs par rôle" className="shadow-sm">
            <div className="space-y-3">
              {Object.entries(stats.users_by_role).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <Tag color={USER_ROLE_COLORS[role as keyof typeof USER_ROLE_COLORS] ?? 'default'}>
                    {USER_ROLE_LABELS[role as keyof typeof USER_ROLE_LABELS] ?? role}
                  </Tag>
                  <span className="font-semibold text-sm">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Répartition colis par statut */}
        <Col xs={24} lg={12}>
          <Card title="Colis par statut" className="shadow-sm">
            <div className="space-y-3">
              {Object.entries(stats.packages_by_status)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Tag color={PACKAGE_STATUS_COLORS[status as keyof typeof PACKAGE_STATUS_COLORS] ?? 'default'}>
                      {PACKAGE_STATUS_LABELS[status as keyof typeof PACKAGE_STATUS_LABELS] ?? status}
                    </Tag>
                    <span className="font-semibold text-sm">{count}</span>
                  </div>
                ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
