import { Mountain, Map, Sprout, ShieldCheck, Zap } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCmsPage } from "../hooks/useCmsPage";
import { SectionQuickLinks } from "./SectionQuickLinks";

const BUSINESS_QUICK_LINKS = [
  { to: "/business/philosophy", label: "경영철학" },
  { to: "/business/vision", label: "비전" },
  { to: "/business/core-competence", label: "핵심역량" },
  { to: "/business/farm", label: "농장소개" },
];

export function BusinessCompetency() {
  const { data } = useCmsPage("business-core-competence");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, string>;
  const intro = (sections.intro ?? {}) as Record<string, string>;

  const defaultCompetencies = [
    {
      num: "01",
      title: "청정 원산지 경쟁력",
      description: "오염되지 않은 천혜의 자연환경에서 자라나 임산물 본연의 깊고 진한 맛과 향을 자랑합니다.",
      icon: <Mountain className="w-6 h-6 text-[#1A4D2E]" />,
      imageUrl: "https://images.unsplash.com/photo-1598768539067-5bb6c024a1e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmlzdGluZSUyMG1vdW50YWluJTIwdmFsbGV5fGVufDF8fHx8MTc3MzU4NTExMnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      num: "02",
      title: "두메산골 고냉지에서\n자란 K-푸드",
      description: "큰 일교차와 맑은 바람이 빚어낸 고랭지 특유의 탁월한 품질로 세계인의 입맛을 사로잡습니다.",
      icon: <Map className="w-6 h-6 text-[#1A4D2E]" />,
      imageUrl: "https://images.unsplash.com/photo-1754810940745-25668d27581e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBhZ3JpY3VsdHVyZSUyMG1vdW50YWlufGVufDF8fHx8MTc3MzU4NTExMnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      num: "03",
      title: "친환경 유기농 재배 기술",
      description: "화학비료 없이 자연과 공존하는 생태 농법을 고집하여 땅의 기운을 살리고 건강함을 더합니다.",
      icon: <Sprout className="w-6 h-6 text-[#1A4D2E]" />,
      imageUrl: "https://images.unsplash.com/photo-1763844599737-be3850c60cea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmdhbmljJTIwZmFybWluZyUyMHNvaWwlMjBoYW5kc3xlbnwxfHx8fDE3NzM1ODUxMTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      num: "04",
      title: "프리미엄 임산물\n품질관리",
      description: "수확부터 가공, 포장에 이르기까지 엄격한 검수 기준을 적용해 최고만을 선별합니다.",
      icon: <ShieldCheck className="w-6 h-6 text-[#1A4D2E]" />,
      imageUrl: "https://images.unsplash.com/photo-1758533696874-587c4e62940c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxxdWFsaXR5JTIwaW5zcGVjdGlvbiUyMGhhcnZlc3R8ZW58MXx8fHwxNzczNTg1MTEyfDA&ixlib=rb-4.1.0&q=80&w=1080"
    }
  ];
  // 요구사항: admin에서는 “이미지만” 대체되도록 카드/텍스트/정렬은 기본값 유지
  const cmsCompetencies = Array.isArray(sections.competencies)
    ? (sections.competencies as Array<Partial<(typeof defaultCompetencies)[number]>>)
    : [];
  const competencies = defaultCompetencies.map((base, idx) => {
    const cmsImg = cmsCompetencies[idx]?.imageUrl;
    return {
      ...base,
      imageUrl: typeof cmsImg === "string" && cmsImg ? cmsImg : base.imageUrl,
    };
  });

  return (
    <div className="flex-1 bg-[#FAFAF7] flex flex-col min-h-screen">
      {/* Header Banner */}
      <div className="relative h-64 md:h-80 flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: header.bannerImage ? `url('${header.bannerImage}')` : 'none',
        }}
        />
        <div className="absolute inset-0 bg-[#1A4D2E]/80 mix-blend-multiply" />
        
        <div className="relative z-10 text-center text-white px-6">
          <Zap className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{header.title || "핵심 역량"}</h1>
          <p className="text-[#E8DFCA] text-lg">{header.subtitle || "자연이 허락한 최고의 재료와 깐깐한 고집이 만든 자부심"}</p>
        </div>
      </div>
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      <div className="site-container py-20 md:py-32 w-full flex flex-col gap-16">
        
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A4D2E] mb-6 leading-tight">
            {(intro.title || "자연과 사람이 피워낸\n프리미엄의 완성").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="md:hidden" />
              </span>
            ))}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            {(intro.description || "(주)산골은 깨끗한 자연이 주는 잠재력에 타협 없는 기술력과 관리 시스템을 더해,\n독보적인 프리미엄 임산물의 새로운 기준을 제시합니다.").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="hidden md:block" />
              </span>
            ))}
          </p>
        </div>

        {/* Competencies Grid (2x2 on desktop, 1x4 on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {competencies.map((comp, index) => (
            <div 
              key={index}
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-[#E8DFCA]/60 hover:shadow-xl transition-all duration-300 group flex flex-col sm:flex-row h-full"
            >
              {/* Image Section — 카드별 동일 크기 (01·02 기준) */}
              <div className="relative w-full sm:w-[42%] shrink-0 h-56 sm:h-64 lg:h-72 overflow-hidden bg-[#E8DFCA]">
                <ImageWithFallback 
                  src={comp.imageUrl} 
                  alt={comp.title.replace('\n', ' ')}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#1A4D2E]/10 group-hover:bg-transparent transition-colors duration-300" />
                
                {/* Number Badge overlayed on image */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-[#1A4D2E] font-black text-xl shadow-md">
                  {comp.num}
                </div>
              </div>
              
              {/* Content Section */}
              <div className="p-8 sm:p-10 flex-1 min-w-0 flex flex-col justify-center bg-white relative">
                <div className="w-12 h-12 rounded-xl bg-[#FAFAF7] flex items-center justify-center mb-6 border border-[#E8DFCA]">
                  {comp.icon}
                </div>
                
                <h3 className="text-2xl font-extrabold text-[#1A4D2E] mb-4 whitespace-pre-line leading-snug">
                  {comp.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed text-base">
                  {comp.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}