import { useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Table, Input, Select, Button, Dropdown, App, Space,
} from 'antd'
import type { TableProps } from 'antd'
import {
  SearchOutlined, MoreOutlined, EyeOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  fetchPackages, setFilters, setPage,
  validatePackage, rejectPackage,
} from '@/store/slices/packagesSlice'
import StatusBadge from '@/components/common/StatusBadge'
import {
  PACKAGE_STATUS_LABELS, PACKAGE_STATUS_COLORS,
  FRAGILITY_LABELS, FRAGILITY_COLORS,
} from '@/constants'
import type { Package, PackageStatus, FragilityLevel } from '@/types'

const { Option } = Select

export default function PackagesPage() {
  const dispatch    = useAppDispatch()
  const navigate    = useNavigate()
  const [searchParams] = useSearchParams()
  const { message } = App.useApp()
  const { items, total, page, pageSize, filters, loading } = useAppSelector((s) => s.packages)

  // Support navigation depuis UserDetail (client_id query param)
  useEffect(() => {
    const clientId = searchParams.get('client_id')
    if (clientId) {
      dispatch(setFilters({ ...filters, client_id: parseInt(clientId) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(() => {
    dispatch(fetchPackages({ filters, page, pageSize }))
  }, [dispatch, filters, page, pageSize])

  useEffect(() => { load() }, [load])

  const handleValidate = async (packageId: number) => {
    const result = await dispatch(validatePackage(packageId))
    if (validatePackage.fulfilled.match(result)) {
      message.success('Colis validé')
    } else {
      message.error(result.payload as string)
    }
  }

  const handleReject = async (packageId: number) => {
    const result = await dispatch(rejectPackage({ packageId }))
    if (rejectPackage.fulfilled.match(result)) {
      message.success('Colis rejeté')
    } else {
      message.error(result.payload as string)
    }
  }

  const rowMenu = (pkg: Package): MenuProps => ({
    items: [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Voir le détail',
        onClick: () => navigate(`/packages/${pkg.package_id}`),
      },
      ...(pkg.status === 'submitted' ? [
        { type: 'divider' as const },
        {
          key: 'validate',
          icon: <CheckOutlined />,
          label: 'Valider',
          onClick: () => handleValidate(pkg.package_id),
        },
        {
          key: 'reject',
          icon: <CloseOutlined />,
          label: 'Rejeter',
          danger: true,
          onClick: () => handleReject(pkg.package_id),
        },
      ] : []),
    ],
  })

  const columns: TableProps<Package>['columns'] = [
    {
      title: 'N° suivi',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      render: (v, pkg) => (
        <Button type="link" size="small" onClick={() => navigate(`/packages/${pkg.package_id}`)}>
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
      render: (_, p) => p.client ? (
        <Button
          type="link"
          size="small"
          className="p-0"
          onClick={() => navigate(`/users/${p.client!.user_id}`)}
        >
          {p.client.first_name} {p.client.last_name}
        </Button>
      ) : '—',
    },
    {
      title: 'Voyage',
      key: 'travel',
      render: (_, p) => p.travel ? (
        <Button
          type="link"
          size="small"
          className="p-0"
          onClick={() => navigate(`/travels/${p.travel!.travel_id}`)}
        >
          {p.travel.itinerary ?? `#${p.travel.travel_id}`}
        </Button>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      title: 'Poids / Vol.',
      key: 'dimensions',
      render: (_, p) => (
        <span className="text-xs text-gray-500">{p.weight} kg · {p.volume} m³</span>
      ),
    },
    {
      title: 'Fragilité',
      dataIndex: 'fragility',
      key: 'fragility',
      render: (f: FragilityLevel) => (
        <StatusBadge label={FRAGILITY_LABELS[f]} color={FRAGILITY_COLORS[f]} />
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: PackageStatus) => (
        <StatusBadge label={PACKAGE_STATUS_LABELS[status]} color={PACKAGE_STATUS_COLORS[status]} />
      ),
    },
    {
      title: 'Prix',
      dataIndex: 'price',
      key: 'price',
      render: (v) => v != null ? `${v} USD` : '—',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, pkg) => (
        <Dropdown menu={rowMenu(pkg)} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Colis</h2>
        <span className="text-sm text-gray-400">{total} au total</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="N° suivi, description…"
          value={filters.search}
          onChange={(e) => dispatch(setFilters({ ...filters, search: e.target.value }))}
          allowClear
          className="w-64"
        />
        <Select
          value={filters.status || undefined}
          placeholder="Tous les statuts"
          onChange={(v) => dispatch(setFilters({ ...filters, status: v ?? '' }))}
          allowClear
          className="w-52"
        >
          {Object.entries(PACKAGE_STATUS_LABELS).map(([k, v]) => (
            <Option key={k} value={k}>
              <Space size={4}>
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: PACKAGE_STATUS_COLORS[k as PackageStatus] === 'default' ? '#d9d9d9' : undefined }}
                />
                {v}
              </Space>
            </Option>
          ))}
        </Select>
      </div>

      <Table
        rowKey="package_id"
        columns={columns}
        dataSource={items}
        loading={loading}
        onRow={(p) => ({ onDoubleClick: () => navigate(`/packages/${p.package_id}`) })}
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
