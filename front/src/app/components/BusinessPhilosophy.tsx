import { Leaf, Users, ShieldCheck } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCmsPage } from "../hooks/useCmsPage";
import { SectionQuickLinks } from "./SectionQuickLinks";

const BUSINESS_QUICK_LINKS = [
  { to: "/business/philosophy", label: "경영철학" },
  { to: "/business/vision", label: "비전" },
  { to: "/business/core-competence", label: "핵심역량" },
  { to: "/business/farm", label: "농장소개" },
];

export function BusinessPhilosophy() {
  const { data } = useCmsPage("business-philosophy");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, string>;
  const intro = (sections.intro ?? {}) as Record<string, string>;

  const defaultPhilosophies = [
    {
      title: "자연 그대로의 가치를 지킨다",
      description: "산골의 맑은 공기와 물을 먹고 자란 청정 임산물만을 고집하여, 자연이 주는 건강함 그대로를 고객의 식탁까지 전합니다.",
      icon: <Leaf className="w-8 h-8 text-[#4F6F52]" />,
      imageUrl: "https://images.unsplash.com/photo-1552248734-c547a6a264e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmlzdGluZSUyMG1vdW50YWluJTIwZm9yZXN0fGVufDF8fHx8MTc3MzU4NDc0Nnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      title: "사람과 자연의 조화",
      description: "자연을 훼손하지 않는 지속 가능한 농법을 연구하며, 인간과 자연이 함께 공존하고 상생하는 건강한 생태계를 만들어 갑니다.",
      icon: <Users className="w-8 h-8 text-[#4F6F52]" />,
      imageUrl: "https://images.unsplash.com/photo-1764918895542-b8c42d80fc6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cnVzdCUyMG5hdHVyZSUyMGhhbmRzfGVufDF8fHx8MTc3MzU4NDc0Nnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      title: "정직과 신뢰",
      description: "눈속임 없는 바른 공정과 철저한 품질 관리를 통해, 언제나 믿고 먹을 수 있는 최고의 프리미엄 브랜드로서의 책임을 다합니다.",
      icon: <ShieldCheck className="w-8 h-8 text-[#4F6F52]" />,
      imageUrl: "https://images.unsplash.com/photo-1760562232244-460858cca10b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtZXIlMjBob2xkaW5nJTIwaGFydmVzdHxlbnwxfHx8fDE3NzM1ODQ3NDV8MA&ixlib=rb-4.1.0&q=80&w=1080"
    }
  ];
  // 요구사항: admin에서는 “이미지만” 대체되도록 카드/텍스트/아이콘은 기본값 유지
  const cmsPhilosophies = Array.isArray(sections.philosophies) ? (sections.philosophies as Array<Partial<(typeof defaultPhilosophies)[number]>>) : [];
  const philosophies = defaultPhilosophies.map((base, idx) => {
    const cmsImg = cmsPhilosophies[idx]?.imageUrl;
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
        <div className="absolute inset-0 bg-[#1A4D2E]/85 mix-blend-multiply" />
        
        <div className="relative z-10 text-center text-white px-6">
          <Leaf className="w-8 h-8 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{header.title || "경영철학"}</h1>
          <p className="text-[#E8DFCA] text-lg">{header.subtitle || "농업회사법인 (주)산골이 추구하는 변하지 않는 가치"}</p>
        </div>
      </div>
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      <div className="site-container py-20 md:py-32 w-full flex flex-col gap-16">
        
        <div className="text-center max-w-3xl mx-auto mb-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A4D2E] mb-6 leading-tight">
            {(intro.title || "자연과 사람이 함께 만드는\n프리미엄 임산물").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="md:hidden" />
              </span>
            ))}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            {(intro.description || "(주)산골은 자연의 순리를 따르며, 바른 먹거리를 통해 고객의 건강한 삶과\n지속 가능한 미래를 책임집니다.").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="hidden md:block" />
              </span>
            ))}
          </p>
        </div>

        {/* Philosophy Grid (1x3 on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {philosophies.map((philosophy, index) => (
            <div 
              key={index}
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-[#E8DFCA]/50 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group flex flex-col h-full"
            >
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback 
                  src={philosophy.imageUrl} 
                  alt={philosophy.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                
                {/* Icon Circle */}
                <div className="absolute bottom-6 left-6 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  {philosophy.icon}
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-2xl font-extrabold text-[#1A4D2E] mb-4 break-keep leading-snug">
                  {philosophy.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-base">
                  {philosophy.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}