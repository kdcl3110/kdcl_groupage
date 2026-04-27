import { Tag } from 'antd'

interface Props {
  label: string
  color: string
}

export default function StatusBadge({ label, color }: Props) {
  return <Tag color={color}>{label}</Tag>
}
