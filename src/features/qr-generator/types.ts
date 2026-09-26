export type QrType = 'url' | 'text' | 'contact' | 'wifi' | 'email' | 'phone' | 'sms' | 'location' | 'payment'

export type QrFormData = Record<string, string>

export type FieldDefinition = {
  name: string
  label: string
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'password'
  required?: boolean
  multiline?: boolean
}

export type QrDesign = {
  foreground: string
  background: string
  size: number
  margin: number
}

export type QrHistoryItem = {
  id: string
  type: QrType
  title: string
  values: QrFormData
  design: QrDesign
  createdAt: number
}
