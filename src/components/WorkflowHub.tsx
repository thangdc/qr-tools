import React from 'react';
import { ArrowRight, CalendarCheck, Package, Boxes, Home, WalletCards, Printer, Wrench, Settings2 } from 'lucide-react';

interface WorkflowHubProps {
  onOpenCheckin: () => void;
  onOpenBulkPrint: () => void;
  onOpenAssets: () => void;
  onOpenInventory: () => void;
  onOpenRooms: () => void;
  onOpenPayment: () => void;
  onOpenEquipmentMaintenance: () => void;
  onOpenConfiguration: (workflowId: string) => void;
}

const workflows = [
  {
    id: 'checkin',
    icon: CalendarCheck,
    title: 'Điểm danh / Check-in',
    description: 'Danh sách → QR → quét liên tục → ghi nhận thời gian → xuất kết quả.',
    status: 'active',
  },
  {
    id: 'bulk-print',
    icon: Printer,
    title: 'Tạo QR hàng loạt & In',
    description: 'Excel → tạo nhiều mã QR → chọn mẫu → in tem hoặc thẻ.',
    status: 'active',
  },
  {
    id: 'assets',
    icon: Package,
    title: 'Quản lý tài sản',
    description: 'Dán QR lên tài sản → quét để tra cứu và ghi nhận kiểm kê.',
    status: 'active',
  },
  {
    id: 'inventory',
    icon: Boxes,
    title: 'Kiểm kê hàng hóa',
    description: 'Quét từng mã → ghi nhận số lượng → đối chiếu và xuất kết quả.',
    status: 'active',
  },
  {
    id: 'rooms',
    icon: Home,
    title: 'Quản lý phòng / căn hộ',
    description: 'Mỗi phòng một QR → tra cứu thông tin và các khoản cần xử lý.',
    status: 'active',
  },
  {
    id: 'payment',
    icon: WalletCards,
    title: 'Thu tiền / Thanh toán',
    description: 'Tạo QR thanh toán → khách quét → theo dõi và đối soát.',
    status: 'active',
  },
  {
    id: 'equipment-maintenance',
    icon: Wrench,
    title: 'Bảo trì thiết bị',
    description: 'Excel → lưu thiết bị → tạo QR → quét để tra cứu và ghi nhận bảo trì.',
    status: 'active',
  },
] as const;

export const WorkflowHub: React.FC<WorkflowHubProps> = ({ onOpenCheckin, onOpenBulkPrint, onOpenAssets, onOpenInventory, onOpenRooms, onOpenPayment, onOpenEquipmentMaintenance, onOpenConfiguration }) => (
  <div className="w-full max-w-5xl mx-auto space-y-8">
    <div className="pb-5 border-b border-neutral-200">
      <div className="flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">Workflows</h1>
        <span className="text-[11px] font-mono uppercase bg-blue-50 px-2 py-0.5 rounded text-blue-700">Thực tế</span>
      </div>
      <p className="text-xs sm:text-sm text-neutral-500 mt-1">
        Chọn công việc bạn cần làm. QR Tools đã thiết kế sẵn quy trình để bạn chỉ việc nhập dữ liệu và sử dụng.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {workflows.map(({ id, icon: Icon, title, description, status }) => {
        const active = status === 'active';
        return (
          <article
            key={title}
            className={`relative rounded-2xl border p-5 transition-all ${
              active
                ? 'border-blue-200 bg-white shadow-sm hover:shadow-md'
                : 'border-neutral-200 bg-neutral-50/60'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
              active ? 'bg-blue-50 text-blue-700' : 'bg-white text-neutral-500 border border-neutral-200'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
            <p className="text-xs leading-5 text-neutral-500 mt-1.5 min-h-10">{description}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              {active ? (
                <button
                  type="button"
                  onClick={title === 'Điểm danh / Check-in' ? onOpenCheckin : title === 'Tạo QR hàng loạt & In' ? onOpenBulkPrint : title === 'Quản lý tài sản' ? onOpenAssets : title === 'Kiểm kê hàng hóa' ? onOpenInventory : title === 'Quản lý phòng / căn hộ' ? onOpenRooms : title === 'Thu tiền / Thanh toán' ? onOpenPayment : onOpenEquipmentMaintenance}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-black cursor-pointer"
                >
                  Bắt đầu <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="inline-flex items-center h-7 px-2.5 rounded-md bg-white border border-neutral-200 text-[11px] font-semibold text-neutral-500">
                  Sắp ra mắt
                </span>
              )}
              {active && <button type="button" data-testid={"configure-workflow-" + id} onClick={() => onOpenConfiguration(id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Settings2 className="h-3.5 w-3.5" /> Cấu hình</button>}
            </div>
          </article>
        );
      })}
    </div>

    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-neutral-900">Một bộ workflow, nhiều công việc</h2>
      <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 leading-6">
        Các workflow mới sẽ được bổ sung dần dựa trên nhu cầu thực tế. Bạn không cần tự xây quy trình từ đầu.
      </p>
    </div>
  </div>
);
