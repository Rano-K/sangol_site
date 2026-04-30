import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

type OrderedItem = {
  code: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

interface ReceiptModalProps {
  items: OrderedItem[];
  total: number;
  orderId?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReceiptModal({ items, total, orderId, onClose, onConfirm }: ReceiptModalProps) {
  const date = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#1A4D2E] text-white p-6 relative flex flex-col items-center justify-center border-b-[8px] border-[#4F6F52]">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <CheckCircle2 className="w-12 h-12 text-[#E8DFCA] mb-3" />
          <h2 className="text-2xl font-extrabold">주문이 완료되었습니다</h2>
          <p className="text-white/80 text-sm mt-1">
            {orderId ? `주문번호 #${orderId} · ` : ''}{date}
          </p>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAF7]">
          <div className="mb-4 text-center text-sm text-gray-500 font-medium border-b border-dashed border-gray-300 pb-4">
            [ 농업회사법인 (주)산골 가맹점 발주 내역 ]
          </div>
          
          <div className="space-y-4">
            {/* List Header */}
            <div className="flex text-xs font-bold text-gray-400 border-b border-gray-200 pb-2">
              <span className="flex-1">품목명 (코드)</span>
              <span className="w-16 text-right">수량</span>
              <span className="w-24 text-right">금액</span>
            </div>
            
            {/* List Items */}
            {items.map(item => (
              <div key={item.code} className="flex text-sm items-start py-1">
                <div className="flex-1 pr-2">
                  <div className="font-semibold text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-500">[{item.code}] / {item.unit} / {item.price.toLocaleString()}원</div>
                </div>
                <div className="w-16 text-right font-medium text-gray-600 pt-1">
                  {item.quantity}
                </div>
                <div className="w-24 text-right font-bold text-gray-800 pt-1">
                  {(item.price * item.quantity).toLocaleString()}원
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white p-6 border-t border-gray-200 border-dashed">
          <div className="flex justify-between items-end mb-6">
            <span className="text-lg font-bold text-gray-600">주문 총 금액</span>
            <span className="text-3xl font-extrabold text-[#1A4D2E]">{total.toLocaleString()}원</span>
          </div>
          <button
            onClick={onConfirm}
            className="w-full py-4 bg-[#1A4D2E] hover:bg-[#123A21] text-white text-lg font-bold rounded-xl transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
        
      </div>
    </div>
  );
}
