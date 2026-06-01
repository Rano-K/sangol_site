import type { CmsFieldLinkInfo } from './cmsFieldLinkMeta';
import type { CmsFieldConfig } from './CmsFieldEditorCard';

export type CmsFieldEditorRowProps = {
  field: CmsFieldConfig;
  rowLabel: string;
  value: string;
  rawValue: unknown;
  enhancedDescription: string;
  imagePreviewSrc: string;
  mediaFileName: string;
  uploading: boolean;
  linkInfo?: CmsFieldLinkInfo | null;
  onTextChange: (path: string, value: string) => void;
  onToggleChange: (path: string, checked: boolean) => void;
  onOpenMediaPicker: () => void;
  onClearImage: () => void;
  onUploadImage: (file: File | null) => void;
  onUploadFont: (file: File | null) => void;
};

export function CmsFieldEditorRow({
  field,
  rowLabel,
  value,
  rawValue,
  enhancedDescription,
  imagePreviewSrc,
  mediaFileName,
  uploading,
  linkInfo = null,
  onTextChange,
  onToggleChange,
  onOpenMediaPicker,
  onClearImage,
  onUploadImage,
  onUploadFont,
}: CmsFieldEditorRowProps) {
  const isTextLike = field.type === 'text' || field.type === 'textarea';
  const livePreview = value.trim();

  return (
    <div className="rounded-lg border border-[#E3E9DE] bg-[#FAFCF8] p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#1A4D2E]">{rowLabel}</p>
        <span className="text-[10px] text-[#6B7B6E] font-mono">{field.path}</span>
      </div>
      {linkInfo?.isNavigation ? (
        <p className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-100 rounded px-2 py-1">
          이동 ↗ <span className="font-mono">{linkInfo.href}</span>
          <span className="text-indigo-600"> · {linkInfo.routeLabel}</span>
          {linkInfo.isFixed ? <span className="ml-1 font-bold">(고정)</span> : null}
        </p>
      ) : null}
      <p className="text-xs text-gray-500">{enhancedDescription}</p>

      {isTextLike && livePreview ? (
        <p className="text-xs text-[#4F6F52] bg-white border border-dashed border-[#DCE8D8] rounded px-2 py-1.5 whitespace-pre-wrap">
          {livePreview}
        </p>
      ) : null}

      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onTextChange(field.path, e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled}
          className={`w-full border rounded-lg px-3 py-2 text-sm min-h-20 bg-white ${
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
          <p>
            연결 파일: <span className="font-medium">{mediaFileName}</span>
          </p>
          <input
            type="file"
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            onChange={(e) => onUploadFont(e.target.files?.[0] || null)}
            disabled={uploading || field.disabled}
            className="mt-2 w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
      ) : field.type === 'image' ? (
        <div className="space-y-2">
          {imagePreviewSrc ? (
            <img
              src={imagePreviewSrc}
              alt={rowLabel}
              className="max-h-32 w-full rounded-lg border object-contain bg-white"
            />
          ) : (
            <div className="rounded border border-dashed border-[#C5D4BE] bg-white px-3 py-4 text-center text-xs text-[#6B7B6E]">
              이미지 미연결
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onUploadImage(e.target.files?.[0] || null)}
            disabled={uploading || field.disabled}
            className="w-full text-sm rounded-lg border border-gray-300 bg-white file:mr-3 file:rounded-md file:border file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenMediaPicker}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
              disabled={field.disabled}
            >
              공용 이미지함
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
      ) : (
        <input
          value={value}
          onChange={(e) => onTextChange(field.path, e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled}
          className={`w-full border rounded-lg px-3 py-2 text-sm bg-white ${
            field.disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
          }`}
        />
      )}
    </div>
  );
}
