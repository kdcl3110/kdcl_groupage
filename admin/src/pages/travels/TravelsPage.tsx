import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Select, Space, Button, Progress, Tooltip,
  Dropdown, App,
} from 'antd'
import type { TableProps } from 'antd'
import {
  MoreOutlined, EyeOutlined,
  SendOutlined, CloudOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchTravels, setFilters, setPage, updateTravelStatus,
} from '@/store/slices/travelsSlice'
import StatusBadge from '@/components/common/StatusBadge'
import {
  TRAVEL_STATUS_LABELS, TRAVEL_STATUS_COLORS,
  TRANSPORT_LABELS, TRAVEL_STATUS_TRANSITIONS,
} from '@/constants'
import type { Travel, TravelStatus, TransportType } from '@/types'

const { Option } = Select

function TransportIcon({ type }: { type: TransportType }) {
  return type === 'plane'
    ? <SendOutlined className="text-blue-500" />
    : <CloudOutlined className="text-cyan-600" />
}

export default function TravelsPage() {
  const dispatch    = useAppDispatch()
  const navigate    = useNavigate()
  const { message } = App.useApp()
  const { items, total, page, pageSize, filters, loading } = useAppSelector((s) => s.travels)

  const load = useCallback(() => {
    dispatch(fetchTravels({ filters, page, pageSize }))
  }, [dispatch, filters, page, pageSize])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (travelId: number, status: TravelStatus) => {
    const result = await dispatch(updateTravelStatus({ travelId, status }))
    if (updateTravelStatus.fulfilled.match(result)) {
      message.success('Statut mis à jour')
    } else {
      message.error(result.payload as string)
    }
  }

  const rowMenu = (travel: Travel): MenuProps => {
    const transitions = TRAVEL_STATUS_TRANSITIONS[travel.status]
    return {
      items: [
        {
          key: 'view',
          icon: <EyeOutlined />,
          label: 'Voir le détail',
          onClick: () => navigate(`/travels/${travel.travel_id}`),
        },
        ...(transitions.length > 0 ? [
          { type: 'divider' as const },
          {
            key: 'status',
            label: 'Changer le statut',
            children: transitions.map((s) => ({
              key: s,
              label: TRAVEL_STATUS_LABELS[s],
              onClick: () => handleStatusChange(travel.travel_id, s),
            })),
          },
        ] : []),
      ],
    }
  }

  const columns: TableProps<Travel>['columns'] = [
    {
      title: '',
      key: 'transport',
      width: 40,
      render: (_, t) => (
        <Tooltip title={TRANSPORT_LABELS[t.transport_type]}>
          <TransportIcon type={t.transport_type} />
        </Tooltip>
      ),
    },
    {
      title: 'Itinéraire',
      key: 'route',
      render: (_, t) => (
        <div>
          <div className="font-medium text-sm">
            {t.itinerary || `${t.origin?.name ?? '?'} → ${t.destination?.name ?? '?'}`}
          </div>
          <div className="text-xs text-gray-400">#{t.travel_id}</div>
        </div>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: TravelStatus) => (
        <StatusBadge label={TRAVEL_STATUS_LABELS[status]} color={TRAVEL_STATUS_COLORS[status]} />
      ),
    },
    {
      title: 'Départ',
      dataIndex: 'departure_date',
      key: 'departure_date',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Arrivée estimée',
      dataIndex: 'estimated_arrival_date',
      key: 'estimated_arrival_date',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Colis',
      dataIndex: 'packages_count',
      key: 'packages_count',
      render: (v) => v ?? '—',
    },
    {
      title: 'Charge (poids)',
      key: 'weight_fill',
      render: (_, t) =>
        t.weight_fill_pct !== undefined ? (
          <Tooltip title={`${t.current_weight ?? 0} / ${t.max_weight} kg`}>
            <Progress
              percent={Math.round(t.weight_fill_pct)}
              size="small"
              strokeColor={t.weight_fill_pct >= 90 ? '#f5222d' : t.weight_fill_pct >= 70 ? '#fa8c16' : '#52c41a'}
              style={{ width: 100 }}
            />
          </Tooltip>
        ) : '—',
    },
    {
      title: 'Prix/unité',
      dataIndex: 'price_per_unit',
      key: 'price_per_unit',
      render: (v, t) => v ? `${v} USD/${t.transport_type === 'plane' ? 'kg' : 'm³'}` : '—',
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, travel) => (
        <Dropdown menu={rowMenu(travel)} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Voyages</h2>
        <span className="text-sm text-gray-400">{total} au total</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <Select
          value={filters.status || undefined}
          placeholder="Tous les statuts"
          onChange={(v) => dispatch(setFilters({ ...filters, status: v ?? '' }))}
          allowClear
          className="w-44"
        >
          {Object.entries(TRAVEL_STATUS_LABELS).map(([k, v]) => (
            <Option key={k} value={k}>{v}</Option>
          ))}
        </Select>
        <Select
          value={filters.transport_type || undefined}
          placeholder="Tous les transports"
          onChange={(v) => dispatch(setFilters({ ...filters, transport_type: v ?? '' }))}
          allowClear
          className="w-44"
        >
          <Option value="plane"><Space><SendOutlined />Aérien</Space></Option>
          <Option value="ship"><Space><CloudOutlined />Maritime</Space></Option>
        </Select>
      </div>

      <Table
        rowKey="travel_id"
        columns={columns}
        dataSource={items}
        loading={loading}
        onRow={(t) => ({ onDoubleClick: () => navigate(`/travels/${t.travel_id}`) })}
        pagination={{
          current:  page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => `${n} résultat${n > 1 ? 's' : ''}`,
          onChange: (p) => dispatch(setPage(p)),
        }}
        className="bg-white rounded-lg shadow-sm"
      />
    </div>
  )
}
