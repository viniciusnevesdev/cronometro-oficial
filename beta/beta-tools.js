/* Cronômetro — ferramentas exclusivas do ambiente Beta */
(() => {
  'use strict';
  const BETA_RELEASE='0.8.9-beta.22';
  const PROD_DB='cronometro_local_v1';
  const BETA_DB='cronometro_beta_v1';
  const STORES=['models','sessions','state'];

  function openDb(name){return new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('models'))d.createObjectStore('models',{keyPath:'id'});if(!d.objectStoreNames.contains('sessions'))d.createObjectStore('sessions',{keyPath:'id'});if(!d.objectStoreNames.contains('state'))d.createObjectStore('state',{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error(`Falha ao abrir ${name}`));r.onblocked=()=>reject(new Error(`Banco ${name} bloqueado`))})}
  function req(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function readStore(db,name){if(!db.objectStoreNames.contains(name))return [];return req(db.transaction(name,'readonly').objectStore(name).getAll())}
  async function replaceStore(db,name,rows){if(!db.objectStoreNames.contains(name))return;await new Promise((resolve,reject)=>{const tx=db.transaction(name,'readwrite'),store=tx.objectStore(name);store.clear();for(const row of rows||[])store.put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Transação cancelada'))})}
  async function copyOfficialToBeta(){const source=await openDb(PROD_DB),target=await openDb(BETA_DB);try{const snap={};for(const store of STORES)snap[store]=await readStore(source,store);for(const store of STORES)await replaceStore(target,store,snap[store]);try{localStorage.setItem('cronometro-beta-copied-at',new Date().toISOString())}catch(_){}return {models:snap.models?.length||0,sessions:(snap.sessions||[]).filter(s=>s?.status==='saved').length,state:snap.state?.length||0}}finally{source.close();target.close()}}
  async function clearBetaOnly(){const db=await openDb(BETA_DB);try{for(const store of STORES)await replaceStore(db,store,[])}finally{db.close()}try{Object.keys(localStorage).filter(k=>k.startsWith('cronometro-beta-')).forEach(k=>localStorage.removeItem(k))}catch(_){}}

  function style(){if(document.getElementById('cronometroBetaStyle'))return;const el=document.createElement('style');el.id='cronometroBetaStyle';el.textContent=`
    #cronometroBetaBadge{position:fixed;top:max(8px,env(safe-area-inset-top));right:10px;z-index:2147482500;padding:5px 8px;border-radius:999px;background:#ff9500;color:#fff;font:800 9px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;letter-spacing:.02em;box-shadow:0 3px 12px rgba(0,0,0,.14);pointer-events:none}
    .cronometro-beta-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 0}.cronometro-beta-actions button{appearance:none;border:0;border-radius:11px;padding:10px 8px;font:650 11px/1.15 inherit;background:#111114;color:#fff}.cronometro-beta-actions button:last-child{background:#e5e5ea;color:#1c1c1e}
    @media(prefers-color-scheme:dark){.cronometro-beta-actions button{background:#f2f2f4;color:#111114}.cronometro-beta-actions button:last-child{background:#2c2c2e;color:#f2f2f4}}
  `;document.head.appendChild(el)}
  function badge(){style();let b=document.getElementById('cronometroBetaBadge');if(!b){b=document.createElement('div');b.id='cronometroBetaBadge';document.body.appendChild(b)}b.textContent=BETA_RELEASE;return true}
  function bindActions(root){root.querySelector('#cronometroBetaCopy').onclick=async e=>{if(!confirm('Substituir os dados atuais da Beta por uma cópia dos dados do app Oficial? O Oficial não será alterado.'))return;const b=e.currentTarget;b.disabled=true;b.textContent='Copiando…';try{const x=await copyOfficialToBeta();alert(`Cópia concluída: ${x.sessions} registros e ${x.models} modelos. O app Oficial permaneceu intacto.`);location.reload()}catch(error){console.error(error);b.disabled=false;b.textContent='Tentar novamente';alert('Não foi possível copiar os dados para a Beta. Nenhum dado do Oficial foi alterado.')}};
    root.querySelector('#cronometroBetaClear').onclick=async e=>{if(!confirm('Apagar somente os dados da Beta? Seus dados do app Oficial permanecerão intactos.'))return;const b=e.currentTarget;b.disabled=true;b.textContent='Limpando…';try{await clearBetaOnly();location.reload()}catch(error){console.error(error);b.disabled=false;b.textContent='Tentar novamente';alert('Não foi possível limpar a Beta. O Oficial não foi alterado.')}};}
  function settingsTools(){style();if(document.getElementById('cronometroBetaTools'))return false;const settings=document.querySelector('.settings-content');if(!settings)return false;const section=document.createElement('section');section.id='cronometroBetaTools';section.className='settings-section';section.innerHTML=`<h3 class="section-label">Ferramentas da Beta</h3><div class="settings-card"><div class="cronometro-beta-actions"><button type="button" id="cronometroBetaCopy">Copiar dados do Oficial</button><button type="button" id="cronometroBetaClear">Limpar Beta</button></div></div>`;settings.appendChild(section);bindActions(section);return true}
  function markVersion(){if(document.title!=='Cronômetro Beta')document.title='Cronômetro Beta';try{if(globalThis.APP_META?.version!==BETA_RELEASE)globalThis.APP_META=Object.freeze({...globalThis.APP_META,version:BETA_RELEASE})}catch(_){}document.querySelectorAll('#app-version-badge').forEach(el=>{if(el.textContent!==BETA_RELEASE)el.textContent=BETA_RELEASE})}
  function apply(){badge();markVersion();settingsTools()}

  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  [60,250,800,1800].forEach(ms=>setTimeout(apply,ms));

  /* Observa somente a raiz do app. Durante o patch o observer fica desconectado,
     evitando o ciclo MutationObserver -> patch -> MutationObserver. */
  const root=document.getElementById('app');
  if(root){
    const observer=new MutationObserver(()=>{
      observer.disconnect();
      try{apply()}finally{observer.observe(root,{childList:true,subtree:true})}
    });
    observer.observe(root,{childList:true,subtree:true});
  }
})();
