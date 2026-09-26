import { useRef } from 'react'
export function ResultActions({value,disabled}:{value:string;disabled?:boolean}) {
const ref=useRef<HTMLDivElement>(null)
const copy=async()=>{if(value)await navigator.clipboard.writeText(value)}
const download=()=>{const svg=ref.current?.querySelector('svg');if(!svg)return;const xml=new XMLSerializer().serializeToString(svg);const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}));const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.fillStyle='#fff';ctx.fillRect(0,0,1024,1024);ctx.drawImage(image,0,0,1024,1024);URL.revokeObjectURL(url);const a=document.createElement('a');a.download='qr-code.png';a.href=canvas.toDataURL('image/png');a.click()};image.src=url}
return <div ref={ref} className="result-actions"><button disabled={disabled} onClick={copy}>Sao chép nội dung</button><button disabled={disabled} onClick={download}>Tải PNG</button></div>
}
