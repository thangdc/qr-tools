import { useMemo, useState } from 'react'
import { QRCode } from '../features/qr-generator/components/QRCode'
import { QrForm } from '../features/qr-generator/components/QrForm'
import { ResultActions } from '../features/qr-generator/components/ResultActions'
import { DEFAULT_VALUES, QR_TYPES } from '../features/qr-generator/config'
import { buildQrPayload } from '../features/qr-generator/payload'
import type { QrFormData, QrType } from '../features/qr-generator/types'

export function App() {
const initialType=useMemo(()=>{const value=new URLSearchParams(window.location.search).get('type') as QrType|null;return QR_TYPES.some(item=>item.id===value)?value!:'url'},[])
const [type,setType]=useState<QrType>(initialType); const [values,setValues]=useState<QrFormData>({...DEFAULT_VALUES[initialType]})
const config=QR_TYPES.find(item=>item.id===type)!; const payload=buildQrPayload(type,values)
const selectType=(next:QrType)=>{setType(next);setValues({...DEFAULT_VALUES[next]});const p=new URLSearchParams(window.location.search);p.set('type',next);window.history.replaceState({},'', '?'+p.toString())}
return <main className="app-shell"><header className="app-header"><div><div className="eyebrow">QR TOOLS</div><h1>QR Code Generator</h1><p>Tạo mã QR nhanh, gọn, không cần đăng nhập.</p></div></header>
<nav className="type-nav" aria-label="QR type">{QR_TYPES.map(item=><button key={item.id} className={item.id===type?'type-button active':'type-button'} onClick={()=>selectType(item.id)}>{item.label}</button>)}</nav>
<section className="workspace"><div className="panel"><div className="panel-title">Thông tin</div><QrForm fields={config.fields} values={values} onChange={(name,value)=>setValues(current=>({...current,[name]:value}))}/></div>
<div className="panel result-panel"><div className="result-heading"><span>Kết quả</span><span className="result-type">{config.label}</span></div><QRCode value={payload}/><ResultActions value={payload} disabled={!payload}/></div></section></main>
}
