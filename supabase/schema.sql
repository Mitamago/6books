-- supabase/schema.sql
-- Supabase管理コンソール > SQL Editor で実行すること

create table shelves (
  id uuid primary key default gen_random_uuid(),
  user_name text not null default '',
  books jsonb not null default '[]',
  created_at timestamptz default now()
);

-- booksのJSONB構造
-- [
--   {
--     "asin": "4820729...",
--     "title": "ゼロ・トゥ・ワン",
--     "author": "ピーター・ティール",
--     "image": "https://m.media-amazon.com/images/...",
--     "url": "https://www.amazon.co.jp/dp/..."
--   },
--   ... (最大6件)
-- ]

-- RLS（Row Level Security）設定
alter table shelves enable row level security;

-- 読み取りは全員OK（シェアリンクで誰でも見れる）
create policy "Public read" on shelves
  for select using (true);

-- 書き込みはAPIキー経由のみ（service_role key使用）
create policy "Service write" on shelves
  for insert with check (true);
