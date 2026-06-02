/**
 * CMS 마케팅·레이아웃 초기 데이터 일괄 복구 (restore 모드)
 *
 * npm run seed:cms-restore-all
 *
 * seed:init 직후에는 이 스크립트로 빈 스키마를 예전 기본 문구로 덮어씁니다.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');

const RESTORE_SCRIPTS: Array<{ name: string; env?: Record<string, string> }> = [
  { name: 'seed:site-layout-cms:restore', env: { FORCE_SITE_LAYOUT_CMS_RESTORE: 'true' } },
  { name: 'seed:home-cms:restore', env: { FORCE_HOME_CMS_RESTORE: 'true' } },
  { name: 'seed:brand-intro-cms:restore', env: { FORCE_BRAND_INTRO_CMS_RESTORE: 'true' } },
  { name: 'seed:support-order-cms:restore', env: { FORCE_SUPPORT_ORDER_CMS_RESTORE: 'true' } },
];

function runScript(scriptName: string, extraEnv: Record<string, string> = {}): void {
  console.log(`\n▶ npm run ${scriptName}\n`);
  execSync(`npm run ${scriptName}`, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
}

async function main(): Promise<void> {
  console.log('CMS 전체 복구 시작 (site-layout → home → brand-intro → support/order)\n');
  for (const { name, env } of RESTORE_SCRIPTS) {
    runScript(name, env ?? {});
  }
  console.log('\n✓ CMS 전체 복구 완료');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
