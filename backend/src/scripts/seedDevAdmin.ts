import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pool from '../config/database';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// 실수로 운영에서 실행되는 것을 막기 위한 옵션(운영에서는 기본적으로 false)
const ALLOW_PROD_SEED_ADMIN = (process.env.ALLOW_PROD_SEED_ADMIN || '').toLowerCase() === 'true';

const main = async (): Promise<void> => {
  if (NODE_ENV === 'production' && !ALLOW_PROD_SEED_ADMIN) {
    throw new Error(
      'production 환경에서는 기본 admin seed가 실행되지 않습니다. ' +
        '개발/테스트에서만 사용하세요. ' +
        '정말 운영에서 실행해야 하면 ALLOW_PROD_SEED_ADMIN=true 를 추가하세요.'
    );
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      'ADMIN_EMAIL / ADMIN_PASSWORD 환경변수가 필요합니다. 예시: ' +
        'ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="yourStrongPassword" npm run seed:dev-admin'
    );
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await pool.query(
    `INSERT INTO users (email, password, name, role, is_active)
     VALUES ($1, $2, 'SANGOL ADMIN', 'admin', TRUE)
     ON CONFLICT (email)
     DO UPDATE SET
       password = EXCLUDED.password,
       name = EXCLUDED.name,
       role = 'admin',
       is_active = TRUE,
       updated_at = NOW()`,
    [ADMIN_EMAIL.trim().toLowerCase(), hashedPassword]
  );

  console.log(`✅ dev admin seed 완료: ${ADMIN_EMAIL.trim().toLowerCase()}`);
};

void main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ seedDevAdmin 실패:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
