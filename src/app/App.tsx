import { useEffect, useMemo, useRef, useState } from 'react'
import { History, Sparkles, Trash2 } from 'lucide-react'
import { QRCode } from '../features/qr-generator/components/QRCode'
import { QrForm } from '../features/qr-generator/components/QrForm'
import { ResultActions } from '../features/qr-generator/components/ResultActions'
import { CustomizePanel } from '../features/qr-generator/components/CustomizePanel'
import { DEFAULT_DESIGN, DEFAULT_VALUES, QR_TYPES } from '../features/qr-generator/config'
import { buildQrPayload } from '../features/qr-generator/payload'
import type { QrDesign, QrFormData, QrHistoryItem, QrType } from '../features/qr-generator/types'

const HISTORY_KEY = 'qr-tools-history'

export function App() {
  const initialType = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('type') as QrType | null
    return QR_TYPES.some((item) => item.id === value) ? value! : 'url'
  }, [])
  const [type, setType] = useState<QrType>(initialType)
  const [values, setValues] = useState<QrFormData>({ ...DEFAULT_VALUES[initialType] })
  const [design, setDesign] = useState<QrDesign>({ ...DEFAULT_DESIGN })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<QrHistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
  })

  const previewRef = useRef<HTMLDivElement>(null)
  const config = QR_TYPES.find((item) => item.id === type)!
  const payload = buildQrPayload(type, values)

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)))
  }, [history])

  const selectType = (next: QrType) => {
    setType(next)
    setValues({ ...DEFAULT_VALUES[next] })
    setDesign({ ...DEFAULT_DESIGN })
    const params = new URLSearchParams(window.location.search)
    params.set('type', next)
    window.history.replaceState({}, '', '?' + params.toString())
  }

  const titleForHistory = () =>
    values.url || values.name || values.ssid || values.to || values.phone || values.account || values.text || config.label

  const saveHistory = () => {
    if (!payload) return
    const title = titleForHistory()
    setHistory((items) => [
      { id: crypto.randomUUID(), type, title, values: { ...values }, design: { ...design }, createdAt: Date.now() },
      ...items.filter((item) => !(item.type === type && item.title === title)),
    ])
  }

  const restoreHistory = (item: QrHistoryItem) => {
    setType(item.type)
    setValues({ ...item.values })
    setDesign({ ...item.design })
    setHistoryOpen(false)
    const params = new URLSearchParams(window.location.search)
    params.set('type', item.type)
    window.history.replaceState({}, '', '?' + params.toString())
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => setHistoryOpen(false)} aria-label="QR Tools home">
          <span className="brand-name">QR Tools</span>
          <span className="brand-subtitle">/ professional utility</span>
        </button>
        <nav className="header-nav" aria-label="Application">
          <button className={historyOpen ? 'nav-button active' : 'nav-button'} onClick={() => setHistoryOpen((open) => !open)}>
            <History size={15} /> History {history.length > 0 && <span className="count">{history.length}</span>}
          </button>
          <button className="pro-button" type="button"><Sparkles size={14} /> Pro</button>
        </nav>
      </header>

      {historyOpen ? (
        <section className="history-view">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR QR CODES</span>
              <h1>History</h1>
              <p>Nhấp vào một mục để khôi phục dữ liệu và thiết kế.</p>
            </div>
            {history.length > 0 && <button className="text-button danger" onClick={() => setHistory([])}><Trash2 size={14} /> Xóa lịch sử</button>}
          </div>
          {history.length === 0 ? (
            <div className="empty-state"><History size={22} /><strong>Chưa có mã QR nào</strong><span>Các mã bạn lưu sẽ xuất hiện ở đây.</span></div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <button key={item.id} className="history-item" onClick={() => restoreHistory(item)}>
                  <span className="history-type">{item.type.toUpperCase()}</span>
                  <span className="history-copy"><strong>{item.title}</strong><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></span>
                  <span className="history-open">Mở</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="page-heading">
            <span className="eyebrow">QR TOOLS</span>
            <h1>QR Code Generator</h1>
            <p>Tạo mã QR nhanh, gọn, không cần đăng nhập.</p>
          </section>

          <nav className="type-nav" aria-label="QR type">
            {QR_TYPES.map((item) => (
              <button key={item.id} className={item.id === type ? 'type-button active' : 'type-button'} onClick={() => selectType(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>

          <section className="workspace">
            <div className="panel form-panel">
              <div className="panel-heading">
                <div><span className="panel-kicker">INPUT</span><h2>{config.label}</h2></div>
                <span className="panel-note">Required fields marked *</span>
              </div>
              <QrForm fields={config.fields} values={values} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} />
            </div>

            <div className="panel result-panel">
              <div className="panel-heading">
                <div><span className="panel-kicker">PREVIEW</span><h2>QR Code</h2></div>
                <span className="result-type">{config.label}</span>
              </div>
              <QRCode value={payload} design={design} containerRef={previewRef} />
              <div className="result-meta">
                <span>Ready to scan</span>
                <button className="save-button" onClick={saveHistory} disabled={!payload}>Lưu vào History</button>
              </div>
              <CustomizePanel design={design} onChange={setDesign} />
              <ResultActions value={payload} previewRef={previewRef} disabled={!payload} />
            </div>
          </section>
        </>
      )}
    </main>
  )
}
