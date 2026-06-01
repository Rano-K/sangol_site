import { useLocation, Link } from "react-router";
import { Leaf } from "lucide-react";

export function Placeholder() {
  const location = useLocation();
  const pathMap: Record<string, string> = {
    '/login': '가맹점 로그인',
    '/mypage': '마이페이지',
    '/company/greeting': '인사말',
    '/company/history': '연혁',
    '/company/awards': '수상,인증',
    '/company/location': '오시는길',
    '/business/philosophy': '경영철학',
    '/business/vision': '비전',
    '/business/core-competence': '핵심역량',
    '/business/farm': '농장소개',
    '/products/forest': '임산물',
    '/products/agriculture': '농산물',
    '/products/manufactured': '가공식품',
    '/products/wip': '재공품',
    '/support/notice': '공지사항',
    '/support/inquiry': '온라인문의',
    '/support/faq': 'FAQ',
    '/community/story': '산골소통방',
    '/community/concert': '산골이야기',
    '/community/small-music': '작은음악회',
  };

  const title = pathMap[location.pathname] || '준비 중인 페이지';

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-32 bg-[#FAFAF7] text-center px-6">
      <Leaf className="w-16 h-16 text-[#1A4D2E] mb-6 opacity-80" />
      <h1 className="text-3xl md:text-4xl font-bold text-[#1A4D2E] mb-4">{title}</h1>
      <p className="text-[#4F6F52] text-lg mb-8">해당 메뉴의 페이지는 현재 준비 중입니다.</p>
      <Link to="/" className="px-6 py-3 bg-[#4F6F52] hover:bg-[#1A4D2E] text-white font-semibold rounded-lg transition-colors">
        메인으로 돌아가기
      </Link>
    </div>
  );
}