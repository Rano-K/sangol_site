const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "sangol",
  user: process.env.DB_USER || "sangol",
  password: process.env.DB_PASSWORD || "sangol_dev_change_me",
});

async function main() {
  const { rows } = await pool.query("SELECT sections FROM cms_pages WHERE page_key = $1", ["home"]);
  if (rows.length === 0) {
    throw new Error("home cms page not found");
  }

  const sections = rows[0].sections || {};
  sections.features = [
    {
      title: "핵심 역량",
      desc: "청정 원산지 경쟁력과 K-푸드 프리미엄 브랜드 구축을 위한 친환경 재배 기술",
      link: "/business/core-competence",
      img: "https://images.unsplash.com/photo-1719254871588-b4a0e8ba9035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtaW5nJTIwcHJvY2VzcyUyMG5hdHVyZXxlbnwxfHx8fDE3NzMyMjE5MjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      title: "품질인증",
      desc: "2024 농산물 우수관리(GAP) 인증 및 무농약 친환경 재배 방식 고수",
      link: "/company/awards",
      img: "https://images.unsplash.com/photo-1658864679847-c96c1794ff2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxxdWFsaXR5JTIwb3JnYW5pYyUyMGZhcm0lMjBzaWdufGVufDF8fHx8MTc3MzIyMTkyNXww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      title: "수상현황",
      desc: "2025 임산물 국가통합 및 프리미엄 브랜드 지정기업 인증 획득",
      link: "/company/awards",
      img: "https://images.unsplash.com/photo-1742887205589-266ab1623152?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwaGFydmVzdCUyMGZhcm18ZW58MXx8fHwxNzczMjIxOTI0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      title: "농장 소개",
      desc: "정직과 신뢰를 바탕으로 자연 그대로 재배하는 화천 고냉지 농장",
      link: "/business/farm",
      img: "https://images.unsplash.com/photo-1644615339756-0afa02e886f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbmhvdXNlJTIwZmFybSUyMG5hdHVyZXxlbnwxfHx8fDE3NzMyMjE5MjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
  ];

  await pool.query("UPDATE cms_pages SET sections = $1::jsonb, updated_at = NOW() WHERE page_key = $2", [
    JSON.stringify(sections),
    "home",
  ]);

  const check = await pool.query(
    "SELECT jsonb_array_length(sections #> '{features}') AS feature_count FROM cms_pages WHERE page_key = $1",
    ["home"]
  );
  console.log(JSON.stringify(check.rows[0]));
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });

