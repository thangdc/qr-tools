import React, { useState } from 'react';
import { LocationData } from '../../types/qr';
import { MapPin, Navigation } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface LocationFormProps {
  data: LocationData;
  onChange: (data: LocationData) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Hoàn Kiếm, Hà Nội', lat: '21.028511', lng: '105.854444' },
  { name: 'Landmark 81, TP.HCM', lat: '10.795123', lng: '106.721915' },
  { name: 'Cầu Rồng, Đà Nẵng', lat: '16.061111', lng: '108.227222' },
];

export const LocationForm: React.FC<LocationFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();
  const [detecting, setDetecting] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...data,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          locationName: data.locationName || 'Current Location',
        });
        setDetecting(false);
      },
      () => {
        setDetecting(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          {tx('Tên vị trí (không bắt buộc)', 'Location Name (Optional)')}
        </label>
        <input
          type="text"
          value={data.locationName}
          onChange={(e) => onChange({ ...data, locationName: e.target.value })}
          placeholder="e.g. Store Branch #1, Meeting Point"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            {tx('Vĩ độ', 'Latitude')}
          </label>
          <input
            type="text"
            value={data.latitude}
            onChange={(e) => onChange({ ...data, latitude: e.target.value })}
            placeholder="10.795123"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            {tx('Kinh độ', 'Longitude')}
          </label>
          <input
            type="text"
            value={data.longitude}
            onChange={(e) => onChange({ ...data, longitude: e.target.value })}
            placeholder="106.721915"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <Navigation className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
          <span>{detecting ? 'Đang lấy vị trí...' : '{tx('Dùng vị trí GPS hiện tại', 'Use my current GPS')}'}</span>
        </button>
      </div>

      <div className="pt-2 border-t border-neutral-100">
        <span className="text-xs font-medium text-neutral-500">{tx('Vị trí phổ biến:', 'Popular presets:')}</span>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {PRESET_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() =>
                onChange({
                  locationName: loc.name,
                  latitude: loc.lat,
                  longitude: loc.lng,
                })
              }
              className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-blue-600 bg-neutral-100 hover:bg-neutral-200/80 px-2 py-1 rounded transition-colors"
            >
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>{loc.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
