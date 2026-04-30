import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type Member = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'franchise';
  franchise_id: number | null;
  franchise_key: string | null;
  member_link_key: string | null;
  franchise_name: string;
  location_franchise_name: string;
  is_active: boolean;
  created_at: string;
};

type Franchise = {
  id: number;
  franchise_key: string;
  name: string;
};

type MemberForm = {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'franchise';
  franchiseKey: string;
  isActive: boolean;
};

interface MembersProps {
  token: string;
}

const parseJsonSafely = async (response: Response): Promise<any> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { error: `서버 응답이 JSON 형식이 아닙니다. (${response.status})` };
  }
};

const getApiErrorMessage = (payload: any, fallback: string): string => {
  if (payload?.error) return String(payload.error);
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const first = payload.errors[0];
    const path = String(first?.path || '');
    if (path === 'password') return '비밀번호는 6자 이상 입력해야 합니다.';
    if (path === 'email') return '유효한 이메일 형식으로 입력해 주세요.';
    if (path === 'name') return '이름을 올바르게 입력해 주세요.';
    if (path === 'role') return '권한(admin/franchise)을 확인해 주세요.';
    if (path === 'franchiseId' || path === 'franchiseKey') return '가맹점을 선택해 주세요.';
    return String(first?.msg || fallback);
  }
  return fallback;
};

const defaultForm: MemberForm = {
  email: '',
  name: '',
  password: '',
  role: 'franchise',
  franchiseKey: '',
  isActive: true,
};

