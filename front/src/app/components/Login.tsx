import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      const redirectTo = (location.state as { from?: string } | null)?.from || "/";
      navigate(redirectTo);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="flex-1 bg-[#F4F6F1] py-20 px-4">
        <div className="max-w-xl mx-auto bg-white border border-[#E2E8D9] rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-[#1A4D2E] mb-2">이미 로그인되어 있습니다.</h1>
          <p className="text-[#5F675B] mb-6">{user.name}님, 환영합니다.</p>
          <Link to="/mypage" className="inline-flex px-5 py-2.5 rounded-lg bg-[#1A4D2E] text-white font-semibold hover:bg-[#123A21] transition-colors">
            마이페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F4F6F1] py-20 px-4">
      <div className="max-w-xl mx-auto bg-white border border-[#E2E8D9] rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-[#1A4D2E] mb-2">로그인</h1>
        <p className="text-[#5F675B] mb-6">가맹점 또는 관리자 계정으로 로그인하세요.</p>

        {error ? (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3D4639] mb-1">
              이메일 <span className="text-red-600">* 필수</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-[#D6DECB] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#1A4D2E]/30"
              placeholder="example@sangol.com"
              required
            />
            <p className="mt-1 text-xs text-gray-500">가입된 이메일 주소를 입력하세요.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D4639] mb-1">
              비밀번호 <span className="text-red-600">* 필수</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-[#D6DECB] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#1A4D2E]/30"
              placeholder="비밀번호를 입력하세요"
              required
            />
            <p className="mt-1 text-xs text-gray-500">영문/숫자/특수문자 조합을 권장합니다.</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A4D2E] hover:bg-[#123A21] text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
