/* v0.9.1 — diretório de clientes por área, sem migração automática. */
function clientDirectoryAreas(){return getAreas().filter(area=>areaType(area)==='clients');}
function clientDirectoryAreaId(){
  const areas=clientDirectoryAreas(),selected=ui.clientDirectoryAreaId;
  if(areas.some(area=>area.id===selected))return selected;
  const active=activeAreaId();
  return areas.some(area=>area.id===active)?active:(areas[0]?.id||'');
}
function clientDirectoryClients(query='',areaId=clientDirectoryAreaId()){
  const needle=normalizeSearchText(query);
  return (data.settings.clients||[]).filter(client=>client&&!client.deletedAt&&client.areaId===areaId&&(!needle||normalizeSearchText(client.name).includes(needle))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function clientSessionCount(clientId){return data.sessions.filter(session=>session.status==='saved'&&!session.deletedAt&&session.clientId===clientId).length;}
function clientDirectoryRows(query='',areaId=clientDirectoryAreaId()){
  const clients=clientDirectoryClients(query,areaId);
  if(!areaId)return '<div class="empty">Crie uma área do tipo Clientes / atendimentos para cadastrar clientes.</div>';
  if(!clients.length)return `<div class="empty">${String(query||'').trim()?'Nenhum cliente encontrado.':'Nenhum cliente cadastrado nesta área.'}</div>`;
  return `<div class="client-directory-card">${clients.map(client=>`<button class="client-directory-row" data-open-client="${esc(client.id)}"><span><strong>${esc(client.name)}</strong>${client.whatsapp?`<small>${esc(client.whatsapp)}</small>`:''}</span><span>${clientSessionCount(client.id)} atend.</span></button>`).join('')}</div>`;
}
function renderClientsDirectory(){
  const areas=clientDirectoryAreas(),areaId=clientDirectoryAreaId(),query=String(ui.clientDirectoryQuery||'');
  return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeClientsDirectory" aria-label="Voltar">${svgIcon('back')}</button><h1>Clientes</h1><button class="client-directory-header-action" id="createDirectoryClient" aria-label="Cadastrar cliente">${svgIcon('plus')}</button></header><main class="settings-content clients-directory-screen"><label class="client-directory-search"><span aria-hidden="true">⌕</span><input id="clientDirectorySearch" type="search" placeholder="Pesquisar clientes" value="${esc(query)}" autocomplete="off"></label>${areas.length>1?`<label class="client-directory-area"><span>Área</span><select id="clientDirectoryArea">${areas.map(area=>`<option value="${esc(area.id)}" ${area.id===areaId?'selected':''}>${esc(area.name)}</option>`).join('')}</select></label>`:''}<button class="client-directory-create" id="createDirectoryClientMain">${svgIcon('plus')}<span>Cadastrar novo cliente${areaId?` em ${esc(areaById(areaId).name)}`:''}</span></button><div id="clientDirectoryRows">${clientDirectoryRows(query,areaId)}</div></main>`,'settings');
}
async function createDirectoryClient(){
  const areaId=clientDirectoryAreaId();
  if(!areaId){toast('Crie primeiro uma área do tipo Clientes / atendimentos');return;}
  const raw=await iosTextPrompt({title:'Cadastrar cliente',placeholder:'Nome do cliente'}),name=String(raw??'').trim();
  if(!name)return;
  const existing=clientsForArea(areaId).find(client=>normalizeSearchText(client.name)===normalizeSearchText(name));
  const client=existing||await createClient(name,areaId);
  if(!existing){
    const phone=await iosTextPrompt({title:'WhatsApp',message:'Opcional',placeholder:'(00) 00000-0000'});
    client.whatsapp=String(phone??'').trim();client.updatedAt=now();await persistSettings();
  }
  ui.modal={type:'clientProfile',clientId:client.id};render();
}
async function editDirectoryClient(clientId){
  const client=clientById(clientId);if(!client||client.deletedAt)return;
  const raw=await iosTextPrompt({title:'Editar cliente',value:client.name,placeholder:'Nome do cliente'}),name=String(raw??'').trim();
  if(!name)return;
  const duplicate=clientsForArea(client.areaId).find(item=>item.id!==client.id&&normalizeSearchText(item.name)===normalizeSearchText(name));
  if(duplicate){toast('Já existe um cliente com esse nome nesta área');return;}
  const phone=await iosTextPrompt({title:'WhatsApp',message:'Opcional',value:client.whatsapp||'',placeholder:'(00) 00000-0000'});
  client.name=name;client.whatsapp=String(phone??client.whatsapp??'').trim();client.updatedAt=now();
  for(const session of data.sessions){if(session.clientId===client.id){session.clientNameSnapshot=name;await put('sessions',session);}}
  if(data.current?.clientId===client.id){data.current.clientNameSnapshot=name;await persistCurrent();}
  await persistSettings();render();
}
async function deleteDirectoryClient(clientId){
  const client=clientById(clientId);if(!client||client.deletedAt)return;
  const count=clientSessionCount(client.id),detail=count?`${count} atendimento(s) e seus nomes registrados serão preservados.`:'Nenhum atendimento será apagado.';
  if(!confirm(`Excluir “${client.name}” do cadastro? ${detail}`))return;
  client.deletedAt=now();client.updatedAt=now();await persistSettings();ui.modal=null;render();
}
function openClientWhatsApp(clientId){
  const client=clientById(clientId),number=String(client?.whatsapp||'').replace(/\D/g,'');
  if(!number){toast('WhatsApp não informado');return;}
  window.open(`https://wa.me/${number}`,'_blank','noopener');
}
function renderClientProfile(clientId){
  const client=clientById(clientId);if(!client)return '';
  const sessions=data.sessions.filter(session=>session.status==='saved'&&!session.deletedAt&&session.clientId===client.id).sort((a,b)=>recordDateMs(b)-recordDateMs(a));
  const measured=sessions.filter(session=>!session.isNoMeasurement),average=measured.length?measured.reduce((sum,session)=>sum+sessionTotal(session,session.savedAt),0)/measured.length:0;
  const notes=[...new Set(sessions.map(session=>String(session.clientNote||'').trim()).filter(Boolean))];
  return `<div class="client-profile-wrap"><section class="client-profile-card client-directory-profile"><div class="client-profile-head"><button class="client-profile-edit" data-edit-directory-client="${esc(client.id)}">Editar</button><h2>${esc(client.name)}</h2><button class="client-profile-close" id="closeClientProfile">${svgIcon('close')}</button></div><div class="client-contact-strip"><span><small>Área</small><strong>${esc(areaById(client.areaId).name)}</strong></span><span><small>WhatsApp</small><strong>${esc(client.whatsapp||'Não informado')}</strong></span><span><small>Atendimentos</small><strong>${sessions.length}</strong></span><span><small>Tempo médio</small><strong>${measured.length?fmtDuration(average):'—'}</strong></span></div>${client.whatsapp?`<button class="client-whatsapp-button" data-open-client-whatsapp="${esc(client.id)}">Abrir WhatsApp</button>`:''}<section class="client-profile-section"><h3>Notas sobre o cliente</h3>${notes.length?notes.map(note=>`<p class="client-directory-note">${esc(note)}</p>`).join(''):'<div class="muted small">Nenhuma anotação.</div>'}</section><section class="client-profile-section"><h3>Histórico</h3>${sessions.length?sessions.map(session=>`<button class="client-directory-history-row" data-open-client-record="${esc(session.id)}"><span>${esc(session.modelNameSnapshot||modelById(session.modelId)?.name||'Modelo')}</span><strong>${esc(fmtDate(recordDateMs(session)))}</strong></button>`).join(''):'<div class="muted small">Nenhum atendimento vinculado.</div>'}</section><button class="client-directory-delete" data-delete-directory-client="${esc(client.id)}">Excluir cliente</button></section></div>`;
}

const __renderSettingsV091Base=renderSettings;
renderSettings=function(){return ui.settingsView==='clientsDirectory'?renderClientsDirectory():__renderSettingsV091Base();};
const __renderV091Base=render;
render=function(){
  const result=__renderV091Base(),byId=id=>document.getElementById(id);
  if(byId('openClientsDirectory'))byId('openClientsDirectory').onclick=()=>{ui.settingsView='clientsDirectory';ui.clientDirectoryQuery='';ui.clientDirectoryAreaId=clientDirectoryAreaId();render();};
  if(byId('closeClientsDirectory'))byId('closeClientsDirectory').onclick=()=>{ui.settingsView='main';render();};
  ['createDirectoryClient','createDirectoryClientMain'].forEach(id=>{const button=byId(id);if(button)button.onclick=createDirectoryClient;});
  const area=byId('clientDirectoryArea');if(area)area.onchange=()=>{ui.clientDirectoryAreaId=area.value;render();};
  const search=byId('clientDirectorySearch');if(search)search.oninput=event=>{ui.clientDirectoryQuery=event.target.value;const rows=byId('clientDirectoryRows');if(rows)rows.innerHTML=clientDirectoryRows(ui.clientDirectoryQuery,clientDirectoryAreaId());document.querySelectorAll('[data-open-client]').forEach(button=>button.onclick=()=>{ui.modal={type:'clientProfile',clientId:button.dataset.openClient};render();});};
  document.querySelectorAll('[data-edit-directory-client]').forEach(button=>button.onclick=()=>editDirectoryClient(button.dataset.editDirectoryClient));
  document.querySelectorAll('[data-delete-directory-client]').forEach(button=>button.onclick=()=>deleteDirectoryClient(button.dataset.deleteDirectoryClient));
  document.querySelectorAll('[data-open-client-whatsapp]').forEach(button=>button.onclick=()=>openClientWhatsApp(button.dataset.openClientWhatsapp));
  return result;
};
