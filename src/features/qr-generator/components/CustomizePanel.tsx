import { useState } from 'react'
import type { QrDesign } from '../types'

type Props = {
  design: QrDesign
  onChange: (design: QrDesign) => void
}

const COLORS = ['#111111', '#1d4ed8', '#047857', '#7c3aed', '#b91c1c']

export function CustomizePanel({ design, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section className="customize">
      <button className="customize-trigger" type="button" onClick={() => setOpen((value) => !value)}>
        <span><strong>Customize</strong><small>Color, size and spacing</small></span>
        <span className={open ? 'chevron open' : 'chevron'}>⌄</span>
      </button>
      {open && (
        <div className="customize-body">
          <div>
            <label>Color</label>
            <div className="color-row">
              {COLORS.map((color) => (
                <button key={color} type="button" aria-label={`Set QR color ${color}`} className={design.foreground === color ? 'color-swatch active' : 'color-swatch'} style={{ background: color }} onClick={() => onChange({ ...design, foreground: color })} />
              ))}
            </div>
          </div>
          <div className="range-field">
            <label htmlFor="qr-size">Size</label>
            <input id="qr-size" type="range" min="180" max="420" value={design.size} onChange={(e) => onChange({ ...design, size: Number(e.target.value) })} />
          </div>
          <div className="range-field">
            <label htmlFor="qr-margin">Margin</label>
            <input id="qr-margin" type="range" min="0" max="6" value={design.margin} onChange={(e) => onChange({ ...design, margin: Number(e.target.value) })} />
          </div>
        </div>
      )}
    </section>
  )
}
