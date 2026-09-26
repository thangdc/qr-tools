import type { QrFormData, QrType } from './types'
const esc=(value:string)=>value.replace(/[\\;,:]/g,'\\$&')
export function buildQrPayload(type:QrType,data:QrFormData):string {
switch(type){
case 'url': return data.url?.trim()||''
case 'text': return data.text?.trim()||''
case 'contact': return ['BEGIN:VCARD','VERSION:3.0',data.name?'FN:'+data.name:'',data.phone?'TEL:'+data.phone:'',data.email?'EMAIL:'+data.email:'','END:VCARD'].filter(Boolean).join('\n')
case 'wifi': return 'WIFI:T:'+(data.security||'WPA')+';S:'+esc(data.ssid||'')+';P:'+esc(data.password||'')+';;'
case 'email': { const query=new URLSearchParams(); if(data.subject)query.set('subject',data.subject); if(data.body)query.set('body',data.body); return 'mailto:'+(data.to||'')+(query.toString()?'?'+query.toString():'') }
case 'phone': return 'tel:'+(data.phone||'')
case 'sms': return 'SMSTO:'+(data.phone||'')+':'+(data.message||'')
case 'location': return 'geo:'+(data.latitude||'')+','+(data.longitude||'')
case 'payment': return data.account?'https://qr.sepay.vn/img?acc='+encodeURIComponent(data.account)+'&bank='+encodeURIComponent(data.bank||'')+'&amount='+encodeURIComponent(data.amount||'')+'&des='+encodeURIComponent(data.message||''):''
}}
