import type { FieldDefinition, QrFormData } from '../types'
export function QrForm({fields,values,onChange}:{fields:FieldDefinition[];values:QrFormData;onChange:(name:string,value:string)=>void}) {
return <div className="qr-form">{fields.map(field=><div className="field" key={field.name}><label htmlFor={'qr-'+field.name}>{field.label}</label>{field.multiline?<textarea id={'qr-'+field.name} value={values[field.name]||''} placeholder={field.placeholder} rows={4} required={field.required} onChange={e=>onChange(field.name,e.target.value)}/>:<input id={'qr-'+field.name} type={field.type||'text'} value={values[field.name]||''} placeholder={field.placeholder} required={field.required} onChange={e=>onChange(field.name,e.target.value)}/>}</div>)}</div>
}
