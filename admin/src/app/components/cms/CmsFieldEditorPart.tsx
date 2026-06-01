import { ExternalLink, Link2, MapPin, Phone } from 'lucide-react';
import { CmsPageWireframe } from './CmsPageWireframe';
import { getFrontPreviewUrl, getPlacementHint } from './cmsFieldPlacementMeta';
import type { CmsFieldLinkInfo } from './cmsFieldLinkMeta';
import type { CmsFieldPart } from './cmsFieldGrouping';
import { getCmsFieldRowLabel } from './cmsFieldGrouping';
import { CmsFieldEditorRow, type CmsFieldEditorRowProps } from './CmsFieldEditorRow';
import type { CmsFieldConfig } from './CmsFieldEditorCard';

type CmsFieldEditorPartProps = {
  pageKey: string;
  part: CmsFieldPart;
  getValue: (path: string) => string;
  getRawValue: (path: string) => unknown;
  getImageSrc: (path: string) => string;
  resolveLink: (path: string) => CmsFieldLinkInfo | null;
  getEnhancedDescription: (field: CmsFieldConfig) => string;
  getImagePreviewSrc: (field: CmsFieldConfig) => string;
  getMediaFileName: (path: string) => string;
  uploading: boolean;
  onTextChange: CmsFieldEditorRowProps['onTextChange'];
  onToggleChange: CmsFieldEditorRowProps['onToggleChange'];
  onOpenMediaPicker: (field: CmsFieldConfig) => void;
  onClearImage: (path: string) => void;
  onUploadImage: (field: CmsFieldConfig, file: File | null) => void;
  onUploadFont: (field: CmsFieldConfig, file: File | null) => void;
};

export function CmsFieldEditorPart({
  pageKey,
  part,
  getValue,
  getRawValue,
  getImageSrc,
  resolveLink,
  getEnhancedDescription,
  getImagePreviewSrc,
  getMediaFileName,
  uploading,
  onTextChange,
  onToggleChange,
  onOpenMediaPicker,
  onClearImage,
  onUploadImage,
  onUploadFont,
}: CmsFieldEditorPartProps) {
  const previewUrl = getFrontPreviewUrl(pageKey);
  const placementHint = getPlacementHint(pageKey, part.previewPath);
  const partLink =
    part.fields.map((field) => resolveLink(field.path)).find((info) => info?.isNavigation) || null;
  const hasNavLink = Boolean(partLink);
  const linkTone = partLink?.kind === 'tel' ? 'sky' : partLink?.kind === 'mailto' ? 'violet' : 'indigo';
  const cardClass = hasNavLink
    ? linkTone === 'sky'
      ? 'border-sky-300 bg-sky-50/40'
      : linkTone === 'violet'
        ? 'border-violet-300 bg-violet-50/40'
        : 'border-indigo-300 bg-indigo-50/40'
    : 'border-gray-200 bg-white';

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm ${cardClass}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_1fr] gap-0">
        <div
          className={`border-b lg:border-b-0 lg:border-r p-3 flex flex-col items-center gap-2 ${
            hasNavLink ? 'bg-[#F0F4FF] border-indigo-200' : 'bg-[#F4F8F1] border-[#E3E9DE]'
          }`}
        >
          <div className="flex items-center gap-1.5 w-full text-[10px] font-semibold text-[#1A4D2E]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">화면 위치</span>
          </div>
          <CmsPageWireframe
            pageKey={pageKey}
            activePath={part.previewPath}
            sections={{}}
            getValue={getValue}
            getImageSrc={getImageSrc}
            activeLinkHref={partLink?.isNavigation ? partLink.href : undefined}
            compact
          />
          <p className="text-[10px] text-[#5F6C60] text-center leading-snug px-1">{placementHint}</p>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E3E9DE] pb-3">
            <div>
              <p className="text-base font-bold text-[#1A4D2E]">{part.title}</p>
              <p className="text-xs text-[#5F6C60] mt-1">{part.description}</p>
              <p className="text-[10px] text-[#8A9A8C] mt-1">{part.fields.length}개 입력 항목</p>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#1A4D2E] hover:underline shrink-0 px-2 py-1 rounded-lg border border-[#C5D4BE] bg-[#F7FBF5]"
            >
              실제 페이지
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {partLink ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-950 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                {partLink.kind === 'tel' ? (
                  <Phone className="w-3.5 h-3.5" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                클릭 시 이동 · {partLink.routeLabel}
                {partLink.isFixed ? (
                  <span className="px-1.5 py-0.5 rounded bg-white/80 text-[10px]">경로 고정</span>
                ) : null}
              </div>
              <p className="font-mono text-[11px] break-all">{partLink.href}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            {part.fields.map((field) => (
              <CmsFieldEditorRow
                key={field.path}
                field={field}
                rowLabel={getCmsFieldRowLabel(field, part.title)}
                value={getValue(field.path)}
                rawValue={getRawValue(field.path)}
                enhancedDescription={getEnhancedDescription(field)}
                imagePreviewSrc={getImagePreviewSrc(field)}
                mediaFileName={getMediaFileName(field.path)}
                uploading={uploading}
                linkInfo={partLink ? null : resolveLink(field.path)}
                onTextChange={onTextChange}
                onToggleChange={onToggleChange}
                onOpenMediaPicker={() => onOpenMediaPicker(field)}
                onClearImage={() => onClearImage(field.path)}
                onUploadImage={(file) => onUploadImage(field, file)}
                onUploadFont={(file) => onUploadFont(field, file)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
