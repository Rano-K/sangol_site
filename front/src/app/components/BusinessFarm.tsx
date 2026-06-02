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

const cmsStr = (value: unknown) => String(value ?? "").trim();

export function BusinessFarm() {
  const { data } = useCmsPage("business-farm");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const body = (sections.body ?? {}) as Record<string, unknown>;
  const headerTitle = cmsStr(header.title);
  const headerSubtitle = cmsStr(header.subtitle);
  const bodyTitle = cmsStr(body.title);
  const bodyDescription = cmsStr(body.description);
  const mediaImage = getCmsMediaFileUrl(
    sections.farmImageMediaId ? Number(sections.farmImageMediaId) : null
  );
  const farmImage = mediaImage || "";
  const headerBannerImage = cmsStr(header.bannerImage ?? sections.headerBannerImage);
  const hasHeader = Boolean(headerTitle || headerSubtitle);
  const hasBody = Boolean(bodyTitle || bodyDescription || farmImage);

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
          <Sprout className="w-8 h-8 mx-auto mb-4 opacity-80" />
          {headerTitle ? (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{headerTitle}</h1>
          ) : null}
          {headerSubtitle ? <p className="text-[#E8DFCA] text-lg">{headerSubtitle}</p> : null}
        </div>
      </div>
      ) : null}
      <SectionQuickLinks items={BUSINESS_QUICK_LINKS} />

      {hasBody ? (
      <div className="site-container py-20 md:py-32 w-full flex flex-col items-center gap-12 md:gap-16">
        {bodyTitle || bodyDescription ? (
        <div className="text-center max-w-3xl mx-auto">
          {bodyTitle ? (
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A4D2E] mb-6 leading-tight">
            {bodyTitle.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                {idx === 0 ? <br className="md:hidden" /> : null}
              </span>
            ))}
          </h2>
          ) : null}
          {bodyDescription ? (
          <p className="text-gray-600 text-lg leading-relaxed">
            {bodyDescription.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                {idx === 0 ? <br className="hidden md:block" /> : null}
              </span>
            ))}
          </p>
          ) : null}
        </div>
        ) : null}

        {farmImage ? (
        <div className="site-container w-full rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-[#E8DFCA]/60">
          <ImageWithFallback
            src={farmImage}
            alt=""
            className="w-full h-auto object-cover"
          />
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
