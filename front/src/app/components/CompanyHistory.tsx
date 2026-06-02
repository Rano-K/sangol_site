import { Leaf } from "lucide-react";
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

export function CompanyHistory() {
  const { data } = useCmsPage("company-history");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const body = (sections.body ?? {}) as Record<string, unknown>;
  const headerTitle = cmsStr(header.title);
  const headerSubtitle = cmsStr(header.subtitle);
  const bodyTitle = cmsStr(body.title);
  const bodySubtitle = cmsStr(body.subtitle);
  const mediaImage = getCmsMediaFileUrl(sections.historyImageMediaId ? Number(sections.historyImageMediaId) : null);
  const historyImage = mediaImage || "";
  const headerBannerImage = cmsStr(header.bannerImage ?? sections.headerBannerImage);
  const hasHeader = Boolean(headerTitle || headerSubtitle);
  const hasBody = Boolean(bodyTitle || bodySubtitle || historyImage);

  return (
    <div className="flex-1 bg-white flex flex-col">
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
          <Leaf className="w-8 h-8 mx-auto mb-4 opacity-80" />
          {headerTitle ? (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{headerTitle}</h1>
          ) : null}
          {headerSubtitle ? <p className="text-[#E8DFCA] text-lg">{headerSubtitle}</p> : null}
        </div>
      </div>
      ) : null}
      <SectionQuickLinks items={COMPANY_QUICK_LINKS} />

      {hasBody ? (
      <div className="site-container site-container--narrow py-20 md:py-32 w-full flex flex-col items-center">
        {bodyTitle || bodySubtitle ? (
        <div className="text-center mb-16">
          {bodyTitle ? <h2 className="text-3xl font-extrabold text-[#1A4D2E] mb-4">{bodyTitle}</h2> : null}
          {bodySubtitle ? <p className="text-[#4F6F52] text-lg">{bodySubtitle}</p> : null}
        </div>
        ) : null}

        {historyImage ? (
        <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex justify-center">
          <ImageWithFallback
            src={historyImage}
            alt=""
            className="max-w-full h-auto object-contain"
          />
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
