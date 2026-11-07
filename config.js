/* Configuração do banco online (Supabase).
   Deixe vazio para usar o modo de teste (dados só neste navegador).
   Onde achar: no Supabase, "Project Settings" > "API" (ou "Data API" / "API Keys").
   - supabaseUrl: o "Project URL" (ex.: https://abcdefgh.supabase.co)
   - supabaseAnonKey: a chave "anon public" (ou "publishable"). Ela é pública por natureza;
     quem protege os dados são as regras de segurança do schema.sql.
   NUNCA cole aqui a chave "service_role" / "secret". */
window.JH_CONFIG = {
  supabaseUrl: 'https://ckwkapqykaethtfshble.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrd2thcHF5a2FldGh0ZnNoYmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MTY1MTMsImV4cCI6MjEwOTE5MjUxM30.wtsMYLAgIQxcZhL-Cj-HCSracKiMtMdoidxzryrd1qc'
};
