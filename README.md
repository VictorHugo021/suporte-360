# Suporte360 — Help Desk com portais de Cliente e Suporte

Sistema de gestão de chamados com **dois lados** (Cliente e Suporte) e
**banco de dados persistente** (Supabase / PostgreSQL), escrito em
**HTML, CSS e JavaScript** puros. Funciona no GitHub Pages.

## Os dois portais
- **Cliente** — abre chamados, acompanha o status e conversa com o suporte.
- **Suporte/TI** — vê todos os chamados, atribui técnico, muda status, responde o
  cliente, gerencia **Usuários** (cria contas dos dois tipos) e vê relatórios.

Na tela inicial você pode **Entrar** ou **Criar conta** (Cliente ou Suporte). Contas demo: `ana@empresa.com` / `tecnico@empresa.com`, senha `123456`.

## Banco de dados
- Com o **Supabase** configurado (`config.js`), os dados são persistentes e
  sincronizam **em tempo real entre dispositivos** — o cliente abre um chamado
  no celular e o suporte vê na hora no notebook.
- Sem configurar, roda em **Modo local** (localStorage), ótimo para testar
  numa máquina só. O sistema indica o modo na barra superior.

➡️ Passo a passo completo do banco em **GUIA_SUPABASE.md** (e SQL em `schema.sql`).

## Tecnologias / requisitos atendidos
- HTML5 + CSS3 + JavaScript, layout com **CSS Grid + Flexbox + Bootstrap**.
- **DataTables** na lista de chamados do suporte.
- **Chart.js** nos gráficos do dashboard.
- **API ViaCEP** (cadastro de unidades) e **API Ninjas — Weather** (clima real).
- **Login** com exibir/ocultar senha · **Dark Mode persistente** (localStorage).
- Mensagens de sucesso/erro, confirmação de exclusão e conversa por chamado.

## Como rodar
1. (Opcional, recomendado) Configure o Supabase seguindo o `GUIA_SUPABASE.md`.
2. Abra `index.html` no navegador, ou hospede no GitHub Pages / Netlify / Vercel.

## Estrutura
```
index.html        Telas, login com papéis e carregamento de bibliotecas
style.css         Design system, grid/flexbox, dark mode, responsivo
config.js         Credenciais do Supabase (URL + chave anon)
script.js         Papéis, roteamento, camada de dados, tempo real, APIs
schema.sql        Criação das tabelas no Supabase
GUIA_SUPABASE.md  Passo a passo do banco de dados
assets/           Logo (SVG/PNG)
docs/ presentation/  Documento (.docx) e apresentação (.pptx)
```
