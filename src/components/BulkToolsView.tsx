import React, { useState, useRef } from 'react';
import { useLanguage } from '../i18n';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { BulkQRItem, QRType } from '../types/qr';
import {
  FileArchive,
  Printer,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ArrowLeft,
  FileSpreadsheet,
  LayoutTemplate,
  Utensils,
  CreditCard,
  Tag,
  HelpCircle,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BulkToolsViewProps {
  isPro: boolean;
  onOpenPro: () => void;
  onBackToGenerator: () => void;
  onPrintBatch: (items: BulkQRItem[]) => void;
}

const DEFAULT_BATCH_ITEMS: BulkQRItem[] = [
  {
    id: 'batch-1',
    label: 'Bàn 01 - Tầng 1',
    type: 'url',
    value: 'https://menu.coffeehouse.vn/table/01',
    resolvedPayload: 'https://menu.coffeehouse.vn/table/01',
    selected: true,
  },
  {
    id: 'batch-2',
    label: 'Bàn 02 - Tầng 1',
    type: 'url',
    value: 'https://menu.coffeehouse.vn/table/02',
    resolvedPayload: 'https://menu.coffeehouse.vn/table/02',
    selected: true,
  },
  {
    id: 'batch-3',
    label: 'Bàn 03 - Tầng 1',
    type: 'url',
    value: 'https://menu.coffeehouse.vn/table/03',
    resolvedPayload: 'https://menu.coffeehouse.vn/table/03',
    selected: true,
  },
  {
    id: 'batch-4',
    label: 'Bàn 04 - Tầng 1',
    type: 'url',
    value: 'https://menu.coffeehouse.vn/table/04',
    resolvedPayload: 'https://menu.coffeehouse.vn/table/04',
    selected: true,
  },
  {
    id: 'batch-5',
    label: 'Khách hàng - Wi-Fi Quán',
    type: 'wifi',
    value: 'WIFI:T:WPA;S:TheCoffeeHouse_Guest;P:coffee2026;H:false;;',
    resolvedPayload: 'WIFI:T:WPA;S:TheCoffeeHouse_Guest;P:coffee2026;H:false;;',
    selected: true,
  },
  {
    id: 'batch-6',
    label: 'Quầy Thu Ngân 01',
    type: 'payment',
    value:
      '00020101021138540010A00000072701240006970436011001234567890208QRIBFTTA53037045802VN5913NGUYEN VAN A6002VN62180814QUAY THU NGAN63048C3D',
    resolvedPayload:
      '00020101021138540010A00000072701240006970436011001234567890208QRIBFTTA53037045802VN5913NGUYEN VAN A6002VN62180814QUAY THU NGAN63048C3D',
    selected: true,
  },
];

export const BulkToolsView: React.FC<BulkToolsViewProps> = ({
  isPro,
  onOpenPro,
  onBackToGenerator,
  onPrintBatch,
}) => {
  const { tx } = useLanguage();
  const [items, setItems] = useState<BulkQRItem[]>(DEFAULT_BATCH_ITEMS);
  const [importText, setImportText] = useState('');
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-Sequencer State
  const [showSequencer, setShowSequencer] = useState(false);
  const [seqPrefix, setSeqPrefix] = useState('Bàn ');
  const [seqFrom, setSeqFrom] = useState(1);
  const [seqTo, setSeqTo] = useState(20);
  const [seqPadZeros, setSeqPadZeros] = useState(true);
  const [seqUrlTemplate, setSeqUrlTemplate] = useState('https://menu.cafe.vn/table/{n}');
  const [seqZone, setSeqZone] = useState('Tầng 1');

  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems(items.map((i) => ({ ...i, selected: !allSelected })));
  };

  const toggleItem = (id: string) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleAddNew = () => {
    const newItem: BulkQRItem = {
      id: `batch-${Date.now()}`,
      label: `QR Item #${items.length + 1}`,
      type: 'url',
      value: `https://example.com/qr/${items.length + 1}`,
      resolvedPayload: `https://example.com/qr/${items.length + 1}`,
      selected: true,
    };
    setItems([...items, newItem]);
  };

  const handleGenerateSequence = () => {
    const from = Math.max(1, seqFrom);
    const to = Math.max(from, Math.min(100, seqTo));
    const newItems: BulkQRItem[] = [];

    for (let i = from; i <= to; i++) {
      const numStr = seqPadZeros ? i.toString().padStart(2, '0') : i.toString();
      const label = `${seqPrefix}${numStr}${seqZone ? ` - ${seqZone}` : ''}`;
      const payload = seqUrlTemplate.replace(/\{n\}/gi, numStr);
      newItems.push({
        id: `seq-${Date.now()}-${i}`,
        label,
        type: 'url',
        value: payload,
        resolvedPayload: payload,
        selected: true,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setShowSequencer(false);
  };

  const parseAndAddLines = (text: string) => {
    if (!text.trim()) return;

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: BulkQRItem[] = lines.map((line, idx) => {
      const parts = line.split(/[,\t]/);
      let label = `Item ${items.length + idx + 1}`;
      let val = line;
      if (parts.length >= 2) {
        label = parts[0].trim().replace(/^"|"$/g, '');
        val = parts.slice(1).join(',').trim().replace(/^"|"$/g, '');
      }

      return {
        id: `batch-import-${Date.now()}-${idx}`,
        label,
        type: val.startsWith('http') ? 'url' : 'text',
        value: val,
        resolvedPayload: val,
        selected: true,
      };
    });

    setItems((prev) => [...prev, ...parsed]);
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseAndAddLines(content);
    };
    reader.readAsText(file);
  };

  // Download Sample CSV Templates
  const handleDownloadTemplate = (type: 'restaurant' | 'wifi' | 'payments') => {
    let rows: string[] = [];
    let filename = '';

    if (type === 'restaurant') {
      filename = 'template-restaurant-tables.csv';
      rows = [
        'Label,Payload',
        'Bàn 01 - Tầng 1,https://menu.restaurant.vn/table/01',
        'Bàn 02 - Tầng 1,https://menu.restaurant.vn/table/02',
        'Bàn 03 - Tầng 1,https://menu.restaurant.vn/table/03',
        'Bàn 04 - Tầng 1,https://menu.restaurant.vn/table/04',
        'Bàn 05 - Tầng 1,https://menu.restaurant.vn/table/05',
        'Bàn VIP 01 - Tầng 2,https://menu.restaurant.vn/vip/01',
        'Bàn VIP 02 - Tầng 2,https://menu.restaurant.vn/vip/02',
      ];
    } else if (type === 'wifi') {
      filename = 'template-wifi-cards.csv';
      rows = [
        'Label,Payload',
        'Khu vực Cafe,WIFI:T:WPA;S:Cafe_FreeWifi;P:welcome2026;;',
        'Khu vực Lầu 1,WIFI:T:WPA;S:Floor1_HighSpeed;P:guest1234;;',
        'Khu vực Họp VIP,WIFI:T:WPA;S:MeetingRoom_VIP;P:VIPpass2026;;',
      ];
    } else {
      filename = 'template-payment-tags.csv';
      rows = [
        'Label,Payload',
        'Quầy Thu Ngân 01,00020101021138540010A00000072701240006970436011010293847560208QRIBFTTA53037045802VN5913NGUYEN VAN A6002VN62140810QUAY 01 THU6304856E',
        'Quầy Thu Ngân 02,00020101021138540010A00000072701240006970436011010293847560208QRIBFTTA53037045802VN5913NGUYEN VAN A6002VN62140810QUAY 02 THU6304856E',
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ZIP Export using JSZip
  const handleExportZIP = async () => {
    if (!isPro) {
      onOpenPro();
      return;
    }

    const selectedItems = items.filter((i) => i.selected);
    if (selectedItems.length === 0) return;

    setIsZipping(true);
    setZipProgress('Starting ZIP packaging...');

    try {
      const zip = new JSZip();
      const folder = zip.folder('qr-codes');

      const csvLines = [
        'Index,Label,Type,Payload,Filename',
        ...selectedItems.map(
          (item, idx) =>
            `${idx + 1},"${item.label.replace(/"/g, '""')}","${item.type}","${item.resolvedPayload.replace(/"/g, '""')}","qr_${idx + 1}_${item.label.replace(/[^a-z0-9]/gi, '_')}.png"`
        ),
      ];
      zip.file('index.csv', '\uFEFF' + csvLines.join('\n'));

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setZipProgress(`Rendering QR ${i + 1} of ${selectedItems.length}...`);

        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, item.resolvedPayload, {
          width: 1024,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });

        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const filename = `qr_${i + 1}_${item.label.replace(/[^a-z0-9]/gi, '_')}.png`;
        folder?.file(filename, base64Data, { base64: true });
      }

      setZipProgress('Compressing archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-tools-batch-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  const handlePrint = () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;
    onPrintBatch(selected);
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Bar - Clean non-wrapping layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button
            type="button"
            onClick={onBackToGenerator}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tx('Quay lại trình tạo', 'Back to Generator')}</span>
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Batch Generator & Multi-Print
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                isPro
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {isPro ? 'Pro Active' : 'Free Preview'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Create dozens of QR codes simultaneously, export as high-resolution ZIP, or print sheets.
          </p>
        </div>

        {/* Clean, Non-Wrapping Unified Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSequencer(!showSequencer)}
            className="h-9 px-3.5 text-xs sm:text-sm font-semibold text-neutral-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-300 rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Generate tables sequentially e.g. Table 01 to 30"
          >
            <Utensils className="w-4 h-4 text-amber-700" />
            <span>{tx('Tự động đánh số bàn', 'Auto-Sequence Tables')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedCount === 0}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg transition-all inline-flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-2xs hover:border-neutral-400 active:scale-[0.99]"
            title="Open print dialog with templates and layout options"
          >
            <Printer className="w-4 h-4 text-neutral-700" />
            <span>Print Sheets ({selectedCount})</span>
          </button>

          <button
            type="button"
            onClick={handleExportZIP}
            disabled={selectedCount === 0 || isZipping}
            className="h-9 px-4 text-xs sm:text-sm font-semibold bg-neutral-900 hover:bg-black text-white rounded-lg transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 shadow-xs active:scale-[0.99]"
            title="Export all selected QR codes as individual 1024px PNGs inside a ZIP"
          >
            <FileArchive className="w-4 h-4" />
            <span>{isZipping ? zipProgress : `Export ZIP (${selectedCount})`}</span>
            {!isPro && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
          </button>
        </div>
      </div>

      {/* Auto-Sequencer Drawer (1-Click Generator for Cafes & Restaurants) */}
      {showSequencer && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-700" />
              <span>{tx('Tự động đánh số bàn (Café / Nhà hàng)', 'Table Number Auto-Sequencer (Cafe / Restaurant)')}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowSequencer(false)}
              className="text-xs text-amber-700 hover:text-amber-900 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>

          <p className="text-xs text-amber-800/80">
            Automatically generates sequenced table records with unique menu URLs and table labels in 1 click.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Label Prefix
              </label>
              <input
                type="text"
                value={seqPrefix}
                onChange={(e) => setSeqPrefix(e.target.value)}
                placeholder="e.g. Bàn , Table "
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Number Range
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={seqFrom}
                  onChange={(e) => setSeqFrom(Number(e.target.value))}
                  className="w-14 h-8 px-2 bg-white border border-neutral-300 rounded-lg text-center"
                />
                <span className="text-neutral-400">to</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={seqTo}
                  onChange={(e) => setSeqTo(Number(e.target.value))}
                  className="w-14 h-8 px-2 bg-white border border-neutral-300 rounded-lg text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Zone / Floor (Optional)
              </label>
              <input
                type="text"
                value={seqZone}
                onChange={(e) => setSeqZone(e.target.value)}
                placeholder="e.g. Tầng 1, VIP"
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-lg"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2 text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={seqPadZeros}
                  onChange={(e) => setSeqPadZeros(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-900"
                />
                <span>{tx('Thêm số 0 (01, 02)', 'Zero-pad (01, 02)')}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
              Destination URL Pattern ({'{n}'} is replaced with table number)
            </label>
            <input
              type="text"
              value={seqUrlTemplate}
              onChange={(e) => setSeqUrlTemplate(e.target.value)}
              placeholder="https://menu.cafe.vn/table/{n}"
              className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-lg font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-amber-800">
              Preview 1st item: <strong>{seqPrefix}{seqPadZeros ? seqFrom.toString().padStart(2, '0') : seqFrom}{seqZone ? ` - ${seqZone}` : ''}</strong> → <span className="font-mono">{seqUrlTemplate.replace('{n}', seqPadZeros ? seqFrom.toString().padStart(2, '0') : seqFrom.toString())}</span>
            </span>

            <button
              type="button"
              onClick={handleGenerateSequence}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Generate {Math.max(1, seqTo - seqFrom + 1)} Table Cards
            </button>
          </div>
        </div>
      )}

      {/* Clear Format Explanation Guide */}
      <div className="p-4 bg-white border border-neutral-200/90 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5 text-blue-600" />
            <span>{tx('Định dạng đầu ra khi in', 'Print Output Formats')}</span>
          </span>
          <span className="text-[11px] text-neutral-400">
            Click any format below to preview in that template:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Card Stand */}
          <div
            onClick={handlePrint}
            className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 transition-all cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100">
                <Utensils className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-neutral-900">Table Tents</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              <strong>Bảng đặt bàn cafe / nhà hàng:</strong> Large foldable A5/A6 cards with Table #, Menu title, & Wi-Fi box.
            </p>
          </div>

          {/* Stickers */}
          <div
            onClick={handlePrint}
            className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 transition-all cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-100">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-neutral-900">Sticker Grid</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              <strong>Tem dán ly / bao bì:</strong> 9–16 small square stickers per sheet. Ideal for takeaway cups, bags, & packaging.
            </p>
          </div>

          {/* VietQR Stand */}
          <div
            onClick={handlePrint}
            className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 transition-all cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
                <CreditCard className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-neutral-900">Bank Stands</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              <strong>Bảng quầy thu ngân:</strong> Counter signs with Napas 247 logo, Account #, & beneficiary name.
            </p>
          </div>

          {/* Minimal Desk */}
          <div
            onClick={handlePrint}
            className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 transition-all cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-100">
                <LayoutTemplate className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-neutral-900">Desk Plaques</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              <strong>Bảng để bàn tối giản:</strong> Clean cards for reception desks, event check-ins, or conference rooms.
            </p>
          </div>
        </div>
      </div>

      {/* CSV Templates Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-neutral-200/90 rounded-xl text-xs shadow-2xs">
        <span className="font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-neutral-400" />
          <span>{tx('Mẫu CSV khởi đầu nhanh:', 'Quick Starter CSV Templates:')}</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownloadTemplate('restaurant')}
            className="px-2.5 py-1 text-xs bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-md transition-colors cursor-pointer"
          >
            Restaurant Tables (1-20)
          </button>
          <button
            type="button"
            onClick={() => handleDownloadTemplate('wifi')}
            className="px-2.5 py-1 text-xs bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-md transition-colors cursor-pointer"
          >
            Guest Wi-Fi Cards
          </button>
          <button
            type="button"
            onClick={() => handleDownloadTemplate('payments')}
            className="px-2.5 py-1 text-xs bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-md transition-colors cursor-pointer"
          >
            Payment Tags
          </button>
        </div>
      </div>

      {/* Import Box */}
      <div className="p-4 bg-white border border-neutral-200/90 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>{tx('Nhập CSV / Excel', 'CSV / Excel Import')}</span>
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-neutral-900 hover:underline font-medium cursor-pointer"
          >
            Or upload .csv file directly
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileDrop}
            className="hidden"
          />
        </div>

        <textarea
          rows={3}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={`Table 10, https://menu.restaurant.vn/table/10\nTable 11, https://menu.restaurant.vn/table/11\nOffice WiFi, WIFI:T:WPA;S:OfficeNet;P:Secret2026;;`}
          className="w-full p-2.5 bg-neutral-50/60 text-neutral-900 border border-neutral-200 rounded-lg text-xs font-mono placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
        />

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-neutral-500">
            Paste text from Excel, Google Sheets, or CSV file (Format: Label, Payload).
          </p>
          <button
            type="button"
            onClick={() => {
              parseAndAddLines(importText);
              setImportText('');
            }}
            disabled={!importText.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-black disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
          >
            Import Lines
          </button>
        </div>
      </div>

      {/* Batch Items Table */}
      <div className="border border-neutral-200/90 rounded-xl bg-white overflow-hidden shadow-2xs">
        {/* Table Header Bar */}
        <div className="p-3 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-neutral-500 hover:text-neutral-900 p-1 cursor-pointer"
            >
              {items.every((i) => i.selected) ? (
                <CheckSquare className="w-4 h-4 text-neutral-900" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span className="text-xs font-medium text-neutral-700">
              {selectedCount} of {items.length} items selected
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 px-2 py-1 rounded-md hover:bg-neutral-200/60 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tx('Thêm một mục', 'Add Single Item')}</span>
          </button>
        </div>

        {/* Rows */}
        <div className="divide-y divide-neutral-100 max-h-[460px] overflow-y-auto">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                item.selected ? 'bg-white' : 'bg-neutral-50/50 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="cursor-pointer text-neutral-500 hover:text-neutral-900"
                >
                  {item.selected ? (
                    <CheckSquare className="w-4 h-4 text-neutral-900" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <span className="font-mono text-neutral-400 tabular-nums w-6">
                  {(idx + 1).toString().padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) =>
                      setItems(
                        items.map((i) =>
                          i.id === item.id ? { ...i, label: e.target.value } : i
                        )
                      )
                    }
                    className="font-medium text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:bg-white px-1 py-0.5 rounded outline-none truncate"
                  />

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) =>
                        setItems(
                          items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  value: e.target.value,
                                  resolvedPayload: e.target.value,
                                }
                              : i
                          )
                        )
                      }
                      className="font-mono text-neutral-500 text-[11px] w-full bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:bg-white px-1 py-0.5 rounded outline-none truncate"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-neutral-400 hover:text-red-600 p-1 rounded-md cursor-pointer"
                  title="Remove row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
