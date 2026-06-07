/* ============================================================
   Suporte360 — controlador (HTML/CSS/JS + Supabase)
   Dois portais: Cliente e Suporte. Banco persistente no Supabase,
   com fallback automático para localStorage (modo local).
   ============================================================ */

/* ---------- Conexão com o banco ---------- */
const CFG = window.SUPABASE_CONFIG || { url:'', anonKey:'' };
const WEATHER_CFG = window.WEATHER_CONFIG || { apiKey:'', city:'Blumenau', country:'BR', lat:-26.91889, lon:-49.06583 };
const USE_DB = !!(CFG.url && CFG.anonKey && window.supabase);
const sb = USE_DB ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;

/* ---------- Cadastros locais (apoio) ---------- */
const LK = 's360_cadastros';
const seedCad = {
  setores:[{nome:'Financeiro',resp:''},{nome:'RH',resp:''},{nome:'Comercial',resp:''},{nome:'Recepção',resp:''}],
  unidades:[{nome:'Matriz',cidade:'Blumenau',uf:'SC'}],
  weatherKey: WEATHER_CFG.apiKey || '',
  weatherCity: WEATHER_CFG.city || 'Blumenau',
  weatherLat: Number.isFinite(Number(WEATHER_CFG.lat)) ? Number(WEATHER_CFG.lat) : -26.91889,
  weatherLon: Number.isFinite(Number(WEATHER_CFG.lon)) ? Number(WEATHER_CFG.lon) : -49.06583
};
function cad(){ try{ return JSON.parse(localStorage.getItem(LK)) || structuredClone(seedCad); }catch(e){ return structuredClone(seedCad); } }
function saveCad(c){ localStorage.setItem(LK, JSON.stringify(c)); }

/* ---------- Usuários (contas) — fallback local ---------- */
const LKU='s360_usuarios';
const seedUsuarios=[
  {id:1,nome:'Marcos Lima',email:'tecnico@empresa.com',senha:'123456',papel:'suporte'},
  {id:2,nome:'Ana Oliveira',email:'ana@empresa.com',senha:'123456',papel:'cliente'}
];
function usuariosLocal(){ try{ return JSON.parse(localStorage.getItem(LKU)) || structuredClone(seedUsuarios); }catch(e){ return structuredClone(seedUsuarios); } }
function saveUsuarios(u){ localStorage.setItem(LKU, JSON.stringify(u)); }

/* ---------- Modo local (fallback do banco) ---------- */
const LKD = 's360_dados';
const seedDados = {
  seq: 1023,
  chamados:[
    {id:1021,titulo:'Impressora sem toner',descricao:'Não imprime documentos fiscais.',solicitante:'Ana Oliveira',solicitante_email:'ana@empresa.com',setor:'Financeiro',prioridade:'Alta',status:'Aberto',tecnico:'Marcos Lima',created_at:'2026-05-28'},
    {id:1022,titulo:'Internet lenta',descricao:'Conexão oscila na recepção.',solicitante:'Carlos Souza',solicitante_email:'carlos@empresa.com',setor:'Recepção',prioridade:'Média',status:'Em andamento',tecnico:'Júlia Reis',created_at:'2026-05-29'}
  ],
  comentarios:[{id:1,chamado_id:1021,autor:'Ana Oliveira',papel:'cliente',mensagem:'Bom dia, segue urgente por favor.',created_at:'2026-05-28'}]
};
function dados(){ try{ return JSON.parse(localStorage.getItem(LKD)) || structuredClone(seedDados); }catch(e){ return structuredClone(seedDados); } }
function saveDados(d){ localStorage.setItem(LKD, JSON.stringify(d)); }

/* ============================================================
   API de dados — mesma interface para Supabase OU local
   ============================================================ */
const api = {
  /* ----- Usuários / contas ----- */
  async registerUser(u){
    if (USE_DB){
      const {data,error}=await sb.from('usuarios').insert(u).select().single();
      if (error){ if(String(error.code)==='23505') throw new Error('Este e-mail já está cadastrado.'); throw error; }
      return data;
    }
    const arr=usuariosLocal();
    if (arr.some(x=>x.email.toLowerCase()===u.email.toLowerCase())) throw new Error('Este e-mail já está cadastrado.');
    const novo={id:(arr.at(-1)?.id||0)+1, ...u}; arr.push(novo); saveUsuarios(arr); return novo;
  },
  async loginUser(email,senha){
    if (USE_DB){
      const {data,error}=await sb.from('usuarios').select('*').eq('email',email).eq('senha',senha).maybeSingle();
      if (error) throw error; return data;
    }
    return usuariosLocal().find(x=>x.email.toLowerCase()===email.toLowerCase() && x.senha===senha) || null;
  },
  async listUsuarios(papel){
    if (USE_DB){ let q=sb.from('usuarios').select('*').order('id'); if(papel)q=q.eq('papel',papel); const {data,error}=await q; if(error)throw error; return data; }
    let arr=usuariosLocal(); return papel?arr.filter(x=>x.papel===papel):arr;
  },
  async updateUsuario(id,patch){
    if (USE_DB){ const {error}=await sb.from('usuarios').update(patch).eq('id',id); if(error)throw error; return; }
    const arr=usuariosLocal(); const u=arr.find(x=>x.id==id); if(u)Object.assign(u,patch); saveUsuarios(arr);
  },
  async deleteUsuario(id){
    if (USE_DB){ const {error}=await sb.from('usuarios').delete().eq('id',id); if(error)throw error; return; }
    saveUsuarios(usuariosLocal().filter(x=>x.id!=id));
  },
  /* ----- Chamados ----- */
  async listChamados(email){
    if (USE_DB){
      let q = sb.from('chamados').select('*').order('id',{ascending:false});
      if (email) q = q.eq('solicitante_email', email);
      const {data,error} = await q; if (error) throw error; return data;
    }
    let arr = dados().chamados.slice().sort((a,b)=>b.id-a.id);
    return email ? arr.filter(c=>c.solicitante_email===email) : arr;
  },
  async getChamado(id){
    if (USE_DB){ const {data,error}=await sb.from('chamados').select('*').eq('id',id).single(); if(error)throw error; return data; }
    return dados().chamados.find(c=>c.id==id);
  },
  async createChamado(obj){
    if (USE_DB){ const {data,error}=await sb.from('chamados').insert(obj).select().single(); if(error)throw error; return data; }
    const d=dados(); d.seq+=1; const novo={id:d.seq,status:'Aberto',created_at:new Date().toISOString().slice(0,10),...obj};
    d.chamados.unshift(novo); saveDados(d); return novo;
  },
  async updateChamado(id, patch){
    if (USE_DB){ const {error}=await sb.from('chamados').update(patch).eq('id',id); if(error)throw error; return; }
    const d=dados(); const c=d.chamados.find(x=>x.id==id); if(c)Object.assign(c,patch); saveDados(d);
  },
  async deleteChamado(id){
    if (USE_DB){ const {error}=await sb.from('chamados').delete().eq('id',id); if(error)throw error; return; }
    const d=dados(); d.chamados=d.chamados.filter(x=>x.id!=id); saveDados(d);
  },
  async listComentarios(chamadoId){
    if (USE_DB){ const {data,error}=await sb.from('comentarios').select('*').eq('chamado_id',chamadoId).order('id'); if(error)throw error; return data; }
    return dados().comentarios.filter(c=>c.chamado_id==chamadoId);
  },
  async addComentario(obj){
    if (USE_DB){ const {error}=await sb.from('comentarios').insert(obj); if(error)throw error; return; }
    const d=dados(); const id=(d.comentarios.at(-1)?.id||0)+1;
    d.comentarios.push({id,created_at:new Date().toISOString().slice(0,10),...obj}); saveDados(d);
  }
};

