import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Descriptions, Select, Space,
  Spin, Alert, App, Image, Modal, Input, Row, Col,
  Divider,
} from 'antd'
import {
  ArrowLeftOutlined, UserOutlined, SendOutlined, CloudOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SwapOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '@/services/api'
import { useAppDispatch } from '@/hooks/redux'
import {
  updatePackageStatus, validatePackage, rejectPackage,
} from '@/store/slices/packagesSlice'
import StatusBadge from '@/components/common/StatusBadge'
import {
  PACKAGE_STATUS_LABELS, PACKAGE_STATUS_COLORS,
  PACKAGE_STATUS_TRANSITIONS, FRAGILITY_LABELS, FRAGILITY_COLORS,
  TRAVEL_STATUS_LABELS, TRAVEL_STATUS_COLORS,
} from '@/constants'
import type { Package, PackageStatus, Payment } from '@/types'

const { Option } = Select
const { TextArea } = Input

export default function PackageDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const dispatch    = useAppDispatch()
  const { message, modal } = App.useApp()

  const [pkg, setPkg]         = useState<Package | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [rejectModal, setRejectModal]   = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [reassignModal, setReassignModal] = useState(false)
  const [newTravelId, setNewTravelId]     = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get(`/packages/${id}/manager-detail`),
      api.get(`/payments/package/${id}`).catch(() => ({ data: { data: null } })),
    ])
      .then(([pRes, payRes]) => {
        setPkg(pRes.data.data ?? pRes.data.package)
        setPayment(payRes.data.data)
      })
      .catch(() => setError('Impossible de charger ce colis'))
      .finally(() => setLoading(false))
  }, [id])

  const handleValidate = async () => {
    if (!pkg) return
    const result = await dispatch(validatePackage(pkg.package_id))
    if (validatePackage.fulfilled.match(result)) {
      setPkg((prev) => prev ? { ...prev, ...result.payload } : prev)
      message.success('Colis validé')
    } else {
      message.error(result.payload as string)
    }
  }

  const handleReject = async () => {
    if (!pkg) return
    const result = await dispatch(rejectPackage({ packageId: pkg.package_id, reason: rejectReason }))
    if (rejectPackage.fulfilled.match(result)) {
      setPkg((prev) => prev ? { ...prev, ...result.payload } : prev)
      setRejectModal(false)
      setRejectReason('')
      message.success('Colis rejeté')
    } else {
      message.error(result.payload as string)
    }
  }

  const handleStatusChange = async (status: PackageStatus) => {
    if (!pkg) return
    const result = await dispatch(updatePackageStatus({ packageId: pkg.package_id, status }))
    if (updatePackageStatus.fulfilled.match(result)) {
      setPkg((prev) => prev ? { ...prev, status } : prev)
      message.success('Statut mis à jour')
    } else {
      message.error(result.payload as string)
    }
  }

  const handleReassign = () => {
    if (!pkg || !newTravelId) return
    modal.confirm({
      title: 'Réaffecter le colis',
      content: `Déplacer ce colis vers le voyage #${newTravelId} ?`,
      onOk: async () => {
        try {
          const { data } = await api.patch(`/packages/${pkg.package_id}/reassign`, {
            travel_id: parseInt(newTravelId),
          })
          setPkg((prev) => prev ? { ...prev, ...data.data } : prev)
          setReassignModal(false)
          setNewTravelId('')
          message.success('Colis réaffecté')
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } } }
          message.error(e.response?.data?.message ?? 'Erreur de réaffectation')
        }
      },
    })
  }

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>
  if (error)   return <Alert type="error" message={error} className="m-6" />
  if (!pkg)    return null

  const images = [pkg.image1, pkg.image2, pkg.image3, pkg.image4].filter(Boolean) as string[]
  const transitions = PACKAGE_STATUS_TRANSITIONS[pkg.status]

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/packages')}
        className="mb-4"
      >
        Retour
      </Button>

      {/* Header */}
      <Card className="mb-4 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-semibold m-0 font-mono">{pkg.tracking_number}</h2>
              <StatusBadge
                label={PACKAGE_STATUS_LABELS[pkg.status]}
                color={PACKAGE_STATUS_COLORS[pkg.status]}
              />
              <StatusBadge
                label={FRAGILITY_LABELS[pkg.fragility]}
                color={FRAGILITY_COLORS[pkg.fragility]}
              />
            </div>
            <p className="text-gray-500 m-0">{pkg.description}</p>
          </div>

          {/* Quick actions */}
          <Space wrap>
            {pkg.status === 'submitted' && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleValidate}
                >
                  Valider
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => setRejectModal(true)}
                >
                  Rejeter
                </Button>
              </>
            )}
            {transitions.length > 0 && (
              <Select
                placeholder="Changer le statut"
                onChange={handleStatusChange}
                className="w-52"
                value={undefined}
              >
                {transitions.map((s) => (
                  <Option key={s} value={s}>{PACKAGE_STATUS_LABELS[s]}</Option>
                ))}
              </Select>
            )}
            {pkg.travel_id && (
              <Button icon={<SwapOutlined />} onClick={() => setReassignModal(true)}>
                Réaffecter
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Row gutter={16}>
        {/* Détails du colis */}
        <Col xs={24} lg={14}>
          <Card title="Détails" className="mb-4 shadow-sm">
            <Descriptions column={2} size="small" labelStyle={{ color: '#6b7280' }}>
              <Descriptions.Item label="Poids">{pkg.weight} kg</Descriptions.Item>
              <Descriptions.Item label="Volume">{pkg.volume} m³</Descriptions.Item>
              <Descriptions.Item label="Valeur déclarée">{pkg.declared_value} USD</Descriptions.Item>
              <Descriptions.Item label="Prix calculé">{pkg.price ? `${pkg.price} USD` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Création">
                {dayjs(pkg.creation_date).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Livraison estimée">
                {pkg.estimated_delivery_date
                  ? dayjs(pkg.estimated_delivery_date).format('DD/MM/YYYY')
                  : '—'}
              </Descriptions.Item>
              {pkg.special_instructions && (
                <Descriptions.Item label="Instructions" span={2}>
                  {pkg.special_instructions}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Client */}
          {pkg.client && (
            <Card
              title={<Space><UserOutlined /> Client</Space>}
              className="mb-4 shadow-sm"
              extra={
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate(`/users/${pkg.client!.user_id}`)}
                >
                  Voir le profil
                </Button>
              }
            >
              <Descriptions column={1} size="small" labelStyle={{ color: '#6b7280' }}>
                <Descriptions.Item label="Nom">
                  {pkg.client.first_name} {pkg.client.last_name}
                </Descriptions.Item>
                <Descriptions.Item label="Email">{pkg.client.email}</Descriptions.Item>
                <Descriptions.Item label="Téléphone">{pkg.client.phone || '—'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Destinataire */}
          {pkg.recipient && (
            <Card title="Destinataire" className="mb-4 shadow-sm">
              <Descriptions column={1} size="small" labelStyle={{ color: '#6b7280' }}>
                <Descriptions.Item label="Nom">
                  {pkg.recipient.first_name} {pkg.recipient.last_name}
                </Descriptions.Item>
                <Descriptions.Item label="Téléphone">{pkg.recipient.phone}</Descriptions.Item>
                <Descriptions.Item label="Ville">{pkg.recipient.city}</Descriptions.Item>
                <Descriptions.Item label="Pays">{pkg.recipient.country}</Descriptions.Item>
                {pkg.recipient.address && (
                  <Descriptions.Item label="Adresse">{pkg.recipient.address}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={10}>
          {/* Voyage */}
          {pkg.travel && (
            <Card
              title={
                <Space>
                  {pkg.travel.transport_type === 'plane' ? <SendOutlined /> : <CloudOutlined />}
                  Voyage
                </Space>
              }
              className="mb-4 shadow-sm"
              extra={
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate(`/travels/${pkg.travel!.travel_id}`)}
                >
                  Voir
                </Button>
              }
            >
              <Descriptions column={1} size="small" labelStyle={{ color: '#6b7280' }}>
                <Descriptions.Item label="Itinéraire">
                  {pkg.travel.itinerary ?? `#${pkg.travel.travel_id}`}
                </Descriptions.Item>
                <Descriptions.Item label="Statut">
                  <StatusBadge
                    label={TRAVEL_STATUS_LABELS[pkg.travel.status]}
                    color={TRAVEL_STATUS_COLORS[pkg.travel.status]}
                  />
                </Descriptions.Item>
                {pkg.travel.departure_date && (
                  <Descriptions.Item label="Départ">
                    {dayjs(pkg.travel.departure_date).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* Paiement */}
          {payment && (
            <Card title="Paiement" className="mb-4 shadow-sm">
              <Descriptions column={1} size="small" labelStyle={{ color: '#6b7280' }}>
                <Descriptions.Item label="Montant">{payment.amount_usd} USD</Descriptions.Item>
                <Descriptions.Item label="Commission">{payment.platform_commission_usd} USD</Descriptions.Item>
                <Descriptions.Item label="Net groupeur">{payment.net_to_groupeur_usd} USD</Descriptions.Item>
                <Descriptions.Item label="Fournisseur">{payment.provider ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Statut">
                  <StatusBadge
                    label={payment.status}
                    color={payment.status === 'paid' ? 'green' : payment.status === 'failed' ? 'red' : 'orange'}
                  />
                </Descriptions.Item>
                {payment.paid_at && (
                  <Descriptions.Item label="Payé le">
                    {dayjs(payment.paid_at).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* Photos */}
          {images.length > 0 && (
            <Card title="Photos" className="shadow-sm">
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, i) => (
                    <Image
                      key={i}
                      src={`/uploads/${img}`}
                      alt={`Photo ${i + 1}`}
                      className="rounded object-cover"
                      height={100}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            </Card>
          )}
        </Col>
      </Row>

      {/* Modal rejet */}
      <Modal
        title="Rejeter le colis"
        open={rejectModal}
        onOk={handleReject}
        onCancel={() => { setRejectModal(false); setRejectReason('') }}
        okText="Confirmer le rejet"
        okButtonProps={{ danger: true }}
      >
        <p className="text-gray-500 mb-3">Motif du rejet (optionnel) :</p>
        <TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
          placeholder="Ex : informations incomplètes, contenu non conforme…"
        />
      </Modal>

      {/* Modal réaffectation */}
      <Modal
        title="Réaffecter vers un autre voyage"
        open={reassignModal}
        onOk={handleReassign}
        onCancel={() => { setReassignModal(false); setNewTravelId('') }}
        okText="Réaffecter"
      >
        <p className="text-gray-500 mb-3">ID du voyage de destination :</p>
        <Input
          value={newTravelId}
          onChange={(e) => setNewTravelId(e.target.value)}
          placeholder="Ex : 42"
          type="number"
        />
        <Divider />
        <Button type="link" className="p-0" onClick={() => navigate('/travels')}>
          Consulter la liste des voyages
        </Button>
      </Modal>
    </div>
  )
}
