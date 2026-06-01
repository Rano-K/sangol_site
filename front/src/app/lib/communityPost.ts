/** 비밀글 목록·홈 미리보기용 제목 (실제 제목 노출 금지) */
export const SECRET_POST_LIST_TITLE = "비밀글입니다.";

export function getCommunityPostListTitle(post: { title: string; is_secret?: boolean }): string {
  return post.is_secret ? SECRET_POST_LIST_TITLE : post.title;
}
