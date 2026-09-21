/* v0.9.2 — analytics avançado somente-leitura.
   Consistência = max(0,100 - desvio-padrão/média*100); só é exibida com 2+ amostras.
   Cliente novo exige createdAt numérico real dentro do período; null/ausente é "data desconhecida". */
(function(){
  'use strict';
  const DAY=86400000,RANGES=[7,30,90,180,365,'all'];
  /* Datas legadas ausentes não podem virar 1970. O app só registra timestamps
     posteriores ao epoch, portanto zero/negativos também não são datas reais. */
  const timestamp=value=>{
    if(value==null||value==='')return null;
    const parsed=Number(value);
    return Number.isFinite(parsed)&&parsed>0?parsed:null;
  };
  const dateOf=session=>timestamp(session?.originalRecordedAt)??timestamp(session?.savedAt)??timestamp(session?.openedAt);
  const timersOf=session=>Array.isArray(session?.timers)?session.timers:[];
  const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
  const median=values=>{if(!values.length)return null;const list=[...values].sort((a,b)=>a-b),mid=Math.floor(list.length/2);return list.length%2?list[mid]:(list[mid-1]+list[mid])/2;};
  const duration=session=>session?Math.max(0,Number(sessionTotal({...session,timers:timersOf(session)},session.savedAt))||0):0;
  const valid=session=>session?.status==='saved'&&!session.deletedAt&&!session.isNoMeasurement&&duration(session)>0;
  function bounds(range,offset=0,anchor=now()){
    if(range==='all')return {start:-Infinity,end:Infinity};
    const days=Number(range),end=anchor-offset*days*DAY,start=end-days*DAY;
    return {start,end};
  }
  function inBounds(session,range){const date=dateOf(session);return date!=null&&(range.start===-Infinity||(date>=range.start&&date<range.end));}
  function areas(){return getAreas();}
  function matches(session,filters){
    if(!valid(session)||!inBounds(session,filters.range))return false;
    if(filters.areaId!=='all'&&sessionAreaId(session)!==filters.areaId)return false;
    if(filters.clientId!=='all'&&session.clientId!==filters.clientId)return false;
    return filters.modelId==='all'||session.modelId===filters.modelId;
  }
  function filtersFromUi(){
    const range=RANGES.includes(ui.analyticsRangeV092)?ui.analyticsRangeV092:30;
    return {range:bounds(range),rangeValue:range,areaId:ui.analyticsAreaV092||'all',clientId:ui.analyticsClientV092||'all',modelId:ui.analyticsModelV092||'all'};
  }
  function labelForRange(range){return range==='all'?'todo o histórico':`últimos ${range} dias`;}
  function analyticsV092Compute(filters=filtersFromUi(),anchor=now()){
    const current=data.sessions.filter(session=>matches(session,filters));
    const previousFilters={...filters,range:filters.rangeValue==='all'?null:bounds(filters.rangeValue,1,anchor)};
    const previous=previousFilters.range?data.sessions.filter(session=>matches(session,previousFilters)):[];
    const values=current.map(duration),average=mean(values),typical=median(values);
    const deviation=average&&values.length>1?Math.sqrt(mean(values.map(value=>(value-average)**2))):null;
    const consistency=deviation==null?null:Math.max(0,Math.min(100,100-deviation/average*100));
    const pauses=current.reduce((sum,session)=>sum+Math.max(0,Number(pauseTotal(session,session.savedAt))||0),0);
    const work=values.reduce((sum,value)=>sum+value,0),pausePercent=work+pauses?pauses/(work+pauses)*100:null;
    const previousAverage=mean(previous.map(duration));
    const comparison=average==null||previousAverage==null?{kind:'unavailable',label:'Sem base anterior comparável'}:previousAverage===0?{kind:'zero',label:'Período anterior sem tempo medido'}:{kind:average<previousAverage?'faster':average>previousAverage?'slower':'same',percent:(average-previousAverage)/previousAverage*100};
    const by=(key,label)=>{const map=new Map();for(const session of current){const id=key(session),entry=map.get(id)||{id,name:label(session),count:0,total:0,values:[]};entry.count++;entry.total+=duration(session);entry.values.push(duration(session));map.set(id,entry);}return [...map.values()].map(entry=>({...entry,average:mean(entry.values)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR'));};
    const models=by(session=>session.modelId,session=>session.modelNameSnapshot||modelById(session.modelId)?.name||'Modelo removido');
    const areaRows=by(session=>sessionAreaId(session),session=>areaById(sessionAreaId(session)).name);
    const stepMap=new Map();for(const session of current)for(const timer of timersOf(session)){const id=timer.templateId||`name:${timer.name}`,value=Math.max(0,Number(timerDuration(timer,session.savedAt))||0);if(!value)continue;const entry=stepMap.get(id)||{id,name:timer.name,total:0,values:[]};entry.total+=value;entry.values.push(value);stepMap.set(id,entry);}const bottlenecks=[...stepMap.values()].map(entry=>({...entry,average:mean(entry.values)})).sort((a,b)=>b.average-a.average);
    const previousSteps=new Map();for(const session of previous)for(const timer of timersOf(session)){const id=timer.templateId||`name:${timer.name}`,value=Math.max(0,Number(timerDuration(timer,session.savedAt))||0);if(!value)continue;const entry=previousSteps.get(id)||{total:0,count:0};entry.total+=value;entry.count++;previousSteps.set(id,entry);}const stepChanges=bottlenecks.map(entry=>{const prior=previousSteps.get(entry.id);return {...entry,previousAverage:prior?prior.total/prior.count:null,change:prior&&prior.total?((entry.average-prior.total/prior.count)/(prior.total/prior.count))*100:null};});
    const curveMap=new Map();for(const session of current){const date=dateOf(session),key=new Date(date).toISOString().slice(0,10),entry=curveMap.get(key)||{key,total:0,count:0};entry.total+=duration(session);entry.count++;curveMap.set(key,entry);}const curve=[...curveMap.values()].map(entry=>({...entry,average:entry.total/entry.count})).sort((a,b)=>a.key.localeCompare(b.key));
    const allSaved=data.sessions.filter(session=>session?.status==='saved'&&!session.deletedAt),clientRows=new Map();for(const session of current){if(!session.clientId)continue;const client=clientById(session.clientId),entry=clientRows.get(session.clientId)||{id:session.clientId,name:client?.name||session.clientNameSnapshot||'Cliente removido',count:0,prior:false,createdAt:client?.createdAt};entry.count++;entry.prior=allSaved.some(item=>item.id!==session.id&&item.clientId===session.clientId&&dateOf(item)!=null&&dateOf(item)<filters.range.start);clientRows.set(session.clientId,entry);}const clients=[...clientRows.values()],closedRange=filters.range.start!==-Infinity;
    const customer={new:closedRange?clients.filter(client=>Number.isFinite(Number(client.createdAt))&&client.createdAt>=filters.range.start&&client.createdAt<filters.range.end).length:null,recurring:closedRange?clients.filter(client=>client.prior).length:null,unknownDate:clients.filter(client=>client.createdAt==null).length,withoutClient:current.filter(session=>!session.clientId).length};
    return {current,previous,average,typical,consistency,pausePercent,work,comparison,models,areas:areaRows,bottlenecks,stepChanges,curve,customer};
  }
  function barRows(rows,formatter=entry=>fmtDuration(entry.total)){if(!rows.length)return '<div class="analytics-v092-empty">Sem dados suficientes.</div>';const max=Math.max(...rows.map(entry=>entry.total||entry.average||0),1);return `<div class="analytics-v092-bars">${rows.slice(0,8).map(entry=>`<div><span>${esc(entry.name)}</span><strong>${formatter(entry)}</strong><i><b style="width:${Math.min(100,(entry.total||entry.average||0)/max*100)}%"></b></i></div>`).join('')}</div>`;}
  function curveMarkup(curve){if(curve.length<2)return '<div class="analytics-v092-empty">São necessários pelo menos dois dias com dados para mostrar a curva.</div>';const max=Math.max(...curve.map(point=>point.average),1);return `<div class="analytics-v092-curve">${curve.slice(-12).map(point=>`<div title="${esc(point.key)}"><i style="height:${Math.max(8,point.average/max*100)}%"></i><small>${esc(point.key.slice(5))}</small></div>`).join('')}</div>`;}
  function card(title,body,note=''){return `<section class="analytics-v092-card"><h3>${title}</h3>${note?`<small>${esc(note)}</small>`:''}${body}</section>`;}
  function renderAdvancedAnalytics(){
    const filters=filtersFromUi(),result=analyticsV092Compute(filters),range=labelForRange(filters.rangeValue),clientOptions=(data.settings.clients||[]).filter(client=>client&&!client.deletedAt&&(filters.areaId==='all'||client.areaId===filters.areaId)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    const modelOptions=activeModels().filter(model=>filters.areaId==='all'||modelAreaId(model)===filters.areaId);
    const comparison=result.comparison.kind==='unavailable'?result.comparison.label:result.comparison.kind==='zero'?result.comparison.label:result.comparison.kind==='same'?'Tempo médio igual ao período anterior':`${Math.abs(result.comparison.percent).toFixed(1).replace('.',',')}% ${result.comparison.kind==='faster'?'mais rápido':'mais lento'} que o período anterior`;
    const options=(items,selected)=>items.map(item=>`<option value="${esc(item.id)}" ${selected===item.id?'selected':''}>${esc(item.name)}</option>`).join('');
    const rangeButtons=RANGES.map(value=>{const label=value==='all'?'Tudo':value===365?'1 ano':`${value}d`;return `<button data-v092-range="${value}" class="${filters.rangeValue===value?'selected':''}">${label}</button>`;}).join('');
    const controls=`<section class="analytics-v092-filters"><div class="analytics-v092-ranges">${rangeButtons}</div><select id="v092Area"><option value="all">Todas as áreas</option>${options(areas(),filters.areaId)}</select><select id="v092Client"><option value="all">Todos os clientes</option>${options(clientOptions,filters.clientId)}</select><select id="v092Model"><option value="all">Todos os modelos</option>${options(modelOptions,filters.modelId)}</select></section>`;
    if(!result.current.length)return shell(`<header class="topbar section-tab-header"><h1>Estatísticas</h1></header><main class="content analytics-v092-content">${controls}<div class="empty">Nenhum registro medido em ${esc(range)} com estes filtros.</div></main>`,'stats');
    const kpi=(label,value)=>`<div><small>${label}</small><strong>${value}</strong></div>`;
    const stepLabel=entry=>entry.change==null?'Sem base anterior':`${entry.change>=0?'+':''}${entry.change.toFixed(1).replace('.',',')}%`;
    const customers=`<div class="analytics-v092-customer"><span>Novos com data real <strong>${result.customer.new==null?'—':result.customer.new}</strong></span><span>Recorrentes <strong>${result.customer.recurring==null?'—':result.customer.recurring}</strong></span><span>Data desconhecida <strong>${result.customer.unknownDate}</strong></span><span>Sem cliente <strong>${result.customer.withoutClient}</strong></span></div>`;
    const trendTone=result.comparison.kind==='faster'?'positive':result.comparison.kind==='slower'?'negative':'neutral';
    const body=[
      `<section class="analytics-v092-hero trend-${trendTone}"><small>${esc(range)}</small><strong>${esc(comparison)}</strong></section>`,
      `<section class="analytics-v092-kpis">${kpi('Atendimentos',result.current.length)}${kpi('Tempo total',fmtDuration(result.work))}${kpi('Média',fmtDuration(result.average))}${kpi('Mediana',fmtDuration(result.typical))}${kpi('Consistência',result.consistency==null?'—':`${result.consistency.toFixed(0)}%`)}${kpi('Pausas',result.pausePercent==null?'—':`${result.pausePercent.toFixed(1).replace('.',',')}%`)}</section>`,
      card('Curva temporal',curveMarkup(result.curve),'média por dia'),card('Distribuição por modelo',barRows(result.models),'tempo total'),
      filters.areaId==='all'?card('Distribuição por área',barRows(result.areas),'tempo total'):'',card('Gargalos por etapa',barRows(result.bottlenecks,entry=>fmtDuration(entry.average)),'maior tempo médio por etapa'),
      card('Evolução por etapa',result.stepChanges.length?barRows(result.stepChanges,stepLabel):'<div class="analytics-v092-empty">Sem etapas medidas.</div>','comparada ao período anterior'),card('Clientes',customers,'legados sem createdAt não são classificados como novos')
    ].join('');
    return shell(`<header class="topbar section-tab-header"><h1>Estatísticas</h1></header><main class="content analytics-v092-content">${controls}${body}</main>`,'stats');
  }
  const fallback=renderStats;
  renderStats=function(){try{return renderAdvancedAnalytics();}catch(error){console.error('Falha no analytics avançado; usando painel anterior.',error);return fallback();}};
  const baseBind=typeof bindV082Events==='function'?bindV082Events:null;
  if(baseBind)bindV082Events=function(){baseBind();const rerender=(key,value)=>{ui[key]=value;render();};document.querySelectorAll('[data-v092-range]').forEach(button=>button.onclick=()=>rerender('analyticsRangeV092',button.dataset.v092Range==='all'?'all':Number(button.dataset.v092Range)));for(const [id,key] of [['v092Area','analyticsAreaV092'],['v092Client','analyticsClientV092'],['v092Model','analyticsModelV092']]){const input=document.getElementById(id);if(input)input.onchange=()=>rerender(key,input.value);}};
  globalThis.analyticsV092Compute=analyticsV092Compute;
})();
