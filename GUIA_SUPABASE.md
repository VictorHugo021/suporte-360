# Guia rápido — Banco de dados persistente (Supabase)

Tempo estimado: ~10 minutos. Tudo no plano gratuito.

## 1. Criar o projeto
1. Acesse https://supabase.com e crie uma conta (pode usar GitHub).
2. **New project** → escolha um nome (ex.: `suporte360`), defina uma senha de banco e a região mais próxima (ex.: South America).
3. Aguarde ~2 min até o projeto ficar pronto.

## 2. Criar as tabelas
1. No menu lateral, abra **SQL Editor**.
2. Clique em **New query**, cole TODO o conteúdo do arquivo `schema.sql` e clique em **Run**.
   - Se aparecer um aviso em "alter publication ... add table" dizendo que a tabela já existe na publicação, pode ignorar.
3. Em **Table Editor** você deve ver as tabelas `usuarios`, `chamados` e `comentarios`.

## 3. Pegar as credenciais
1. Vá em **Project Settings** (engrenagem) → **API**.
2. Copie:
   - **Project URL** (ex.: `https://abcdefgh.supabase.co`)
   - **anon public** (a chave longa que começa com `eyJ...`)

## 4. Conectar o sistema

Nesta versão, o arquivo `config.js` já está preenchido com as credenciais enviadas para o projeto Supabase:

```js
window.SUPABASE_CONFIG = {
  url: "https://lcszhwkktfoqxjqhjenx.supabase.co",
  anonKey: "sb_publishable_..."
};
```

Salve. Pronto — ao abrir o sistema, a barra superior deve mostrar **● Banco Supabase**.

Se quiser trocar de projeto Supabase no futuro, altere somente esses dois campos no `config.js`.

## 5. Testar os dois lados (a hora da apresentação)
1. Abra o sistema em **duas janelas** (ou dois aparelhos).
2. Janela A: entre como **Cliente** e abra um chamado.
3. Janela B: entre como **Suporte** — o chamado aparece **automaticamente** (tempo real).
4. No suporte, mude o status e responda na **Conversa**. O cliente vê a atualização na hora.

> Dica: se a chave não estiver preenchida, o sistema funciona em **Modo local**
> (dados só naquele navegador). Ótimo para testar, mas não sincroniza entre dispositivos.

## Contas de usuário
- O sistema já cria duas contas de exemplo: `tecnico@empresa.com` (suporte) e
  `ana@empresa.com` (cliente), senha `123456`.
- Na tela inicial, a aba **Criar conta** permite cadastrar novos usuários de
  qualquer tipo (Cliente ou Suporte).
- Logado como suporte, a página **Usuários** lista e cria contas dos dois tipos.

> Segurança: para simplificar a demonstração, a senha é guardada como texto na
> tabela `usuarios`. Em um sistema real usa-se hash de senha ou o **Supabase Auth**
> (login pronto e seguro). Vale citar isso na apresentação.

## Segurança (importante saber para a apresentação)
As políticas do `schema.sql` liberam acesso público de propósito, porque é um
protótipo acadêmico que roda 100% no navegador. Em um sistema real, a chave
ficaria protegida em um backend e o acesso seria restrito por usuário autenticado
(o Supabase oferece login pronto via **Supabase Auth**).
