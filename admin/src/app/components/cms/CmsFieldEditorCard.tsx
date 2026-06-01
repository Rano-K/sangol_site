import { ExternalLink, Link2, MapPin, Phone } from 'lucide-react';
import { CmsPageWireframe } from './CmsPageWireframe';
import { getFrontPreviewUrl, getPlacementHint } from './cmsFieldPlacementMeta';
import type { CmsFieldLinkInfo } from './cmsFieldLinkMeta';

export type CmsFieldConfig = {
  path: string;
  label: string;
  description: string;
  type: 'text' | 'textarea' | 'image' | 'font' | 'toggle';
  imageValueType?: 'url' | 'mediaId';
  placeholder?: string;
  disabled?: boolean;
};

type CmsFieldEditorCardProps = {
  pageKey: string;
  field: CmsFieldConfig;
  value: string;
  rawValue: unknown;
  enhancedDescription: string;
  imagePreviewSrc: string;
  mediaFileName: string;
  uploading: boolean;
  getValue: (path: string) => string;
  getImageSrc: (path: string) => string;
  onTextChange: (path: string, value: string) => void;
  onToggleChange: (path: string, checked: boolean) => void;
  onOpenMediaPicker: () => void;
  onClearImage: () => void;
  onUploadImage: (file: File | null) => void;
  onUploadFont: (file: File | null) => void;
  linkInfo?: CmsFieldLinkInfo | null;
};

