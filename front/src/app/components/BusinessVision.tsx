import { Target, MapPin, Globe, TreePine } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionQuickLinks } from "./SectionQuickLinks";

const BUSINESS_QUICK_LINKS = [
  { to: "/business/philosophy", label: "경영철학" },
  { to: "/business/vision", label: "비전" },
  { to: "/business/core-competence", label: "핵심역량" },
  { to: "/business/farm", label: "농장소개" },
];

export function BusinessVision() {
  const { data } = useCmsPage("business-vision");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const mediaImage = getCmsMediaFileUrl(
    sections.visionImageMediaId ? Number(sections.visionImageMediaId) : null
  );
  const visionImage = mediaImage || "";
  const headerBannerImage =
    (typeof header.bannerImage === "string" && header.bannerImage) ||
    (typeof sections.headerBannerImage === "string" && sections.headerBannerImage) ||
    "";

  const visionPillars = [
    {
      step: "01",
      title: "두메산골 고냉지 임산물,\n농산물 브랜드",
      description: "청정 자연을 품은 고냉지에서 자란 프리미엄 임산물과 농산물을 발굴하여, 소비자에게 가장 신선하고 건강한 먹거리를 제공하는 대표 브랜드로 도약합니다.",
      icon: <MapPin className="w-8 h-8 text-[#E6631E]" />,
      colorClass: "bg-[#E6631E]/10 border-[#E6631E]/20 text-[#E6631E]"
    },
    {
      step: "02",
      title: "K-푸드 프리미엄\n임산물 브랜드 구축",
      description: "우수한 우리 임산물의 본연의 가치를 재조명하고 현대적 감각을 더해, 국내를 넘어 세계 시장에서도 인정받는 K-푸드 프리미엄 명품 브랜드로 성장합니다.",
      icon: <Globe className="w-8 h-8 text-[#7CB926]" />,
      colorClass: "bg-[#7CB926]/10 border-[#7CB926]/20 text-[#7CB926]"
    },
    {
      step: "03",
      title: "지속가능한 체험, 가공,\n관광 농업",
      description: "단순 1차 생산을 넘어 가공, 체험, 관광을 융합한 6차 산업 생태계를 실현하며, 지역 사회와 상생하고 환경을 생각하는 지속 가능한 미래 농업을 이끕니다.",
      icon: <TreePine className="w-8 h-8 text-[#EBB41A]" />,
      colorClass: "bg-[#EBB41A]/10 border-[#EBB41A]/20 text-[#EBB41A]"
    }
  ];

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
        <div className="absolute inset-0 bg-[#1A4D2E]/85 mix-blend-multiply" />
        
        <div className="relative z-10 text-center text-white px-6">
          <Target className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">비전</h1>
          <p className="text-[#E8DFCA] text-lg">(주)산골이 만들어가는 숲과 사람의 지속가능한 내일</p>
        </div>
      </div>
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      <div className="max-w-7xl mx-auto px-6 py-20 md:py-32 w-full flex flex-col gap-24">
        
        {/* Intro Text */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A4D2E] mb-6 leading-tight">
            세계를 무대로 도약하는<br className="md:hidden" /> K-포레스트 브랜드
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            자연이 내어준 소중한 선물에 헌신적인 연구와 진정성을 더하여,<br className="hidden md:block" />
            대한민국을 넘어 세계인에게 사랑받는 종합 임산물 브랜드로 자리매김하겠습니다.
          </p>
        </div>

        {/* Vision Graphic from Figma */}
        <div className="w-full flex justify-center items-center py-8 bg-white rounded-3xl shadow-sm border border-[#E8DFCA]/60">
          <div className="relative w-full max-w-4xl p-4 md:p-8">
            <ImageWithFallback
              src={visionImage}
              alt="산골 비전: 고냉지 브랜드, K-푸드 프리미엄 브랜드, 지속가능한 체험 관광 농업" 
              className="w-full h-auto object-contain mx-auto mix-blend-multiply"
            />
          </div>
        </div>

        {/* Vision Detail Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {visionPillars.map((pillar, index) => (
            <div 
              key={index}
              className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#E8DFCA]/50 flex flex-col hover:shadow-xl transition-shadow duration-300 relative overflow-hidden"
            >
              {/* Background Accent */}
              <div className={`absolute top-0 left-0 w-full h-2 ${pillar.colorClass.split(' ')[0].replace('/10', '')}`} />
              
              <div className="flex justify-between items-start mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${pillar.colorClass}`}>
                  {pillar.icon}
                </div>
                <span className={`text-4xl font-black opacity-20 ${pillar.colorClass.split(' ').find(c => c.startsWith('text-'))}`}>
                  {pillar.step}
                </span>
              </div>
              
              <h3 className="text-2xl font-extrabold text-[#1A4D2E] mb-6 whitespace-pre-line leading-snug">
                {pillar.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed flex-1 text-base">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}