import { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  MessageSquare,
  Bell,
  FileText,
  Settings,
  Music2,
  HelpCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Overview } from './Overview';
import { Orders } from './Orders';
import { Franchises } from './Franchises';
import { Inquiries } from './Inquiries';
import { Products } from './Products';
import { ContentManager } from './ContentManager';
import { ConcertManager } from './ConcertManager';
import { Notices } from './Notices';
import { FaqManager } from './FaqManager';
import { Members } from './Members';

type Tab = 'overview' | 'orders' | 'franchises' | 'members' | 'inquiries' | 'notices' | 'faq' | 'products' | 'content' | 'concert';

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export function Dashboard({ token, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const sidebarExpandedClass = isSidebarOpen ? 'w-64' : 'w-20';
  const sidebarLabelClass = isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none w-0 overflow-hidden';

  const menuItems = [
    { id: 'overview' as Tab, icon: LayoutDashboard, label: '대시보드' },
    { id: 'orders' as Tab, icon: ShoppingBag, label: '주문 관리' },
    { id: 'franchises' as Tab, icon: Users, label: '가맹점 관리' },
    { id: 'members' as Tab, icon: Users, label: '회원 관리' },
    { id: 'products' as Tab, icon: FileText, label: '상품 관리' },
    { id: 'inquiries' as Tab, icon: MessageSquare, label: '문의 관리' },
    { id: 'notices' as Tab, icon: Bell, label: '공지사항 관리' },
    { id: 'faq' as Tab, icon: HelpCircle, label: 'FAQ 관리' },
    { id: 'content' as Tab, icon: Settings, label: '프론트 콘텐츠' },
    { id: 'concert' as Tab, icon: Music2, label: '작은 음악회' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview token={token} onNavigate={setActiveTab} />;
      case 'orders':
        return <Orders token={token} />;
      case 'franchises':
        return <Franchises token={token} />;
      case 'products':
        return <Products token={token} />;
      case 'members':
        return <Members token={token} />;
      case 'inquiries':
        return <Inquiries token={token} />;
      case 'notices':
        return <Notices token={token} />;
      case 'faq':
        return <FaqManager token={token} />;
      case 'content':
        return <ContentManager token={token} />;
      case 'concert':
        return <ConcertManager token={token} />;
      default:
        return <Overview token={token} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarExpandedClass} shrink-0 bg-green-800 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className={`h-full ${isSidebarOpen ? 'p-6' : 'px-3 py-6'} flex flex-col`}>
          <div className={`mb-8 flex items-center ${isSidebarOpen ? '' : 'justify-center'}`}>
            <h1 className={`font-bold whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'text-2xl' : 'text-sm tracking-[0.2em]'}`}>
              {isSidebarOpen ? 'SANGOL ADMIN' : 'SA'}
            </h1>
          </div>

          <nav className="space-y-2 sidebar-nav flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-full flex items-center ${isSidebarOpen ? 'justify-start space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg transition ${
                    activeTab === item.id
                      ? 'bg-green-700 text-white'
                      : 'text-green-100 hover:bg-green-700'
                  }`}
                >
                  <Icon size={20} />
                  <span className={`whitespace-nowrap transition-all duration-300 ${sidebarLabelClass}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={onLogout}
            title="로그아웃"
            className={`w-full flex items-center ${isSidebarOpen ? 'justify-start space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg text-green-100 hover:bg-green-700 transition mt-8 sidebar-logout-btn`}
          >
            <LogOut size={20} />
            <span className={`whitespace-nowrap transition-all duration-300 ${sidebarLabelClass}`}>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-600 hover:text-gray-900"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">관리자</span>
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 min-w-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
