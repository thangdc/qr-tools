import { useEffect,useRef } from 'react'
import qrcode from 'qrcode-generator'
export function QRCode({value}:{value:string}) {
const ref=useRef<HTMLDivElement>(null)
useEffect(()=>{const el=ref.current;if(!el)return;el.innerHTML='';if(!value)return;try{const qr=qrcode(0,'M');qr.addData(value);qr.make();el.innerHTML=qr.createSvgTag({scalable:true,margin:2})}catch{el.textContent='Nội dung quá dài hoặc không hợp lệ.'}},[value])
return <div className="qr-preview" ref={ref} aria-label="QR code preview"/>
}
