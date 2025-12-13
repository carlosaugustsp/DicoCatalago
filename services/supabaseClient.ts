import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

// Tenta pegar das variáveis de ambiente (Vite)
// Para configurar na produção, crie um arquivo .env na raiz com:
// VITE_SUPABASE_URL=sua_url
// VITE_SUPABASE_ANON_KEY=sua_chave
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let client: any = null;

// Cliente Mock (Simulado) para quando não houver conexão ou chaves
const createMockClient = (reason: string) => {
  console.log(`%c 🌩️ MODO OFFLINE ATIVADO: ${reason}`, 'background: #fef3c7; color: #d97706; padding: 4px; border-radius: 4px; font-weight: bold;');
  return {
    from: (table: string) => ({ 
      select: async () => ({ data: [], error: { message: "Modo Offline - Tabela " + table } }),
      insert: async () => ({ data: null, error: { message: "Offline - Insert Falhou" } }),
      update: async () => ({ data: null, error: { message: "Offline - Update Falhou" } }),
      delete: async () => ({ data: null, error: { message: "Offline - Delete Falhou" } }),
    }),
    auth: { 
      signInWithPassword: async () => ({ data: { user: null }, error: { message: "Login Offline" } }),
      signUp: async () => ({ data: { user: { id: 'mock-id-' + Math.random() } }, error: null }),
      signOut: async () => {} 
    }
  };
};

try {
  // Verifica se as chaves parecem válidas (URL começa com http e Key existe)
  if (SUPABASE_URL && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20) {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
  } else {
      client = createMockClient("Variáveis de ambiente (URL/KEY) não configuradas ou inválidas.");
  }
} catch (error) {
  console.error("Erro crítico ao inicializar Supabase:", error);
  client = createMockClient("Erro na inicialização do cliente.");
}

export const supabase = client;