import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://vllqlizmlycgavltzbtr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zrEAyKDdSM-2uvSP_xehLQ_o6lxJz3d';

let client: any = null;

const createMockClient = (reason: string) => {
  console.warn(`⚠️ Supabase Offline: ${reason}. Usando dados de demonstração.`);
  return {
    from: (table: string) => ({ 
      select: async () => ({ data: null, error: { message: "Modo Offline - Tabela " + table } }),
      insert: async () => ({ data: {}, error: null }),
      update: async () => ({ data: {}, error: null }),
      delete: async () => ({ data: {}, error: null }),
    }),
    auth: { 
      signInWithPassword: async () => ({ data: { user: null }, error: { message: "Login Offline" } }),
      signUp: async () => ({ data: { user: { id: 'mock-id' } }, error: null }),
      signOut: async () => {} 
    }
  };
};

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Tenta criar o cliente. Se a chave for inválida, operações futuras falharão e cairão no fallback do api.ts
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
      client = createMockClient("Credenciais ausentes");
  }
} catch (error) {
  client = createMockClient("Erro na inicialização");
}

export const supabase = client;