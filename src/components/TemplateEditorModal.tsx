import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { QRTemplate, TemplateLayout, FrameStyle, ModuleStyle, EyeStyle } from '../types/qr';
import {
  X,
  Star,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  Layout,
  Utensils,
  CreditCard,
  Sparkles,
  Wifi,
  Type,
  Grid,
  Upload,
} from 'lucide-react';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: QRTemplate[];
  activeTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onSetDefaultTemplate: (templateId: string) => void;
  onSaveTemplate: (template: QRTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  templates,
  activeTemplateId,
  onSelectTemplate,
  onSetDefaultTemplate,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  const { tx } = useLanguage();
  const [editingTemplate, setEditingTemplate] = useState<QRTemplate | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    const newTemplate: QRTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      name: 'Custom Template',
      description: tx('Tùy chỉnh bố cục và nhận diện thương hiệu cho màn hình QR.', 'Customize layout and branding for your QR displays.'),
      isPredefined: false,
      isDefault: false,
      layout: 'table-tent',
      headerTitle: 'MENU & ĐẶT MÓN',
      subtitle: 'Quét mã để đặt món trực tuyến',
      footerMessage: 'Cảm ơn quý khách',
      includeWifi: true,
      wifiSsid: 'My_Store_Wifi',
      wifiPass: 'welcome123',
      frameStyle: 'none',
      frameText: 'SCAN ME',
      design: {
        fgColor: '#000000',
        bgColor: '#ffffff',
        margin: 2,
        errorCorrectionLevel: 'M',
        centerLogo: 'none',
        customLogoUrl: null,
        moduleStyle: 'dots',
        eyeStyle: 'rounded',
        frameStyle: 'none',
        frameText: '',
      },
    };
    setEditingTemplate(newTemplate);
  };

  const handleDuplicate = (tmpl: QRTemplate) => {
    const copy: QRTemplate = {
      ...tmpl,
      id: `tmpl-custom-${Date.now()}`,
      name: `${tmpl.name} (Copy)`,
      isPredefined: false,
      isDefault: false,
    };
    setEditingTemplate(copy);
  };

  const handleEdit = (tmpl: QRTemplate) => {
    // Edit the selected template in place. Duplication is a separate, explicit action.
    setEditingTemplate({ ...tmpl });
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;
    onSaveTemplate(editingTemplate);
    setEditingTemplate(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-neutral-900 text-white">
              <Layout className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {tx('Studio mẫu & cài đặt mặc định', 'Template Studio & Default Settings')}
              </h2>
              <p className="text-xs text-neutral-500">
                {tx('Chọn hoặc thiết kế mẫu cho xem trước, tải xuống và in hàng loạt.', 'Choose or design templates for live preview, downloads, and batch printing.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editingTemplate && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="h-8 px-3 text-xs font-medium text-white bg-neutral-900 hover:bg-black rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tx('Mẫu mới', 'New Template')}</span>
              </button>
            )}
            <button
              onClick={() => {
                if (editingTemplate) setEditingTemplate(null);
                else onClose();
              }}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {editingTemplate ? (
            /* Editing / Creating Form */
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="font-semibold text-sm text-neutral-900">
                  {templates.some((t) => t.id === editingTemplate.id)
                    ? editingTemplate.isPredefined
                      ? tx('Tùy chỉnh mẫu', 'Customize Template')
                      : tx('Chỉnh sửa mẫu', 'Edit Template')
                    : tx('Tạo mẫu tùy chỉnh', 'Create Custom Template')}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
                >
                  {tx('Hủy', 'Cancel')}
                </button>
              </div>

              {/* {tx('Tên mẫu', 'Template Name')} & Layout Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-800 uppercase tracking-wider mb-1">
                    {tx('Tên mẫu', 'Template Name')}
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="w-full h-9 px-3 border border-neutral-300 rounded-lg text-xs"
                    placeholder="e.g. Coffee Table Tent"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-800 uppercase tracking-wider mb-1">
                    {tx('Định dạng thẻ / hiển thị', 'Card / Display Format')}
                  </label>
                  <select
                    value={editingTemplate.layout}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        layout: e.target.value as TemplateLayout,
                      })
                    }
                    className="w-full h-9 px-3 border border-neutral-300 rounded-lg text-xs bg-white"
                  >
                    <option value="bare">{tx('QR thuần (không khung)', 'Clean Bare QR (No card wrapper)')}</option>
                    <option value="framed">{tx('Banner nổi bật (khung trên/dưới)', 'Callout Banner (Bottom/Top Frame)')}</option>
                    <option value="table-tent">{tx('Bảng để bàn (Nhà hàng & Café)', 'Table Tent (Restaurant & Cafe)')}</option>
                    <option value="bank-stand">{tx('Bảng VietQR quầy thu ngân', 'VietQR Counter Stand')}</option>
                    <option value="minimal-card">{tx('Bảng để bàn tối giản', 'Minimal Desk Plaque')}</option>
                    <option value="dark-card">{tx('Thẻ studio nền tối', 'Dark Slate Studio Card')}</option>
                  </select>
                </div>
              </div>

              {/* Texts customization */}
              {editingTemplate.layout !== 'bare' && (
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                        Header Title
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.headerTitle}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            headerTitle: e.target.value,
                          })
                        }
                        className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md"
                        placeholder="e.g. MENU & ĐẶT MÓN, THANH TOÁN"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                        Subtitle / Instructions
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.subtitle || ''}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            subtitle: e.target.value,
                          })
                        }
                        className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md"
                        placeholder="e.g. Quét mã bằng camera điện thoại"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                      Footer Note
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.footerMessage}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          footerMessage: e.target.value,
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md"
                      placeholder="e.g. Cảm ơn quý khách!"
                    />
                  </div>

                  {/* Brand / Store Logo on Card Header */}
                  <div className="pt-2 border-t border-neutral-200">
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Store / Brand Logo on Card Header
                    </label>
                    <div className="flex items-center gap-3">
                      {editingTemplate.brandLogoUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={editingTemplate.brandLogoUrl}
                            alt="Brand Logo"
                            className="h-9 max-w-[130px] object-contain rounded border border-neutral-200 p-1 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditingTemplate({
                                ...editingTemplate,
                                brandLogoUrl: null,
                              })
                            }
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Remove Logo
                          </button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-medium cursor-pointer hover:bg-neutral-50 shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{tx('Tải logo cửa hàng (.png, .svg)', 'Upload Store Logo (.png, .svg)')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    brandLogoUrl: ev.target?.result as string,
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      Renders at the top header of physical cards and table tents.
                    </span>
                  </div>

                  {/* Wi-Fi details toggle */}
                  {editingTemplate.layout === 'table-tent' && (
                    <div className="pt-2 border-t border-neutral-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={editingTemplate.includeWifi}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              includeWifi: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-neutral-900 border-neutral-300"
                        />
                        <span>{tx('Hiển thị Wi-Fi khách trên thẻ', 'Include Guest Wi-Fi block on card')}</span>
                      </label>

                      {editingTemplate.includeWifi && (
                        <div className="grid grid-cols-2 gap-2 pl-6">
                          <input
                            type="text"
                            value={editingTemplate.wifiSsid || ''}
                            onChange={(e) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                wifiSsid: e.target.value,
                              })
                            }
                            placeholder={tx('Tên Wi-Fi (SSID)', 'Wi-Fi SSID')}
                            className="h-8 px-2.5 bg-white border border-neutral-300 rounded-md"
                          />
                          <input
                            type="text"
                            value={editingTemplate.wifiPass || ''}
                            onChange={(e) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                wifiPass: e.target.value,
                              })
                            }
                            placeholder={tx('Mật khẩu Wi-Fi', 'Wi-Fi Password')}
                            className="h-8 px-2.5 bg-white border border-neutral-300 rounded-md font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Frame callout caption */}
                  {editingTemplate.layout === 'framed' && (
                    <div className="pt-2 border-t border-neutral-200 space-y-2">
                      <label className="block font-semibold text-neutral-700">
                        Frame Callout Caption
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.frameText}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            frameText: e.target.value,
                          })
                        }
                        placeholder="SCAN ME, QUÉT MÃ"
                        className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md uppercase font-medium"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* QR Pattern & Eye Styling in Template */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Module Pattern
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'square', label: tx('Cổ điển', 'Classic') },
                      { id: 'dots', label: 'Dots' },
                      { id: 'squircle', label: tx('Bo mềm', 'Squircle') },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setEditingTemplate({
                            ...editingTemplate,
                            design: {
                              ...editingTemplate.design,
                              moduleStyle: m.id as ModuleStyle,
                            },
                          })
                        }
                        className={`py-1 rounded text-xs border transition-colors ${
                          editingTemplate.design.moduleStyle === m.id
                            ? 'bg-neutral-900 text-white font-medium border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Corner Eyes
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'square', label: tx('Vuông', 'Square') },
                      { id: 'rounded', label: tx('Bo tròn', 'Rounded') },
                      { id: 'circle', label: tx('Tròn', 'Circle') },
                    ].map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() =>
                          setEditingTemplate({
                            ...editingTemplate,
                            design: {
                              ...editingTemplate.design,
                              eyeStyle: e.id as EyeStyle,
                            },
                          })
                        }
                        className={`py-1 rounded text-xs border transition-colors ${
                          editingTemplate.design.eyeStyle === e.id
                            ? 'bg-neutral-900 text-white font-medium border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-200'
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  {tx('Hủy', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg font-medium transition-colors cursor-pointer shadow-xs"
                >
                  {tx('Lưu mẫu', 'Save Template')}
                </button>
              </div>
            </div>
          ) : (
            /* Templates List */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((tmpl) => {
                const isActive = tmpl.id === activeTemplateId;
                const isDefault = tmpl.isDefault;

                return (
                  <div
                    key={tmpl.id}
                    className={`p-4 rounded-xl border transition-all text-left relative flex flex-col justify-between space-y-3 ${
                      isActive
                        ? 'border-neutral-900 bg-neutral-50/50 shadow-xs ring-1 ring-neutral-900'
                        : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                          {tmpl.name}
                        </span>

                        <div className="flex items-center gap-1">
                          {isDefault ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200/60">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{tx('MẶC ĐỊNH', 'DEFAULT')}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSetDefaultTemplate(tmpl.id)}
                              className="text-[10px] font-medium text-neutral-400 hover:text-amber-600 px-1.5 py-0.5 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                              title="Set as default for all QR codes, downloads, and batch"
                            >
                              {tx('Đặt làm mặc định', 'Set Default')}
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-neutral-500 leading-normal">
                        {tmpl.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-neutral-400">
                        <span className="uppercase font-semibold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                          {tmpl.layout}
                        </span>
                        {tmpl.includeWifi && <span>· Wi-Fi badge</span>}
                        {tmpl.frameStyle !== 'none' && <span>· Frame caption</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTemplate(tmpl.id);
                          onClose();
                        }}
                        className={`px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                        }`}
                      >
                        {isActive ? tx('Mẫu đang dùng ✓', 'Active Template ✓') : tx('Dùng mẫu', 'Use Template')}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(tmpl)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 rounded cursor-pointer"
                          title="Duplicate as new custom template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(tmpl)}
                          className="text-[11px] text-neutral-400 hover:text-neutral-700 underline ml-1 cursor-pointer inline-flex items-center gap-1"
                          title={tmpl.isPredefined ? 'Customize this template' : 'Edit custom template'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{tmpl.isPredefined ? tx('Tùy chỉnh', 'Customize') : tx('Chỉnh sửa', 'Edit')}</span>
                        </button>

                        {!tmpl.isPredefined && (
                          <button
                            type="button"
                            onClick={() => onDeleteTemplate(tmpl.id)}
                            className="p-1 text-neutral-400 hover:text-red-600 rounded cursor-pointer"
                            title="Delete custom template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
