declare module 'qrcode-generator' {
  type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

  type SvgOptions = {
    scalable?: boolean
    margin?: number
  }

  type QRCodeInstance = {
    addData(data: string): void
    make(): void
    createSvgTag(options?: SvgOptions): string
  }

  function qrcode(typeNumber: number, errorCorrectionLevel: ErrorCorrectionLevel): QRCodeInstance

  export default qrcode
}
