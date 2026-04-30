-- DBeaver: 기본 DB "postgres"에 슈퍼유저(보통 postgres)로 접속한 뒤 1회 실행합니다.
-- 실행 후 새 연결을 만들 때 Database는 "sangol"로 선택합니다.

CREATE DATABASE sangol
  WITH OWNER = CURRENT_USER
  ENCODING 'UTF8'
  TEMPLATE = template0;
