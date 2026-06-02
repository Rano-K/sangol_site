import { MapPin, Phone, Printer, Building2, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCmsPage } from "../hooks/useCmsPage";
import { SectionQuickLinks } from "./SectionQuickLinks";
import { API_BASE_URL } from "../lib/apiBaseUrl";

const COMPANY_QUICK_LINKS = [
  { to: "/company/greeting", label: "인사말" },
  { to: "/company/history", label: "연혁" },
  { to: "/company/awards", label: "수상,인증" },
  { to: "/company/location", label: "오시는길" },
];

type FranchiseRow = {
  type: string;
  name: string;
  phone: string;
  owner: string;
  ownerPhone: string;
  address: string;
};

function AddressMap({ address, title }: { address: string; title: string }) {
  const query = encodeURIComponent(address);
  const mapUrl = `https://maps.google.com/maps?q=${query}&z=16&output=embed`;
  return (
    <iframe
      src={mapUrl}
      className="w-full h-full min-h-[256px]"
      style={{ border: "none" }}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export function CompanyLocation() {
  const { data } = useCmsPage("company-location");
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [franchiseRows, setFranchiseRows] = useState<FranchiseRow[]>([]);
  const sections = (data?.sections ?? {}) as Record<string, unknown>;
  const header = (sections.header ?? {}) as Record<string, string>;
  const headOffice = (sections.headOffice ?? {}) as Record<string, string>;
  const directStore = (sections.directStore ?? {}) as Record<string, string>;
  const table = (sections.table ?? {}) as Record<string, string>;
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/franchises/location`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload)) {
          setFranchiseRows([]);
          return;
        }
        const mapped = payload.map((row: any) => ({
          type: String(row.store_type || ""),
          name: String(row.name || ''),
          phone: String(row.store_phone || ''),
          owner: String(row.owner_name || ''),
          ownerPhone: String(row.owner_phone || ''),
          address: String(row.address || ''),
        }));
        setFranchiseRows(mapped);
      } catch {
        setFranchiseRows([]);
      }
    };
    run();
    return () => controller.abort();
  }, [apiBaseUrl]);

  return (
    <div className="flex-1 bg-white flex flex-col">
      {/* Page Header Banner */}
      <div className="relative h-64 md:h-80 flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: header.bannerImage ? `url('${header.bannerImage}')` : "none" }}
        />
        <div className="absolute inset-0 bg-[#1A4D2E]/80 mix-blend-multiply" />
        
        <div className="relative z-10 text-center text-white px-6">
          <MapPin className="w-8 h-8 mx-auto mb-4 opacity-80" />
          {String(header.title ?? "").trim() ? (
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{String(header.title).trim()}</h1>
          ) : null}
          {header.subtitle ? <p className="text-[#E8DFCA] text-lg">{header.subtitle}</p> : null}
        </div>
      </div>
      <SectionQuickLinks items={COMPANY_QUICK_LINKS} />

      <div className="site-container py-20 md:py-32 w-full flex flex-col gap-24">
        
        {/* Head Office & Direct Store Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Card 1: 본사(농장) */}
          <div className="bg-[#FAFAF7] rounded-3xl p-8 shadow-sm border border-[#1A4D2E]/10 flex flex-col">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#E8DFCA]">
              <div className="w-12 h-12 bg-[#1A4D2E] text-white rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1A4D2E]">{headOffice.title || "-"}</h2>
                <p className="text-[#4F6F52] text-sm">{headOffice.subTitle || "-"}</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8 flex-grow">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#4F6F52] mt-0.5 shrink-0" />
                <p className="text-gray-700 font-medium break-keep">{headOffice.address || "-"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#4F6F52] shrink-0" />
                <p className="text-gray-700 font-medium">
                  고객센터 :{" "}
                  <span className="font-bold text-[#1A4D2E]">{headOffice.phone || "-"}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-[#4F6F52] shrink-0" />
                <p className="text-gray-700 font-medium">팩스 : {headOffice.fax || "-"}</p>
              </div>
            </div>

            {/* 주소 기반 지도 임베드 (배포/브라우저 환경 호환성 우선) */}
            <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-300 shadow-inner relative z-0">
              {headOffice.address ? (
                <AddressMap title="본사 위치 지도" address={headOffice.address} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50">
                  주소 정보 없음
                </div>
              )}
            </div>
          </div>

          {/* Card 2: 직영점 */}
          <div className="bg-[#FAFAF7] rounded-3xl p-8 shadow-sm border border-[#1A4D2E]/10 flex flex-col">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#E8DFCA]">
              <div className="w-12 h-12 bg-[#4F6F52] text-white rounded-xl flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1A4D2E]">{directStore.title || "-"}</h2>
                <p className="text-[#4F6F52] text-sm">{directStore.subTitle || "-"}</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8 flex-grow">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#4F6F52] mt-0.5 shrink-0" />
                <p className="text-gray-700 font-medium break-keep">{directStore.address || "-"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#4F6F52] shrink-0" />
                <p className="text-gray-700 font-medium">
                  고객센터 :{" "}
                  <span className="font-bold text-[#1A4D2E]">{directStore.phone || "-"}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-[#4F6F52] shrink-0" />
                <p className="text-gray-700 font-medium">팩스 : {directStore.fax || "-"}</p>
              </div>
            </div>

            {/* 주소 기반 지도 임베드 (배포/브라우저 환경 호환성 우선) */}
            <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-300 shadow-inner relative z-0">
              {directStore.address ? (
                <AddressMap title="직영점 위치 지도" address={directStore.address} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50">
                  주소 정보 없음
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Franchise Table Section */}
        <div className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b-2 border-[#1A4D2E] pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1A4D2E] flex items-center gap-2">
                <Store className="w-6 h-6 text-[#4F6F52]" /> 
                {table.title || "-"}
              </h2>
            </div>
            {table.dateText ? (
              <p className="text-gray-500 text-sm font-medium mt-2 md:mt-0">{table.dateText}</p>
            ) : null}
          </div>
          
          <div className="w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#FAFAF7]">
                  <th className="py-4 px-6 font-bold text-[#1A4D2E] border-b border-gray-200 w-24 text-center">매장구분</th>
                  <th className="py-4 px-6 font-bold text-[#1A4D2E] border-b border-gray-200 w-40">매장명</th>
                  <th className="py-4 px-6 font-bold text-[#1A4D2E] border-b border-gray-200 w-36">매장 전화번호</th>
                  <th className="py-4 px-6 font-bold text-[#1A4D2E] border-b border-gray-200 w-24 text-center">대표자</th>
                  <th className="py-4 px-6 font-bold text-[#1A4D2E] border-b border-gray-200 w-36">대표자 전화번호</th>
                  <th className="py-4 px-6 font-bold text-[#1A4D2E] border-b border-gray-200">주소</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {franchiseRows.map((store, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAF7]/50 transition-colors">
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        store.type === '직영점' ? 'bg-[#1A4D2E] text-white' : 'bg-[#E8DFCA] text-[#1A4D2E]'
                      }`}>
                        {store.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-800">{store.name}</td>
                    <td className="py-4 px-6 text-gray-600 font-medium">{store.phone}</td>
                    <td className="py-4 px-6 text-gray-800 text-center">{store.owner}</td>
                    <td className="py-4 px-6 text-gray-600 font-medium">{store.ownerPhone}</td>
                    <td className="py-4 px-6 text-gray-700 text-sm break-keep">{store.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}