import { useMemo, useState } from 'react'
import { QRCode } from '../features/qr-generator/components/QRCode'

const types = [
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Văn bản' },
  { id: 'contact', label: 'Liên hệ' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Điện thoại' },
  { id: 'sms', label: 'SMS' },
  { id: 'location', label: 'Vị trí' },
  { id: 'payment', label: 'VietQR' },
] as const

type QrType = (typeof types)[number]['id']

export function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialType = (params.get('type') as QrType | null) ?? 'url'
  const [type, setType] = useState<QrType>(
    types.some((item) => item.id === initialType) ? initialType : 'url',
  )
  const [value, setValue] = useState('https://example.com')

  const selectType = (next: QrType) => {
    setType(next)
    const nextParams = new URLSearchParams(window.location.search)
    nextParams.set('type', next)
    window.history.replaceState({}, '', `?${nextParams.toString()}`)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">QR TOOLS</div>
          <h1>QR Code Generator</h1>
          <p>Tạo, tùy chỉnh và quản lý mã QR.</p>
        </div>
      </header>

      <nav className="type-nav" aria-label="QR type">
        {types.map((item) => (
          <button
            key={item.id}
            className={item.id === type ? 'type-button active' : 'type-button'}
            onClick={() => selectType(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="workspace">
        <div className="panel">
          <label htmlFor="qr-value">Nội dung</label>
          <textarea
            id="qr-value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={6}
          />
          <div className="panel-meta">{type.toUpperCase()}</div>
        </div>

        <div className="panel result-panel">
          <div className="result-heading">
            <span>Kết quả</span>
          </div>
          <QRCode value={value} />
        </div>
      </section>
    </main>
  )
}