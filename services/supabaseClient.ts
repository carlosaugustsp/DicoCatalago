
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

// NOTA: As chaves abaixo devem ser as do seu projeto real no painel do Supabase.
// O prefixo 'sb_publishable' não é padrão do Supabase; chaves anon começam com 'ey...'.
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://vllqlizmlycgavltzbtr.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbHFsaXptbHljZ2F2bHR6YnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY3MDU0ODAsImV4cCI6MjAyMjI4MTQ4MH0.your-real-key-here';

let client: any = null;

const createMockClient = (reason: string) => {
  console.warn(`%c ⚠️ MODO DE SEGURANÇA: ${reason}`, 'background: #fff3cd; color: #856404; padding: 4px; border-radius: 4px;');
  return {
    from: (table: string) => ({ 
      select: () => ({ 
        order: () => ({ data: [], error: { message: "Offline: " + table } }),
        eq: () => ({ single: async () => ({ data: null, error: { message: "Offline" } }), data: [], error: null }),
        data: [], error: null 
      }),
      insert: async () => ({ data: null, error: { message: "Erro de Conexão - Verifique as chaves do Supabase" } }),
      update: async () => ({ data: null, error: { message: "Erro de Conexão - Update" } }),
      delete: async () => ({ data: null, error: { message: "Erro de Conexão - Delete" } }),
    }),
    auth: { 
      signInWithPassword: async () => ({ data: { user: null }, error: { message: "Verifique a SUPABASE_URL e ANON_KEY" } }),
      signUp: async () => ({ data: { user: null }, error: { message: "Erro de Configuração" } }),
      signOut: async () => {} 
    }
  };
};

try {
  if (SUPABASE_URL && SUPABASE_URL.includes('.supabase.co') && SUPABASE_ANON_KEY.length > 20) {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
  } else {
      client = createMockClient("Chaves de API inválidas ou formato incorreto.");
  }
} catch (error) {
  console.error("Erro crítico na inicialização do Supabase:", error);
  client = createMockClient("Falha catastrófica no SDK.");
}

export const supabase = client;
