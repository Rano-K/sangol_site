import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type ConcertVideo = {
  id: number;
  title: string;
  youtube_url: string;
  description: string | null;
  hashtags: string | null;
  source_url: string | null;
  is_active: boolean;
  sort_order: number;
};

interface ConcertManagerProps {
  token: string;
}

export function ConcertManager({ token }: ConcertManagerProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [videos, setVideos] = useState<ConcertVideo[]>([]);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const loadVideos = async () => {
    const response = await fetch(`${apiBaseUrl}/community/admin/concert-videos`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '목록 조회 실패');
    setVideos(data);
  };

  useEffect(() => {
    loadVideos().catch((err) => setError(err instanceof Error ? err.message : '오류'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitVideo = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const endpoint = editingId
        ? `${apiBaseUrl}/community/admin/concert-videos/${editingId}`
        : `${apiBaseUrl}/community/admin/concert-videos`;
      const response = await fetch(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, youtubeUrl, description, hashtags, sourceUrl, sortOrder, isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || (editingId ? '수정 실패' : '등록 실패'));

      setTitle('');
      setYoutubeUrl('');
      setDescription('');
      setHashtags('');
      setSourceUrl('');
      setSortOrder(0);
      setIsActive(true);
      setEditingId(null);
      setMessage(editingId ? '영상이 수정되었습니다.' : '영상이 등록되었습니다.');
      await loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류');
    }
  };

  const deleteVideo = async (videoId: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/community/admin/concert-videos/${videoId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '삭제 실패');
      setMessage('영상이 삭제되었습니다.');
      await loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류');
    }
  };

  const startEdit = (video: ConcertVideo) => {
    setEditingId(video.id);
    setTitle(video.title);
    setYoutubeUrl(video.youtube_url);
    setDescription(video.description || '');
    setHashtags(video.hashtags || '');
    setSourceUrl(video.source_url || '');
    setSortOrder(video.sort_order ?? 0);
    setIsActive(video.is_active);
    setMessage('');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setYoutubeUrl('');
    setDescription('');
    setHashtags('');
    setSourceUrl('');
    setSortOrder(0);
    setIsActive(true);
    setMessage('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">작은 음악회 관리</h2>
        <p className="text-sm text-gray-500 mt-1">유튜브 링크를 등록/수정/삭제하면 프론트 작은 음악회에 즉시 반영됩니다.</p>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <form onSubmit={submitVideo} className="bg-white border rounded-xl p-4 space-y-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          등록 가이드: 제목/유튜브 링크는 필수이며, 정렬 순서가 낮을수록 앞에 노출됩니다. 비활성으로 저장하면 프론트에 숨김 처리됩니다.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">영상 제목 <span className="text-red-600">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="영상 제목"
              className="border rounded-lg px-3 py-2 w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유튜브 링크 <span className="text-red-600">*</span></label>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="유튜브 링크"
              className="border rounded-lg px-3 py-2 w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">예: https://www.youtube.com/watch?v=...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            placeholder="정렬 순서"
            className="border rounded-lg px-3 py-2"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="영상 설명"
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="해시태그 (예: #산골 #작은음악회)"
            className="border rounded-lg px-3 py-2"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="원문 링크(선택)"
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            활성(프론트 노출)
          </label>
          <div className="flex items-center gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold"
              >
                수정 취소
              </button>
            ) : null}
            <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
              {editingId ? '영상 수정' : '영상 등록'}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-gray-700">등록된 영상</div>
        <div className="divide-y">
          {videos.map((video) => (
            <div key={video.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{video.title}</p>
                <p className="text-xs text-gray-500 truncate">{video.youtube_url}</p>
                {video.hashtags ? <p className="text-xs text-green-700 truncate mt-0.5">{video.hashtags}</p> : null}
                <p className="text-xs text-gray-500 mt-0.5">
                  정렬: {video.sort_order} / 상태: {video.is_active ? '활성' : '비활성'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(video)}
                  className="text-blue-700 border border-blue-300 px-3 py-1 rounded-md text-sm"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => deleteVideo(video.id)}
                  className="text-red-600 border border-red-300 px-3 py-1 rounded-md text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {videos.length === 0 && <div className="px-4 py-8 text-center text-gray-500">등록된 영상이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

