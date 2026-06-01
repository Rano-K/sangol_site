import { useEffect, useMemo, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { useLocation } from "react-router";
import { cn } from "./ui/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";

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

function VideoCard({
  video,
  onClick,
}: {
  video: ConcertVideo;
  onClick: () => void;
}) {
  const youtubeId = extractYoutubeId(video.youtube_url);
  const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-[#E2E5D9] overflow-hidden text-left hover:shadow-lg transition-shadow"
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
}

function VideoGrid({ videos, onSelect }: { videos: ConcertVideo[]; onSelect: (video: ConcertVideo) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onClick={() => onSelect(video)} />
      ))}
    </div>
  );
}

function CinemaScreen({
  video,
  isPlaying,
  onPlay,
  onStop,
}: {
  video: ConcertVideo;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  const youtubeId = extractYoutubeId(video.youtube_url);
  const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "";

  return (
    <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
      {/* 스크린 프레임 */}
      <div
        className="relative mx-auto max-w-5xl"
        style={{ perspective: "1200px" }}
      >
        <div
          className="relative rounded-xl md:rounded-2xl overflow-hidden border-[6px] md:border-8 border-[#1a1a1a] shadow-[0_0_60px_rgba(255,255,255,0.08),0_25px_50px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(0,0,0,0.8)]"
          style={{ transform: "rotateX(4deg)", transformOrigin: "center bottom" }}
        >
          <div className="aspect-video bg-black relative">
            {isPlaying && youtubeId ? (
              <>
                <iframe
                  title={video.title}
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  type="button"
                  onClick={onStop}
                  className="absolute top-3 right-3 z-10 rounded-full bg-black/70 p-1.5 text-white/90 hover:bg-black hover:text-white transition-colors"
                  aria-label="재생 종료"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : thumbnail ? (
              <>
                <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
                <button
                  type="button"
                  onClick={onPlay}
                  disabled={!youtubeId}
                  className="absolute inset-0 grid place-items-center group disabled:cursor-not-allowed"
                  aria-label={`${video.title} 재생`}
                >
                  <span className="rounded-full bg-white/15 backdrop-blur-sm p-4 md:p-5 border border-white/30 group-hover:bg-white/25 group-hover:scale-105 transition-all shadow-lg">
                    <PlayCircle className="w-14 h-14 md:w-20 md:h-20 text-white drop-shadow-lg" />
                  </span>
                </button>
              </>
            ) : (
              <div className="w-full h-full grid place-items-center text-white/60 text-sm">유효한 영상이 없습니다.</div>
            )}
          </div>
          {/* 스크린 하단 반사광 */}
          <div className="h-3 md:h-4 bg-gradient-to-b from-[#2a2a2a] to-transparent opacity-80" />
        </div>
      </div>
    </div>
  );
}

function VideoCarousel({ videos }: { videos: ConcertVideo[] }) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeVideo = videos[currentIndex] ?? videos[0];

  useEffect(() => {
    if (!carouselApi) return;
    const onSelectSlide = () => {
      setCurrentIndex(carouselApi.selectedScrollSnap());
      setIsPlaying(false);
    };
    onSelectSlide();
    carouselApi.on("select", onSelectSlide);
    carouselApi.on("reInit", onSelectSlide);
    return () => {
      carouselApi.off("select", onSelectSlide);
    };
  }, [carouselApi]);

  const goToSlide = (idx: number) => {
    carouselApi?.scrollTo(idx);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-8 md:space-y-10">
      {/* 영화관 상단 스크린 */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#0c100c] via-[#151c15] to-[#1e2a1e] px-4 py-8 md:px-10 md:py-12 shadow-xl border border-[#2a352a]">
        {/* 상단 조명 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-900/15 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-3/4 max-w-md h-1 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />

        {/* 좌·우 커튼 */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 md:w-16 bg-gradient-to-r from-[#4a1520]/90 via-[#6b1f2e]/40 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 md:w-16 bg-gradient-to-l from-[#4a1520]/90 via-[#6b1f2e]/40 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 max-w-5xl mx-auto space-y-5 md:space-y-6">
          <p className="text-center text-[10px] md:text-xs font-bold tracking-[0.35em] text-amber-200/50 uppercase">
            Small Music Concert
          </p>

          <CinemaScreen
            video={activeVideo}
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onStop={() => setIsPlaying(false)}
          />

          <div className="text-center px-2 space-y-2">
            <h2 className="text-lg md:text-2xl font-bold text-white/95">{activeVideo.title}</h2>
            <p className="text-sm md:text-base text-white/55 line-clamp-2 max-w-2xl mx-auto">
              {activeVideo.description || "영상 설명이 없습니다."}
            </p>
            {activeVideo.hashtags ? (
              <p className="text-xs text-[#8fbc8f]">{activeVideo.hashtags}</p>
            ) : null}
            {activeVideo.source_url ? (
              <a
                href={activeVideo.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-amber-200/80 hover:text-amber-100 underline underline-offset-2"
              >
                원문 보기
              </a>
            ) : null}
          </div>
        </div>

        {/* 관객석 실루엣 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 md:h-12 bg-gradient-to-t from-black/50 to-transparent"
          aria-hidden
        />
      </div>

      {/* 하단 필름 스트립 캐러셀 */}
      <div>
        <p className="text-center text-sm font-bold text-[#4F6F52] mb-4">다른 영상 보기</p>
        <div className="relative px-10 md:px-12">
          <Carousel
            setApi={setCarouselApi}
            opts={{ align: "center", loop: videos.length > 1, dragFree: false }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 md:-ml-4">
              {videos.map((video, idx) => {
                const youtubeId = extractYoutubeId(video.youtube_url);
                const thumb = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : "";
                const isActive = idx === currentIndex;
                return (
                  <CarouselItem
                    key={video.id}
                    className="pl-3 md:pl-4 basis-[42%] sm:basis-[32%] md:basis-[24%] lg:basis-[20%]"
                  >
                    <button
                      type="button"
                      onClick={() => goToSlide(idx)}
                      className={cn(
                        "w-full rounded-xl overflow-hidden border-2 text-left transition-all",
                        isActive
                          ? "border-[#1A4D2E] ring-2 ring-[#1A4D2E]/30 shadow-lg scale-[1.02]"
                          : "border-[#E2E5D9] opacity-80 hover:opacity-100 hover:border-[#4F6F52]"
                      )}
                    >
                      <div className="relative aspect-video bg-gray-100">
                        {thumb ? (
                          <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-xs text-gray-400">없음</div>
                        )}
                        {isActive ? (
                          <div className="absolute inset-0 border-2 border-[#1A4D2E] pointer-events-none rounded-[10px]" />
                        ) : null}
                      </div>
                      <p className="p-2 text-xs font-bold text-[#1A4D2E] line-clamp-2 bg-white">{video.title}</p>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {videos.length > 1 ? (
              <>
                <CarouselPrevious className="left-0 size-9 bg-white/95 border-[#D8E1D1] text-[#1A4D2E] hover:bg-white shadow-md top-[38%]" />
                <CarouselNext className="right-0 size-9 bg-white/95 border-[#D8E1D1] text-[#1A4D2E] hover:bg-white shadow-md top-[38%]" />
              </>
            ) : null}
          </Carousel>

          {videos.length > 1 ? (
            <div className="flex justify-center gap-2 mt-5">
              {videos.map((video, idx) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === currentIndex ? "w-6 bg-[#1A4D2E]" : "w-2 bg-[#C5D4BC] hover:bg-[#4F6F52]"
                  )}
                  aria-label={`${idx + 1}번째 영상`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CommunityConcert() {
  const location = useLocation();
  const isSmallMusicPage = location.pathname === "/community/small-music";
  const pageTitle = isSmallMusicPage ? "작은음악회" : "산골이야기";
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
        if (!response.ok) throw new Error(data?.error || `${pageTitle} 목록 조회 실패`);
        setVideos(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiBaseUrl, pageTitle]);

  useEffect(() => {
    if (!selectedVideo || isSmallMusicPage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedVideo(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedVideo, isSmallMusicPage]);

  const containerClass = isSmallMusicPage
    ? "site-container py-14 space-y-8"
    : "site-container site-container--narrow py-14 space-y-8";

  return (
    <div className="flex-1 bg-[#FAFAF7] min-h-screen">
      <div className={containerClass}>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1A4D2E]">{pageTitle}</h1>
          <p className="text-[#4F6F52] mt-2">
            {isSmallMusicPage
              ? "작은 음악회에 오신 것을 환영합니다!"
              : "관리자가 등록한 유튜브 영상을 바로 감상할 수 있습니다."}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">불러오는 중...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-16">{error}</div>
        ) : videos.length === 0 ? (
          <div className="text-center text-gray-500 py-16">등록된 영상이 없습니다.</div>
        ) : isSmallMusicPage ? (
          <VideoCarousel videos={videos} />
        ) : (
          <VideoGrid videos={videos} onSelect={setSelectedVideo} />
        )}
      </div>

      {!isSmallMusicPage && selectedVideo ? (
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
                if (!id) {
                  return <div className="w-full h-full grid place-items-center text-white">유효한 유튜브 링크가 아닙니다.</div>;
                }
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
