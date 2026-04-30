import { useEffect, useMemo, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { API_BASE_URL } from "../lib/apiBaseUrl";

type ConcertVideo = {
  id: number;
  title: string;
  youtube_url: string;
  description?: string | null;
  hashtags?: string | null;
  source_url?: string | null;
};

const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{6,})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
};

export function CommunityConcert() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [videos, setVideos] = useState<ConcertVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ConcertVideo | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/community/concert-videos`);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "작은 음악회 목록 조회 실패");
        setVideos(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!selectedVideo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedVideo(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedVideo]);

  return (
    <div className="flex-1 bg-[#FAFAF7] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1A4D2E]">작은 음악회</h1>
          <p className="text-[#4F6F52] mt-2">관리자가 등록한 유튜브 영상을 바로 감상할 수 있습니다.</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">불러오는 중...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-16">{error}</div>
        ) : videos.length === 0 ? (
          <div className="text-center text-gray-500 py-16">등록된 영상이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              const youtubeId = extractYoutubeId(video.youtube_url);
              const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : "";
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setSelectedVideo(video)}
                  className="bg-white rounded-2xl border border-[#E2E5D9] overflow-hidden text-left hover:shadow-lg transition"
                >
                  <div className="relative h-48 bg-gray-100">
                    {thumbnail ? (
                      <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-gray-400">썸네일 없음</div>
                    )}
                    <div className="absolute inset-0 bg-black/20 grid place-items-center">
                      <PlayCircle className="w-14 h-14 text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-[#1A4D2E]">{video.title}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{video.description || "영상 설명이 없습니다."}</p>
                    {video.hashtags ? <p className="text-xs text-[#2E6B4A] mt-2">{video.hashtags}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedVideo ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div
            className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-black text-white flex items-center justify-between">
              <p className="font-semibold">{selectedVideo.title}</p>
              <button type="button" onClick={() => setSelectedVideo(null)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            {selectedVideo.hashtags || selectedVideo.source_url ? (
              <div className="px-4 py-2 bg-[#111] text-white text-xs flex items-center justify-between gap-3">
                <span className="truncate">{selectedVideo.hashtags || ""}</span>
                {selectedVideo.source_url ? (
                  <a
                    href={selectedVideo.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-300 hover:text-green-200 whitespace-nowrap"
                  >
                    원문 보기
                  </a>
                ) : null}
              </div>
            ) : null}
            <div className="aspect-video bg-black">
              {(() => {
                const id = extractYoutubeId(selectedVideo.youtube_url);
                if (!id) return <div className="w-full h-full grid place-items-center text-white">유효한 유튜브 링크가 아닙니다.</div>;
                return (
                  <iframe
                    title={selectedVideo.title}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

