-- ============================================================
-- Suporte360 — Esquema do banco de dados (Supabase / PostgreSQL)
-- Cole TODO este conteúdo no SQL Editor do Supabase e clique em RUN.
-- ============================================================

-- 1) Tabela de usuários (contas de cliente e de suporte/técnico)
create table if not exists usuarios (
  id          bigint generated always as identity primary key,
  nome        text not null,
  email       text unique not null,
  senha       text not null,                 -- PROTÓTIPO: em produção use hash / Supabase Auth
  papel       text not null default 'cliente', -- 'cliente' ou 'suporte'
  created_at  timestamptz default now()
);
alter table usuarios enable row level security;
drop policy if exists demo_usuarios on usuarios;
create policy demo_usuarios on usuarios for all using (true) with check (true);
insert into usuarios (nome, email, senha, papel) values
 ('Marcos Lima',  'tecnico@empresa.com', '123456', 'suporte'),
 ('Ana Oliveira', 'ana@empresa.com',     '123456', 'cliente')
on conflict (email) do nothing;

-- 2) Tabela de chamados
create table if not exists chamados (
  id                bigint generated always as identity primary key,
  titulo            text not null,
  descricao         text,
  solicitante       text not null,
  solicitante_email text,
  setor             text,
  prioridade        text default 'Média',
  status            text default 'Aberto',
  tecnico           text,
  created_at        timestamptz default now()
);

-- 3) Tabela de comentários (conversa cliente <-> suporte)
create table if not exists comentarios (
  id          bigint generated always as identity primary key,
  chamado_id  bigint references chamados(id) on delete cascade,
  autor       text not null,
  papel       text,                 -- 'cliente' ou 'suporte'
  mensagem    text not null,
  created_at  timestamptz default now()
);

-- 4) Segurança (Row Level Security) das demais tabelas
alter table chamados   enable row level security;
alter table comentarios enable row level security;

-- ATENÇÃO: políticas liberadas para PROTÓTIPO ACADÊMICO (chave anônima).
-- Liberam leitura/escrita pública. NÃO use assim em produção real.
drop policy if exists demo_chamados on chamados;
drop policy if exists demo_comentarios on comentarios;
create policy demo_chamados   on chamados    for all using (true) with check (true);
create policy demo_comentarios on comentarios for all using (true) with check (true);

-- 5) Tempo real
-- Adiciona as tabelas à publicação de realtime sem quebrar o script
-- caso elas já tenham sido adicionadas antes.
do $$
begin
  begin
    alter publication supabase_realtime add table chamados;
  exception
    when duplicate_object then null;
    when others then raise notice 'Realtime chamados: %', SQLERRM;
  end;

  begin
    alter publication supabase_realtime add table comentarios;
  exception
    when duplicate_object then null;
    when others then raise notice 'Realtime comentarios: %', SQLERRM;
  end;
end $$;

-- 6) Dados de exemplo (opcional)
insert into chamados (titulo, descricao, solicitante, solicitante_email, setor, prioridade, status, tecnico) values
 ('Impressora sem toner', 'Não imprime documentos fiscais.', 'Ana Oliveira', 'ana@empresa.com', 'Financeiro', 'Alta', 'Aberto', 'Marcos Lima'),
 ('Internet lenta', 'Conexão oscila na recepção.', 'Carlos Souza', 'carlos@empresa.com', 'Recepção', 'Média', 'Em andamento', 'Júlia Reis');
