import { Sprout } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionQuickLinks } from "./SectionQuickLinks";

const BUSINESS_QUICK_LINKS = [
  { to: "/business/philosophy", label: "경영철학" },
  { to: "/business/vision", label: "비전" },
  { to: "/business/core-competence", label: "핵심역량" },
  { to: "/business/farm", label: "농장소개" },
];

export function BusinessFarm() {
  const { data } = useCmsPage("business-farm");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, string>;
  const body = (sections.body ?? {}) as Record<string, string>;
  const mediaImage = getCmsMediaFileUrl(
    sections.farmImageMediaId ? Number(sections.farmImageMediaId) : null
  );
  const farmImage = mediaImage || "";
  const headerBannerImage =
    (typeof header.bannerImage === "string" && header.bannerImage) ||
    (typeof sections.headerBannerImage === "string" && sections.headerBannerImage) ||
    "";

  return (
    <div className="flex-1 bg-[#FAFAF7] flex flex-col min-h-screen">
      {/* Header Banner */}
      <div className="relative h-64 md:h-80 flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: headerBannerImage ? `url('${headerBannerImage}')` : "none",
          }}
        />
        <div className="absolute inset-0 bg-[#1A4D2E]/80 mix-blend-multiply" />
        
        <div className="relative z-10 text-center text-white px-6">
          <Sprout className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{header.title || "농장 소개"}</h1>
          <p className="text-[#E8DFCA] text-lg">{header.subtitle || "자연 그대로의 방식을 고집하는 산골의 청정 농장"}</p>
        </div>
      </div>
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      <div className="site-container py-20 md:py-32 w-full flex flex-col items-center gap-12 md:gap-16">
        
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A4D2E] mb-6 leading-tight">
            {(body.title || "자연과 사람이 피워낸\n건강한 먹거리").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                {idx === 0 ? <br className="md:hidden" /> : null}
              </span>
            ))}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            {(body.description ||
              "농업 법인(주)산골은 청정 두메산골에서 가장 친환경적인 방식으로 재배하며, 정직과 신뢰를 바탕으로 자연의 가치를 지키고 건강과 행복을 더합니다.")
              .split("\n")
              .map((line, idx) => (
                <span key={idx}>
                  {line}
                  {idx === 0 ? <br className="hidden md:block" /> : null}
                </span>
              ))}
          </p>
        </div>

        {/* Provided Banner Image */}
        <div className="site-container w-full rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-[#E8DFCA]/60">
          <ImageWithFallback
            src={farmImage}
            alt="농업회사 법인 (주)산골 농장소개 배너"
            className="w-full h-auto object-cover"
          />
        </div>
        
      </div>
    </div>
  );
}