/* ---------- Sessão / papéis ---------- */
const SK='s360_session';
let session = (()=>{ try{ return JSON.parse(localStorage.getItem(SK)); }catch(e){ return null; } })();
const isSuporte = ()=> session?.role==='suporte';

const menus = {
  cliente:[['dashboard','Início','bi-house'],['novoChamado','Abrir chamado','bi-plus-circle'],['chamados','Meus chamados','bi-list-check'],['perfil','Perfil','bi-person-circle'],['ajuda','Ajuda','bi-question-circle']],
  suporte:[['dashboard','Dashboard','bi-grid-1x2'],['chamados','Chamados','bi-list-check'],['relatorios','Relatórios','bi-bar-chart'],['usuarios','Usuários','bi-people'],['setores','Setores','bi-diagram-3'],['unidades','Unidades','bi-geo-alt'],['perfil','Perfil','bi-person-circle'],['configuracoes','Configurações','bi-gear'],['ajuda','Ajuda','bi-question-circle']]
};
function titleFor(page){
  if(page==='dashboard') return isSuporte()?'Dashboard':'Início';
  if(page==='chamados') return isSuporte()?'Chamados':'Meus chamados';
  return {novoChamado:'Abrir chamado',detalhes:'Detalhes do chamado',usuarios:'Usuários',setores:'Setores',unidades:'Unidades',relatorios:'Relatórios',perfil:'Perfil',configuracoes:'Configurações',ajuda:'Ajuda'}[page]||'Suporte360';
}

const $=(s)=>document.querySelector(s);

/* ---------- Login / Cadastro ---------- */
let authMode='entrar', registerRole='cliente';
document.querySelectorAll('#authTabs .seg-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#authTabs .seg-btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); authMode=b.dataset.mode;
  const criar=authMode==='criar';
  $('#nomeWrap').classList.toggle('hidden',!criar);
  $('#senha2Wrap').classList.toggle('hidden',!criar);
  $('#senhaHint').classList.toggle('hidden',!criar);
  $('#roleWrap').classList.toggle('hidden',!criar);
  $('#authSubmit').textContent=criar?'Criar conta':'Entrar';
  $('#loginSub').textContent=criar?'Crie sua conta de cliente ou de suporte.':'Entre com sua conta.';
  $('#loginError').textContent='';
}));
document.querySelectorAll('#roleWrap .seg-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#roleWrap .seg-btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); registerRole=b.dataset.role;
}));

$('#loginForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const email=$('#email').value.trim(), senha=$('#senha').value.trim(), err=$('#loginError');
  if(!email||!senha){ err.textContent='Preencha e-mail e senha.'; return; }
  if(!email.includes('@')){ err.textContent='Informe um e-mail válido.'; return; }
  err.textContent='';
  try{
    let user;
    if(authMode==='criar'){
      const nome=$('#nome').value.trim();
      if(!nome){ err.textContent='Informe seu nome.'; return; }
      if(senha.length<6){ err.textContent='A senha deve ter ao menos 6 caracteres.'; return; }
      if(senha!==$('#senha2').value.trim()){ err.textContent='As senhas não conferem.'; return; }
      user=await api.registerUser({nome,email,senha,papel:registerRole});
      showToast('Conta criada com sucesso! Bem-vindo(a).');
    }else{
      user=await api.loginUser(email,senha);
      if(!user){ err.textContent='E-mail ou senha inválidos.'; return; }
    }
    session={id:user.id,nome:user.nome,email:user.email,role:user.papel};
    localStorage.setItem(SK,JSON.stringify(session));
    enterApp();
  }catch(ex){ err.textContent=ex.message||String(ex); }
});

function ligarOlho(btnId, inputId){
  const btn=$('#'+btnId); if(!btn) return;
  btn.onclick=function(){
    const s=$('#'+inputId), show=s.type==='password';
    s.type=show?'text':'password';
    this.querySelector('i').className=show?'bi bi-eye-slash':'bi bi-eye';
    this.setAttribute('aria-pressed',String(show));
    this.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');
  };
}
ligarOlho('togglePassword','senha');
ligarOlho('togglePassword2','senha2');

