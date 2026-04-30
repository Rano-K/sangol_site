import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import franchiseRoutes from './routes/franchises';
import noticeRoutes from './routes/notices';
import inquiryRoutes from './routes/inquiries';
import adminRoutes from './routes/admin';
import contentRoutes from './routes/content';
import communityRoutes from './routes/community';
import shoppingRoutes from './routes/shopping';
import { apiLogger, logApiError } from './middleware/apiLogger';
import { openApiSpec } from './docs/openapi';
import { env, assertServerEnv } from './config/env';

assertServerEnv();

const app = express();
const PORT = env.PORT;
const allowedOrigins = [
  env.FRONTEND_URL,
  env.ADMIN_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
].filter(Boolean) as string[];

// Middleware
app.set('trust proxy', env.TRUST_PROXY);
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  exposedHeaders: ['X-Request-Id'],
}));
// Admin 상품 등록 시 base64 이미지(payload)가 커질 수 있어 body 제한을 상향한다.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(apiLogger);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/franchises', franchiseRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/shopping', shoppingRoutes);
app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: '산골 API 서버가 정상 작동중입니다.' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = Number(err?.status || err?.statusCode || 500);
  logApiError(req, res, err, statusCode);
  res.status(statusCode).json({
    success: false,
    message: err?.message || '요청 처리 중 오류가 발생했습니다.',
    requestId: req.requestId || null,
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: '요청한 경로를 찾을 수 없습니다.',
    requestId: req.requestId || null,
  });
});

app.listen(PORT, async () => {
  console.log(`✅ 산골 API 서버가 포트 ${PORT}에서 실행중입니다.`);
});
