import { Leaf, Award } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionQuickLinks } from "./SectionQuickLinks";

const COMPANY_QUICK_LINKS = [
  { to: "/company/greeting", label: "인사말" },
  { to: "/company/history", label: "연혁" },
  { to: "/company/awards", label: "수상,인증" },
  { to: "/company/location", label: "오시는길" },
];

export function CompanyAwards() {
  const { data } = useCmsPage("company-awards");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, string>;
  const body = (sections.body ?? {}) as Record<string, string>;
  const certMediaIds = Array.isArray(sections.certMediaIds) ? sections.certMediaIds : [];
  const resolveCertMediaUrl = (val: unknown): string => {
    const num = typeof val === "string" || typeof val === "number" ? Number(val) : NaN;
    if (!Number.isFinite(num) || num <= 0) return "";
    return getCmsMediaFileUrl(num) || "";
  };
  const certImages = [
    resolveCertMediaUrl(certMediaIds[0] ?? sections.cert1MediaId),
    resolveCertMediaUrl(certMediaIds[1] ?? sections.cert2MediaId),
    resolveCertMediaUrl(certMediaIds[2] ?? sections.cert3MediaId),
  ];
  const headerBannerImage =
    (typeof header.bannerImage === "string" && header.bannerImage) ||
    (typeof sections.headerBannerImage === "string" && sections.headerBannerImage) ||
    "";

  return (
    <div className="flex-1 bg-[#FAFAF7] flex flex-col">
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
          <Award className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{header.title || "수상 및 인증"}</h1>
          <p className="text-[#E8DFCA] text-lg">{header.subtitle || "엄격한 기준을 통과한 산골의 자부심입니다."}</p>
        </div>
      </div>
      <SectionQuickLinks items={COMPANY_QUICK_LINKS} />

      {/* Main Content Area */}
      <div className="site-container py-16 md:py-24 w-full flex flex-col items-center">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-[#1A4D2E] mb-4">{body.title || "국가가 인정한 프리미엄 임산물"}</h2>
          <p className="text-[#4F6F52] text-lg">
            {body.subtitle || "청정 숲에서 자란 우수한 품질을 증명하는 인증 내역과 혜택 안내입니다."}
          </p>
        </div>
        
        <div className="w-full flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-start">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition-shadow h-full">
              <ImageWithFallback
                src={certImages[0]}
                alt="임산물 국가통합브랜드 지정기업" 
                className="w-full h-auto object-contain"
              />
            </div>
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition-shadow h-full">
              <ImageWithFallback
                src={certImages[1]}
                alt="임산물 프리미엄 브랜드 지정기업" 
                className="w-full h-auto object-contain"
              />
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition-shadow h-full">
              <ImageWithFallback
                src={certImages[2]}
                alt="산골 혜택 및 출하 시기 안내" 
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}