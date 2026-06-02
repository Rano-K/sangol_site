import { Award } from "lucide-react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionQuickLinks } from "./SectionQuickLinks";

const COMPANY_QUICK_LINKS = [
  { to: "/company/greeting", label: "인사말" },
  { to: "/company/history", label: "연혁" },
  { to: "/company/awards", label: "수상,인증" },
  { to: "/company/location", label: "오시는길" },
];

const cmsStr = (value: unknown) => String(value ?? "").trim();

export function CompanyAwards() {
  const { data } = useCmsPage("company-awards");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const body = (sections.body ?? {}) as Record<string, unknown>;
  const headerTitle = cmsStr(header.title);
  const headerSubtitle = cmsStr(header.subtitle);
  const bodyTitle = cmsStr(body.title);
  const bodySubtitle = cmsStr(body.subtitle);
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
  ].filter(Boolean);
  const headerBannerImage = cmsStr(header.bannerImage ?? sections.headerBannerImage);
  const hasHeader = Boolean(headerTitle || headerSubtitle);
  const hasBody = Boolean(bodyTitle || bodySubtitle || certImages.length > 0);

  return (
    <div className="flex-1 bg-[#FAFAF7] flex flex-col">
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
          <Award className="w-8 h-8 mx-auto mb-4 opacity-80" />
          {headerTitle ? (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{headerTitle}</h1>
          ) : null}
          {headerSubtitle ? <p className="text-[#E8DFCA] text-lg">{headerSubtitle}</p> : null}
        </div>
      </div>
      ) : null}
      <SectionQuickLinks items={COMPANY_QUICK_LINKS} />

      {hasBody ? (
      <div className="site-container py-16 md:py-24 w-full flex flex-col items-center">
        {bodyTitle || bodySubtitle ? (
        <div className="text-center mb-16">
          {bodyTitle ? <h2 className="text-3xl font-extrabold text-[#1A4D2E] mb-4">{bodyTitle}</h2> : null}
          {bodySubtitle ? <p className="text-[#4F6F52] text-lg">{bodySubtitle}</p> : null}
        </div>
        ) : null}

        {certImages.length > 0 ? (
        <div className="w-full flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-start">
            {certImages.map((src) => (
              <div
                key={src}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition-shadow h-full"
              >
                <ImageWithFallback src={src} alt="" className="w-full h-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
