import React from 'react';
import { useLanguage } from '../../i18n';
import { ContactData } from '../../types/qr';
import { Download, FileText } from 'lucide-react';

interface ContactFormProps {
  data: ContactData;
  onChange: (data: ContactData) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();
  const updateField = (field: keyof ContactData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleDownloadVCF = () => {
    const vcardContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${data.lastName || ''};${data.firstName || ''};;;`,
      `FN:${[data.firstName, data.lastName].filter(Boolean).join(' ')}`,
      data.organization ? `ORG:${data.organization}` : '',
      data.phone ? `TEL;TYPE=CELL:${data.phone}` : '',
      data.email ? `EMAIL;TYPE=INTERNET:${data.email}` : '',
      data.website ? `URL:${data.website}` : '',
      data.address ? `ADR;TYPE=WORK:;;${data.address};;;;` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');

    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${[data.firstName, data.lastName].filter(Boolean).join('_') || 'contact'}.vcf`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasContactInfo = data.firstName || data.lastName || data.phone || data.email;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
          {tx('Thông tin liên hệ', 'Contact Details')}
        </label>
        {hasContactInfo && (
          <button
            type="button"
            onClick={handleDownloadVCF}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            title="{tx('Tải tệp .vcf chuẩn', 'Download standard .vcf file')}"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{tx('Tải danh thiếp .vcf', 'Download .vcf Card')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            {tx('Tên', 'First Name')}
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="Minh"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            {tx('Họ', 'Last Name')}
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Nguyen"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            {tx('Số điện thoại', 'Phone Number')}
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+84 901 234 567"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            Email
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="minh.nguyen@company.vn"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            {tx('Tổ chức / Công ty', 'Organization / Company')}
          </label>
          <input
            type="text"
            value={data.organization}
            onChange={(e) => updateField('organization', e.target.value)}
            placeholder="Acme Tech JSC"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            Website
          </label>
          <input
            type="url"
            value={data.website}
            onChange={(e) => updateField('website', e.target.value)}
            placeholder="https://company.vn"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          Address
        </label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="72 Le Thanh Ton, Ben Nghe, District 1, Ho Chi Minh City"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          {tx('Xuất vCard 3.0 chuẩn. Khi quét, điện thoại có thể lưu liên hệ trực tiếp vào danh bạ.', 'Exports standard vCard 3.0. Phones scanning this can save contact directly to address book.')}
        </p>
      </div>
    </div>
  );
};
