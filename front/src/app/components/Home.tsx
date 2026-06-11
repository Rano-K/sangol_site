import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, Award, CheckCircle2, ChevronRight, MessageCircle, Phone, Shield, Truck, Leaf } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getCmsMediaFileUrl, useCmsPage } from "../hooks/useCmsPage";
import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { getCommunityPostListTitle } from "../lib/communityPost";
import { buildProductCatalogHref } from "../lib/productCatalog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "./ui/carousel";
import { cn } from "./ui/utils";

const HERO_SLIDE_MS = 6000;
const POPULAR_CAROUSEL_MS = 2000;
const POPULAR_PRODUCT_LIMIT = 16;
/** max-w-7xl 4열 그리드와 동일한 카드 폭(사진 크기 유지) */
const POPULAR_CARD_CLASS = "pl-4 basis-[280px] sm:basis-[300px]";

type HomeCard = { title: string; desc: string; link: string; img: string };
type HomeProduct = { id?: number; name: string; category: string; img: string; link?: string };
type ProductApiRow = {
  id: number;
  name: string;
  category: string;
  image_url?: string | null;
  is_active?: boolean;
};
type HomeCommunityPost = { title: string; date: string; link: string };
type CommunityPostApiRow = { id: number; title: string; created_at: string; is_secret?: boolean };
type NoticeRow = { id: number; title: string; is_important: boolean; created_at: string };
type HomeHeroAction = { label: string; link: string; variant: "primary" | "outline" };
type HomeTrustBadge = { title: string; desc: string; iconUrl?: string; iconMediaId?: string | number };

const parseHomeFeatures = (raw: unknown): HomeCard[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<HomeCard>;
      const title = String(row.title ?? "").trim();
      const img = String(row.img ?? "").trim();
      if (!title && !img) return null;
      return {
        title,
        desc: String(row.desc ?? "").trim(),
        link: String(row.link ?? "").trim(),
        img,
      };
    })
    .filter((item): item is HomeCard => item !== null);
};

const resolveTrustBadgeIcon = (badge: Partial<HomeTrustBadge>): string => {
  const mediaId = Number(badge.iconMediaId);
  if (Number.isFinite(mediaId) && mediaId > 0) {
    return getCmsMediaFileUrl(mediaId) || "";
  }
  return String(badge.iconUrl ?? "").trim();
};

/** 카테고리를 골고루 섞어 인기 상품 목록 구성 */
const pickDiversePopularProducts = (rows: ProductApiRow[], limit: number): ProductApiRow[] => {
  const buckets = new Map<string, ProductApiRow[]>();
  for (const row of rows) {
    const category = String(row.category || "").trim() || "기타";
    const list = buckets.get(category) ?? [];
    list.push(row);
    buckets.set(category, list);
  }
  const categories = [...buckets.keys()].sort((a, b) => a.localeCompare(b, "ko"));
  const picked: ProductApiRow[] = [];
  let round = 0;
  while (picked.length < limit) {
    let added = false;
    for (const category of categories) {
      const list = buckets.get(category) ?? [];
      if (round < list.length) {
        picked.push(list[round]);
        added = true;
        if (picked.length >= limit) break;
      }
    }
    if (!added) break;
    round += 1;
  }
  return picked.length > 0 ? picked : rows.slice(0, limit);
};

