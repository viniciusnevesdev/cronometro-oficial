(function(){
"use strict";
var cfg=window.CRONO_APP_CONFIG;
if(!cfg) throw new Error("CRONO_APP_CONFIG ausente");
var app=document.getElementById("app");
var state={tab:"timer",models:[],contexts:[],sessions:[],current:null,selectedContextId:null,selectedModelId:null};
var contextStore=cfg.kind==="areas"?"areas":"clients";
var contextKey=cfg.kind==="areas"?"areaId":"clientId";
var contextLabel=cfg.kind==="areas"?"Área":"Cliente";
var db=null;

function uid(){return (crypto.randomUUID&&crypto.randomUUID())||("id-"+Date.now()+"-"+Math.random().toString(16).slice(2));}
function now(){return Date.now();}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];});}
function fmt(ms){ms=Math.max(0,Number(ms)||0);var t=Math.floor(ms/1000),h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;return h?(h+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")):(m+":"+String(s).padStart(2,"0"));}
function timerDuration(t,at){at=at||now();return (t.intervals||[]).reduce(function(sum,i){return sum+Math.max(0,(i.endedAt==null?at:i.endedAt)-i.startedAt);},0);}
function sessionTotal(s,at){return (s&&s.timers||[]).reduce(function(sum,t){return sum+timerDuration(t,at);},0);}
function starterModel(){var names=["Remoção","Levantamento de cutícula","Corte da cutícula","Estrutura","Lixamento","Esmaltação","Top Coat"];return {id:"modelo-manutencao",name:"Manutenção",sortOrder:0,timers:names.map(function(name,i){return {id:"timer-"+(i+1),name:name,order:i};})};}

function openDb(){
 if(db)return Promise.resolve(db);
 return new Promise(function(resolve,reject){
  var r=indexedDB.open(cfg.dbName,1);
  r.onupgradeneeded=function(){
   var d=r.result;
   ["models","sessions","state"].forEach(function(n){if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:n==="state"?"key":"id"});});
   if(!d.objectStoreNames.contains(contextStore))d.createObjectStore(contextStore,{keyPath:"id"});
  };
  r.onsuccess=function(){db=r.result;resolve(db);};
  r.onerror=function(){reject(r.error);};
  r.onblocked=function(){reject(new Error("Banco bloqueado por outra aba."));};
 });
}
function all(store){return openDb().then(function(d){return new Promise(function(resolve,reject){var r=d.transaction(store,"readonly").objectStore(store).getAll();r.onsuccess=function(){resolve(r.result||[]);};r.onerror=function(){reject(r.error);};});});}
function get(store,key){return openDb().then(function(d){return new Promise(function(resolve,reject){var r=d.transaction(store,"readonly").objectStore(store).get(key);r.onsuccess=function(){resolve(r.result||null);};r.onerror=function(){reject(r.error);};});});}
function put(store,value){return openDb().then(function(d){return new Promise(function(resolve,reject){var tx=d.transaction(store,"readwrite");tx.objectStore(store).put(value);tx.oncomplete=function(){resolve(value);};tx.onerror=function(){reject(tx.error);};});});}
function getState(key,fallback){return get("state",key).then(function(r){return r?r.value:fallback;});}
function setState(key,value){return put("state",{key:key,value:value});}
function clearBeta(){return openDb().then(function(d){var names=["models","sessions","state",contextStore];return Promise.all(names.map(function(n){return new Promise(function(resolve,reject){var tx=d.transaction(n,"readwrite");tx.objectStore(n).clear();tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};});}));});}

var UI={
 header:function(){return '<header class="app-header"><div><small>Nova arquitetura</small><h1>'+esc(cfg.title)+'</h1></div><span class="beta-pill">BETA NOVA</span></header>';},
 button:function(label,id,extra){return '<button class="primary-button" id="'+esc(id)+'" '+(extra||"")+'>'+esc(label)+'</button>';},
 row:function(title,subtitle){return '<div class="list-row"><span><strong>'+esc(title)+'</strong>'+(subtitle?'<small>'+esc(subtitle)+'</small>':"")+'</span></div>';},
 nav:function(){var specific=cfg.kind==="areas"?["areas","Áreas"]:["clients","Clientes"];var items=[["timer","Cronômetros"],["models","Modelos"],specific,["history","Histórico"],["settings","Ajustes"]];return '<nav class="bottom-nav">'+items.map(function(x){return '<button data-tab="'+x[0]+'" class="'+(state.tab===x[0]?"active":"")+'"><span>'+({timer:"⏱",models:"▦",areas:"◫",clients:"◉",history:"◷",settings:"⚙"}[x[0]]||"•")+'</span><small>'+x[1]+'</small></button>';}).join("")+'</nav>';},
 empty:function(text){return '<div class="empty-state">'+esc(text)+'</div>';},
 timerCards:function(s){return '<div class="timer-grid">'+s.timers.slice().sort(function(a,b){return a.order-b.order;}).map(function(t){var running=(t.intervals||[]).some(function(i){return i.endedAt==null;});return '<button class="timer-card '+(running?"running":"")+'" data-timer="'+esc(t.id)+'"><span>'+esc(t.name)+'</span><strong>'+fmt(timerDuration(t))+'</strong><small>'+(running?"Rodando":"Toque para iniciar")+'</small></button>';}).join("")+'</div><section class="total-card"><span>Tempo total</span><strong>'+fmt(sessionTotal(s))+'</strong></section>';}
};

