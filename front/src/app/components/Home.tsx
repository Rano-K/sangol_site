import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, Award, CheckCircle2, ChevronRight, MessageCircle, Phone, Shield, Truck, Volume2, Leaf } from "lucide-react";
import { useCmsPage } from "../hooks/useCmsPage";
import { API_BASE_URL } from "../lib/apiBaseUrl";

type HomeCard = { title: string; desc: string; link: string; img: string };
type HomeProduct = { name: string; category: string; img: string; link?: string };
type HomeCommunityPost = { title: string; date: string; link: string };
type CommunityPostApiRow = { id: number; title: string; created_at: string };
type NoticeRow = { id: number; title: string; is_important: boolean; created_at: string };
type HomeHeroAction = { label: string; link: string; variant: "primary" | "outline" };
type HomeTrustBadge = { title: string; desc: string };

const DEFAULT_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1733837323673-da9b3a98135e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920",
  "https://images.unsplash.com/photo-1741515044901-58696421d24a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920",
  "https://images.unsplash.com/photo-1695798790639-c3c4294373ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920",
];

const DEFAULT_FEATURES: HomeCard[] = [
  { title: "핵심 역량", desc: "청정 원산지 경쟁력과 K-푸드 프리미엄 브랜드 구축을 위한 친환경 재배 기술", link: "/business/core-competence", img: "https://images.unsplash.com/photo-1719254871588-b4a0e8ba9035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtaW5nJTIwcHJvY2VzcyUyMG5hdHVyZXxlbnwxfHx8fDE3NzMyMjE5MjV8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  { title: "품질인증", desc: "2024 농산물 우수관리(GAP) 인증 및 무농약 친환경 재배 방식 고수", link: "/company/awards", img: "https://images.unsplash.com/photo-1658864679847-c96c1794ff2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxxdWFsaXR5JTIwb3JnYW5pYyUyMGZhcm0lMjBzaWdufGVufDF8fHx8MTc3MzIyMTkyNXww&ixlib=rb-4.1.0&q=80&w=1080" },
  { title: "수상현황", desc: "2025 임산물 국가통합 및 프리미엄 브랜드 지정기업 인증 획득", link: "/company/awards", img: "https://images.unsplash.com/photo-1742887205589-266ab1623152?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwaGFydmVzdCUyMGZhcm18ZW58MXx8fHwxNzczMjIxOTI0fDA&ixlib=rb-4.1.0&q=80&w=1080" },
  { title: "농장 소개", desc: "정직과 신뢰를 바탕으로 자연 그대로 재배하는 화천 고냉지 농장", link: "/business/farm", img: "https://images.unsplash.com/photo-1644615339756-0afa02e886f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbmhvdXNlJTIwZmFybSUyMG5hdHVyZXxlbnwxfHx8fDE3NzMyMjE5MjV8MA&ixlib=rb-4.1.0&q=80&w=1080" },
];

const DEFAULT_PRODUCTS: HomeProduct[] = [
  { name: "명품 산양삼", category: "임산물", img: "https://images.unsplash.com/photo-1622256075005-551338a107fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", link: "/products/forest" },
  { name: "고냉지 토마토", category: "농산물", img: "https://images.unsplash.com/photo-1631292171396-26a654f51c48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", link: "/products/agriculture" },
  { name: "생표고버섯", category: "임산물", img: "https://images.unsplash.com/photo-1603651645989-3c7d3520a912?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", link: "/products/forest" },
  { name: "산골 식혜·수정과", category: "가공제품", img: "https://images.unsplash.com/photo-1715017245420-9638115138a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", link: "/products/manufactured" },
];

const formatDateYMD = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
};

const DEFAULT_HERO_ACTIONS: HomeHeroAction[] = [
  { label: "상품 둘러보기", link: "/products/forest", variant: "primary" },
  { label: "가맹점 주문하기", link: "/order", variant: "outline" },
];

const DEFAULT_TRUST_BADGES: HomeTrustBadge[] = [
  { title: "안전한 원산지", desc: "산지 추적 관리" },
  { title: "품질 인증", desc: "엄격한 선별 기준" },
  { title: "빠른 배송", desc: "신선도 우선 출고" },
  { title: "검수 완료", desc: "출고 전 품질 점검" },
];

const withFixedFeatureLinks = (items: HomeCard[]): HomeCard[] =>
  items.map((item, index) => ({
    ...item,
    link: DEFAULT_FEATURES[index]?.link || item.link,
  }));

