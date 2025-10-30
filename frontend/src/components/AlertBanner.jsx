import React from "react";

const AlertBanner = ({ open, title, desc, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[1000] w-[min(92vw,740px)] -translate-x-1/2">
      <div className="rounded-xl border border-red-300 bg-gradient-to-r from-red-50 to-red-100/90 backdrop-blur p-5 text-red-800 shadow-xl relative">
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none mt-0.5">⚠️</div>
          <div className="flex-1">
            <p className="font-bold text-[16px]">{title || "안내"}</p>
            {desc && <p className="text-sm mt-1 leading-relaxed">{desc}</p>}
          </div>

          {/* 닫기 버튼 - 오른쪽 상단 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 px-3 py-1.5 text-[13px] font-semibold text-red-700 bg-white/70 border border-red-200 rounded-md shadow-sm hover:bg-red-100 hover:text-red-800 transition-all"
            aria-label="닫기"
            title="닫기"
          >
            닫기 ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;

