import { Leaf } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionQuickLinks } from "./SectionQuickLinks";

const COMPANY_QUICK_LINKS = [
  { to: "/company/greeting", label: "인사말" },
  { to: "/company/history", label: "연혁" },
  { to: "/company/awards", label: "수상,인증" },
  { to: "/company/location", label: "오시는길" },
];

export function CompanyHistory() {
  const { data } = useCmsPage("company-history");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const mediaImage = getCmsMediaFileUrl(sections.historyImageMediaId ? Number(sections.historyImageMediaId) : null);
  const historyImage = mediaImage || "";
  const headerBannerImage =
    (typeof header.bannerImage === "string" && header.bannerImage) ||
    (typeof sections.headerBannerImage === "string" && sections.headerBannerImage) ||
    "";

  return (
    <div className="flex-1 bg-white flex flex-col">
      {/* Page Header Banner */}
      <div className="relative h-64 md:h-80 flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: headerBannerImage ? `url('${headerBannerImage}')` : "none",
          }}
        />
        <div className="absolute inset-0 bg-[#1A4D2E]/80 mix-blend-multiply" />
        
        <div className="relative z-10 text-center text-white px-6">
          <Leaf className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">연혁</h1>
          <p className="text-[#E8DFCA] text-lg">자연과 함께 걸어온 (주)산골의 발자취입니다.</p>
        </div>
      </div>
      <SectionQuickLinks items={COMPANY_QUICK_LINKS} />

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-32 w-full flex flex-col items-center">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-[#1A4D2E] mb-4">농업회사법인 (주)산골 연혁</h2>
          <p className="text-[#4F6F52] text-lg">
            2017년 설립부터 현재까지, 신뢰와 정직으로 성장해온 기록입니다.
          </p>
        </div>
        
        <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex justify-center">
          <ImageWithFallback
            src={historyImage}
            alt="농업법인 (주)산골 연혁 - 2017년 농업법인(주)산골 설립부터 2025년 직영점 및 가맹점 운영까지" 
            className="max-w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}