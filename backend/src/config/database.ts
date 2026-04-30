import { Pool, PoolClient } from 'pg';
import { env } from './env';

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 10,
});

// Test connection
pool.connect()
  .then((client: PoolClient) => {
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
    client.release();
  })
  .catch((err: Error) => {
    console.error('❌ PostgreSQL 연결 실패:', err.message);
  });

export default pool;
