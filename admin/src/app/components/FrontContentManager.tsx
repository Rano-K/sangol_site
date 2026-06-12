import { useState } from 'react';
import { ContentManager } from './ContentManager';
import { PopularProductsManager } from './PopularProductsManager';

type FrontContentTab = 'pages' | 'popular-products';

interface FrontContentManagerProps {
  token: string;
}

const TABS: Array<{ id: FrontContentTab; label: string }> = [
  { id: 'pages', label: '페이지 콘텐츠' },
  { id: 'popular-products', label: '인기상품 관리' },
];

export function FrontContentManager({ token }: FrontContentManagerProps) {
  const [activeTab, setActiveTab] = useState<FrontContentTab>('pages');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">프론트 콘텐츠</h2>
        <p className="text-sm text-gray-600 mt-2">메인 및 각 페이지 콘텐츠와 홈 인기 상품 노출을 관리합니다.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-green-700 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pages' ? <ContentManager token={token} embedded /> : <PopularProductsManager token={token} />}
    </div>
  );
}
