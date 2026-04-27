import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Descriptions, Select, Space,
  Spin, Alert, App, Progress, Table, Tag,
} from 'antd'
import type { TableProps } from 'antd'
import {
  ArrowLeftOutlined, SendOutlined, CloudOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '@/services/api'
import { useAppDispatch } from '@/hooks/redux'
import { updateTravelStatus } from '@/store/slices/travelsSlice'
import StatusBadge from '@/components/common/StatusBadge'
import {
  TRAVEL_STATUS_LABELS, TRAVEL_STATUS_COLORS, TRAVEL_STATUS_TRANSITIONS,
  TRANSPORT_LABELS, PACKAGE_STATUS_LABELS, PACKAGE_STATUS_COLORS,
} from '@/constants'
import type { Travel, TravelStatus, Package, PackageStatus } from '@/types'

const { Option } = Select

export default function TravelDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const dispatch    = useAppDispatch()
  const { message } = App.useApp()

  const [travel, setTravel]   = useState<Travel | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get(`/travels/${id}`),
      api.get('/admin/packages', { params: { travel_id: id, limit: 100 } }),
    ])
      .then(([tRes, pRes]) => {
        setTravel(tRes.data.data)
        setPackages(pRes.data.data.packages ?? [])
      })
      .catch(() => setError('Impossible de charger ce voyage'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (status: TravelStatus) => {
    if (!travel) return
    const result = await dispatch(updateTravelStatus({ travelId: travel.travel_id, status }))
    if (updateTravelStatus.fulfilled.match(result)) {
      setTravel((prev) => prev ? { ...prev, status } : prev)
      message.success('Statut mis à jour')
    } else {
      message.error(result.payload as string)
    }
  }

  const pkgColumns: TableProps<Package>['columns'] = [
    {
      title: 'N° suivi',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      render: (v, p) => (
        <Button type="link" size="small" onClick={() => navigate(`/packages/${p.package_id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Client',
      key: 'client',
      render: (_, p) => p.client
        ? `${p.client.first_name} ${p.client.last_name}`
        : '—',
    },
    {
      title: 'Poids',
      dataIndex: 'weight',
      key: 'weight',
      render: (v) => `${v} kg`,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: PackageStatus) => (
        <Tag color={PACKAGE_STATUS_COLORS[status]}>{PACKAGE_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: 'Prix',
      dataIndex: 'price',
      key: 'price',
      render: (v) => v ? `${v} USD` : '—',
    },
  ]

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>
  if (error)   return <Alert type="error" message={error} className="m-6" />
  if (!travel) return null

  const transitions = TRAVEL_STATUS_TRANSITIONS[travel.status]

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/travels')}
        className="mb-4"
      >
        Retour
      </Button>

      {/* Header */}
      <Card className="mb-4 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">
              {travel.transport_type === 'plane' ? <SendOutlined className="text-blue-500" /> : <CloudOutlined className="text-cyan-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold m-0">
                  {travel.itinerary || `${travel.origin?.name ?? '?'} → ${travel.destination?.name ?? '?'}`}
                </h2>
                <StatusBadge
                  label={TRAVEL_STATUS_LABELS[travel.status]}
                  color={TRAVEL_STATUS_COLORS[travel.status]}
                />
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {TRANSPORT_LABELS[travel.transport_type]} · Voyage #{travel.travel_id}
              </div>
            </div>
          </div>
          {transitions.length > 0 && (
            <Select
              value={travel.status}
              onChange={handleStatusChange}
              className="w-48"
            >
              {transitions.map((s) => (
                <Option key={s} value={s}>{TRAVEL_STATUS_LABELS[s]}</Option>
              ))}
            </Select>
          )}
        </div>
      </Card>

      {/* Stats capacité */}
      <Card className="mb-4 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-gray-400 mb-1">
              Charge poids — {travel.current_weight ?? 0} / {travel.max_weight} kg
            </div>
            <Progress
              percent={Math.round(travel.weight_fill_pct ?? 0)}
              strokeColor={
                (travel.weight_fill_pct ?? 0) >= 90 ? '#f5222d' :
                (travel.weight_fill_pct ?? 0) >= 70 ? '#fa8c16' : '#52c41a'
              }
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">
              Charge volume — {travel.current_volume ?? 0} / {travel.max_volume} m³
            </div>
            <Progress
              percent={Math.round(travel.volume_fill_pct ?? 0)}
              strokeColor={
                (travel.volume_fill_pct ?? 0) >= 90 ? '#f5222d' :
                (travel.volume_fill_pct ?? 0) >= 70 ? '#fa8c16' : '#52c41a'
              }
            />
          </div>
        </div>
      </Card>

      {/* Détails */}
      <Card className="mb-4 shadow-sm">
        <Descriptions column={2} size="small" labelStyle={{ color: '#6b7280' }}>
          <Descriptions.Item label="Départ">
            {travel.departure_date ? dayjs(travel.departure_date).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Arrivée estimée">
            {travel.estimated_arrival_date ? dayjs(travel.estimated_arrival_date).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Poids max">{travel.max_weight} kg</Descriptions.Item>
          <Descriptions.Item label="Volume max">{travel.max_volume} m³</Descriptions.Item>
          <Descriptions.Item label="Prix / unité">
            {travel.price_per_unit
              ? `${travel.price_per_unit} USD / ${travel.transport_type === 'plane' ? 'kg' : 'm³'}`
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Conteneur">{travel.container ?? '—'}</Descriptions.Item>
          {travel.creator && (
            <Descriptions.Item label="Groupeur">
              <Button
                type="link"
                size="small"
                className="p-0"
                onClick={() => navigate(`/users/${travel.creator!.user_id}`)}
              >
                {travel.creator.first_name} {travel.creator.last_name}
              </Button>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Packages */}
      <Card
        title={
          <Space>
            <InboxOutlined />
            <span>Colis ({packages.length})</span>
          </Space>
        }
        className="shadow-sm"
      >
        <Table
          rowKey="package_id"
          columns={pkgColumns}
          dataSource={packages}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
