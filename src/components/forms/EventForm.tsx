import React from 'react';
import { useLanguage } from '../../i18n';
import { EventData } from '../../types/qr';
import { Calendar, MapPin, Clock, AlignLeft, Sparkles } from 'lucide-react';

interface EventFormProps {
  data: EventData;
  onChange: (data: EventData) => void;
}

export const EventForm: React.FC<EventFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();
  const setQuickPreset = (preset: {
    title: string;
    location: string;
    description: string;
    hoursAhead: number;
    durationHours: number;
  }) => {
    const start = new Date(Date.now() + preset.hoursAhead * 3600 * 1000);
    const end = new Date(start.getTime() + preset.durationHours * 3600 * 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalISO = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    onChange({
      title: preset.title,
      location: preset.location,
      startDate: toLocalISO(start),
      endDate: toLocalISO(end),
      description: preset.description,
      allDay: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Event Title */}
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span>{tx('Tên sự kiện', 'Event Title')}</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="e.g. Grand Opening Cafe & Workshop"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors font-medium"
        />
      </div>

      {/* Date & Time Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Ngày & giờ bắt đầu</span>
          </label>
          <input
            type="datetime-local"
            value={data.startDate}
            onChange={(e) => onChange({ ...data, startDate: e.target.value })}
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-neutral-900 transition-colors cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Ngày & giờ kết thúc</span>
          </label>
          <input
            type="datetime-local"
            value={data.endDate}
            onChange={(e) => onChange({ ...data, endDate: e.target.value })}
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-neutral-900 transition-colors cursor-pointer"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
          <span>Địa điểm</span>
        </label>
        <input
          type="text"
          value={data.location}
          onChange={(e) => onChange({ ...data, location: e.target.value })}
          placeholder="e.g. 123 Lê Lợi, Bến Nghé, Quận 1, TP.HCM"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <AlignLeft className="w-3.5 h-3.5 text-neutral-400" />
          <span>Mô tả & lịch trình</span>
        </label>
        <textarea
          rows={3}
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Lịch trình, trang phục, diễn giả hoặc ghi chú đặc biệt..."
          className="w-full p-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors resize-y leading-relaxed"
        />
      </div>

      {/* Quick Presets */}
      <div className="pt-1">
        <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Mẫu nhanh:</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            {
              title: 'Grand Opening & Tasting Day',
              location: '72 Lê Thánh Tôn, Quận 1, TP.HCM',
              description: 'Tiệc khai trương trải nghiệm cà phê đặc sản & ưu đãi 30%',
              hoursAhead: 48,
              durationHours: 3,
            },
            {
              title: 'Barista & Coffee Workshop',
              location: 'Highlands Lab, Hà Nội',
              description: 'Lớp học pha chế Pour-over và Latte Art miễn phí',
              hoursAhead: 72,
              durationHours: 2,
            },
            {
              title: 'VIP Member Networking Night',
              location: 'Rooftop Lounge, Quận 3, TP.HCM',
              description: 'Gặp gỡ đối tác và tiệc cocktail thân mật',
              hoursAhead: 24,
              durationHours: 4,
            },
          ].map((p) => (
            <button
              key={p.title}
              type="button"
              onClick={() => setQuickPreset(p)}
              className="text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Khi người tham dự quét mã QR này, iPhone và Android sẽ hiển thị <strong>"Thêm vào lịch"</strong> với địa điểm, ngày và lời nhắc đã điền sẵn.
      </p>
    </div>
  );
};