function shell(body){return UI.header()+'<main class="content">'+body+'</main>'+UI.nav();}
function contextOptions(){return state.contexts.map(function(c){return '<option value="'+esc(c.id)+'" '+(c.id===state.selectedContextId?"selected":"")+'>'+esc(c.name)+'</option>';}).join("");}
function modelOptions(){return state.models.map(function(m){return '<option value="'+esc(m.id)+'" '+(m.id===state.selectedModelId?"selected":"")+'>'+esc(m.name)+'</option>';}).join("");}
function currentContext(){return state.contexts.find(function(c){return c.id===state.selectedContextId;})||null;}

function renderTimer(){
 if(state.current){
  var c=state.contexts.find(function(x){return x.id===state.current[contextKey];});
  return shell((c?'<span class="context-chip">'+contextLabel+': '+esc(c.name)+'</span>':"")+UI.timerCards(state.current)+UI.button(cfg.kind==="clients"?"Salvar atendimento":"Salvar registro","saveSession")+'<button class="secondary-button" id="discardSession">Descartar sessão</button>');
 }
 var noContext=!state.contexts.length;
 return shell('<section class="panel"><h2>'+(cfg.kind==="clients"?"Novo atendimento":"Nova sessão")+'</h2>'+(noContext?'<p class="notice">Cadastre '+(cfg.kind==="clients"?"uma cliente":"uma área")+' primeiro.</p>':'<label class="field"><span>'+contextLabel+'</span><select id="contextSelect">'+contextOptions()+'</select></label>')+'<label class="field"><span>Modelo</span><select id="modelSelect">'+modelOptions()+'</select></label>'+UI.button(cfg.kind==="clients"?"Iniciar atendimento":"Iniciar cronômetros","startSession",noContext?"disabled":"")+'</section><section class="panel"><p class="notice">'+(cfg.kind==="clients"?"Este app não possui Áreas nem areaId.":"Este app não possui clientes nem clientId.")+'</p></section>');
}
function renderContexts(){
 var title=cfg.kind==="areas"?"Áreas":"Clientes";
 var list=state.contexts.length?'<div class="list-card">'+state.contexts.map(function(c){return UI.row(c.name,c.whatsapp||"");}).join("")+'</div>':UI.empty("Nenhum cadastro ainda.");
 return shell('<h2 class="section-title">'+title+'</h2>'+list+'<section class="panel"><h2>'+(cfg.kind==="areas"?"Nova área":"Cadastrar cliente")+'</h2><label class="field"><span>Nome</span><input id="contextName" placeholder="'+(cfg.kind==="areas"?"Ex.: Trabalho":"Nome da cliente")+'"></label>'+(cfg.kind==="clients"?'<label class="field"><span>WhatsApp (opcional)</span><input id="contextPhone" placeholder="(00) 00000-0000"></label>':"")+UI.button(cfg.kind==="areas"?"Adicionar área":"Cadastrar cliente","addContext")+'</section>');
}
function renderModels(){
 var list=state.models.length?'<div class="list-card">'+state.models.map(function(m){return UI.row(m.name,(m.timers||[]).length+" cronômetros");}).join("")+'</div>':UI.empty("Nenhum modelo.");
 return shell('<h2 class="section-title">Modelos</h2>'+list+'<section class="panel"><h2>Novo modelo</h2><label class="field"><span>Nome</span><input id="modelName"></label><label class="field"><span>Cronômetros separados por vírgula</span><textarea id="modelTimers" rows="3" placeholder="Remoção, Preparação, Esmaltação"></textarea></label>'+UI.button("Criar modelo","addModel")+'</section>');
}
function renderHistory(){
 if(!state.sessions.length)return shell(UI.empty(cfg.kind==="clients"?"Nenhum atendimento salvo.":"Nenhum registro salvo."));
 return shell('<h2 class="section-title">Histórico</h2>'+state.sessions.map(function(s){var c=state.contexts.find(function(x){return x.id===s[contextKey];});return '<article class="history-item"><div><strong>'+esc(c?c.name:"Sem vínculo")+'</strong><small>'+esc(s.modelNameSnapshot)+' · '+new Date(s.savedAt).toLocaleString("pt-BR")+'</small></div><strong>'+fmt(sessionTotal(s,s.savedAt))+'</strong></article>';}).join(""));
}
function renderSettings(){
 return shell('<section class="panel"><h2>Arquitetura nova</h2><p class="notice">Banco isolado: <strong>'+esc(cfg.dbName)+'</strong><br>Componentes e motor: <strong>/shared/v2-app.js</strong></p></section><section class="panel"><h2>Separação real</h2><p class="notice">'+(cfg.kind==="clients"?"O IndexedDB deste app tem store de clientes e não tem store de áreas.":"O IndexedDB deste app tem store de áreas e não tem store de clientes.")+'</p><button class="secondary-button danger-button" id="clearBeta">Limpar somente esta Beta</button></section>');
}
function render(){
 var specific=cfg.kind==="areas"?"areas":"clients";
 app.innerHTML=state.tab==="timer"?renderTimer():state.tab==="models"?renderModels():state.tab===specific?renderContexts():state.tab==="history"?renderHistory():renderSettings();
 bind();
}
function makeSession(model,ctx){
 return {id:uid(),modelId:model.id,modelNameSnapshot:model.name,openedAt:now(),savedAt:null,status:"active",timers:(model.timers||[]).slice().sort(function(a,b){return a.order-b.order;}).map(function(t){return {id:uid(),templateId:t.id,name:t.name,order:t.order,intervals:[]};}),[contextKey]:ctx.id};
}
function toggleTimer(id){var t=state.current.timers.find(function(x){return x.id===id;});if(!t)return;var open=(t.intervals||[]).slice().reverse().find(function(i){return i.endedAt==null;});if(open)open.endedAt=now();else t.intervals.push({id:uid(),startedAt:now(),endedAt:null});}
function stopAll(){var t=now();(state.current.timers||[]).forEach(function(x){var open=(x.intervals||[]).slice().reverse().find(function(i){return i.endedAt==null;});if(open)open.endedAt=t;});}

