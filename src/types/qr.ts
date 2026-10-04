export type QRType =
  | 'url'
  | 'text'
  | 'contact'
  | 'wifi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'location'
  | 'payment'
  | 'event';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type ModuleStyle = 'square' | 'dots' | 'squircle';
export type EyeStyle = 'square' | 'rounded' | 'circle';
export type FrameStyle = 'none' | 'bottom-bar' | 'top-bar' | 'badge' | 'minimal-box';
export type TemplateLayout = 'bare' | 'framed' | 'table-tent' | 'bank-stand' | 'minimal-card' | 'dark-card';

export interface UrlData {
  url: string;
}

export interface TextData {
  text: string;
}

export interface ContactData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  address: string;
  website: string;
}

export interface WifiData {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface EmailData {
  email: string;
  subject: string;
  message: string;
}

export interface PhoneData {
  phone: string;
}

export interface SmsData {
  phone: string;
  message: string;
}

export interface LocationData {
  latitude: string;
  longitude: string;
  locationName: string;
}

export interface PaymentData {
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: string;
  description: string;
}

export interface EventData {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  allDay?: boolean;
}

export type QRFormData = {
  url: UrlData;
  text: TextData;
  contact: ContactData;
  wifi: WifiData;
  email: EmailData;
  phone: PhoneData;
  sms: SmsData;
  location: LocationData;
  payment: PaymentData;
  event: EventData;
};

export interface QRDesignOptions {
  fgColor: string;
  bgColor: string;
  margin: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  centerLogo: 'none' | 'bank' | 'wifi' | 'link' | 'custom';
  customLogoUrl: string | null;
  moduleStyle: ModuleStyle;
  eyeStyle: EyeStyle;
  frameStyle: FrameStyle;
  frameText: string;
}

export interface QROutputSettings {
  imageSize: 512 | 1024 | 2048;
  dpi: 300;
  printSizeMm: number;
  addCropMarks: boolean;
}

export const DEFAULT_QR_OUTPUT_SETTINGS: QROutputSettings = {
  imageSize: 1024,
  dpi: 300,
  printSizeMm: 60,
  addCropMarks: true,
};

export interface QRTemplate {
  id: string;
  name: string;
  description: string;
  isPredefined?: boolean;
  isDefault?: boolean;
  layout: TemplateLayout;
  headerTitle: string;
  subtitle?: string;
  footerMessage: string;
  brandLogoUrl?: string | null;
  includeWifi: boolean;
  wifiSsid?: string;
  wifiPass?: string;
  frameStyle: FrameStyle;
  frameText: string;
  design: QRDesignOptions;
}

export interface QRHistoryItem {
  id: string;
  type: QRType;
  title: string;
  subtitle: string;
  data: any;
  design: QRDesignOptions;
  templateId?: string;
  rawPayload: string;
  createdAt: number;
}

export interface BankInfo {
  bin: string;
  shortName: string;
  name: string;
  code: string;
  swiftCode?: string;
  logoBg: string;
  color: string;
}

export interface BulkQRItem {
  id: string;
  label: string;
  type: QRType;
  data: any;
  selected: boolean;
}

export interface DecodedQRData {
  raw: string;
  type: QRType;
  title: string;
  subtitle: string;
  parsedData: Partial<QRFormData[QRType]>;
}

