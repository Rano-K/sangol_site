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

const cmsStr = (value: unknown) => String(value ?? "").trim();
const COMPETENCY_ICONS = [Mountain, Map, Sprout, ShieldCheck];

export function BusinessCompetency() {
  const { data } = useCmsPage("business-core-competence");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const intro = (sections.intro ?? {}) as Record<string, unknown>;
  const headerTitle = cmsStr(header.title);
  const headerSubtitle = cmsStr(header.subtitle);
  const introTitle = cmsStr(intro.title);
  const introDescription = cmsStr(intro.description);
  const headerBannerImage = cmsStr(header.bannerImage);

  const competencies = (Array.isArray(sections.competencies) ? sections.competencies : [])
    .map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const title = cmsStr(row.title);
      const description = cmsStr(row.description);
      const imageUrl = cmsStr(row.imageUrl);
      const num = cmsStr(row.num) || String(index + 1).padStart(2, "0");
      if (!title && !description && !imageUrl) return null;
      const Icon = COMPETENCY_ICONS[index % COMPETENCY_ICONS.length];
      return { num, title, description, imageUrl, icon: <Icon className="w-6 h-6 text-[#1A4D2E]" /> };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const hasHeader = Boolean(headerTitle || headerSubtitle);
  const hasIntro = Boolean(introTitle || introDescription);

  return (
    <div className="flex-1 bg-[#FAFAF7] flex flex-col min-h-screen">
      {hasHeader ? (
      <div className="relative h-64 md:h-80 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: headerBannerImage ? `url('${headerBannerImage}')` : "none",
          }}
        />
        <div className="absolute inset-0 bg-[#1A4D2E]/80 mix-blend-multiply" />

        <div className="relative z-10 text-center text-white px-6">
          <Zap className="w-8 h-8 mx-auto mb-4 opacity-80" />
          {headerTitle ? (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{headerTitle}</h1>
          ) : null}
          {headerSubtitle ? <p className="text-[#E8DFCA] text-lg">{headerSubtitle}</p> : null}
        </div>
      </div>
      ) : null}
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      {hasIntro || competencies.length > 0 ? (
      <div className="site-container py-20 md:py-32 w-full flex flex-col gap-16">
        {hasIntro ? (
        <div className="text-center max-w-3xl mx-auto mb-8">
          {introTitle ? (
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A4D2E] mb-6 leading-tight">
            {introTitle.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="md:hidden" />
              </span>
            ))}
          </h2>
          ) : null}
          {introDescription ? (
          <p className="text-gray-600 text-lg leading-relaxed">
            {introDescription.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="hidden md:block" />
              </span>
            ))}
          </p>
          ) : null}
        </div>
        ) : null}

        {competencies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {competencies.map((comp, index) => (
            <div
              key={index}
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-[#E8DFCA]/60 hover:shadow-xl transition-all duration-300 group flex flex-col sm:flex-row h-full"
            >
              {comp.imageUrl ? (
              <div className="relative w-full sm:w-[42%] shrink-0 h-56 sm:h-64 lg:h-72 overflow-hidden bg-[#E8DFCA]">
                <ImageWithFallback
                  src={comp.imageUrl}
                  alt={comp.title.replace("\n", " ")}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#1A4D2E]/10 group-hover:bg-transparent transition-colors duration-300" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-[#1A4D2E] font-black text-xl shadow-md">
                  {comp.num}
                </div>
              </div>
              ) : null}

              <div className="p-8 sm:p-10 flex-1 min-w-0 flex flex-col justify-center bg-white relative">
                <div className="w-12 h-12 rounded-xl bg-[#FAFAF7] flex items-center justify-center mb-6 border border-[#E8DFCA]">
                  {comp.icon}
                </div>

                {comp.title ? (
                <h3 className="text-2xl font-extrabold text-[#1A4D2E] mb-4 whitespace-pre-line leading-snug">
                  {comp.title}
                </h3>
                ) : null}

                {comp.description ? (
                <p className="text-gray-600 leading-relaxed text-base">{comp.description}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