function bind(){
 document.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){state.tab=b.dataset.tab;render();};});
 var cs=document.getElementById("contextSelect");if(cs)cs.onchange=function(){state.selectedContextId=cs.value;setState("selectedContextId",cs.value);};
 var ms=document.getElementById("modelSelect");if(ms)ms.onchange=function(){state.selectedModelId=ms.value;setState("selectedModelId",ms.value);};
 var start=document.getElementById("startSession");if(start)start.onclick=function(){var model=state.models.find(function(x){return x.id===state.selectedModelId;})||state.models[0],ctx=currentContext();if(!model||!ctx)return;state.current=makeSession(model,ctx);setState("current",state.current).then(render);};
 document.querySelectorAll("[data-timer]").forEach(function(b){b.onclick=function(){toggleTimer(b.dataset.timer);setState("current",state.current).then(render);};});
 var save=document.getElementById("saveSession");if(save)save.onclick=function(){stopAll();state.current.savedAt=now();state.current.status="saved";put("sessions",state.current).then(function(){return setState("current",null);}).then(function(){state.sessions.unshift(state.current);state.current=null;state.tab="history";render();});};
 var discard=document.getElementById("discardSession");if(discard)discard.onclick=function(){if(confirm("Descartar esta sessão?")){state.current=null;setState("current",null).then(render);}};
 var addContext=document.getElementById("addContext");if(addContext)addContext.onclick=function(){var name=document.getElementById("contextName").value.trim();if(!name)return;var obj={id:uid(),name:name,createdAt:now(),updatedAt:now(),deletedAt:null};if(cfg.kind==="clients")obj.whatsapp=document.getElementById("contextPhone").value.trim();put(contextStore,obj).then(function(){state.contexts.push(obj);state.contexts.sort(function(a,b){return a.name.localeCompare(b.name,"pt-BR");});state.selectedContextId=obj.id;return setState("selectedContextId",obj.id);}).then(render);};
 var addModel=document.getElementById("addModel");if(addModel)addModel.onclick=function(){var name=document.getElementById("modelName").value.trim(),names=document.getElementById("modelTimers").value.split(",").map(function(x){return x.trim();}).filter(Boolean);if(!name||!names.length)return;var model={id:uid(),name:name,sortOrder:state.models.length,timers:names.map(function(n,i){return {id:uid(),name:n,order:i};})};put("models",model).then(function(){state.models.push(model);state.selectedModelId=model.id;return setState("selectedModelId",model.id);}).then(render);};
 var clear=document.getElementById("clearBeta");if(clear)clear.onclick=function(){if(confirm("Apagar somente os dados desta Beta?"))clearBeta().then(function(){location.reload();});};
}

Promise.all([all("models"),all(contextStore),all("sessions"),getState("current",null),getState("selectedContextId",null),getState("selectedModelId",null)]).then(function(r){
 state.models=r[0];state.contexts=r[1].filter(function(x){return !x.deletedAt;}).sort(function(a,b){return a.name.localeCompare(b.name,"pt-BR");});state.sessions=r[2].filter(function(x){return x.status==="saved";}).sort(function(a,b){return b.savedAt-a.savedAt;});state.current=r[3];state.selectedContextId=r[4]||((state.contexts[0]||{}).id||null);state.selectedModelId=r[5]||((state.models[0]||{}).id||null);
 if(!state.models.length){var m=starterModel();return put("models",m).then(function(){state.models=[m];state.selectedModelId=m.id;return setState("selectedModelId",m.id);});}
}).then(render).catch(function(error){console.error(error);app.innerHTML='<main class="content"><section class="panel"><h2>Erro ao abrir</h2><p>'+esc(error.message||error)+'</p></section></main>';});
setInterval(function(){if(state.current&&state.tab==="timer")render();},1000);
})();