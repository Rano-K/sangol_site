import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

type StoryPost = {
  id: number;
  title: string;
  content: string;
  author_name: string;
  views: number;
  is_secret: boolean;
  is_active: boolean;
  comment_count: number;
  created_at: string;
};

type StoryComment = {
  id: number;
  post_id: number;
  parent_comment_id?: number | null;
  author_name: string;
  content: string;
  is_active: boolean;
  created_at: string;
};

interface StoryManagerProps {
  token: string;
}

export function StoryManager({ token }: StoryManagerProps) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const headers = { Authorization: `Bearer ${token}` };
  const [posts, setPosts] = useState<StoryPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [postPassword, setPostPassword] = useState('');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPosts = async () => {
    const response = await fetch(`${apiBaseUrl}/community/admin/posts`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '목록 조회 실패');
    setPosts(Array.isArray(data) ? data : []);
  };

  const loadPostDetail = async (postId: number) => {
    const response = await fetch(`${apiBaseUrl}/community/admin/posts/${postId}`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || '상세 조회 실패');
    setSelectedPostId(postId);
    setComments(Array.isArray(data?.comments) ? data.comments : []);
    setReplyTargetId(null);
  };

  useEffect(() => {
    void loadPosts().catch((e) => setError(e instanceof Error ? e.message : '오류'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPostForm = () => {
    setTitle('');
    setContent('');
    setAuthorName('');
    setIsSecret(false);
    setPostPassword('');
    setEditingPostId(null);
  };

  const submitPost = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const endpoint = editingPostId
        ? `${apiBaseUrl}/community/admin/posts/${editingPostId}`
        : `${apiBaseUrl}/community/admin/posts`;
      const method = editingPostId ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          authorName,
          isSecret,
          ...(postPassword.trim() ? { postPassword: postPassword.trim() } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '저장 실패');
      setMessage(editingPostId ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.');
      resetPostForm();
      await loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  const editPost = (post: StoryPost) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setAuthorName(post.author_name);
    setIsSecret(post.is_secret);
    setPostPassword('');
  };

  const deletePost = async (postId: number) => {
    if (!window.confirm('해당 게시글을 삭제(비활성)하시겠습니까?')) return;
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/community/admin/posts/${postId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '삭제 실패');
      setMessage('게시글이 삭제되었습니다.');
      if (selectedPostId === postId) {
        setSelectedPostId(null);
        setComments([]);
      }
      await loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPostId) return;
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/community/admin/posts/${selectedPostId}/comments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: commentAuthor, content: commentContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '댓글 등록 실패');
      setCommentAuthor('');
      setCommentContent('');
      setReplyTargetId(null);
      setMessage('댓글이 등록되었습니다.');
      await loadPostDetail(selectedPostId);
      await loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPostId || !replyTargetId) return;
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/community/admin/posts/${selectedPostId}/comments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentCommentId: replyTargetId,
          authorName: replyAuthor,
          content: replyContent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '대댓글 등록 실패');
      setReplyAuthor('');
      setReplyContent('');
      setReplyTargetId(null);
      setMessage('대댓글이 등록되었습니다.');
      await loadPostDetail(selectedPostId);
      await loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  const updateComment = async (commentId: number, content: string) => {
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/community/admin/comments/${commentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '댓글 수정 실패');
      setMessage('댓글이 수정되었습니다.');
      if (selectedPostId) await loadPostDetail(selectedPostId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!window.confirm('해당 댓글을 삭제(비활성)하시겠습니까?')) return;
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/community/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '댓글 삭제 실패');
      setMessage('댓글이 삭제되었습니다.');
      if (selectedPostId) {
        await loadPostDetail(selectedPostId);
        await loadPosts();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류');
    }
  };

  const buildCommentTree = (rawComments: StoryComment[]) => {
    const byParent = new Map<number, StoryComment[]>();
    const roots: StoryComment[] = [];
    rawComments.forEach((item) => {
      if (!item.parent_comment_id) {
        roots.push(item);
        return;
      }
      const current = byParent.get(item.parent_comment_id) ?? [];
      current.push(item);
      byParent.set(item.parent_comment_id, current);
    });
    return { roots, byParent };
  };

  const { roots: rootComments, byParent: childCommentMap } = useMemo(
    () => buildCommentTree(comments),
    [comments]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">산골소통방 관리</h2>
        <p className="text-sm text-gray-500 mt-1">산골소통방 게시글/댓글/비밀글을 운영 관리합니다.</p>
      </div>

      {message ? <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{message}</div> : null}
      {error ? <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div> : null}

      <form onSubmit={submitPost} className="bg-white border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="작성자" className="border rounded-lg px-3 py-2" required />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="border rounded-lg px-3 py-2" required />
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" className="border rounded-lg px-3 py-2 w-full min-h-24" required />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} />
            비밀글
          </label>
          {isSecret ? (
            <input
              type="password"
              value={postPassword}
              onChange={(e) => setPostPassword(e.target.value)}
              placeholder={editingPostId ? '변경할 비밀번호(선택)' : '비밀번호(필수)'}
              className="border rounded-lg px-3 py-2 text-sm"
              required={!editingPostId}
              minLength={4}
            />
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {editingPostId ? (
              <button type="button" onClick={resetPostForm} className="px-3 py-2 border rounded-lg text-sm">
                취소
              </button>
            ) : null}
            <button type="submit" className="px-4 py-2 bg-[#1A4D2E] text-white rounded-lg text-sm font-semibold">
              {editingPostId ? '게시글 수정' : '게시글 등록'}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-gray-700">등록된 게시글</div>
        <div className="divide-y">
          {posts.map((post) => (
            <div key={post.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => void loadPostDetail(post.id)} className="min-w-0 text-left flex-1">
                <p className="font-semibold text-gray-800 truncate">{post.is_secret ? '🔒 ' : ''}{post.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  작성자: {post.author_name} · 댓글 {post.comment_count}개 · 조회수 {post.views}
                </p>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => editPost(post)} className="text-blue-700 border border-blue-300 px-3 py-1 rounded-md text-sm">수정</button>
                <button type="button" onClick={() => void deletePost(post.id)} className="text-red-600 border border-red-300 px-3 py-1 rounded-md text-sm">삭제</button>
              </div>
            </div>
          ))}
          {posts.length === 0 ? <div className="px-4 py-8 text-center text-gray-500">등록된 게시글이 없습니다.</div> : null}
        </div>
      </div>

      {selectedPostId ? (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-[#1A4D2E]">댓글 관리 (게시글 #{selectedPostId})</h3>
          <form onSubmit={submitComment} className="space-y-2">
            <input value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} placeholder="댓글 작성자" className="border rounded-lg px-3 py-2 w-full" required />
            <textarea value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="댓글 내용" className="border rounded-lg px-3 py-2 w-full min-h-20" required />
            <button type="submit" className="px-4 py-2 bg-[#1A4D2E] text-white rounded-lg text-sm font-semibold">댓글 등록</button>
          </form>
          {replyTargetId ? (
            <form onSubmit={submitReply} className="space-y-2 border rounded-lg p-3 bg-emerald-50/60">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[#1A4D2E] font-semibold">대댓글 작성 대상 댓글 #{replyTargetId}</p>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTargetId(null);
                    setReplyAuthor('');
                    setReplyContent('');
                  }}
                  className="text-xs px-2 py-1 border rounded-md"
                >
                  취소
                </button>
              </div>
              <input value={replyAuthor} onChange={(e) => setReplyAuthor(e.target.value)} placeholder="대댓글 작성자" className="border rounded-lg px-3 py-2 w-full" required />
              <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="대댓글 내용" className="border rounded-lg px-3 py-2 w-full min-h-20" required />
              <button type="submit" className="px-4 py-2 bg-[#1A4D2E] text-white rounded-lg text-sm font-semibold">대댓글 등록</button>
            </form>
          ) : null}
          <div className="divide-y border rounded-lg">
            {rootComments.map((comment) => (
              <StoryCommentRow
                key={comment.id}
                comment={comment}
                depth={0}
                onUpdate={updateComment}
                onDelete={deleteComment}
                onReply={(id) => setReplyTargetId(id)}
              />
            ))}
            {rootComments.map((comment) =>
              (childCommentMap.get(comment.id) ?? []).map((reply) => (
                <StoryCommentRow
                  key={reply.id}
                  comment={reply}
                  depth={1}
                  onUpdate={updateComment}
                  onDelete={deleteComment}
                  onReply={(id) => setReplyTargetId(id)}
                />
              ))
            )}
            {comments.length === 0 ? <div className="px-4 py-6 text-center text-gray-500 text-sm">등록된 댓글이 없습니다.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StoryCommentRow({
  comment,
  depth,
  onUpdate,
  onDelete,
  onReply,
}: {
  comment: StoryComment;
  depth: number;
  onUpdate: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReply: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);

  useEffect(() => {
    setContent(comment.content);
  }, [comment.content]);

  return (
    <div className={`px-3 py-2 ${depth > 0 ? 'bg-gray-50 ml-6 border-l-2 border-emerald-200' : ''}`}>
      <p className="text-sm font-semibold text-gray-800">
        {depth > 0 ? '↳ ' : ''}
        {comment.author_name}
      </p>
      {editing ? (
        <div className="space-y-2 mt-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm min-h-20"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onUpdate(comment.id, content).then(() => setEditing(false))}
              className="text-blue-700 border border-blue-300 px-2 py-1 rounded text-xs"
            >
              저장
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-600 border px-2 py-1 rounded text-xs">
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 mt-1">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => onReply(comment.id)} className="text-emerald-700 border border-emerald-300 px-2 py-1 rounded text-xs">대댓글</button>
            <button type="button" onClick={() => setEditing(true)} className="text-blue-700 border border-blue-300 px-2 py-1 rounded text-xs">수정</button>
            <button type="button" onClick={() => void onDelete(comment.id)} className="text-red-600 border border-red-300 px-2 py-1 rounded text-xs">삭제</button>
          </div>
        </div>
      )}
    </div>
  );
}
