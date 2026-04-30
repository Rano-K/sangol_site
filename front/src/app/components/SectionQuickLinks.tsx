import { Link, useLocation } from "react-router";

type QuickLinkItem = {
  to: string;
  label: string;
};

interface SectionQuickLinksProps {
  items: QuickLinkItem[];
}

export function SectionQuickLinks({ items }: SectionQuickLinksProps) {
  const location = useLocation();

  return (
    <div className="bg-white border-b border-[#E5E7DF] sticky top-20 z-30">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center justify-center overflow-x-auto whitespace-nowrap">
          {items.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-8 py-4 text-base font-semibold border-b-2 transition-colors ${
                  isActive
                    ? "text-[#1A4D2E] border-[#2D7A4A]"
                    : "text-gray-500 border-transparent hover:text-[#1A4D2E]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

