/* ============================================================
   CONFIGURAÇÃO DO BANCO DE DADOS (Supabase)
   ------------------------------------------------------------
   1) Crie um projeto grátis em https://supabase.com
   2) Vá em Project Settings -> API
   3) Copie "Project URL" e a chave "anon public" abaixo.
   4) Rode o arquivo schema.sql no SQL Editor do Supabase.

   Se deixar em branco, o sistema funciona em MODO LOCAL
   (dados salvos só neste navegador, via localStorage).
   ============================================================ */
window.SUPABASE_CONFIG = {
  url: "https://lcszhwkktfoqxjqhjenx.supabase.co",
  // Publishable/anon public key do projeto Supabase.
  anonKey: "sb_publishable_jE_zXaLFSMLgSO1x00DrSQ_aIkci5sN"
};

/* ============================================================
   CONFIGURAÇÃO DA API DE CLIMA (API Ninjas — Weather)
   ------------------------------------------------------------
   Endpoint usado pelo sistema:
   https://api.api-ninjas.com/v1/weather?lat=...&lon=...

   A chave abaixo é enviada no cabeçalho HTTP:
   X-Api-Key: sua_chave
   ============================================================ */
window.WEATHER_CONFIG = {
  // Chave padrão da API Ninjas Weather para todos os usuários do sistema
  apiKey: "6EVUskGSidL2FEqexTHoHL89ISQcnwD8iYKu1Ab0",

  // Local padrão do painel para TODOS os perfis: cliente, suporte/técnico e administrador.
  // Usamos latitude/longitude porque busca por cidade é recurso premium na API Ninjas.
  city: "Blumenau",
  country: "BR",
  // Coordenadas aproximadas do centro de Blumenau/SC
  lat: -26.91889,
  lon: -49.06583
};

