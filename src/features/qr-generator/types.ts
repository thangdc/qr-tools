export type QrType = 'url' | 'text' | 'contact' | 'wifi' | 'email' | 'phone' | 'sms' | 'location' | 'payment'
export type QrFormData = Record<string, string>
export type FieldDefinition = { name: string; label: string; placeholder?: string; type?: 'text'|'email'|'tel'|'url'|'password'; required?: boolean; multiline?: boolean }
