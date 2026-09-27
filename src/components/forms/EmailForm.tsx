import React from 'react';
import { EmailData } from '../../types/qr';
import { useLanguage } from '../../i18n';

interface EmailFormProps {
  data: EmailData;
  onChange: (data: EmailData) => void;
}

export const EmailForm: React.FC<EmailFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();
  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          Recipient Email
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          placeholder="support@company.com"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          {tx('Tiêu đề', 'Subject')}
        </label>
        <input
          type="text"
          value={data.subject}
          onChange={(e) => onChange({ ...data, subject: e.target.value })}
          placeholder="Inquiry / Feedback"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          {tx('Nội dung email', 'Message Body')}
        </label>
        <textarea
          rows={3}
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          placeholder="{tx('Nội dung email soạn sẵn...', 'Pre-filled email message...')}"
          className="w-full p-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors resize-y"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          {tx('Mở ứng dụng email mặc định với người nhận, tiêu đề và nội dung đã điền sẵn.', 'Opens default mail client with recipient, subject, and message pre-populated.')}
        </p>
      </div>
    </div>
  );
};