export function Members({ token }: MembersProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const [members, setMembers] = useState<Member[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [form, setForm] = useState<MemberForm>(defaultForm);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [memberKeywordFilter, setMemberKeywordFilter] = useState('');

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, franchisesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/members`, { headers: authHeaders }),
        fetch(`${apiBaseUrl}/admin/members/franchises`, { headers: authHeaders }),
      ]);

      const membersData = await parseJsonSafely(membersRes);
      const franchisesData = await parseJsonSafely(franchisesRes);

      if (!membersRes.ok) throw new Error(getApiErrorMessage(membersData, '회원 목록 조회 실패'));
      if (!franchisesRes.ok) throw new Error(getApiErrorMessage(franchisesData, '가맹점 목록 조회 실패'));

      setMembers(membersData);
      setFranchises(Array.isArray(franchisesData) ? franchisesData : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMembers = useMemo(() => {
    const keyword = memberKeywordFilter.trim().toLowerCase();
    if (!keyword) return members;
    return members.filter(
      (member) =>
        member.email.toLowerCase().includes(keyword) ||
        member.name.toLowerCase().includes(keyword) ||
        String(member.franchise_name || '').toLowerCase().includes(keyword) ||
        String(member.location_franchise_name || '').toLowerCase().includes(keyword)
    );
  }, [members, memberKeywordFilter]);

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setForm({
      email: member.email,
      name: member.name,
      password: '',
      role: member.role,
      franchiseKey: member.franchise_key || '',
      isActive: member.is_active,
    });
    setMessage('');
    setError('');
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingMember(null);
  };

  const submitCreateOrUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (form.role === 'franchise' && !form.franchiseKey) {
      setError('가맹점 회원은 가맹점을 선택해야 합니다.');
      return;
    }

    try {
      const isEdit = Boolean(editingMember);
      const endpoint = isEdit
        ? `${apiBaseUrl}/admin/members/${editingMember?.id}`
        : `${apiBaseUrl}/admin/members`;
      const method = isEdit ? 'PATCH' : 'POST';

      const payload: Record<string, unknown> = {
        email: form.email,
        name: form.name,
        role: form.role,
        franchiseKey: form.role === 'franchise' ? form.franchiseKey : null,
        isActive: form.isActive,
      };
      if (!isEdit || form.password.trim()) {
        payload.password = form.password;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) throw new Error(getApiErrorMessage(data, '회원 저장 실패'));

      setMessage(isEdit ? '회원 정보가 수정되었습니다.' : '회원이 생성되었습니다.');
      resetForm();
      await loadAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '회원 저장에 실패했습니다.');
    }
  };

  const deactivateMember = async (memberId: number) => {
    if (!window.confirm('해당 회원을 비활성 처리하시겠습니까?')) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) throw new Error(getApiErrorMessage(data, '회원 비활성 실패'));
      setMessage('회원이 비활성 처리되었습니다.');
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '회원 비활성에 실패했습니다.');
    }
  };
  const activateMember = async (memberId: number) => {
    if (!window.confirm('해당 회원을 활성 처리하시겠습니까?')) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) throw new Error(getApiErrorMessage(data, '회원 활성 실패'));
      setMessage('회원이 활성 처리되었습니다.');
      await loadAll();
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : '회원 활성에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">회원 관리</h2>
        <p className="text-sm text-gray-500 mt-1">회원 조회/생성/수정/비활성(CRUD)을 관리합니다.</p>
      </div>

      {message ? <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{message}</div> : null}
      {error ? <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div> : null}

      <form onSubmit={submitCreateOrUpdate} className="bg-white border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-gray-800">{editingMember ? '회원 수정' : '회원 생성'}</h3>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
          <p><strong>입력 가이드</strong></p>
          <p>- <strong>이메일</strong>: 로그인 ID로 사용됩니다. (중복 불가)</p>
          <p>- <strong>이름</strong>: 사용자 표시명입니다.</p>
          <p>- <strong>비밀번호</strong>: 최소 6자 이상. 수정 시 비워두면 기존 비밀번호 유지.</p>
          <p>- <strong>권한</strong>: `admin`은 관리자, `franchise`는 가맹점 사용자입니다.</p>
          <p>- <strong>가맹점</strong>: 권한이 `franchise`일 때 반드시 선택해야 하며 고유 연동키로 저장됩니다.</p>
          <p>- <strong>활성 회원</strong>: 비활성화하면 로그인 불가 상태로 관리됩니다.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="text-sm text-gray-700 space-y-1">
            <span className="font-medium">이메일 <span className="text-red-600">*</span></span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="예: user@sangol.com"
              required
            />
            <p className="text-xs text-gray-500">로그인 ID로 사용됩니다. 중복 불가</p>
          </label>
          <label className="text-sm text-gray-700 space-y-1">
            <span className="font-medium">이름 <span className="text-red-600">*</span></span>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="예: 홍길동"
              required
            />
            <p className="text-xs text-gray-500">화면에 표시되는 사용자 이름</p>
          </label>
          <label className="text-sm text-gray-700 space-y-1">
            <span className="font-medium">비밀번호 {!editingMember ? <span className="text-red-600">*</span> : null}</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder={editingMember ? '변경할 때만 입력' : '6자 이상 입력'}
              required={!editingMember}
            />
            <p className="text-xs text-gray-500">최소 6자, 수정 시 미입력하면 기존 값 유지</p>
          </label>
          <label className="text-sm text-gray-700 space-y-1">
            <span className="font-medium">권한 <span className="text-red-600">*</span></span>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => {
                  const nextRole = e.target.value as MemberForm['role'];
                  return {
                    ...prev,
                    role: nextRole,
                    // admin 전환 시 가맹점 값이 남아 잘못 전송되는 것을 방지
                    franchiseKey: nextRole === 'franchise' ? prev.franchiseKey : '',
                  };
                })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="franchise">franchise (가맹점 회원)</option>
              <option value="admin">admin (관리자)</option>
            </select>
            <p className="text-xs text-gray-500">admin 또는 franchise 선택</p>
          </label>
          <label className="text-sm text-gray-700 space-y-1">
            <span className="font-medium">가맹점 {form.role === 'franchise' ? <span className="text-red-600">*</span> : null}</span>
            <select
              value={form.franchiseKey}
              onChange={(e) => setForm((prev) => ({ ...prev, franchiseKey: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              disabled={form.role !== 'franchise'}
            >
              <option value="">가맹점 선택</option>
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.franchise_key}>
                  {franchise.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">franchise 권한일 때 필수 선택</p>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-7">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            활성 회원
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg">
            {editingMember ? '수정 저장' : '회원 생성'}
          </button>
          {editingMember ? (
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg">
              취소
            </button>
          ) : null}
        </div>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            회원 {filteredMembers.length}명
            {memberKeywordFilter.trim() ? ` (검색: ${memberKeywordFilter.trim()})` : ''}
          </p>
          <input
            type="text"
            value={memberKeywordFilter}
            onChange={(e) => setMemberKeywordFilter(e.target.value)}
            placeholder="이메일/이름/가맹점 검색"
            className="w-44 border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이메일</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이름</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">권한</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">가맹점</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">가맹점관리명</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  회원 목록을 불러오는 중입니다.
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 text-sm text-gray-700">{member.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{member.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{member.role}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{member.franchise_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{member.location_franchise_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {member.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(member)}
                        className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                      >
                        수정
                      </button>
                      {member.is_active ? (
                        <button
                          type="button"
                          onClick={() => void deactivateMember(member.id)}
                          className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          비활성
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void activateMember(member.id)}
                          className="px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50"
                        >
                          활성
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
