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

const cmsStr = (value: unknown) => String(value ?? "").trim();
const PHILOSOPHY_ICONS = [Leaf, Users, ShieldCheck];

export function BusinessPhilosophy() {
  const { data } = useCmsPage("business-philosophy");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const intro = (sections.intro ?? {}) as Record<string, unknown>;
  const headerTitle = cmsStr(header.title);
  const headerSubtitle = cmsStr(header.subtitle);
  const introTitle = cmsStr(intro.title);
  const introDescription = cmsStr(intro.description);
  const headerBannerImage = cmsStr(header.bannerImage);

  const philosophies = (Array.isArray(sections.philosophies) ? sections.philosophies : [])
    .map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const title = cmsStr(row.title);
      const description = cmsStr(row.description);
      const imageUrl = cmsStr(row.imageUrl);
      if (!title && !description && !imageUrl) return null;
      const Icon = PHILOSOPHY_ICONS[index % PHILOSOPHY_ICONS.length];
      return { title, description, imageUrl, icon: <Icon className="w-8 h-8 text-[#4F6F52]" /> };
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
        <div className="absolute inset-0 bg-[#1A4D2E]/85 mix-blend-multiply" />

        <div className="relative z-10 text-center text-white px-6">
          <Leaf className="w-8 h-8 mx-auto mb-4 opacity-80" />
          {headerTitle ? (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{headerTitle}</h1>
          ) : null}
          {headerSubtitle ? <p className="text-[#E8DFCA] text-lg">{headerSubtitle}</p> : null}
        </div>
      </div>
      ) : null}
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      {hasIntro || philosophies.length > 0 ? (
      <div className="site-container py-20 md:py-32 w-full flex flex-col gap-16">
        {hasIntro ? (
        <div className="text-center max-w-3xl mx-auto mb-4">
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

        {philosophies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {philosophies.map((philosophy, index) => (
            <div
              key={index}
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-[#E8DFCA]/50 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group flex flex-col h-full"
            >
              {philosophy.imageUrl ? (
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback
                  src={philosophy.imageUrl}
                  alt={philosophy.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                <div className="absolute bottom-6 left-6 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  {philosophy.icon}
                </div>
              </div>
              ) : null}

              <div className="p-8 flex-1 flex flex-col">
                {philosophy.title ? (
                <h3 className="text-2xl font-extrabold text-[#1A4D2E] mb-4 break-keep leading-snug">
                  {philosophy.title}
                </h3>
                ) : null}
                {philosophy.description ? (
                <p className="text-gray-600 leading-relaxed text-base">{philosophy.description}</p>
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
