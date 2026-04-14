import { createClient } from "@supabase/supabase-js";

// Supabaseクライアントは関数経由で生成（ビルド時にenv参照しない）
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// サーバーサイド専用: service_role キーを使う（RLS をバイパスして書き込む）
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
