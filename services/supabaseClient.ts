import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

// Prioriza variáveis de ambiente, mas usa as chaves fornecidas como fallback
// para garantir que o sistema conecte mesmo sem configuração de .env local.
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://vllqlizmlycgavltzbtr.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zrEAyKDdSM-2uvSP_xehLQ_o6lxJz3d';

let client: any = null;

// Cliente Mock (Apenas para evitar crash total se não houver internet/chaves)
const createMockClient = (reason: string) => {
  console.warn(`%c ⚠️ MODO OFFLINE/MOCK: ${reason}`, 'background: #fff3cd; color: #856404; padding: 4px; border-radius: 4px;');
  return {
    from: (table: string) => ({ 
      select: async () => ({ data: [], error: { message: "Erro de Conexão - " + table } }),
      insert: async () => ({ data: null, error: { message: "Erro de Conexão - Insert" } }),
      update: async () => ({ data: null, error: { message: "Erro de Conexão - Update" } }),
      delete: async () => ({ data: null, error: { message: "Erro de Conexão - Delete" } }),
    }),
    auth: { 
      signInWithPassword: async () => ({ data: { user: null }, error: { message: "Login Offline" } }),
      signUp: async () => ({ data: { user: null }, error: { message: "Cadastro Offline indisponível" } }),
      signOut: async () => {} 
    }
  };
};

try {
  // Validação básica para garantir que não estamos criando um cliente inválido
  if (SUPABASE_URL && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY) {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
  } else {
      client = createMockClient("Chaves de API inválidas ou ausentes.");
  }
} catch (error) {
  console.error("Erro crítico Supabase:", error);
  client = createMockClient("Falha na inicialização do cliente.");
}

export const supabase = client;