const formatDateYMD = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
};

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const reduceMotion = useReducedMotion();
  const { data } = useCmsPage("home");
  const { user, token } = useAuth();
  const isFranchiseUser = user?.role === "franchise";
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const heroSection = (sections.hero ?? {}) as Record<string, string>;
  const introSection = (sections.intro ?? {}) as Record<string, string>;
  const apiBaseUrl = API_BASE_URL;
  const [communityPosts, setCommunityPosts] = useState<HomeCommunityPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [popularProducts, setPopularProducts] = useState<HomeProduct[]>([]);
  const [popularCarouselApi, setPopularCarouselApi] = useState<CarouselApi>();
  const [isPopularCarouselPaused, setIsPopularCarouselPaused] = useState(false);

  const heroImages = (Array.isArray(sections.heroImages) ? sections.heroImages : [])
    .map((url) => String(url ?? "").trim())
    .filter(Boolean);
  const features = parseHomeFeatures(sections.features);
  const supportSection = (sections.support ?? {}) as Record<string, string>;
  const heroActions = (Array.isArray(sections.heroActions) ? (sections.heroActions as HomeHeroAction[]) : [])
    .map((action) => ({
      label: String(action?.label ?? "").trim(),
      link: String(action?.link ?? "").trim(),
      variant: action?.variant === "outline" ? "outline" : "primary",
    }))
    .filter((action) => action.label && action.link && action.link !== "/order");
  const trustBadges = (Array.isArray(sections.trustBadges) ? (sections.trustBadges as Partial<HomeTrustBadge>[]) : [])
    .map((badge) => ({
      title: String(badge?.title ?? "").trim(),
      desc: String(badge?.desc ?? "").trim(),
      iconUrl: resolveTrustBadgeIcon(badge),
    }))
    .filter((badge) => badge.title || badge.desc);
  const heroSubtitle = String(heroSection.subtitle ?? "").trim();
  const heroTitle = String(heroSection.title ?? "").trim();
  const heroSubtitle2 = String(heroSection.subtitle2 ?? "").trim();
  const hasHeroContent = heroImages.length > 0 || heroSubtitle || heroTitle || heroSubtitle2 || heroActions.length > 0;
  const hasTrustBadges = trustBadges.length > 0;
  const introHasContent =
    Boolean(introSection.iconUrl?.trim()) ||
    Boolean(introSection.title?.trim()) ||
    Boolean(introSection.description1?.trim()) ||
    Boolean(introSection.description2?.trim());


  useEffect(() => {
    if (heroImages.length < 2) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, HERO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    if (!popularCarouselApi || isPopularCarouselPaused || popularProducts.length < 2) return;
    const timer = window.setInterval(() => {
      if (popularCarouselApi.canScrollNext()) {
        popularCarouselApi.scrollNext();
      } else {
        popularCarouselApi.scrollTo(0);
      }
    }, POPULAR_CAROUSEL_MS);
    return () => window.clearInterval(timer);
  }, [popularCarouselApi, isPopularCarouselPaused, popularProducts.length]);

  useEffect(() => {
    const controller = new AbortController();

    const loadCommunityPosts = async () => {
      setCommunityLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/community/posts`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "산골소통방 목록 조회 실패");

        const rows = Array.isArray(data) ? (data as CommunityPostApiRow[]) : [];
        const next = rows.slice(0, 4).map((p) => ({
          title: getCommunityPostListTitle(p),
          date: formatDateYMD(p.created_at),
          link: "/community/story",
        }));
        setCommunityPosts(next);
      } catch (_error) {
        setCommunityPosts([]);
      } finally {
        setCommunityLoading(false);
      }
    };

    void loadCommunityPosts();
    return () => controller.abort();
  }, [apiBaseUrl]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPopularProducts = async () => {
      try {
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${apiBaseUrl}/products`, { signal: controller.signal, headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "상품 목록 조회 실패");
        const rows = Array.isArray(data) ? (data as ProductApiRow[]) : [];
        const eligible = rows
          .filter((row) => row && row.name && row.category && row.is_active !== false)
          .filter((row) => isFranchiseUser || String(row.category || "").trim() !== "재공품");
        const top = pickDiversePopularProducts(eligible, POPULAR_PRODUCT_LIMIT).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          img: row.image_url || "",
          link: buildProductCatalogHref(
            { id: row.id, category: row.category },
            { isFranchiseUser }
          ),
        }));
        setPopularProducts(top);
      } catch (_error) {
        setPopularProducts([]);
      }
    };

    void loadPopularProducts();
    return () => controller.abort();
  }, [apiBaseUrl, isFranchiseUser, token]);

  // 홈 상단 미니 공지사항
  useEffect(() => {
    const controller = new AbortController();

    const loadNotices = async () => {
      setNoticesLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/notices`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "공지사항 목록 조회 실패");

        const rows = Array.isArray(data) ? (data as NoticeRow[]) : [];
        setNotices(rows.slice(0, 4));
      } catch (_error) {
        setNotices([]);
      } finally {
        setNoticesLoading(false);
      }
    };

    void loadNotices();
    return () => controller.abort();
  }, [apiBaseUrl]);

  return (
    <div className="flex-1 flex flex-col">
      {hasHeroContent ? (
      <section className="relative h-[620px] md:h-[720px] w-full overflow-hidden flex items-center justify-center text-center group">
        {heroImages.length > 0 ? (
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={currentSlide}
            className="absolute inset-0 z-0"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={heroImages[currentSlide % heroImages.length]}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-cover hero-image-tone",
                !reduceMotion && (currentSlide % 2 === 0 ? "hero-ken-burns-a" : "hero-ken-burns-b")
              )}
              fetchPriority={currentSlide === 0 ? "high" : "auto"}
              decoding="async"
            />
          </motion.div>
        </AnimatePresence>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1A4D2E] to-[#2d5016]" aria-hidden />
        )}
        <motion.div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/58 to-black/38 z-10" aria-hidden />
        <motion.div className="absolute inset-0 bg-black/15 z-10" aria-hidden />

        <motion.div
          key={`hero-copy-${currentSlide}`}
          className="relative z-20 text-white site-container w-full flex flex-col items-center"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: reduceMotion ? 0 : 0.08 },
            },
          }}
        >
          {heroSubtitle ? (
          <motion.p
            variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-base md:text-xl font-medium text-[#E8DFCA] mb-5 tracking-wide [text-shadow:0_2px_10px_rgba(0,0,0,0.45)]"
          >
            {heroSubtitle}
          </motion.p>
          ) : null}
          {heroTitle ? (
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 leading-[1.25] text-white tracking-tight [text-shadow:0_3px_18px_rgba(0,0,0,0.55)]"
          >
            {heroTitle.split("\n").map((line, idx) => (
                <span key={idx}>
                  {line}
                  <br />
                </span>
              ))}
          </motion.h1>
          ) : null}
          {heroSubtitle2 ? (
            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm md:text-lg font-medium text-white/90 mb-8 tracking-wide [text-shadow:0_2px_10px_rgba(0,0,0,0.45)]"
            >
              {heroSection.subtitle2}
            </motion.p>
          ) : (
            <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="mb-8" />
          )}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {heroActions.map((action, index) => {
              const isPrimaryAction =
                action.label.includes("주문") || action.variant === "primary" || index === 1;

              return (
                <Link
                  key={`${action.label}-${index}`}
                  to={action.link}
                  className={
                    isPrimaryAction
                      ? "px-7 py-3.5 rounded-full bg-[#D1A24A] text-[#1A2F1E] font-extrabold shadow-[0_8px_24px_rgba(0,0,0,0.28)] hover:bg-[#C39237] transition-all"
                      : "px-7 py-3.5 rounded-full border border-white/75 bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                  }
                >
                  {action.label}
                </Link>
              );
            })}
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            className="flex justify-center gap-3 mt-12"
          >
              {heroImages.length > 1
                ? heroImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentSlide ? "w-12 bg-white" : "w-8 bg-white/30 hover:bg-white/60"
                  )}
                  aria-label={`${i + 1}번째 슬라이드`}
                  aria-current={i === currentSlide}
                />
              ))
                : null}
          </motion.div>
        </motion.div>
      </section>
      ) : null}

      {hasTrustBadges ? (
      <section className="py-10 bg-gradient-to-b from-[#F5F7F1] to-white border-b border-[#E8EDE2]">
        <div className="site-container grid grid-cols-2 lg:grid-cols-4 gap-4">
          {trustBadges.map((badge, index) => {
            const Icon = [Shield, Award, Truck, CheckCircle2][index % 4];
            return (
              <div key={`${badge.title}-${index}`} className="rounded-2xl border border-[#E1E8D9] bg-white px-4 py-4 flex items-center gap-3">
                {badge.iconUrl ? (
                  <img src={badge.iconUrl} alt={`${badge.title} 아이콘`} className="w-5 h-5 object-contain" />
                ) : (
                  <Icon className="w-5 h-5 text-[#1A4D2E]" />
                )}
                <div>
                  <p className="text-sm font-semibold text-[#1A4D2E]">{badge.title}</p>
                  <p className="text-xs text-[#6D7568]">{badge.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      ) : null}

      {introHasContent ? (
      <section className="py-20 bg-[#FAFAF7]">
        <div className="site-container site-container--narrow text-center">
          {introSection.iconUrl ? (
            <img
              src={introSection.iconUrl}
              alt="브랜드 스토리 아이콘"
              className="w-12 h-12 object-contain mx-auto mb-6"
            />
          ) : (
            <Leaf className="w-12 h-12 text-[#1A4D2E] mx-auto mb-6" />
          )}
          {introSection.title ? (
          <h2 className="text-3xl font-extrabold text-[#1A4D2E] mb-6">
            {introSection.title}
          </h2>
          ) : null}
          {introSection.description1 ? (
          <p className="text-[#4F6F52] text-lg leading-relaxed mb-4">
            {introSection.description1.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="hidden md:block" />
              </span>
            ))}
          </p>
          ) : null}
          {introSection.description2 ? (
          <p className="text-gray-500">
            {introSection.description2.split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="hidden md:block" />
              </span>
            ))}
          </p>
          ) : null}
        </div>
      </section>
      ) : null}

      {features.length > 0 ? (
      <section className="py-24 bg-white relative">
        <div className="site-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={`${feature.title}-${idx}`}
                className="group flex flex-col h-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 bg-white"
                initial={reduceMotion ? false : { opacity: 0, y: 36 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: reduceMotion ? 0 : idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
              >
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                  <img src={feature.img} alt={feature.title} className="w-full h-full object-cover hero-image-tone group-hover:scale-110 group-hover:saturate-[1.15] transition-all duration-700" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-bold text-[#1A4D2E] mb-4 group-hover:text-[#4F6F52] transition-colors">{feature.title}</h3>
                  <p className="text-gray-600 text-[15px] leading-relaxed mb-8 flex-grow">
                    {feature.desc}
                  </p>
                  {feature.link ? (
                  <Link to={feature.link} className="flex items-center gap-2 text-[#4F6F52] font-semibold text-sm group-hover:text-[#1A4D2E] mt-auto w-fit">
                    자세히 보기 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {/* Body Section 2: 주요 상품 라인업 (Product Cards) */}
      <section className="py-24 bg-[#FAFAF7]">
        <div className="site-container">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-[#E8DFCA] pb-6">
            <div>
              <p className="text-sm font-semibold text-[#4F6F52] mb-2">BEST SELLER</p>
              <h2 className="text-4xl font-extrabold text-[#1A4D2E] tracking-tight">인기 상품</h2>
              <p className="text-[#4F6F52] mt-3 text-lg">산골이 직접 재배하고 엄격하게 선별한 건강한 우리 농산물 및 가공제품</p>
            </div>
            <Link to="/products/forest" className="hidden md:flex items-center gap-2 text-white bg-[#1A4D2E] hover:bg-[#2d5016] font-bold px-6 py-3 rounded-full transition-colors">
              상품 더 보기 <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          <div
            className="relative px-10 md:px-12"
            onMouseEnter={() => setIsPopularCarouselPaused(true)}
            onMouseLeave={() => setIsPopularCarouselPaused(false)}
            onFocusCapture={() => setIsPopularCarouselPaused(true)}
            onBlurCapture={() => setIsPopularCarouselPaused(false)}
          >
            <Carousel
              setApi={setPopularCarouselApi}
              opts={{ align: "start", loop: true, dragFree: false }}
              className="w-full"
            >
              <CarouselContent>
                {popularProducts.map((product, idx) => (
                  <CarouselItem
                    key={product.id ?? `${product.name}-${idx}`}
                    className={POPULAR_CARD_CLASS}
                  >
                    <Link
                      to={
                        product.id
                          ? buildProductCatalogHref(
                              { id: product.id, category: product.category },
                              { isFranchiseUser }
                            )
                          : product.link || "/products/forest"
                      }
                      className="group cursor-pointer block"
                    >
                      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-4 shadow-sm border border-[#E2E8D9] bg-gray-100 group-hover:shadow-lg transition-shadow">
                        <img
                          src={product.img}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                          <span className="text-white/80 text-xs font-bold mb-2">{product.category}</span>
                          <span className="text-white font-medium border border-white/50 px-4 py-1.5 rounded-full text-sm backdrop-blur-sm w-fit">
                            자세히 보기
                          </span>
                        </div>
                      </div>
                      <div className="text-center px-1">
                        <span className="text-xs font-bold text-[#4F6F52] mb-1 block">{product.category}</span>
                        <h3 className="text-xl font-bold text-[#1A4D2E] group-hover:text-[#4F6F52] transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 md:left-1 top-[38%] size-10 bg-white/95 border-[#D8E1D1] text-[#1A4D2E] hover:bg-white shadow-md" />
              <CarouselNext className="right-0 md:right-1 top-[38%] size-10 bg-white/95 border-[#D8E1D1] text-[#1A4D2E] hover:bg-white shadow-md" />
            </Carousel>
          </div>

          <Link to="/products/forest" className="md:hidden mt-10 w-full flex justify-center items-center gap-2 text-white bg-[#1A4D2E] hover:bg-[#2d5016] font-bold px-6 py-4 rounded-xl transition-colors">
            상품 더 보기 <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Body Section 3: 고객 지원 및 소통 (Board / Contact) */}
      <section className="py-24 bg-white">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Left column: Notice + Board */}
            <div className="flex flex-col gap-6">
              {/* Notice */}
              <div className="bg-[#FAFAF7] rounded-3xl p-7 md:p-8 border border-gray-100">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-2xl font-bold text-[#1A4D2E]">공지사항</h3>
                  <Link
                    to="/support/notice"
                    className="text-gray-500 hover:text-[#1A4D2E] text-sm font-medium"
                  >
                    더보기 +
                  </Link>
                </div>
                <div className="h-px bg-[#1A4D2E]/20 mb-4" />
                <ul className="space-y-3">
                  {noticesLoading
                    ? null
                    : notices.map((notice, idx) => (
                        <li key={`${notice.id}-${idx}`} className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-16">
                            {notice.is_important ? (
                              <span className="bg-[#1A4D2E] text-white text-xs font-bold px-3 py-1.5 rounded-full block text-center shadow-sm">
                                공지
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full block text-center">
                                일반
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              to="/support/notice"
                              className="block text-[15px] font-medium text-gray-700 hover:text-[#1A4D2E] transition-colors truncate"
                            >
                              {notice.title}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-400 font-medium shrink-0">
                            {new Date(notice.created_at).toLocaleDateString()}
                          </div>
                        </li>
                      ))}
                  {!noticesLoading && notices.length === 0 ? (
                    <li className="text-sm text-gray-500 py-6">공지사항이 없습니다.</li>
                  ) : null}
                </ul>
              </div>

              {/* Board — 공지사항과 동일 리스트 UI */}
              <div className="bg-[#FAFAF7] rounded-3xl p-7 md:p-8 border border-gray-100">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-2xl font-bold text-[#1A4D2E]">산골소통방</h3>
                  <Link
                    to="/community/story"
                    className="text-gray-500 hover:text-[#1A4D2E] text-sm font-medium"
                  >
                    더보기 +
                  </Link>
                </div>
                <div className="h-px bg-[#1A4D2E]/20 mb-4" />
                <ul className="space-y-3">
                  {communityLoading
                    ? null
                    : communityPosts.map((post, idx) => (
                        <li key={`${post.title}-${idx}`} className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-16">
                            <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full block text-center">
                              소통
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={post.link}
                              className="block text-[15px] font-medium text-gray-700 hover:text-[#1A4D2E] transition-colors truncate"
                            >
                              {post.title}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-400 font-medium shrink-0">
                            {post.date}
                          </div>
                        </li>
                      ))}
                  {!communityLoading && communityPosts.length === 0 ? (
                    <li className="text-sm text-gray-500 py-6">게시글이 없습니다.</li>
                  ) : null}
                </ul>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-6">
              {/* Online Inquiry Banner */}
              <Link
                to="/support/inquiry"
                className="bg-[#1A4D2E] rounded-3xl p-7 md:p-8 text-white flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:bg-[#123A21] transition-colors h-40 md:h-48 block"
              >
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    <MessageCircle className="w-7 h-7 text-[#E8DFCA]" /> 온라인문의
                  </h3>
                  <p className="text-white/80">제품 및 프랜차이즈 가맹 관련 문의를 남겨주세요.</p>
                </div>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </Link>

              {/* CS Info */}
              <div className="bg-white rounded-3xl p-6 md:p-7 border-2 border-[#1A4D2E]/10 flex flex-col md:flex-row items-center gap-6 min-h-[200px] md:min-h-[220px]">
                <div className="w-14 h-14 bg-[#4F6F52]/10 rounded-full flex items-center justify-center shrink-0">
                  <Phone className="w-7 h-7 text-[#1A4D2E]" />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm font-bold text-[#4F6F52] mb-1">고객센터</p>
                  <p className="text-3xl md:text-[2rem] font-extrabold text-[#1A4D2E] mb-2 tracking-tight">
                    {String(supportSection.phone ?? "").trim() || "-"}
                  </p>
                  {String(supportSection.notice ?? "").trim() ? (
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {String(supportSection.notice).split("\n").map((line, idx) => (
                      <span key={idx}>
                        {line}
                        <br className="hidden md:block" />
                      </span>
                    ))}
                  </p>
                  ) : null}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
