import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

// CORREÇÃO: Adicionadas aspas ('') ao redor dos valores para torná-los strings válidas.
const SUPABASE_URL = 'https://vllqlizmlycgavltzbtr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zrEAyKDdSM-2uvSP_xehLQ_o6lxJz3d';

// Validação simples para garantir que não são strings vazias
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ ATENÇÃO: As credenciais do Supabase não estão preenchidas.');
  if (typeof window !== 'undefined') {
    alert('Erro de Configuração: Verifique services/supabaseClient.ts');
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);