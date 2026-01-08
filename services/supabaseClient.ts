
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

// Tenta obter do ambiente, senão usa o fallback
let SUPABASE_URL = 'https://vllqlizmlycgavltzbtr.supabase.co';
let SUPABASE_ANON_KEY = 'sb_publishable_zrEAyKDdSM-2uvSP_xehLQ_o6lxJz3d';

try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
    // @ts-ignore
    SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  }
} catch (e) {
  console.warn("Ambiente não suporta import.meta.env, usando chaves padrão.");
}

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
      signOut: async () => {},
      updateUser: async () => ({ data: null, error: { message: "Offline" } })
    }
  };
};

try {
  if (SUPABASE_URL && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY) {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
  } else {
      client = createMockClient("Chaves de API inválidas.");
  }
} catch (error) {
  console.error("Erro crítico Supabase:", error);
  client = createMockClient("Falha na inicialização.");
}

export const supabase = client;
