import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { getCommunityPostListTitle } from "../lib/communityPost";

type StoryPost = {
  id: number;
  title: string;
  content: string;
  author_name: string;
  views: number;
  is_secret: boolean;
  created_at: string;
};

type StoryComment = {
  id: number;
  post_id: number;
  author_name: string;
  content: string;
  created_at: string;
};

export function CommunityStory() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [posts, setPosts] = useState<StoryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);

  const [selectedPost, setSelectedPost] = useState<StoryPost | null>(null);
  const [selectedPostPassword, setSelectedPostPassword] = useState("");
  const [isEditingSecretPost, setIsEditingSecretPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentContent, setCommentContent] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [newPostPassword, setNewPostPassword] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/community/posts`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "산골소통방 목록 조회 실패");
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, [toastVisible, toastMessage]);

  const openPostDetail = async (post: StoryPost) => {
    try {
      let detailUrl = `${apiBaseUrl}/community/posts/${post.id}`;
      if (post.is_secret) {
        const inputPassword = window.prompt("비밀글 비밀번호를 입력해 주세요.");
        if (!inputPassword) return;
        detailUrl += `?postPassword=${encodeURIComponent(inputPassword)}`;
        setSelectedPostPassword(inputPassword);
      } else {
        setSelectedPostPassword("");
      }

      const response = await fetch(detailUrl);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "게시글 상세 조회 실패");
      setSelectedPost(data.post);
      setComments(data.comments || []);
      setEditTitle(data.post?.title || "");
      setEditContent(data.post?.content || "");
      setEditPassword("");
      setIsEditingSecretPost(false);
    } catch (err) {
      setToastVariant("error");
      setToastMessage(err instanceof Error ? err.message : "게시글을 불러오지 못했습니다.");
      setToastVisible(true);
    }
  };

  const submitPost = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBaseUrl}/community/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          authorName: newAuthor,
          isSecret: newIsSecret,
          postPassword: newIsSecret ? newPostPassword : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "게시글 등록 실패");
      setNewTitle("");
      setNewContent("");
      setNewAuthor("");
      setNewIsSecret(false);
      setNewPostPassword("");
      await loadPosts();
      setToastVariant("success");
      setToastMessage("게시글이 등록되었습니다.");
      setToastVisible(true);
    } catch (err) {
      setToastVariant("error");
      setToastMessage(err instanceof Error ? err.message : "게시글 등록 중 오류");
      setToastVisible(true);
    }
  };

  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;
    try {
      const response = await fetch(`${apiBaseUrl}/community/posts/${selectedPost.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: commentAuthor, content: commentContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "댓글 등록 실패");
      setCommentAuthor("");
      setCommentContent("");
      await openPostDetail(selectedPost);
    } catch (err) {
      setToastVariant("error");
      setToastMessage(err instanceof Error ? err.message : "댓글 등록 중 오류");
      setToastVisible(true);
    }
  };

  const submitSecretPostEdit = async (e: FormEvent) => {
    e.preventDefault();
    await saveSecretPostEdit();
  };

  const saveSecretPostEdit = async (): Promise<boolean> => {
    if (!selectedPost) return false;
    try {
      const response = await fetch(`${apiBaseUrl}/community/posts/${selectedPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          postPassword: editPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "비밀글 수정 실패");
      setToastVariant("success");
      setToastMessage("비밀글이 수정되었습니다.");
      setToastVisible(true);
      setSelectedPost(data.post);
      setIsEditingSecretPost(false);
      setEditPassword("");
      await loadPosts();
      return true;
    } catch (err) {
      setToastVariant("error");
      setToastMessage(err instanceof Error ? err.message : "비밀글 수정 중 오류");
      setToastVisible(true);
      return false;
    }
  };

  const closeStoryModal = async () => {
    if (!selectedPost) return;
    const hasSecretEditChanges =
      selectedPost.is_secret &&
      isEditingSecretPost &&
      (editTitle !== selectedPost.title || editContent !== selectedPost.content || editPassword.trim().length > 0);

    if (hasSecretEditChanges) {
      const shouldApply = window.confirm("수정한 내역을 반영하시겠습니까?");
      if (shouldApply) {
        const saved = await saveSecretPostEdit();
        if (!saved) return;
      }
    }

    setSelectedPost(null);
    setSelectedPostPassword("");
    setIsEditingSecretPost(false);
  };

  useEffect(() => {
    if (!selectedPost) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void closeStoryModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPost, isEditingSecretPost, editTitle, editContent, editPassword]);

  return (
    <div className="flex-1 bg-[#FAFAF7] min-h-screen">
      <div className="site-container site-container--narrow py-14 space-y-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1A4D2E]">산골소통방</h1>
          <p className="text-[#4F6F52] mt-2">일반 글 작성과 댓글 소통이 가능한 커뮤니티입니다.</p>
        </div>

        <form onSubmit={submitPost} className="bg-white rounded-2xl border border-[#E2E5D9] p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#1A4D2E]">새 글 작성</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">작성자 <span className="text-red-600">*</span></label>
              <input
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="작성자"
                className="border rounded-lg px-3 py-2 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 <span className="text-red-600">*</span></label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="제목"
                className="border rounded-lg px-3 py-2 w-full"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용 <span className="text-red-600">*</span></label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="내용"
              className="border rounded-lg px-3 py-2 w-full min-h-28"
              required
            />
            <p className="text-xs text-gray-500 mt-1">상세 내용을 입력하세요. 줄바꿈 가능합니다.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[#1A4D2E]">
            <input
              type="checkbox"
              checked={newIsSecret}
              onChange={(e) => setNewIsSecret(e.target.checked)}
              className="w-4 h-4"
            />
            비밀글(관리자만 열람)
          </label>
          {newIsSecret ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀글 비밀번호 <span className="text-red-600">*</span></label>
              <input
                type="password"
                value={newPostPassword}
                onChange={(e) => setNewPostPassword(e.target.value)}
                placeholder="비밀글 수정용 비밀번호(4자 이상)"
                className="border rounded-lg px-3 py-2 w-full md:w-96"
                required
                minLength={4}
              />
            </div>
          ) : null}
          <button type="submit" className="bg-[#1A4D2E] text-white px-5 py-2.5 rounded-lg font-semibold">
            글 등록
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-[#E2E5D9] overflow-hidden">
          <div className="px-5 py-4 border-b font-bold text-[#1A4D2E]">게시글 목록</div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">불러오는 중...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">등록된 글이 없습니다.</div>
          ) : (
            <div className="divide-y">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => openPostDetail(post)}
                  className="w-full text-left px-5 py-4 hover:bg-[#F7F8F3] transition"
                >
                  <p className="font-semibold text-[#1A4D2E]">
                    {post.is_secret ? "🔒 " : ""}
                    {getCommunityPostListTitle(post)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    작성자: {post.author_name} | 조회수: {post.views} | {new Date(post.created_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPost ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => {
            void closeStoryModal();
          }}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#1A4D2E]">{selectedPost.title}</h3>
              <button
                type="button"
                onClick={() => {
                  void closeStoryModal();
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-auto">
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  작성자: {selectedPost.author_name} | 조회수: {selectedPost.views}
                </p>
                <p className="whitespace-pre-wrap text-gray-800">{selectedPost.content}</p>
              </div>
              {selectedPost.is_secret ? (
                <div className="border rounded-xl p-4 bg-[#F8FAF4]">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="text-sm font-semibold text-[#1A4D2E]">비밀글 수정</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSecretPost((prev) => !prev);
                        setEditTitle(selectedPost.title);
                        setEditContent(selectedPost.content);
                        setEditPassword(selectedPostPassword);
                      }}
                      className="text-xs bg-white border px-2.5 py-1 rounded-md"
                    >
                      {isEditingSecretPost ? "닫기" : "수정 열기"}
                    </button>
                  </div>
                  {isEditingSecretPost ? (
                    <form onSubmit={submitSecretPostEdit} className="space-y-2">
                      <p className="text-xs text-red-600">비밀글 수정 항목은 모두 필수입니다.</p>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="수정 제목"
                        required
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 min-h-24"
                        placeholder="수정 내용"
                        required
                      />
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="비밀글 비밀번호"
                        required
                        minLength={4}
                      />
                      <button type="submit" className="bg-[#1A4D2E] text-white px-4 py-2 rounded-lg font-semibold">
                        비밀글 수정 저장
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}

              <div className="border-t pt-5">
                <h4 className="font-bold text-[#1A4D2E] flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5" /> 댓글
                </h4>
                <div className="space-y-2 mb-4">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-500">등록된 댓글이 없습니다.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-[#F6F7F2] rounded-lg p-3">
                        <p className="text-sm font-semibold text-[#1A4D2E]">{comment.author_name}</p>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={submitComment} className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">댓글 작성자 <span className="text-red-600">*</span></label>
                    <input
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      placeholder="댓글 작성자"
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">댓글 내용 <span className="text-red-600">*</span></label>
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="댓글 내용"
                      className="w-full border rounded-lg px-3 py-2 min-h-20"
                      required
                    />
                  </div>
                  <button type="submit" className="bg-[#1A4D2E] text-white px-4 py-2 rounded-lg font-semibold">
                    댓글 등록
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toastVisible && toastMessage ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-[70] transition-opacity duration-200">
          <div
            className={`max-w-sm rounded-xl border px-4 py-3 shadow-xl backdrop-blur bg-white/95 ${
              toastVariant === "error" ? "border-red-200" : "border-[#DDE7D4]"
            }`}
          >
            <p className={`text-sm font-medium ${toastVariant === "error" ? "text-red-700" : "text-[#1A4D2E]"}`}>
              {toastMessage}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

