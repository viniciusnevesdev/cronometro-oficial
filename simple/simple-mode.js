/* Variante simples: pacote e banco próprios; Áreas e clientes não existem
   semanticamente neste ambiente, não são apenas controles ocultos. */
(() => {
  const SIMPLE_AREA='simple';
  getAreas=()=>[{id:SIMPLE_AREA,name:'Principal',type:'generic'}];
  areaById=()=>getAreas()[0];
  activeAreaId=()=>SIMPLE_AREA;
  activeArea=()=>getAreas()[0];
  areaType=()=> 'generic';
  isClientArea=()=>false;
  modelAreaId=()=>SIMPLE_AREA;
  sessionAreaId=()=>SIMPLE_AREA;
  activeAreaBadge=()=>'';
  modelOptionsForActiveArea=()=>activeModels().slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  currentTitle=function(){const s=data.current;if(!s)return 'Cronômetro';return s.manualTitle&&s.title?s.title:fmtDateTime(s.firstTimerStartedAt??s.openedAt);};
  const baseSave=saveSession;
  saveSession=async function(){const ok=await baseSave();if(!ok)return ok;const saved=data.sessions?.[0];if(saved&&!saved.manualTitle&&String(saved.title||'').startsWith('(sem título) ')){saved.title=saved.title.slice(12);await put('sessions',saved);}return ok;};
})();
