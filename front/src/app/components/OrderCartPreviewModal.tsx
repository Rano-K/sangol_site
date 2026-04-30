import { useEffect } from "react";
import { X } from "lucide-react";

type CartPreviewItem = {
  code: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

interface OrderCartPreviewModalProps {
  items: CartPreviewItem[];
  total: number;
  onClose: () => void;
  onConfirmOrder?: () => void;
  isSubmitting?: boolean;
}

export function OrderCartPreviewModal({
  items,
  total,
  onClose,
  onConfirmOrder,
  isSubmitting = false,
}: OrderCartPreviewModalProps) {
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
        <div className="bg-[#1A4D2E] text-white p-6 relative flex items-center justify-center border-b-[8px] border-[#4F6F52]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-extrabold">주문 내역</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAF7]">
          <div className="space-y-4">
            <div className="flex text-xs font-bold text-gray-400 border-b border-gray-200 pb-2">
              <span className="flex-1">품목명 (코드)</span>
              <span className="w-16 text-right">수량</span>
              <span className="w-24 text-right">금액</span>
            </div>

            {items.length === 0 ? (
              <div className="text-sm text-gray-500 py-8 text-center">담긴 상품이 없습니다.</div>
            ) : (
              items.map((item) => (
                <div key={item.code} className="flex text-sm items-start py-1">
                  <div className="flex-1 pr-2 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      [{item.code}] / {item.unit} / {item.price.toLocaleString()}원
                    </div>
                  </div>
                  <div className="w-16 text-right font-medium text-gray-600 pt-1">{item.quantity}</div>
                  <div className="w-24 text-right font-bold text-gray-800 pt-1">
                    {(item.price * item.quantity).toLocaleString()}원
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 border-t border-gray-200 border-dashed">
          <div className="flex justify-between items-end mb-6">
            <span className="text-lg font-bold text-gray-600">주문 총 금액</span>
            <span className="text-3xl font-extrabold text-[#1A4D2E]">{total.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-[#D2DAC7] text-[#4F6F52] text-lg font-bold rounded-xl transition-colors hover:bg-[#F4F7EF]"
            >
              닫기
            </button>
            {onConfirmOrder ? (
              <button
                type="button"
                onClick={onConfirmOrder}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-[#1A4D2E] hover:bg-[#123A21] text-white text-lg font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "주문 저장 중" : "주문 완료하기"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

