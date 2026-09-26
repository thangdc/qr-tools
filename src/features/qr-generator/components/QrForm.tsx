import type { FieldDefinition, QrFormData } from '../types'

type Props = {
  fields: FieldDefinition[]
  values: QrFormData
  onChange: (name: string, value: string) => void
}

export function QrForm({ fields, values, onChange }: Props) {
  return (
    <div className="qr-form">
      {fields.map((field) => (
        <div className="field" key={field.name}>
          <label htmlFor={'qr-' + field.name}>
            {field.label}
            {field.required && <span aria-hidden="true" className="required-mark"> *</span>}
          </label>
          {field.multiline ? (
            <textarea
              id={'qr-' + field.name}
              value={values[field.name] || ''}
              placeholder={field.placeholder}
              rows={4}
              required={field.required}
              onChange={(e) => onChange(field.name, e.target.value)}
            />
          ) : (
            <input
              id={'qr-' + field.name}
              type={field.type || 'text'}
              value={values[field.name] || ''}
              placeholder={field.placeholder}
              required={field.required}
              onChange={(e) => onChange(field.name, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
