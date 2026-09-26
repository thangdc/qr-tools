import type { FieldDefinition, QrType } from './types'

export const QR_TYPES: { id: QrType; label: string; fields: FieldDefinition[] }[] = [
  { id: 'url', label: 'URL', fields: [{ name: 'url', label: 'Website URL', placeholder: 'https://example.com', type: 'url', required: true }] },
  { id: 'text', label: 'Văn bản', fields: [{ name: 'text', label: 'Nội dung', placeholder: 'Nhập nội dung...', multiline: true, required: true }] },
  { id: 'contact', label: 'Liên hệ', fields: [
    { name: 'name', label: 'Họ tên', placeholder: 'Nguyễn Văn A', required: true },
    { name: 'phone', label: 'Điện thoại', placeholder: '0901234567', type: 'tel' },
    { name: 'email', label: 'Email', placeholder: 'email@example.com', type: 'email' },
  ] },
  { id: 'wifi', label: 'WiFi', fields: [
    { name: 'ssid', label: 'Tên WiFi (SSID)', placeholder: 'My WiFi', required: true },
    { name: 'password', label: 'Mật khẩu', placeholder: 'Mật khẩu WiFi', type: 'password' },
    { name: 'security', label: 'Bảo mật', placeholder: 'WPA', required: true },
  ] },
  { id: 'email', label: 'Email', fields: [
    { name: 'to', label: 'Email nhận', placeholder: 'email@example.com', type: 'email', required: true },
    { name: 'subject', label: 'Tiêu đề', placeholder: 'Tiêu đề email' },
    { name: 'body', label: 'Nội dung', placeholder: 'Nội dung...', multiline: true },
  ] },
  { id: 'phone', label: 'Điện thoại', fields: [{ name: 'phone', label: 'Số điện thoại', placeholder: '0901234567', type: 'tel', required: true }] },
  { id: 'sms', label: 'SMS', fields: [
    { name: 'phone', label: 'Số điện thoại', placeholder: '0901234567', type: 'tel', required: true },
    { name: 'message', label: 'Tin nhắn', placeholder: 'Nội dung tin nhắn...', multiline: true },
  ] },
  { id: 'location', label: 'Vị trí', fields: [
    { name: 'latitude', label: 'Vĩ độ', placeholder: '10.7769', required: true },
    { name: 'longitude', label: 'Kinh độ', placeholder: '106.7009', required: true },
  ] },
  { id: 'payment', label: 'VietQR', fields: [
    { name: 'bank', label: 'Ngân hàng', placeholder: 'Vietcombank', required: true },
    { name: 'account', label: 'Số tài khoản', placeholder: '0123456789', required: true },
    { name: 'amount', label: 'Số tiền', placeholder: '100000' },
    { name: 'message', label: 'Nội dung chuyển khoản', placeholder: 'Thanh toan...', multiline: true },
  ] },
]

export const DEFAULT_VALUES: Record<QrType, Record<string, string>> = {
  url: { url: 'https://example.com' },
  text: { text: '' },
  contact: { name: '', phone: '', email: '' },
  wifi: { ssid: '', password: '', security: 'WPA' },
  email: { to: '', subject: '', body: '' },
  phone: { phone: '' },
  sms: { phone: '', message: '' },
  location: { latitude: '', longitude: '' },
  payment: { bank: '', account: '', amount: '', message: '' },
}

export const DEFAULT_DESIGN = {
  foreground: '#111111',
  background: '#ffffff',
  size: 320,
  margin: 2,
} as const
