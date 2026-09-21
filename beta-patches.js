/* Cronômetro Beta — ajustes experimentais exclusivos da Beta.
   Ícones dos cronômetros padrão: exibidos ao lado do título sem alterar dados/backup. */
(() => {
  'use strict';

  const ICONS = {
    'remocao': {
      viewBox:'0 0 18.7344 18.3203',
      body:'<path d="M16.9219 1.39844C17.8516 2.32031 18.3281 3.6875 18.3281 5.45312L18.3281 12.8672C18.3281 14.6328 17.8438 16.0078 16.9219 16.9219C16.0234 17.8203 14.6484 18.3203 12.875 18.3203L5.45312 18.3203C3.67969 18.3203 2.3125 17.8281 1.40625 16.9219C0.476562 16 0 14.6328 0 12.8672L0 5.45312C0 3.6875 0.484375 2.3125 1.40625 1.39844C2.30469 0.5 3.67969 0 5.45312 0L12.875 0C14.6484 0 16.0156 0.484375 16.9219 1.39844ZM3.63281 9.15625C3.63281 12.2031 6.10156 14.6719 9.15625 14.6719C12.2031 14.6719 14.6797 12.2031 14.6797 9.15625C14.6797 6.10156 12.2031 3.63281 9.15625 3.63281C6.10156 3.63281 3.63281 6.10156 3.63281 9.15625ZM11.6094 12.5625C10.9297 13.0703 10.0781 13.3672 9.16406 13.3672C6.82812 13.3672 4.94531 11.4844 4.94531 9.15625C4.94531 8.23438 5.24219 7.39062 5.75781 6.70312ZM13.3828 9.15625C13.3828 10.0781 13.0781 10.9297 12.5625 11.6172L6.69531 5.75C7.38281 5.24219 8.23438 4.9375 9.16406 4.9375C11.4922 4.9375 13.3828 6.82031 13.3828 9.15625Z"/>'
    },
    'levantamento de cuticula': {
      viewBox:'0 0 21.4883 23.7022',
      body:'<path d="M14.9725 2.91337L14.0501 3.83643C12.3817 2.83288 10.4875 2.24564 8.59961 2.24564C4.16211 2.24564 1.4668 5.39408 1.4668 9.51126C1.4668 14.8081 5.77148 20.1206 12.5059 20.9331C12.9043 20.98 13.0996 21.2691 13.0996 21.5581C13.0996 21.8706 12.8574 22.1988 12.3652 22.1363C6.18555 21.6519 0.240234 16.355 0.240234 9.55033C0.240234 4.69095 3.50586 1.01126 8.63086 1.01126C10.832 1.01126 13.0476 1.70925 14.9725 2.91337ZM20.8496 12.7222C20.8496 16.2613 18.4121 18.605 15.0293 18.605C12.7019 18.605 10.1769 17.5148 8.27554 15.7603L9.57912 15.158C11.1963 16.5622 13.1816 17.441 15.0059 17.441C17.5449 17.441 19.6543 15.6519 19.6543 12.7222C19.6543 10.7675 18.9507 8.8771 17.7874 7.25799L18.6921 6.35656C20.0315 8.18994 20.8496 10.3799 20.8496 12.7222Z"/><path d="M9.07617 13.7691L18.1465 4.71439L16.7559 3.32376L7.69336 12.3785L6.81055 14.2769C6.73242 14.4722 6.92773 14.6831 7.12305 14.5972ZM18.8652 4.00345L19.6465 3.23001C20.0293 2.8472 20.0449 2.33158 19.6621 1.9722L19.4512 1.77689C19.1152 1.45658 18.6074 1.45658 18.248 1.82376L17.4746 2.60501Z"/>'
    },
    'corte da cuticula': { asset:'./corte-cuticula.svg' },
    '2o levantamento': null,
    'segundo levantamento': null,
    'primer + capa base': { asset:'./primer-capa-base.svg' },
    'estrutura': { asset:'./estrutura.svg' },
    'lixamento': {
      viewBox:'0 0 19.5626 23.4922',
      body:'<path d="M17.5938 16.9609L14.5391 16.8047L0.765658 16.8047C0.328158 16.8047 0.0000332833 17.1172 0.0000332833 17.5703C0.0000332833 18.0156 0.328158 18.3281 0.765658 18.3281L14.5391 18.3281L17.5938 18.1562C17.9766 18.125 18.1875 17.8438 18.1875 17.5625C18.1875 17.2656 17.9766 16.9844 17.5938 16.9609ZM12.6172 22.1875C12.461 22.3438 12.3907 22.5156 12.3907 22.7344C12.3907 23.1797 12.6953 23.4922 13.1407 23.4922C13.3438 23.4922 13.5625 23.3984 13.7188 23.2422L18.8985 18.1406C19.2344 17.8203 19.25 17.3203 18.8985 16.9922L13.7188 11.8906C13.5625 11.7344 13.3438 11.6406 13.1407 11.6406C12.6953 11.6406 12.3907 11.9531 12.3907 12.3984C12.3907 12.6172 12.461 12.7891 12.6172 12.9453L14.8907 15.1641L17.625 17.5703L14.8907 19.9688Z"/><path d="M1.55472 5.32812C1.17972 5.35156 0.960971 5.625 0.960971 5.92188C0.960971 6.20312 1.17972 6.48438 1.55472 6.51562L4.61722 6.6875L18.3907 6.6875C18.8282 6.6875 19.1563 6.375 19.1563 5.92969C19.1563 5.48438 18.8282 5.16406 18.3907 5.16406L4.61722 5.16406ZM6.5391 10.5547L4.26566 8.32812L1.52347 5.92969L4.26566 3.52344L6.5391 1.30469C6.69535 1.14844 6.76566 0.976562 6.76566 0.757812C6.76566 0.320312 6.46097 0 6.01566 0C5.81253 0 5.59378 0.101562 5.43753 0.257812L0.257846 5.35938C-0.0937167 5.6875-0.0780917 6.1875 0.257846 6.5L5.43753 11.6016C5.59378 11.7578 5.81253 11.8516 6.01566 11.8516C6.46097 11.8516 6.76566 11.5391 6.76566 11.0938C6.76566 10.875 6.69535 10.7031 6.5391 10.5547Z"/>'
    },
    'esmaltacao': {
      viewBox:'0 0 21.5158 23.7053',
      body:'<path d="M1.22663 22.4815C2.85163 24.0987 4.75006 24.1143 6.35163 22.5206C7.64069 21.2315 8.8985 18.255 9.89069 17.0987L12.1563 19.3722C12.8673 20.0909 13.7501 20.0909 14.4532 19.3878L15.711 18.1222C16.4063 17.4112 16.4063 16.5597 15.6876 15.8409L7.86725 8.0206C7.14069 7.29403 6.28913 7.28622 5.57819 7.99716L4.32038 9.25497C3.61725 9.9581 3.60944 10.8253 4.32819 11.5518L6.59381 13.8097C5.45319 14.8018 2.47663 16.0675 1.18756 17.3487C-0.406186 18.9503-0.398374 20.8487 1.22663 22.4815ZM5.49225 10.0362L6.37506 9.17685C6.63288 8.91903 6.92194 8.91122 7.17975 9.16903L14.5313 16.5206C14.7891 16.7784 14.7813 17.0675 14.5235 17.3331L13.6719 18.2003C13.4063 18.4737 13.1016 18.4737 12.8438 18.2081L10.3907 15.7393C10.0469 15.3956 9.60944 15.419 9.21881 15.794C8.36725 16.6378 6.961 20.0362 5.41413 21.5831C4.40631 22.6065 3.18756 22.5909 2.14069 21.5597C1.10944 20.5206 1.10163 19.2862 2.11725 18.2862C3.66413 16.7393 7.07038 15.3331 7.90631 14.4815C8.28131 14.0909 8.31256 13.6534 7.96881 13.3175L5.49225 10.8565C5.23444 10.5909 5.23444 10.294 5.49225 10.0362ZM3.711 21.2159C4.38288 21.2159 4.92194 20.6768 4.92194 19.9972C4.92194 19.3331 4.38288 18.7862 3.711 18.7862C3.03913 18.7862 2.49225 19.3331 2.49225 19.9972C2.49225 20.6768 3.03913 21.2159 3.711 21.2159ZM15.5938 16.669L20.3126 11.9503C21.3907 10.88 21.3751 9.57528 20.2735 8.47372L12.4141 0.606533C11.3985-0.409092 9.69538-0.0184674 9.34381 1.55185C8.45319 5.4581 8.32038 6.15341 6.85163 8.20028L7.85163 9.19247C9.50006 6.96591 9.68756 5.85653 10.6251 2.24716C10.7735 1.63778 11.2813 1.50497 11.6485 1.86435L19.2344 9.44247C19.7423 9.9581 19.7423 10.5909 19.2501 11.0831L14.6329 15.7081ZM14.1329 10.9347C14.6641 11.4581 17.6094 9.82528 18.6251 8.55185L16.4063 6.34091C16.2188 8.12997 15.2891 9.41122 14.1563 10.544C14.0313 10.6768 14.0469 10.8409 14.1329 10.9347Z"/>'
    },
    'top coat': {
      viewBox:'0 0 18.9141 24.8047',
      body:'<path d="M8.69531 4.85938C8.82031 4.85938 8.88281 4.78125 8.90625 4.66406C9.17969 3.0625 9.15625 2.92969 10.9375 2.63281C11.0547 2.61719 11.125 2.54688 11.125 2.42969C11.125 2.3125 11.0547 2.23438 10.9375 2.21875C9.15625 1.92188 9.17969 1.78906 8.90625 0.1875C8.88281 0.0703125 8.82031 0 8.69531 0C8.57031 0 8.50781 0.0703125 8.48438 0.1875C8.21094 1.78906 8.23438 1.92188 6.45312 2.21875C6.33594 2.23438 6.26562 2.3125 6.26562 2.42969C6.26562 2.54688 6.33594 2.61719 6.45312 2.63281C8.23438 2.92969 8.21094 3.0625 8.48438 4.66406C8.50781 4.78125 8.57031 4.85938 8.69531 4.85938Z"/><path d="M3.78125 11.7422C3.9375 11.7422 4.05469 11.6328 4.07812 11.4766C4.45312 8.77344 4.51562 8.79688 7.29688 8.26562C7.44531 8.23438 7.5625 8.13281 7.5625 7.96875C7.5625 7.80469 7.44531 7.69531 7.29688 7.67188C4.51562 7.25 4.44531 7.19531 4.07812 4.46875C4.05469 4.30469 3.9375 4.19531 3.78125 4.19531C3.625 4.19531 3.50781 4.30469 3.48438 4.47656C3.13281 7.17188 3.03125 7.14062 0.265625 7.67188C0.117188 7.70312 0 7.80469 0 7.96875C0 8.14062 0.117188 8.23438 0.296875 8.26562C3.04688 8.72656 3.13281 8.76562 3.48438 11.4609C3.50781 11.6328 3.625 11.7422 3.78125 11.7422Z"/><path d="M10.6172 22.9453C10.8594 22.9453 11.0391 22.7812 11.0703 22.5312C11.7578 16.8516 12.4922 16.1016 18.0781 15.5156C18.3359 15.4922 18.5078 15.3125 18.5078 15.0703C18.5078 14.8281 18.3359 14.6406 18.0781 14.6172C12.4922 14.0312 11.7578 13.2812 11.0703 7.60156C11.0391 7.35938 10.8594 7.1875 10.6172 7.1875C10.375 7.1875 10.2031 7.35938 10.1641 7.60156C9.47656 13.2812 8.74219 14.0312 3.15625 14.6172C2.89844 14.6406 2.72656 14.8281 2.72656 15.0703C2.72656 15.3125 2.89844 15.4922 3.15625 15.5156C8.72656 16.2344 9.42969 16.8594 10.1641 22.5312C10.2031 22.7812 10.375 22.9453 10.6172 22.9453Z"/>'
    },
    'encerramento': {
      viewBox:'0 0 20.7578 20.3672',
      body:'<path d="M10.1719 20.3516C15.7891 20.3516 20.3516 15.7969 20.3516 10.1797C20.3516 4.5625 15.7891 0 10.1719 0C4.55469 0 0 4.5625 0 10.1797C0 15.7969 4.55469 20.3516 10.1719 20.3516ZM10.1719 18.8984C5.35156 18.8984 1.45312 15 1.45312 10.1797C1.45312 5.35938 5.35156 1.46094 10.1719 1.46094C14.9922 1.46094 18.8906 5.35938 18.8906 10.1797C18.8906 15 14.9922 18.8984 10.1719 18.8984Z"/><path d="M9.07031 14.9609C9.35938 14.9609 9.59375 14.8281 9.76562 14.5625L14.5547 7.05469C14.6562 6.89844 14.7578 6.70312 14.7578 6.51562C14.7578 6.13281 14.4141 5.875 14.0625 5.875C13.8359 5.875 13.6172 6.01562 13.4609 6.26562L9.03906 13.2891L6.83594 10.5312C6.63281 10.2656 6.4375 10.1875 6.20312 10.1875C5.82812 10.1875 5.53125 10.4922 5.53125 10.875C5.53125 11.0625 5.60938 11.25 5.73438 11.4141L8.34375 14.5625C8.5625 14.8438 8.78125 14.9609 9.07031 14.9609Z"/>'
    },
    'finalizacao': null
  };

  ICONS['2o levantamento'] = ICONS['levantamento de cuticula'];
  ICONS['segundo levantamento'] = ICONS['levantamento de cuticula'];
  ICONS['corte de cuticula'] = ICONS['corte da cuticula'];
  ICONS['finalizacao'] = ICONS['encerramento'];

  function normalizeName(value){
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/º/g,'o')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function versionedAssetUrl(asset){
    const release=String(window.APP_RELEASE || 'beta');
    return asset + (asset.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(release);
  }

  function iconMarkup(def){
    if(def.asset){
      const assetUrl=versionedAssetUrl(def.asset);
      return '<span class="beta-standard-timer-icon beta-standard-timer-icon-mask' +
        (def.asset.includes('primer-capa-base.svg') ? ' beta-primer-timer-icon' : '') +
        '" aria-hidden="true" style="-webkit-mask-image:url(' +
        assetUrl + ');mask-image:url(' + assetUrl + ')"></span>';
    }
    return '<span class="beta-standard-timer-icon" aria-hidden="true"><svg viewBox="' +
      def.viewBox +
      '" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      def.body +
      '</svg></span>';
  }

  function decorateStandardTimerTitles(root){
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.timer-card .name').forEach(nameEl => {
      if(nameEl.querySelector('.beta-standard-timer-icon')) return;
      const key = normalizeName(nameEl.textContent);
      const def = ICONS[key];
      if(!def) return;
      nameEl.insertAdjacentHTML('afterbegin', iconMarkup(def));
    });
  }

  const style=document.createElement('style');
  style.id='beta-standard-timer-icons-style';
  style.textContent=
    '.timer-card:not(.central){' +
      'grid-template-columns:38px minmax(0,1fr) auto!important;' +
      'column-gap:4px!important;' +
    '}' +
    '.timer-card .name .beta-standard-timer-icon{' +
      'display:inline-block;width:30px;height:30px;margin-right:5px;' +
      'vertical-align:-4px;line-height:0;opacity:.85;flex:0 0 auto;' +
    '}' +
    '.timer-card .name .beta-standard-timer-icon svg{' +
      'display:block;width:100%;height:100%;overflow:visible;fill:currentColor;' +
    '}' +
    '.timer-card .name .beta-standard-timer-icon-mask{' +
      'background:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;' +
      '-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain;' +
    '}' +
    '.timer-card .name .beta-primer-timer-icon{' +
      'width:39px;height:39px;margin-left:-4px;margin-right:5px;vertical-align:-11px;' +
    '}' +
    '.timer-card.central .name .beta-standard-timer-icon{vertical-align:-4px;}';
  document.head.appendChild(style);

  const app=document.getElementById('app');
  if(!app) return;

  decorateStandardTimerTitles(app);
  const observer=new MutationObserver(() => decorateStandardTimerTitles(app));
  observer.observe(app,{childList:true,subtree:true});
})();