function enterApp(){
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  buildNav(); refreshUserChip(); refreshDbBadge();
  navigate(location.hash.replace('#','')||'dashboard');
  loadWeather(); subscribeRealtime();
}
function logout(){
  localStorage.removeItem(SK); session=null; location.hash='';
  if(window._rt){ try{ sb.removeChannel(window._rt); }catch(e){} window._rt=null; }
  $('#app').classList.add('hidden'); $('#loginScreen').classList.remove('hidden');
}

/* ---------- Navegação ---------- */
function buildNav(){
  const nav=$('#navMenu'); nav.innerHTML='';
  menus[session.role].forEach(([page,label,icon])=>{
    const b=document.createElement('button'); b.dataset.page=page;
    b.innerHTML=`<i class="bi ${icon}"></i> ${label}`;
    b.addEventListener('click',()=>{ navigate(page); closeSidebar(); });
    nav.appendChild(b);
  });
}
const allowed = ()=> menus[session.role].map(m=>m[0]).concat('detalhes');
async function navigate(page){
  if(!session) return;
  if(!allowed().includes(page)) page='dashboard';
  location.hash=page;
  $('#pageTitle').textContent=titleFor(page);
  $('#breadcrumb').textContent='Início / '+($('#pageTitle').textContent);
  document.querySelectorAll('#navMenu button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const r=renderers[page]||renderers.dashboard;
  $('#content').innerHTML='<div class="loading"><span class="spin"></span> Carregando...</div>';
  try{ $('#content').innerHTML=await r(); if(afterRender[page]) await afterRender[page](); }
  catch(e){ $('#content').innerHTML=`<article class="panel"><h3>Não foi possível carregar</h3><p class="muted">${e.message||e}</p></article>`; }
  window.scrollTo({top:0,behavior:'smooth'});
}
window.addEventListener('hashchange',()=>{ if(session && !$('#app').classList.contains('hidden')) navigate(location.hash.replace('#','')); });

/* ---------- Helpers visuais ---------- */
const pillClass={'Alta':'alta','Média':'media','Baixa':'baixa','Aberto':'aberto','Em andamento':'andamento','Concluído':'concluido'};
const pill=(v)=>`<span class="pill ${pillClass[v]||''}">${v}</span>`;
const initials=(n)=>n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
function fmtData(d){ if(!d) return '—'; const dt=new Date(d); return isNaN(dt)? d : dt.toLocaleDateString('pt-BR'); }
function showToast(msg,type='success'){
  const t=$('#toast'); const ic=type==='error'?'bi-x-circle':type==='info'?'bi-info-circle':'bi-check-circle';
  t.className='toast-msg '+(type==='success'?'':type); t.innerHTML=`<i class="bi ${ic}"></i> ${msg}`;
  t.classList.remove('hidden'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.add('hidden'),2800);
}
function refreshUserChip(){ $('#navName').textContent=session.nome; $('#navRole').textContent=isSuporte()?'Suporte / TI':'Cliente'; $('#navAvatar').textContent=initials(session.nome); }
function refreshDbBadge(){ const b=$('#dbBadge'); b.textContent=USE_DB?'● Banco Supabase':'● Modo local'; b.className='db-badge '+(USE_DB?'on':'off'); $('#dbModeNote').textContent=USE_DB?'Conectado ao banco Supabase':'Modo local (configure o Supabase em config.js)'; }
function toggleSidebar(){ $('#sidebar').classList.toggle('open'); }
function closeSidebar(){ $('#sidebar').classList.remove('open'); }

/* ---------- Tema persistente ---------- */
function applyTheme(t){ document.documentElement.setAttribute('data-theme',t); const i=$('#themeBtn')?.querySelector('i'); if(i)i.className=t==='dark'?'bi bi-sun':'bi bi-moon-stars'; }
function toggleTheme(){ const n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'; localStorage.setItem('theme',n); applyTheme(n); if((location.hash.replace('#','')||'dashboard')==='dashboard'&&isSuporte()) afterRender.dashboard&&afterRender.dashboard(); }
applyTheme(localStorage.getItem('theme')||'light');

/* ---------- Tempo real ---------- */
function subscribeRealtime(){
  if(!USE_DB) return;
  window._rt=sb.channel('s360')
    .on('postgres_changes',{event:'*',schema:'public',table:'chamados'},()=>{ const p=location.hash.replace('#',''); if(['dashboard','chamados'].includes(p)) navigate(p); })
    .on('postgres_changes',{event:'*',schema:'public',table:'comentarios'},()=>{ if(location.hash.replace('#','')==='detalhes') navigate('detalhes'); })
    .subscribe();
}

/* ============================================================
   Renderizadores
   ============================================================ */
const renderers={}; const afterRender={};

/* ---------- Dashboard ---------- */
renderers.dashboard=async()=>{
  const todos=await api.listChamados(isSuporte()?null:session.email);
  const c={abertos:todos.filter(t=>t.status==='Aberto').length,andamento:todos.filter(t=>t.status==='Em andamento').length,concluido:todos.filter(t=>t.status==='Concluído').length,total:todos.length};
  if(!isSuporte()){
    return `<div class="section-head"><div><h3>Olá, ${session.nome.split(' ')[0]}!</h3><p>Acompanhe os seus chamados de suporte.</p></div>
      <button class="btn primary sm" onclick="navigate('novoChamado')"><i class="bi bi-plus-lg"></i> Abrir chamado</button></div>
    <div class="cards-grid cards-3">
      <article class="metric"><div class="ico i-blue"><i class="bi bi-inbox"></i></div><strong>${c.abertos}</strong><span>Abertos</span></article>
      <article class="metric"><div class="ico i-amber"><i class="bi bi-hourglass-split"></i></div><strong>${c.andamento}</strong><span>Em andamento</span></article>
      <article class="metric"><div class="ico i-green"><i class="bi bi-check2-circle"></i></div><strong>${c.concluido}</strong><span>Resolvidos</span></article>
    </div>
    <article class="panel" style="margin-top:16px"><h3>Seus chamados recentes</h3>
      ${todos.length?todos.slice(0,5).map(t=>`<div class="queue-item"><span class="dot" style="background:${t.status==='Concluído'?'var(--success)':t.status==='Em andamento'?'var(--warning)':'var(--primary)'}"></span>
        <div style="flex:1"><strong>${t.titulo}</strong><br><small class="muted">#${t.id} · ${t.setor||'—'}</small></div>${pill(t.status)}
        <button class="row-btn" onclick="openTicket(${t.id})">Ver</button></div>`).join(''):'<p class="muted">Você ainda não abriu chamados. Clique em “Abrir chamado”.</p>'}
    </article>`;
  }
  const fila=todos.filter(t=>t.status!=='Concluído').sort((a,b)=>({Alta:0,'Média':1,Baixa:2}[a.prioridade]-{Alta:0,'Média':1,Baixa:2}[b.prioridade]));
  return `<div class="section-head"><div><h3>Visão geral</h3><p>Indicadores de todos os chamados internos.</p></div></div>
  <div class="cards-grid">
    <article class="metric"><div class="ico i-blue"><i class="bi bi-inbox"></i></div><strong>${c.abertos}</strong><span>Abertos</span></article>
    <article class="metric"><div class="ico i-amber"><i class="bi bi-hourglass-split"></i></div><strong>${c.andamento}</strong><span>Em andamento</span></article>
    <article class="metric"><div class="ico i-green"><i class="bi bi-check2-circle"></i></div><strong>${c.concluido}</strong><span>Concluídos</span></article>
    <article class="metric"><div class="ico i-cyan"><i class="bi bi-collection"></i></div><strong>${c.total}</strong><span>Total</span></article>
  </div>
  <article class="panel"><h3>Distribuição por status</h3><div class="chart-wrap" style="height:300px"><canvas id="statusChart"></canvas></div></article>
  <article class="panel" style="margin-top:16px"><h3>Fila de prioridade</h3>
    ${fila.length?fila.map(t=>`<div class="queue-item"><span class="dot" style="background:${t.prioridade==='Alta'?'var(--danger)':t.prioridade==='Média'?'var(--warning)':'var(--success)'}"></span>
      <div style="flex:1"><strong>${t.titulo}</strong><br><small class="muted">${t.setor||'—'} · ${t.solicitante}</small></div>${pill(t.prioridade)} ${pill(t.status)}
      <button class="row-btn" onclick="openTicket(${t.id})">Ver</button></div>`).join(''):'<p class="muted">Nenhum chamado em aberto.</p>'}
  </article>
  <p class="rt-hint"><i class="bi bi-broadcast"></i> ${USE_DB?'Atualização em tempo real ativa — novos chamados aparecem automaticamente.':'Modo local: configure o Supabase para sincronizar entre dispositivos.'}</p>`;
};
afterRender.dashboard=async()=>{
  if(!isSuporte()) return;
  const todos=await api.listChamados(null);
  const c={abertos:todos.filter(t=>t.status==='Aberto').length,andamento:todos.filter(t=>t.status==='Em andamento').length,concluido:todos.filter(t=>t.status==='Concluído').length};
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  const grid=dark?'rgba(255,255,255,.08)':'rgba(15,23,42,.07)', txt=dark?'#9fb0c7':'#5b6b82';
  if(window._charts)window._charts.forEach(ch=>ch.destroy()); window._charts=[];
  const st=$('#statusChart');
  if(st&&window.Chart)window._charts.push(new Chart(st,{type:'doughnut',data:{labels:['Abertos','Em andamento','Concluídos'],datasets:[{data:[c.abertos,c.andamento,c.concluido],backgroundColor:['#2563eb','#d97706','#16a34a'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:txt,padding:14}}}}}));
};

/* ---------- Novo chamado ---------- */
renderers.novoChamado=async()=>{
  const c=cad();
  return `<div class="section-head"><div><h3>Abrir novo chamado</h3><p>Descreva o problema para a equipe de suporte.</p></div></div>
  <article class="panel"><form id="ticketForm" class="form-grid">
    <div class="span-2"><label for="f-titulo">Título</label><input id="f-titulo" required placeholder="Resuma o problema"></div>
    <div><label for="f-setor">Setor</label><select id="f-setor">${c.setores.map(s=>`<option>${s.nome}</option>`).join('')}</select></div>
    <div><label for="f-resp">Responsável pelo setor</label><input id="f-resp" readonly placeholder="Selecione um setor"></div>
    <div><label for="f-prio">Prioridade</label><select id="f-prio"><option>Alta</option><option selected>Média</option><option>Baixa</option></select></div>
    <div class="span-2"><label for="f-desc">Descrição</label><textarea id="f-desc" placeholder="Explique o que está acontecendo..."></textarea></div>
    <div class="form-actions"><button class="btn primary" type="submit"><i class="bi bi-send"></i> Enviar chamado</button>
    <button class="btn secondary" type="button" onclick="navigate('chamados')">Cancelar</button></div>
  </form></article>`;
};
afterRender.novoChamado=async()=>{
  const setores=cad().setores;
  const setSel=$('#f-setor'), respIn=$('#f-resp');
  function preencherResp(){ const s=setores.find(x=>x.nome===setSel.value); respIn.value = s ? (s.resp||'—') : '—'; }
  setSel.addEventListener('change', preencherResp); preencherResp();
  $('#ticketForm').addEventListener('submit',async(e)=>{
    e.preventDefault();
    const titulo=$('#f-titulo').value.trim();
    if(!titulo){ showToast('Informe um título para o chamado.','error'); return; }
    try{
      const novo=await api.createChamado({titulo,descricao:$('#f-desc').value,solicitante:session.nome,solicitante_email:session.email,setor:$('#f-setor').value,prioridade:$('#f-prio').value,tecnico:respIn.value||'—'});
      showToast('Chamado #'+novo.id+' enviado com sucesso!');
      navigate('chamados');
    }catch(err){ showToast('Erro ao salvar: '+(err.message||err),'error'); }
  });
};

/* ---------- Lista de chamados ---------- */
renderers.chamados=async()=>{
  const lista=await api.listChamados(isSuporte()?null:session.email);
  if(!isSuporte()){
    return `<div class="section-head"><div><h3>Meus chamados</h3><p>Acompanhe o andamento das suas solicitações.</p></div>
      <button class="btn primary sm" onclick="navigate('novoChamado')"><i class="bi bi-plus-lg"></i> Novo</button></div>
    <article class="panel"><table class="simple"><thead><tr><th>ID</th><th>Título</th><th>Aberto em</th><th>Status</th><th></th></tr></thead><tbody>
      ${lista.length?lista.map(t=>`<tr><td>#${t.id}</td><td>${t.titulo}</td><td>${fmtData(t.created_at)}</td><td>${pill(t.status)}</td><td><button class="row-btn" onclick="openTicket(${t.id})">Ver</button></td></tr>`).join(''):'<tr><td colspan="5" class="muted">Nenhum chamado encontrado.</td></tr>'}
    </tbody></table></article>`;
  }
  return `<div class="section-head"><div><h3>Chamados</h3><p>Todos os chamados — busca, paginação e ordenação (DataTables).</p></div></div>
  <article class="panel"><table id="ticketsTable" class="display" style="width:100%">
    <thead><tr><th>ID</th><th>Título</th><th>Solicitante</th><th>Setor</th><th>Aberto em</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${lista.map(t=>`<tr><td>#${t.id}</td><td>${t.titulo}</td><td>${t.solicitante}</td><td>${t.setor||'—'}</td><td data-order="${t.created_at||''}">${fmtData(t.created_at)}</td>
      <td data-order="${t.prioridade}">${pill(t.prioridade)}</td><td data-order="${t.status}">${pill(t.status)}</td>
      <td><button class="row-btn" onclick="openTicket(${t.id})"><i class="bi bi-eye"></i></button>
          <button class="row-btn del" onclick="deleteTicket(${t.id})"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody>
  </table></article>`;
};
afterRender.chamados=async()=>{
  if(!isSuporte()) return;
  if(!(window.jQuery && jQuery.fn && jQuery.fn.DataTable)) return; // sem a lib, mantém a tabela simples
  if(jQuery.fn.DataTable.isDataTable('#ticketsTable')) new DataTable('#ticketsTable').destroy();
  new DataTable('#ticketsTable',{pageLength:6,lengthChange:false,language:{url:'https://cdn.datatables.net/plug-ins/2.0.8/i18n/pt-BR.json'}});
};
let currentId=null;
function openTicket(id){ currentId=id; navigate('detalhes'); }
async function deleteTicket(id){
  const t=await api.getChamado(id);
  if(t&&t.status==='Concluído'){ showToast('Erro: chamados concluídos não podem ser excluídos.','error'); return; }
  if(!confirm('Confirma a exclusão do chamado #'+id+'?')) return;
  try{ await api.deleteChamado(id); showToast('Chamado #'+id+' excluído.','info'); navigate('chamados'); }
  catch(e){ showToast('Erro ao excluir: '+(e.message||e),'error'); }
}

/* ---------- Detalhes + conversa ---------- */
renderers.detalhes=async()=>{
  if(!currentId){ const l=await api.listChamados(isSuporte()?null:session.email); currentId=l[0]?.id; }
  const t=currentId?await api.getChamado(currentId):null;
  if(!t) return '<article class="panel"><p class="muted">Nenhum chamado selecionado.</p></article>';
  const coms=await api.listComentarios(t.id);
  const sup=await api.listUsuarios('suporte');
  const painelSuporte=isSuporte()?`
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
      <select id="f-status" class="inp">${['Aberto','Em andamento','Concluído'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select>
      <select id="f-tec" class="inp"><option ${!sup.some(x=>x.nome===t.tecnico)?'selected':''}>—</option>${sup.map(x=>`<option ${x.nome===t.tecnico?'selected':''}>${x.nome}</option>`).join('')}</select>
      <button class="btn primary" onclick="salvarAtendimento()"><i class="bi bi-check-lg"></i> Atualizar</button>
    </div>`:`<p style="margin-top:12px"><b>Status atual:</b> ${pill(t.status)}</p>`;
  return `<div class="section-head"><div><h3>Chamado #${t.id}</h3><p>${t.titulo}</p></div>
    <button class="btn secondary sm" onclick="navigate('chamados')"><i class="bi bi-arrow-left"></i> Voltar</button></div>
  <div class="grid-2">
    <article class="panel">
      <p><b>Problema:</b> ${t.descricao||'—'}</p>
      <p><b>Solicitante:</b> ${t.solicitante} &nbsp;·&nbsp; <b>Setor:</b> ${t.setor||'—'}</p>
      <p><b>Responsável:</b> ${t.tecnico||'—'} &nbsp;·&nbsp; <b>Prioridade:</b> ${pill(t.prioridade)}</p>
      <p><b>Aberto em:</b> ${fmtData(t.created_at)}</p>
      ${painelSuporte}
    </article>
    <article class="panel"><h3>Conversa</h3>
      <div class="thread" id="thread">
        ${coms.length?coms.map(m=>`<div class="msg ${m.papel==='suporte'?'sup':'cli'}"><small>${m.autor} · ${m.papel}</small><p>${m.mensagem}</p></div>`).join(''):'<p class="muted">Sem mensagens ainda.</p>'}
      </div>
      <div class="msg-box"><input id="msgInput" placeholder="Escreva uma mensagem..."><button class="btn primary" onclick="enviarMsg()"><i class="bi bi-send"></i></button></div>
    </article>
  </div>`;
};
async function salvarAtendimento(){
  try{ await api.updateChamado(currentId,{status:$('#f-status').value,tecnico:$('#f-tec').value});
    showToast('Atendimento atualizado!'); navigate('detalhes'); }
  catch(e){ showToast('Erro: '+(e.message||e),'error'); }
}
async function enviarMsg(){
  const v=$('#msgInput').value.trim(); if(!v) return;
  try{ await api.addComentario({chamado_id:currentId,autor:session.nome,papel:session.role,mensagem:v});
    navigate('detalhes'); }
  catch(e){ showToast('Erro ao enviar: '+(e.message||e),'error'); }
}

/* ---------- Cadastros (suporte) ---------- */
function listPanel(title,head,rows){ return `<article class="panel"><h3>${title}</h3><table class="simple"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></article>`; }
renderers.usuarios=async()=>{
  const lista=await api.listUsuarios();
  const tag=(p)=>`<span class="pill ${p==='suporte'?'andamento':'aberto'}">${p==='suporte'?'Suporte':'Cliente'}</span>`;
  return `<div class="section-head"><div><h3>Usuários</h3><p>Contas de clientes e da equipe de suporte/técnicos.</p></div></div>
  <div class="grid-2">
    <article class="panel"><h3>Criar usuário</h3><form id="userForm" class="form-grid">
      <div class="span-2"><label for="u2-nome">Nome</label><input id="u2-nome" value="Novo Usuário"></div>
      <div><label for="u2-mail">E-mail</label><input id="u2-mail" value="novo@empresa.com"></div>
      <div><label for="u2-senha">Senha</label><input id="u2-senha" value="123456"></div>
      <div class="span-2"><label for="u2-papel">Tipo de conta</label><select id="u2-papel"><option value="cliente">Cliente</option><option value="suporte">Suporte / Técnico</option></select></div>
      <div class="form-actions"><button class="btn primary" type="submit"><i class="bi bi-person-plus"></i> Salvar usuário</button></div>
    </form></article>
    <article class="panel"><h3>Cadastrados (${lista.length})</h3>
      <table class="simple"><thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th></th></tr></thead><tbody>
      ${lista.map(u=>`<tr><td>${u.nome}</td><td>${u.email}</td><td>${tag(u.papel)}</td>
        <td><button class="row-btn del" onclick="delUser(${u.id})" title="Excluir"><i class="bi bi-trash"></i></button></td></tr>`).join('')}
      </tbody></table>
    </article>
  </div>`;
};
afterRender.usuarios=async()=>$('#userForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const nome=$('#u2-nome').value.trim(), email=$('#u2-mail').value.trim();
  if(!nome||!email){ showToast('Preencha nome e e-mail.','error'); return; }
  try{ await api.registerUser({nome,email,senha:$('#u2-senha').value||'123456',papel:$('#u2-papel').value});
    showToast('Usuário criado com sucesso!'); navigate('usuarios'); }
  catch(err){ showToast(err.message||String(err),'error'); }
});
async function delUser(id){
  if(id==session.id){ showToast('Você não pode excluir a própria conta.','error'); return; }
  if(!confirm('Confirma a exclusão deste usuário?')) return;
  try{ await api.deleteUsuario(id); showToast('Usuário excluído.','info'); navigate('usuarios'); }
  catch(e){ showToast('Erro ao excluir: '+(e.message||e),'error'); }
}

renderers.setores=async()=>{ const c=cad(); const sup=await api.listUsuarios('suporte'); return `<div class="section-head"><div><h3>Setores</h3><p>Áreas internas. O responsável deve ser um usuário de suporte.</p></div></div>
  <div class="grid-2"><article class="panel"><form id="setForm" class="form-grid">
    <div><label for="s-nome">Setor</label><input id="s-nome" value="Logística"></div>
    <div><label for="s-resp">Responsável (suporte)</label><select id="s-resp">${sup.length?sup.map(x=>`<option>${x.nome}</option>`).join(''):'<option value="">Cadastre um suporte primeiro</option>'}</select></div>
    <div class="form-actions"><button class="btn primary" type="submit">Salvar setor</button></div></form></article>
    ${listPanel('Cadastrados',['Setor','Responsável',''],c.setores.map((s,i)=>`<tr><td>${s.nome}</td><td>${s.resp||'—'}</td><td><button class="row-btn del" onclick="delSetor(${i})" title="Excluir setor"><i class="bi bi-trash"></i></button></td></tr>`).join('')||'<tr><td colspan="3" class="muted">Nenhum setor cadastrado.</td></tr>')}</div>`; };
afterRender.setores=async()=>$('#setForm').addEventListener('submit',e=>{e.preventDefault();const c=cad();const resp=$('#s-resp').value;if(!resp){showToast('Não há suporte cadastrado para ser responsável.','error');return;}c.setores.push({nome:$('#s-nome').value,resp});saveCad(c);showToast('Setor salvo!');navigate('setores');});
function delSetor(i){
  const c=cad(); const s=c.setores[i]; if(!s) return;
  if(!confirm('Excluir o setor "'+s.nome+'"?')) return;
  c.setores.splice(i,1); saveCad(c); showToast('Setor excluído.','info'); navigate('setores');
}

renderers.unidades=async()=>{ const c=cad(); return `<div class="section-head"><div><h3>Unidades</h3><p>Locais de atendimento. O CEP preenche o endereço via API ViaCEP.</p></div></div>
  <div class="grid-2"><article class="panel"><form id="uniForm" class="form-grid">
    <div><label for="u-nome">Unidade</label><input id="u-nome" value="Filial Centro"></div>
    <div><label for="cep">CEP</label><input id="cep" maxlength="9" value="89010025"></div>
    <div><label for="rua">Rua</label><input id="rua"></div><div><label for="bairro">Bairro</label><input id="bairro"></div>
    <div><label for="cidade">Cidade</label><input id="cidade"></div><div><label for="uf">UF</label><input id="uf"></div>
    <div class="form-actions"><button class="btn primary" type="submit">Salvar unidade</button></div></form>
    <p class="muted" style="margin-top:12px"><i class="bi bi-info-circle"></i> Ao sair do campo CEP, o endereço é preenchido automaticamente.</p></article>
    ${listPanel('Cadastradas',['Unidade','Cidade','UF'],c.unidades.map(u=>`<tr><td>${u.nome}</td><td>${u.cidade}</td><td>${u.uf}</td></tr>`).join(''))}</div>`; };
afterRender.unidades=async()=>{
  const cep=$('#cep'); cep.addEventListener('blur',buscarCep);
  cep.addEventListener('input',()=>{let v=cep.value.replace(/\D/g,'').slice(0,8);cep.value=v.length>5?v.slice(0,5)+'-'+v.slice(5):v;});
  $('#uniForm').addEventListener('submit',e=>{e.preventDefault();const c=cad();c.unidades.push({nome:$('#u-nome').value,cidade:$('#cidade').value||'-',uf:$('#uf').value||'-'});saveCad(c);showToast('Unidade salva!');navigate('unidades');});
  buscarCep();
};
async function buscarCep(){
  const el=$('#cep'); if(!el) return; const v=el.value.replace(/\D/g,''); if(v.length!==8) return;
  try{ const r=await fetch(`https://viacep.com.br/ws/${v}/json/`); const d=await r.json();
    if(d.erro){ showToast('CEP não encontrado.','error'); return; }
    $('#rua').value=d.logradouro||''; $('#bairro').value=d.bairro||''; $('#cidade').value=d.localidade||''; $('#uf').value=d.uf||'';
  }catch(e){ showToast('ViaCEP indisponível.','error'); }
}

/* ---------- Relatórios ---------- */
renderers.relatorios=async()=>{
  const todos=await api.listChamados(null);
  const c={abertos:todos.filter(t=>t.status==='Aberto').length,andamento:todos.filter(t=>t.status==='Em andamento').length,concluido:todos.filter(t=>t.status==='Concluído').length,total:todos.length};
  const porSetor={}; todos.forEach(t=>porSetor[t.setor||'—']=(porSetor[t.setor||'—']||0)+1);
  return `<div class="section-head"><div><h3>Relatório gerencial</h3><p>Resumo consolidado.</p></div>
    <button class="btn secondary sm" onclick="showToast('Relatório exportado (simulado).','info')"><i class="bi bi-download"></i> Exportar</button></div>
  <div class="grid-2">
    ${listPanel('Métricas gerais',['Métrica','Resultado'],`<tr><td>Abertos</td><td>${c.abertos}</td></tr><tr><td>Em andamento</td><td>${c.andamento}</td></tr><tr><td>Concluídos</td><td>${c.concluido}</td></tr><tr><td>Total</td><td>${c.total}</td></tr>`)}
    ${listPanel('Chamados por setor',['Setor','Qtd.'],Object.entries(porSetor).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join(''))}
  </div>`;
};

/* ---------- Perfil ---------- */
renderers.perfil=async()=>`<div class="section-head"><div><h3>Perfil</h3><p>Seus dados de acesso.</p></div></div>
  <article class="panel"><form id="perfForm" class="form-grid">
    <div><label for="p-nome">Nome</label><input id="p-nome" value="${session.nome}"></div>
    <div><label for="p-mail">E-mail</label><input id="p-mail" value="${session.email}"></div>
    <div class="span-2"><label>Perfil de acesso</label><input value="${isSuporte()?'Suporte / TI':'Cliente'}" disabled></div>
    <div class="form-actions"><button class="btn primary" type="submit">Atualizar</button></div></form></article>`;
afterRender.perfil=async()=>$('#perfForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  session.nome=$('#p-nome').value; session.email=$('#p-mail').value;
  localStorage.setItem(SK,JSON.stringify(session)); refreshUserChip();
  try{ if(session.id) await api.updateUsuario(session.id,{nome:session.nome,email:session.email}); }catch(err){}
  showToast('Perfil atualizado!');
});

/* ---------- Configurações ---------- */
renderers.configuracoes=async()=>{
  const c=cad(); const dark=document.documentElement.getAttribute('data-theme')==='dark';
  return `<div class="section-head"><div><h3>Configurações</h3><p>Preferências da plataforma.</p></div></div>
  <div class="grid-2">
    <article class="panel"><h3>Aparência</h3><p class="muted">O tema fica salvo no navegador (localStorage) e permanece ao recarregar.</p>
      <button class="btn primary" onclick="toggleTheme()"><i class="bi bi-${dark?'sun':'moon-stars'}"></i> Modo ${dark?'claro':'escuro'}</button></article>
    <article class="panel"><h3>Clima no painel (API Ninjas)</h3><p class="muted">O clima fica padronizado para Blumenau/SC em todos os acessos: cliente, suporte/técnico e administrador.</p>
      <div class="notice"><b>API Weather:</b> chave padrão ativa em <span class="kbd">config.js</span> usando latitude/longitude de Blumenau.</div>
      <div class="form-grid">
        <div><label>Local padrão</label><input class="inp" value="Blumenau/SC" readonly></div>
        <div><label>Latitude</label><input class="inp" value="${Number(WEATHER_CFG.lat || -26.91889)}" readonly></div>
        <div><label>Longitude</label><input class="inp" value="${Number(WEATHER_CFG.lon || -49.06583)}" readonly></div>
      </div>
      <button class="btn primary" style="margin-top:14px" onclick="salvarClima()"><i class="bi bi-cloud-check"></i> Testar clima de Blumenau</button></article>
  </div>
  <article class="panel" style="margin-top:16px"><h3>Banco de dados</h3>
    <p>${USE_DB?'<b style="color:var(--success)">Conectado ao Supabase.</b> Dados persistentes e compartilhados entre dispositivos.':'<b style="color:var(--warning)">Modo local.</b> Edite <span class="kbd">config.js</span> com a URL e a chave do seu projeto Supabase para ativar o banco persistente.'}</p></article>`;
};
function salvarClima(){ const c=cad(); c.weatherKey=''; c.weatherCity=WEATHER_CFG.city || 'Blumenau'; c.weatherLat=Number(WEATHER_CFG.lat) || -26.91889; c.weatherLon=Number(WEATHER_CFG.lon) || -49.06583; saveCad(c); loadWeather(); showToast('Clima padrão de Blumenau testado!'); }

/* ---------- Ajuda ---------- */
renderers.ajuda=async()=>{
  const passos=isSuporte()
    ?['Veja os indicadores no Dashboard','Abra a lista de Chamados','Clique em Ver para abrir um chamado','Atribua técnico e mude o status','Converse com o cliente pela aba Conversa','Acompanhe os Relatórios']
    :['Clique em Abrir chamado','Descreva o problema e envie','Acompanhe em Meus chamados','Abra Ver para conversar com o suporte','Veja o status mudar em tempo real'];
  return `<div class="section-head"><div><h3>Central de ajuda</h3><p>Como usar o Suporte360.</p></div></div>
  <article class="panel"><h3>Passo a passo (${isSuporte()?'Suporte':'Cliente'})</h3>
    ${passos.map((s,i)=>`<div class="help-step"><span class="n">${i+1}</span><div>${s}</div></div>`).join('')}</article>`;
};

/* ---------- API Ninjas — Weather ---------- */
function loadWeather(){
  const box = $('#weatherBox');
  if(!box) return;

  const span = box.querySelector('span');
  const c = cad();

  // A chave padrão vem do config.js. Assim todos os usuários já entram com o clima ativo.
  const weatherKey = String(WEATHER_CFG.apiKey || c.weatherKey || '').trim();
  // Padrão fixo para todos os perfis: cliente, suporte/técnico e administrador.
  // Não usamos city=..., porque a API Ninjas exige plano premium para busca por cidade.
  const weatherCity = String(WEATHER_CFG.city || 'Blumenau').trim();
  const weatherLat = Number.isFinite(Number(WEATHER_CFG.lat)) ? Number(WEATHER_CFG.lat) : -26.91889;
  const weatherLon = Number.isFinite(Number(WEATHER_CFG.lon)) ? Number(WEATHER_CFG.lon) : -49.06583;

  if(!weatherKey){
    span.textContent = 'Configurar clima';
    return;
  }

  // No plano gratuito da API Ninjas, a busca por cidade pode retornar:
  // {"error": "Searching by city parameter requires a premium subscription."}
  // Por isso, para Blumenau usamos latitude/longitude como padrão.
  const weatherUrl = `https://api.api-ninjas.com/v1/weather?lat=${encodeURIComponent(weatherLat)}&lon=${encodeURIComponent(weatherLon)}`;
  span.textContent = 'Carregando clima...';

  function montarTextoClima(result){
    if(!result || typeof result.temp === 'undefined'){
      console.warn('API Ninjas Weather: resposta sem temp:', result);
      return null;
    }

    const temp = Math.round(Number(result.temp));
    const feels = typeof result.feels_like !== 'undefined'
      ? ` · Sens. ${Math.round(Number(result.feels_like))}°C`
      : '';
    const hum = typeof result.humidity !== 'undefined'
      ? ` · Umid. ${result.humidity}%`
      : '';
    const wind = typeof result.wind_speed !== 'undefined'
      ? ` · Vento ${result.wind_speed}`
      : '';

    return `${weatherCity} ${temp}°C${feels}${hum}${wind}`;
  }

  function mostrarErro(status, detalhe){
    const detalheLimpo = String(detalhe || '').slice(0, 120);
    console.error('API Ninjas Weather Error:', status, detalheLimpo);

    // Status 0 quase sempre é CORS, bloqueio do navegador, falta de internet ou abrir o HTML direto pelo file://.
    if(status === 0 || status === '0'){
      span.textContent = 'Clima bloqueado pelo navegador';
      return;
    }

    span.textContent = `Clima erro ${status}`;
  }

  // XMLHttpRequest puro: evita conflito com o $ do projeto e reproduz o comportamento do exemplo da API Ninjas.
  try{
    const xhr = new XMLHttpRequest();
    xhr.open('GET', weatherUrl, true);
    xhr.setRequestHeader('X-Api-Key', weatherKey);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function(){
      if(xhr.status >= 200 && xhr.status < 300){
        try{
          const result = JSON.parse(xhr.responseText || '{}');
          console.log('API Ninjas Weather:', result);

          const texto = montarTextoClima(result);
          span.textContent = texto || 'Clima sem temperatura';
        }catch(e){
          mostrarErro('JSON', e.message);
        }
      }else{
        mostrarErro(xhr.status, xhr.responseText || xhr.statusText);
      }
    };

    xhr.onerror = function(){
      mostrarErro(0, 'Falha de rede/CORS. Abra pelo Live Server ou publique em localhost.');
    };

    xhr.ontimeout = function(){
      mostrarErro('timeout', 'Tempo esgotado ao chamar API Ninjas Weather.');
    };

    xhr.timeout = 12000;
    xhr.send();
  }catch(e){
    mostrarErro('script', e.message || e);
  }
}

/* ---------- Auto-login se já houver sessão ---------- */
if(session) enterApp();