export function CmsFieldEditorCard({
  pageKey,
  field,
  value,
  rawValue,
  enhancedDescription,
  imagePreviewSrc,
  mediaFileName,
  uploading,
  getValue,
  getImageSrc,
  onTextChange,
  onToggleChange,
  onOpenMediaPicker,
  onClearImage,
  onUploadImage,
  onUploadFont,
  linkInfo = null,
}: CmsFieldEditorCardProps) {
  const placementHint = getPlacementHint(pageKey, field.path);
  const previewUrl = getFrontPreviewUrl(pageKey);
  const isTextLike = field.type === 'text' || field.type === 'textarea';
  const livePreview = value.trim();
  const hasNavLink = Boolean(linkInfo?.isNavigation);
  const linkTone =
    linkInfo?.kind === 'mailto'
      ? 'violet'
      : linkInfo?.kind === 'tel'
        ? 'sky'
        : linkInfo?.kind === 'external'
          ? 'amber'
          : 'indigo';
  const toneStyles = {
    indigo: {
      card: 'border-indigo-300 bg-indigo-50/50 shadow-indigo-100',
      rail: 'bg-[#F0F4FF] border-indigo-200',
      badge: 'bg-indigo-600 text-white',
      panel: 'bg-indigo-100/80 border-indigo-200 text-indigo-950',
      code: 'bg-white/80 text-indigo-900',
    },
    violet: {
      card: 'border-violet-300 bg-violet-50/50 shadow-violet-100',
      rail: 'bg-[#F5F0FF] border-violet-200',
      badge: 'bg-violet-600 text-white',
      panel: 'bg-violet-100/80 border-violet-200 text-violet-950',
      code: 'bg-white/80 text-violet-900',
    },
    sky: {
      card: 'border-sky-300 bg-sky-50/50 shadow-sky-100',
      rail: 'bg-[#F0F9FF] border-sky-200',
      badge: 'bg-sky-600 text-white',
      panel: 'bg-sky-100/80 border-sky-200 text-sky-950',
      code: 'bg-white/80 text-sky-900',
    },
    amber: {
      card: 'border-amber-300 bg-amber-50/50 shadow-amber-100',
      rail: 'bg-[#FFFBEB] border-amber-200',
      badge: 'bg-amber-600 text-white',
      panel: 'bg-amber-100/80 border-amber-200 text-amber-950',
      code: 'bg-white/80 text-amber-900',
    },
  }[linkTone];

  return (
    <div
      className={`border rounded-xl overflow-hidden shadow-sm ${
        hasNavLink ? toneStyles.card : 'border-gray-200 bg-white'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_1fr] gap-0">
        <div
          className={`border-b lg:border-b-0 lg:border-r p-3 flex flex-col items-center gap-2 ${
            hasNavLink ? toneStyles.rail : 'bg-[#F4F8F1] border-[#E3E9DE]'
          }`}
        >
          <div className="flex items-center gap-1.5 w-full text-[10px] font-semibold text-[#1A4D2E]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">화면 위치 미리보기</span>
          </div>
          <CmsPageWireframe
            pageKey={pageKey}
            activePath={field.path}
            sections={{}}
            getValue={getValue}
            getImageSrc={getImageSrc}
            activeLinkHref={linkInfo?.isNavigation ? linkInfo.href : undefined}
            compact
          />
          <p className="text-[10px] text-[#5F6C60] text-center leading-snug px-1">{placementHint}</p>
          {hasNavLink && linkInfo ? (
            <p className={`text-[9px] font-semibold text-center px-1.5 py-0.5 rounded ${toneStyles.badge}`}>
              링크 영역
            </p>
          ) : null}
        </div>

        <div className="p-4 space-y-3">
          {hasNavLink && linkInfo ? (
            <div className={`rounded-lg border px-3 py-2.5 text-xs space-y-1.5 ${toneStyles.panel}`}>
              <div className="flex items-center gap-1.5 font-semibold">
                {linkInfo.kind === 'tel' ? (
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {linkInfo.kind === 'internal'
                    ? '클릭 시 페이지 이동'
                    : linkInfo.kind === 'external'
                      ? '외부 링크 연결'
                      : linkInfo.kind === 'mailto'
                        ? '이메일 링크'
                        : '전화 링크'}
                </span>
                {linkInfo.isFixed ? (
                  <span className="px-1.5 py-0.5 rounded bg-white/70 text-[10px] font-bold">경로 고정</span>
                ) : null}
              </div>
              <p className="leading-snug">
                <span className="font-medium">이동 대상:</span> {linkInfo.routeLabel}
              </p>
              <p className={`font-mono text-[11px] break-all px-2 py-1 rounded ${toneStyles.code}`}>{linkInfo.href}</p>
              {linkInfo.kind === 'internal' ? (
                <a
                  href={linkInfo.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                >
                  프론트에서 해당 페이지 열기
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${hasNavLink ? 'text-indigo-950' : 'text-gray-800'}`}>
                {field.label}
              </p>
              <p className="text-xs text-[#4F6F52] mt-0.5 flex flex-wrap items-center gap-1">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                    hasNavLink ? toneStyles.badge : 'bg-[#E8F0E6] text-[#1A4D2E]'
                  }`}
                >
                  {hasNavLink
                    ? '링크'
                    : field.type === 'image'
                      ? '이미지'
                      : field.type === 'font'
                        ? '폰트'
                        : field.type === 'toggle'
                          ? 'ON/OFF'
                          : '텍스트'}
                </span>
                <span className="text-gray-500">{placementHint}</span>
              </p>
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

          <p className="text-xs text-gray-500">{enhancedDescription}</p>

          {isTextLike && livePreview ? (
            <div className="rounded-lg border border-dashed border-[#C5D4BE] bg-[#FAFCF8] px-3 py-2">
              <p className="text-[10px] font-semibold text-[#5F6C60] mb-1">입력값 미리보기</p>
              <p className={`text-sm text-[#1A4D2E] whitespace-pre-wrap ${field.type === 'textarea' ? 'leading-relaxed' : ''}`}>
                {livePreview}
              </p>
            </div>
          ) : null}

          {field.type === 'textarea' ? (
            <textarea
              value={value}
              onChange={(e) => onTextChange(field.path, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className={`w-full border rounded-lg px-3 py-2 text-sm min-h-24 ${
                field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          ) : field.type === 'toggle' ? (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              {(() => {
                const checked = field.path.endsWith('.enabled') ? rawValue !== false : Boolean(rawValue);
                return (
                  <>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleChange(field.path, e.target.checked)}
                      disabled={field.disabled}
                    />
                    {checked ? '사용' : '미사용'}
                  </>
                );
              })()}
            </label>
          ) : field.type === 'font' ? (
            <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-200 text-violet-900 font-semibold">폰트 파일</span>
                <span className="text-xs text-violet-700">웹폰트 전용</span>
              </div>
              <p className="mt-1">
                현재 연결 파일: <span className="font-medium">{mediaFileName}</span>
              </p>
            </div>
          ) : (
            <input
              value={value}
              onChange={(e) => onTextChange(field.path, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          )}

          {field.type === 'image' ? (
            <div className="space-y-2">
              {imagePreviewSrc ? (
                <div className="rounded-lg border border-[#DCE8D8] bg-[#F7FBF5] p-2">
                  <p className="text-[10px] font-semibold text-[#5F6C60] mb-2">등록된 이미지 (실제 노출 크기는 화면마다 다름)</p>
                  <img
                    src={imagePreviewSrc}
                    alt={field.label}
                    className="max-h-40 w-full rounded-lg border object-contain bg-white"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#C5D4BE] bg-[#FAFCF8] px-3 py-6 text-center text-xs text-[#6B7B6E]">
                  아직 연결된 이미지가 없습니다. 업로드하거나 공용 이미지함에서 선택하세요.
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onUploadImage(e.target.files?.[0] || null)}
                disabled={uploading || field.disabled}
                className="w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenMediaPicker}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
                  disabled={field.disabled}
                >
                  공용 이미지함에서 선택
                </button>
                <button
                  type="button"
                  onClick={onClearImage}
                  className="px-3 py-1.5 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                  disabled={field.disabled}
                >
                  연결 해제
                </button>
              </div>
            </div>
          ) : null}

          {field.type === 'font' ? (
            <div className="space-y-2">
              <input
                type="file"
                accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                onChange={(e) => onUploadFont(e.target.files?.[0] || null)}
                disabled={uploading || field.disabled}
                className="w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">폰트 업로드: woff2 권장, 최대 20MB.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
