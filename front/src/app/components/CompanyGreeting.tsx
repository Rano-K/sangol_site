import { Leaf, Quote } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionQuickLinks } from "./SectionQuickLinks";

const COMPANY_QUICK_LINKS = [
  { to: "/company/greeting", label: "인사말" },
  { to: "/company/history", label: "연혁" },
  { to: "/company/awards", label: "수상,인증" },
  { to: "/company/location", label: "오시는길" },
];

export function CompanyGreeting() {
  const { data } = useCmsPage("company-greeting");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const headerTitle = (typeof sections.headerTitle === "string" ? sections.headerTitle : null) || "인사말";
  const headerSubtitle =
    (typeof sections.headerSubtitle === "string" ? sections.headerSubtitle : null) ||
    "자연의 가치를 지키는 농업법인 (주)산골입니다.";
  const headerBannerImage =
    (typeof header.bannerImage === "string" && header.bannerImage) ||
    (typeof sections.headerBannerImage === "string" && sections.headerBannerImage) ||
    "";
  const mediaImage = getCmsMediaFileUrl(sections.mainImageMediaId ? Number(sections.mainImageMediaId) : null);
  const heroImage = mediaImage || "";
  const messageTitle =
    (typeof sections.messageTitle === "string" ? sections.messageTitle : null) ||
    "신뢰로 키우고,\n명품으로 보답하겠습니다.";

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
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{headerTitle}</h1>
          <p className="text-[#E8DFCA] text-lg">{headerSubtitle}</p>
        </div>
      </div>
      <SectionQuickLinks items={COMPANY_QUICK_LINKS} />

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-20 md:py-32 w-full flex flex-col md:flex-row gap-16 items-start">
        
        {/* Left Side: Photo */}
        <div className="w-full md:w-5/12 shrink-0">
          <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3] md:aspect-[3/4]">
            <ImageWithFallback
              src={heroImage} 
              alt="농업법인 (주)산골" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[6px] border-[#1A4D2E]/10 rounded-2xl pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Text Message */}
        <div className="w-full md:w-7/12 flex flex-col justify-center">
          <Quote className="w-12 h-12 text-[#E8DFCA] mb-8" />
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A4D2E] mb-10 leading-tight">
            {messageTitle.split("\n")[0]}
            <br className="hidden md:block" />
            <span className="text-[#4F6F52]">{messageTitle.split("\n")[1] || ""}</span>
          </h2>
          
          <div className="space-y-6 text-[#4F6F52] text-[17px] leading-[1.8] font-medium tracking-wide">
            <p className="text-xl font-bold text-[#1A4D2E]">
              안녕하십니까. 농업법인 (주)산골 대표이사 정현철입니다.
            </p>
            
            <p>
              저는 오랜 금융기관 생활을 통해 삶에서 가장 중요한 가치는 <strong className="text-[#1A4D2E]">"신뢰"</strong>임을 배웠습니다. 은퇴 후 고향인 두메산골로 돌아와 농업인의 길을 걷게 된 것도, 바로 그 신뢰를 지켜내기 위함이었습니다.
            </p>
            
            <p>
              농업에서 신뢰란 곧 고객이 믿고 선택할 수 있는 품질이며, 이는 곧 <strong className="text-[#1A4D2E]">"명품"</strong>으로 이어집니다. 강원도 화천 깊은 산골의 맑은 공기와 청정 토양에서 자란 산양삼, 산더덕, 표고버섯 등은 자연의 선물과 저희의 정성이 더해져, 명실상부한 명품으로 자리매김하고 있습니다.
            </p>
            
            <p>
              앞으로도 (주)산골은 고객 여러분께 다른 어디에서도 경험할 수 없는 최상의 농·임산물을 제공하기 위해 땀과 열정을 다할 것입니다. 신뢰로 키우고, 명품으로 보답하는 (주)산골을 기억해 주시기 바랍니다.
            </p>
            
            <div className="pt-10 text-right">
              <p className="text-gray-500 mb-2">감사합니다.</p>
              <p className="text-xl font-bold text-[#1A4D2E]">
                농업 법인회사 (주)산골 임직원 일동
              </p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}