/* smartbeta-settings-layer
   A Beta inteligente usa o acabamento visual da UZE sem substituir a aba Estatísticas.
   Também colapsa Áreas em um único contexto de atendimentos somente neste ambiente Beta. */
(() => {
  'use strict';
  const normalizeText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const lineIcon=paths=>`<svg class="sf-icon smartbeta-line-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const icons={
    note:lineIcon('<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>'),
    appearance:lineIcon('<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>'),
    optimized:lineIcon('<path d="M5 12h14"/><path d="M12 5v14"/><circle cx="12" cy="12" r="8"/>'),
    ultra:lineIcon('<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>')
  };
  const themeIcon=mode=>mode==='light'
    ?'<svg class="smartbeta-theme-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
    :mode==='dark'
      ?'<svg class="smartbeta-theme-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="currentColor"/></svg>'
      :'<svg class="smartbeta-theme-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 3.5a6.5 6.5 0 0 0 0 13Z" fill="currentColor"/></svg>';

  async function normalizeSinglePresentationArea(){
    if(typeof data==='undefined'||!data?.settings||typeof put!=='function')return false;
    let settingsChanged=false,currentChanged=false;
    const area={id:'principal',name:'Atendimentos',type:'clients'};
    const areas=Array.isArray(data.settings.areas)?data.settings.areas:[];
    if(areas.length!==1||areas[0]?.id!=='principal'||areas[0]?.type!=='clients'){data.settings.areas=[area];settingsChanged=true;}
    if(data.settings.activeAreaId!=='principal'){data.settings.activeAreaId='principal';settingsChanged=true;}
    if(!Array.isArray(data.settings.clients))data.settings.clients=[];
    for(const client of data.settings.clients){if(client&&client.areaId!=='principal'){client.areaId='principal';settingsChanged=true;}}
    for(const model of data.models||[]){if(model&&model.areaId!=='principal'){model.areaId='principal';await put('models',model);}}
    for(const session of data.sessions||[]){if(session&&session.areaId!=='principal'){session.areaId='principal';await put('sessions',session);}}
    if(data.current&&data.current.areaId!=='principal'){data.current.areaId='principal';currentChanged=true;}
    if(settingsChanged)await persistSettings();
    if(currentChanged)await persistCurrent();
    return settingsChanged||currentChanged;
  }

  const style=document.createElement('style');
  style.id='smartbeta-settings-style';
  style.textContent=`
    .smartbeta-heading{margin:0 4px 7px;color:var(--text);font-size:15px;line-height:20px;font-weight:760}
    .smartbeta-mode{margin-bottom:13px}
    .smartbeta-segment{--segment-count:3;position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:3px;border:1px solid var(--line);border-radius:999px;background:var(--card);overflow:hidden;isolation:isolate}
    .smartbeta-segment[data-options="2"]{--segment-count:2;grid-template-columns:repeat(2,minmax(0,1fr))}
    .smartbeta-segment::before{content:"";position:absolute;z-index:0;top:3px;bottom:3px;left:3px;width:calc((100% - 6px)/var(--segment-count));border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,var(--bg));box-shadow:0 1px 4px rgba(0,0,0,.11);transition:transform .24s cubic-bezier(.22,.8,.24,1)}
    .smartbeta-segment[data-selected="system"]::before,.smartbeta-segment[data-selected="ultra"]::before{transform:translateX(100%)}
    .smartbeta-segment[data-selected="dark"]::before{transform:translateX(200%)}
    .smartbeta-segment button{position:relative;z-index:1;min-width:0;min-height:38px;border:0;border-radius:999px;background:transparent;color:var(--secondary);display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 8px;font-size:13px;font-weight:680;white-space:nowrap}
    .smartbeta-segment button.selected{color:var(--accent)}
    .smartbeta-theme-icon,.smartbeta-segment .smartbeta-line-icon{width:18px;height:18px;flex:0 0 18px}
    .smartbeta-line-icon{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .smartbeta-navigation .settings-row{min-width:0}
    .smartbeta-navigation-row{display:grid!important;grid-template-columns:minmax(0,1fr) 18px!important;gap:9px!important;align-items:center!important;width:100%!important}
    .smartbeta-icon-label{display:inline-flex;align-items:center;gap:9px;min-width:0;text-align:left}
    .smartbeta-icon-label>.sf-icon{width:19px;height:19px;flex:0 0 auto}
    .smartbeta-icon-label>span{min-width:0}.smartbeta-icon-label strong,.smartbeta-icon-label small{display:block}
    .smartbeta-icon-label small{color:var(--secondary);font-size:11px;font-weight:400;line-height:14px;margin-top:2px;white-space:normal}
    .smartbeta-chevron{color:var(--secondary);font-size:24px;line-height:1;justify-self:end}
    @media(max-width:390px){.smartbeta-segment button{font-size:12px;gap:5px;padding:0 5px}.smartbeta-theme-icon,.smartbeta-segment .smartbeta-line-icon{width:17px;height:17px;flex-basis:17px}}
  `;
  document.head.appendChild(style);

  const baseSettings=renderSettings;
  renderSettings=function(){
    const view=ui.settingsView||'main';
    if(view!=='main')return baseSettings();
    const theme=data.settings.theme||'system',visual=visualStyleModeV088(),release=String(window.APP_RELEASE||APP_META?.version||'');
    const themes=[['light','Claro'],['system','Automático'],['dark','Escuro']];
    const visuals=[['classic','Otimizado',icons.optimized],['ultra','Ultra',icons.ultra]];
    const clientIcon=typeof personIconMarkup==='function'?personIconMarkup():lineIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>');
    return shell(`<header class="topbar section-tab-header"><h1>Ajustes</h1></header><main class="settings-content settings-v090">
      <section class="settings-section smartbeta-mode"><h2 class="smartbeta-heading">Tema</h2><div class="smartbeta-segment" data-selected="${esc(theme)}" data-options="3">${themes.map(([id,label])=>`<button data-theme-choice="${id}" class="${theme===id?'selected':''}">${themeIcon(id)}<span>${label}</span></button>`).join('')}</div></section>
      <section class="settings-section smartbeta-mode"><h2 class="smartbeta-heading">Estilo visual</h2><div class="smartbeta-segment" data-selected="${esc(visual)}" data-options="2">${visuals.map(([id,label,icon])=>`<button data-visual-style-mode="${id}" class="${visual===id?'selected':''}">${icon}<span>${label}</span></button>`).join('')}</div></section>
      <section class="settings-section"><div class="settings-card settings-navigation-card smartbeta-navigation">
        <button class="settings-row button-row smartbeta-navigation-row" id="openClientsDirectory"><span class="smartbeta-icon-label">${clientIcon}<span><strong>Clientes</strong><small>Cadastrar e gerenciar clientes</small></span></span><span class="smartbeta-chevron">›</span></button>
        <button class="settings-row button-row smartbeta-navigation-row" id="openSoundSettings"><span class="smartbeta-icon-label">${icons.note}<span><strong>Som do cronômetro</strong><small>${data.settings.timerSoundEnabled?'Ativado':'Desativado'}</small></span></span><span class="smartbeta-chevron">›</span></button>
        <button class="settings-row button-row smartbeta-navigation-row" id="openAppearanceSettings"><span class="smartbeta-icon-label">${icons.appearance}<span><strong>Aparência</strong><small>Visual, ícones e detalhes</small></span></span><span class="smartbeta-chevron">›</span></button>
      </div></section>
      ${typeof renderDataBackupSectionV087==='function'?renderDataBackupSectionV087():''}
      <p class="settings-version-v090">Versão ${esc(release)}</p>
    </main>`,'settings');
  };
  if(typeof visualStyleSettingsBlockV088==='function')visualStyleSettingsBlockV088=()=> '';

  async function ready(attempt=0){
    if(typeof data!=='undefined'&&data?.settings&&Array.isArray(data.models)&&Array.isArray(data.sessions)){
      const changed=await normalizeSinglePresentationArea();
      if(changed&&typeof render==='function')render();
      return;
    }
    if(attempt<120)setTimeout(()=>ready(attempt+1),50);
  }
  ready();
})();
