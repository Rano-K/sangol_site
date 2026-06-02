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

const cmsStr = (value: unknown) => String(value ?? "").trim();

export function CompanyGreeting() {
  const { data } = useCmsPage("company-greeting");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, unknown>;
  const headerTitle = cmsStr(sections.headerTitle ?? header.title);
  const headerSubtitle = cmsStr(sections.headerSubtitle ?? header.subtitle);
  const headerBannerImage = cmsStr(header.bannerImage ?? sections.headerBannerImage);
  const mediaImage = getCmsMediaFileUrl(sections.mainImageMediaId ? Number(sections.mainImageMediaId) : null);
  const heroImage = mediaImage || "";
  const messageTitle = cmsStr(sections.messageTitle);
  const body = (sections.body ?? {}) as Record<string, unknown>;
  const bodyLead = cmsStr(body.lead);
  const bodyParagraphs = Array.isArray(body.paragraphs)
    ? (body.paragraphs as unknown[]).map((p) => cmsStr(p)).filter(Boolean)
    : [];
  const closingThanks = cmsStr(body.closingThanks);
  const closingSign = cmsStr(body.closingSign);
  const hasHeader = Boolean(headerTitle || headerSubtitle);
  const hasMessage =
    Boolean(messageTitle) || Boolean(bodyLead) || bodyParagraphs.length > 0 || Boolean(closingThanks) || Boolean(closingSign);

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

      {hasMessage || heroImage ? (
      <div className="site-container py-16 md:py-24 w-full flex flex-col md:flex-row gap-10 md:gap-12 lg:gap-16 items-start">
        {heroImage ? (
        <div className="w-full shrink-0 flex justify-center md:justify-start md:w-2/5 lg:w-[42%] max-w-[520px]">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-xl aspect-[4/3] md:aspect-[5/4]">
            <ImageWithFallback
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 border-[6px] border-[#1A4D2E]/10 rounded-2xl pointer-events-none" />
          </div>
        </div>
        ) : null}

        {hasMessage ? (
        <div className="w-full flex-1 min-w-0 flex flex-col justify-center">
          <Quote className="w-12 h-12 text-[#E8DFCA] mb-8" />

          {messageTitle ? (
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A4D2E] mb-10 leading-tight">
            {messageTitle.split("\n")[0]}
            {messageTitle.includes("\n") ? (
              <>
                <br className="hidden md:block" />
                <span className="text-[#4F6F52]">{messageTitle.split("\n").slice(1).join("\n")}</span>
              </>
            ) : null}
          </h2>
          ) : null}

          <div className="space-y-6 text-[#4F6F52] text-[17px] leading-[1.8] font-medium tracking-wide">
            {bodyLead ? <p className="text-xl font-bold text-[#1A4D2E]">{bodyLead}</p> : null}
            {bodyParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
            {closingThanks || closingSign ? (
            <div className="pt-10 text-right">
              {closingThanks ? <p className="text-gray-500 mb-2">{closingThanks}</p> : null}
              {closingSign ? <p className="text-xl font-bold text-[#1A4D2E]">{closingSign}</p> : null}
            </div>
            ) : null}
          </div>
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
