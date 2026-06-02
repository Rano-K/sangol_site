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

const cmsStr = (value: unknown) => String(value ?? "").trim();

const PILLAR_STYLES = [
  {
    icon: <MapPin className="w-8 h-8 text-[#E6631E]" />,
    colorClass: "bg-[#E6631E]/10 border-[#E6631E]/20 text-[#E6631E]",
    accent: "bg-[#E6631E]",
  },
  {
    icon: <Globe className="w-8 h-8 text-[#7CB926]" />,
    colorClass: "bg-[#7CB926]/10 border-[#7CB926]/20 text-[#7CB926]",
    accent: "bg-[#7CB926]",
  },
  {
    icon: <TreePine className="w-8 h-8 text-[#EBB41A]" />,
    colorClass: "bg-[#EBB41A]/10 border-[#EBB41A]/20 text-[#EBB41A]",
    accent: "bg-[#EBB41A]",
  },
];

export function BusinessVision() {
  const { data } = useCmsPage("business-vision");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const headerTitle = cmsStr(header.title);
  const headerSubtitle = cmsStr(header.subtitle);
  const mediaImage = getCmsMediaFileUrl(
    sections.visionImageMediaId ? Number(sections.visionImageMediaId) : null
  );
  const visionImage = mediaImage || "";
  const headerBannerImage = cmsStr(header.bannerImage ?? sections.headerBannerImage);

  const visionPillars = (Array.isArray(sections.visionPillars) ? sections.visionPillars : [])
    .map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const title = cmsStr(row.title);
      const description = cmsStr(row.description);
      const step = cmsStr(row.step) || String(index + 1).padStart(2, "0");
      if (!title && !description) return null;
      const style = PILLAR_STYLES[index % PILLAR_STYLES.length];
      return { step, title, description, ...style };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const hasHeader = Boolean(headerTitle || headerSubtitle);
  const hasContent = Boolean(visionImage) || visionPillars.length > 0;

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
        <div className="absolute inset-0 bg-[#1A4D2E]/85 mix-blend-multiply" />

        <div className="relative z-10 text-center text-white px-6">
          <Target className="w-8 h-8 mx-auto mb-4 opacity-80" />
          {headerTitle ? (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{headerTitle}</h1>
          ) : null}
          {headerSubtitle ? <p className="text-[#E8DFCA] text-lg">{headerSubtitle}</p> : null}
        </div>
      </div>
      ) : null}
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      {hasContent ? (
      <div className="site-container py-20 md:py-32 w-full flex flex-col gap-24">
        {visionImage ? (
        <div className="w-full flex justify-center items-center py-8 bg-white rounded-3xl shadow-sm border border-[#E8DFCA]/60">
          <div className="relative w-full max-w-4xl p-4 md:p-8">
            <ImageWithFallback
              src={visionImage}
              alt=""
              className="w-full h-auto object-contain mx-auto mix-blend-multiply"
            />
          </div>
        </div>
        ) : null}

        {visionPillars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {visionPillars.map((pillar, index) => (
            <div
              key={index}
              className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#E8DFCA]/50 flex flex-col hover:shadow-xl transition-shadow duration-300 relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-2 ${pillar.accent}`} />

              <div className="flex justify-between items-start mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${pillar.colorClass}`}>
                  {pillar.icon}
                </div>
                <span className={`text-4xl font-black opacity-20 ${pillar.colorClass.split(" ").find((c) => c.startsWith("text-"))}`}>
                  {pillar.step}
                </span>
              </div>

              {pillar.title ? (
              <h3 className="text-2xl font-extrabold text-[#1A4D2E] mb-6 whitespace-pre-line leading-snug">
                {pillar.title}
              </h3>
              ) : null}

              {pillar.description ? (
              <p className="text-gray-600 leading-relaxed flex-1 text-base">{pillar.description}</p>
              ) : null}
            </div>
          ))}
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
