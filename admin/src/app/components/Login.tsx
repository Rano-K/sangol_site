import { useState, FormEvent } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';
import type { AuthUser } from '../lib/authSession';

interface LoginProps {
  onLogin: (payload: {
    token: string;
    refreshToken: string;
    refreshIdleExpiresIn?: string;
    user: AuthUser;
  }) => Promise<void>;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiBaseUrl = API_BASE_URL;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || '로그인에 실패했습니다.');
        return;
      }

      if (!data?.refreshToken) {
        setError('로그인 응답에 refresh token이 없습니다. 백엔드를 최신 버전으로 업데이트해주세요.');
        return;
      }

      if (data?.user?.role !== 'admin') {
        setError('관리자 계정만 로그인할 수 있습니다.');
        return;
      }

      await onLogin({
        token: data.token,
        refreshToken: data.refreshToken,
        refreshIdleExpiresIn: data.refreshIdleExpiresIn,
        user: data.user,
      });
    } catch (fetchError) {
      setError('서버 연결에 실패했습니다. 백엔드 상태를 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">SANGOL ADMIN</h1>
          <p className="text-gray-600">농업회사법인 (주)산골 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일 <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="이메일"
              required
            />
            <p className="mt-1 text-xs text-gray-500">관리자 계정 이메일을 입력하세요.</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 <span className="text-red-600">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
            <p className="mt-1 text-xs text-gray-500">보안을 위해 비밀번호는 화면에 표시되지 않습니다.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 transition font-medium"
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 space-y-1">
          <p>관리자 계정으로만 접근 가능합니다</p>
          <p>1시간 동안 활동이 없으면 자동 로그아웃됩니다</p>
        </div>
      </div>
    </div>
  );
}