const withFixedProductLinks = (items: HomeProduct[]): HomeProduct[] =>
  items.map((item, index) => ({
    ...item,
    link: DEFAULT_PRODUCTS[index]?.link || item.link,
  }));

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data } = useCmsPage("home");
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const heroSection = (sections.hero ?? {}) as Record<string, string>;
  const introSection = (sections.intro ?? {}) as Record<string, string>;
  const apiBaseUrl = API_BASE_URL;
  const [communityPosts, setCommunityPosts] = useState<HomeCommunityPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

  const heroImages =
    Array.isArray(sections.heroImages) && sections.heroImages.length > 0
      ? (sections.heroImages as string[])
      : DEFAULT_HERO_IMAGES;
  // 요구사항: admin에서는 “이미지만” 대체되도록 배열/텍스트/정렬은 기본값 유지
  const cmsFeatures = Array.isArray(sections.features) ? (sections.features as Partial<HomeCard>[]) : [];
  const features = withFixedFeatureLinks(
    DEFAULT_FEATURES.map((base, idx) => ({
      ...base,
      img:
        typeof cmsFeatures[idx]?.img === "string" && cmsFeatures[idx]?.img
          ? String(cmsFeatures[idx].img)
          : base.img,
    }))
  );

  const cmsFeaturedCards = Array.isArray(sections.featuredCards)
    ? (sections.featuredCards as Partial<HomeProduct>[])
    : Array.isArray(sections.products)
      ? (sections.products as Partial<HomeProduct>[])
      : [];
  const featuredCards = withFixedProductLinks(
    DEFAULT_PRODUCTS.map((base, idx) => ({
      ...base,
      img:
        typeof cmsFeaturedCards[idx]?.img === "string" && cmsFeaturedCards[idx]?.img
          ? String(cmsFeaturedCards[idx].img)
          : base.img,
    }))
  );
  const supportSection = (sections.support ?? {}) as Record<string, string>;
  const heroActions =
    Array.isArray(sections.heroActions) && sections.heroActions.length > 0
      ? (sections.heroActions as HomeHeroAction[])
      : DEFAULT_HERO_ACTIONS;
  const trustBadges =
    Array.isArray(sections.trustBadges) && sections.trustBadges.length > 0
      ? (sections.trustBadges as HomeTrustBadge[])
      : DEFAULT_TRUST_BADGES;

  // Auto-slide effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    const controller = new AbortController();

    const loadCommunityPosts = async () => {
      setCommunityLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/community/posts`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "산골이야기 목록 조회 실패");

        const rows = Array.isArray(data) ? (data as CommunityPostApiRow[]) : [];
        const next = rows.slice(0, 4).map((p) => ({
          title: p.title,
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
        setNotices(rows.slice(0, 2));
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
      {/* Hero Section */}
      <section className="relative h-[620px] md:h-[720px] w-full overflow-hidden flex items-center justify-center text-center group">
        {heroImages.map((img, index) => (
          <div 
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0 z-0'}`}
            style={{ backgroundImage: `url('${img}')` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/58 to-black/38 z-10" />
        <div className="absolute inset-0 bg-black/15 z-10" />
        
        <div className="relative z-20 text-white px-6 max-w-5xl mx-auto w-full flex flex-col items-center">
          <p className="text-base md:text-xl font-medium text-[#E8DFCA] mb-5 tracking-wide [text-shadow:0_2px_10px_rgba(0,0,0,0.45)]">
            {heroSection.subtitle || "강원도 화천 청정 두메산골에서 자란 명품 임산물과 고냉지 농산물"}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 leading-[1.25] text-white tracking-tight [text-shadow:0_3px_18px_rgba(0,0,0,0.55)]">
            {(heroSection.title || "자연의 가치를 지키고\n소비자의 삶에 건강과\n행복을 더하는 것을\n목표로 하고 있습니다.").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br />
              </span>
            ))}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {heroActions.map((action, index) => {
              const isPrimaryAction =
                (action.label || "").includes("주문") || action.variant === "primary" || index === 1;

              return (
                <Link
                  key={`${action.label}-${index}`}
                  to={action.link || "/products/forest"}
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
          </div>
          
          <div className="flex gap-3 mt-12">
            {heroImages.map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-12 h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-white' : 'bg-white/30 hover:bg-white/60'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-gradient-to-b from-[#F5F7F1] to-white border-b border-[#E8EDE2]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[Shield, Award, Truck, CheckCircle2].map((Icon, index) => {
            const badge = trustBadges[index] || DEFAULT_TRUST_BADGES[index];
            return (
              <div key={`${badge.title}-${index}`} className="rounded-2xl border border-[#E1E8D9] bg-white px-4 py-4 flex items-center gap-3">
                <Icon className="w-5 h-5 text-[#1A4D2E]" />
                <div>
                  <p className="text-sm font-semibold text-[#1A4D2E]">{badge.title}</p>
                  <p className="text-xs text-[#6D7568]">{badge.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* About CEO / Philosophy Section (New Addition based on Analysis) */}
      <section className="py-20 bg-[#FAFAF7]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Leaf className="w-12 h-12 text-[#1A4D2E] mx-auto mb-6" />
          <h2 className="text-3xl font-extrabold text-[#1A4D2E] mb-6">"신뢰를 바탕으로 건강한 먹거리를 공급합니다"</h2>
          <p className="text-[#4F6F52] text-lg leading-relaxed mb-4">
            {(introSection.description1 || "금융권 경력을 뒤로하고 고향으로 돌아와 설립한 농업법인 (주)산골은\n강원도 화천의 맑은 자연이 주는 선물에 정성을 더해 명품 임산물을 키워냅니다.").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="hidden md:block" />
              </span>
            ))}
          </p>
          <p className="text-gray-500">
            {(introSection.description2 || "사람과 자연의 조화, 그리고 정직과 신뢰의 경영 철학으로\n지속가능한 체험·가공·관광 농업의 비전을 실현하며 K-푸드 프리미엄 브랜드로 도약하겠습니다.").split("\n").map((line, idx) => (
              <span key={idx}>
                {line}
                <br className="hidden md:block" />
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* Body Section 1: 기업 핵심 가치 (Feature Cards) */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div key={`${feature.title}-${idx}`} className="group flex flex-col h-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white">
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                  <img src={feature.img} alt={feature.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-bold text-[#1A4D2E] mb-4 group-hover:text-[#4F6F52] transition-colors">{feature.title}</h3>
                  <p className="text-gray-600 text-[15px] leading-relaxed mb-8 flex-grow">
                    {feature.desc}
                  </p>
                  <Link to={feature.link || "#"} className="flex items-center gap-2 text-[#4F6F52] font-semibold text-sm group-hover:text-[#1A4D2E] mt-auto w-fit">
                    자세히 보기 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Body Section 2: 주요 상품 라인업 (Product Cards) */}
      <section className="py-24 bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-6">
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredCards.map((product, idx) => (
              <Link to={product.link || "/products/forest"} key={`${product.name}-${idx}`} className="group cursor-pointer block">
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
                <div className="text-center">
                  <span className="text-xs font-bold text-[#4F6F52] mb-1 block">{product.category}</span>
                  <h3 className="text-xl font-bold text-[#1A4D2E] group-hover:text-[#4F6F52] transition-colors">{product.name}</h3>
                  <p className="text-sm font-semibold text-[#1A4D2E] mt-1">신선 당일 선별</p>
                </div>
              </Link>
            ))}
          </div>
          
          <Link to="/products/forest" className="md:hidden mt-10 w-full flex justify-center items-center gap-2 text-white bg-[#1A4D2E] hover:bg-[#2d5016] font-bold px-6 py-4 rounded-xl transition-colors">
            상품 더 보기 <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Body Section 3: 고객 지원 및 소통 (Board / Contact) */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
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

              {/* Board */}
              <div className="bg-[#FAFAF7] rounded-3xl p-7 md:p-8 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-[#1A4D2E] flex items-center gap-3">
                    <Volume2 className="w-6 h-6 text-[#4F6F52]" /> 산골이야기
                  </h3>
                  <Link
                    to="/community/story"
                    className="text-gray-500 hover:text-[#1A4D2E] text-sm font-medium"
                  >
                    더보기 +
                  </Link>
                </div>
                <ul className="space-y-4">
                  {communityLoading
                    ? null
                    : communityPosts.map((post, idx) => (
                        <li key={`${post.title}-${idx}`}>
                          <Link
                            to={post.link}
                            className="group flex justify-between items-center py-4 border-b border-gray-200 last:border-0 hover:border-[#1A4D2E] transition-colors cursor-pointer"
                          >
                            <span className="text-gray-700 font-medium group-hover:text-[#1A4D2E] truncate pr-4">
                              {post.title}
                            </span>
                            <span className="text-sm text-gray-400 shrink-0">{post.date}</span>
                          </Link>
                        </li>
                      ))}
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
                  <p className="text-3xl md:text-[2rem] font-extrabold text-[#1A4D2E] mb-2 tracking-tight">{supportSection.phone || "-"}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {(supportSection.notice || "주말 및 공휴일은 상담 불가하므로\n평일 업무 시간 내 문의 부탁드립니다.").split("\n").map((line, idx) => (
                      <span key={idx}>
                        {line}
                        <br className="hidden md:block" />
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
