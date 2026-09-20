'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const DAY=86400000,ANCHOR=1800000000000;
const models=[
  {id:'m-care',name:'Consulta',areaId:'care',sortOrder:0},
  {id:'m-home',name:'Rotina',areaId:'home',sortOrder:1}
];
const session=(id,{daysAgo,modelId='m-care',clientId=null,duration=60000,pause=0,step='Avaliação'})=>({
  id,status:'saved',deletedAt:null,isNoMeasurement:false,modelId,modelNameSnapshot:models.find(model=>model.id===modelId).name,
  areaId:models.find(model=>model.id===modelId).areaId,clientId,originalRecordedAt:ANCHOR-daysAgo*DAY,savedAt:ANCHOR-daysAgo*DAY+duration+pause,
  pauseIntervals:pause?[{startedAt:ANCHOR-daysAgo*DAY+duration,endedAt:ANCHOR-daysAgo*DAY+duration+pause}]:[],
  timers:[{id:`t-${id}`,templateId:`template-${step}`,name:step,duration}]
});
const data={models,sessions:[
  session('recent-new',{daysAgo:2,clientId:'new',duration:60000,pause:10000,step:'Avaliação'}),
  session('recent-recurring',{daysAgo:4,clientId:'old',duration:120000,step:'Tratamento'}),
  session('recent-legacy',{daysAgo:5,clientId:'legacy',duration:180000,step:'Avaliação'}),
  session('recent-none',{daysAgo:6,clientId:null,duration:240000,step:'Tratamento'}),
  session('generic',{daysAgo:3,modelId:'m-home',duration:300000,step:'Limpeza'}),
  session('previous',{daysAgo:35,clientId:'old',duration:90000,step:'Tratamento'}),
  session('old-history',{daysAgo:200,clientId:'old',duration:150000,step:'Tratamento'})
],settings:{clients:[
  {id:'new',name:'Novo',areaId:'care',createdAt:ANCHOR-2*DAY},
  {id:'old',name:'Recorrente',areaId:'care',createdAt:ANCHOR-300*DAY},
  {id:'legacy',name:'Legado',areaId:'care',createdAt:null}
]}};
const context={
  console:{log:console.log,error:()=>{}},data,ui:{analyticsRangeV092:30,analyticsAreaV092:'all',analyticsClientV092:'all',analyticsModelV092:'all'},
  now:()=>ANCHOR,sessionTotal:item=>item.timers.reduce((sum,timer)=>sum+timer.duration,0),timerDuration:timer=>timer.duration,
  pauseTotal:item=>item.pauseIntervals.reduce((sum,pause)=>sum+pause.endedAt-pause.startedAt,0),
  getAreas:()=>[{id:'care',name:'Atendimentos',type:'clients'},{id:'home',name:'Casa',type:'generic'}],
  areaType:area=>area.type,areaById:id=>context.getAreas().find(area=>area.id===id),sessionAreaId:item=>item.areaId,
  activeModels:()=>models,modelAreaId:model=>model.areaId,modelById:id=>models.find(model=>model.id===id),
  clientById:id=>data.settings.clients.find(client=>client.id===id)||null,
  fmtDuration:value=>`${Math.round(value)} ms`,esc:value=>String(value),svgIcon:()=>'',shell:value=>value,
  renderStats:()=>'<div>fallback</div>',render:()=>{},bindV082Events:null,
  document:{querySelectorAll:()=>[],getElementById:()=>null},globalThis:null
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','cronometro-v092-advanced-analytics.js'),'utf8'),context,{filename:'cronometro-v092-advanced-analytics.js'});

const filters=(rangeValue,areaId='all',clientId='all',modelId='all')=>({rangeValue,range:rangeValue==='all'?{start:-Infinity,end:Infinity}:{start:ANCHOR-rangeValue*DAY,end:ANCHOR},areaId,clientId,modelId});

for(const range of [7,30,90,180,365,'all']){
  const result=context.analyticsV092Compute(filters(range),ANCHOR);
  assert.ok(Array.isArray(result.current),`range ${range} retorna coleção`);
  assert.doesNotMatch(JSON.stringify(result),/NaN|Infinity/);
}
let result=context.analyticsV092Compute(filters(30),ANCHOR);
assert.equal(result.current.length,5,'30 dias inclui sessões das duas áreas');
assert.equal(result.average,180000,'média calculada');
assert.equal(result.typical,180000,'mediana calculada');
assert.equal(result.customer.new,1,'cliente novo exige createdAt real no período');
assert.equal(result.customer.recurring,1,'cliente recorrente tem registro anterior real');
assert.equal(result.customer.unknownDate,1,'cliente legado sem data fica separado');
assert.equal(result.customer.withoutClient,2,'sessões sem cliente, inclusive em área genérica, ficam separadas');
assert.ok(result.pausePercent>0,'pausas entram na métrica');
assert.ok(result.bottlenecks.some(item=>item.name==='Tratamento'),'gargalo por etapa calculado');
assert.ok(result.stepChanges.some(item=>item.name==='Tratamento'),'evolução por etapa calculada');
assert.equal(result.comparison.kind,'slower','comparação usa período anterior equivalente');

result=context.analyticsV092Compute(filters(7,'care','old','m-care'),ANCHOR);
assert.equal(result.current.length,1,'filtros de área, cliente e modelo são combináveis');
assert.equal(result.current[0].id,'recent-recurring');
assert.equal(context.analyticsV092Compute(filters(30,'home'),ANCHOR).current.length,1,'área genérica permanece consultável');
result=context.analyticsV092Compute(filters('all'),ANCHOR);
assert.equal(result.customer.new,null,'todo o histórico não inventa período de clientes novos');
assert.equal(result.customer.recurring,null,'todo o histórico não inventa recorrência anterior');
result=context.analyticsV092Compute(filters(7),ANCHOR);
assert.equal(result.previous.length,0,'período anterior vazio é representado sem percentual artificial');
assert.equal(result.comparison.kind,'unavailable');

const first=JSON.stringify(context.analyticsV092Compute(filters(30),ANCHOR));
const second=JSON.stringify(context.analyticsV092Compute(filters(30),ANCHOR));
assert.equal(second,first,'cálculo é idempotente e não altera dados');

const legacyDateSessions=[
  {...session('legacy-null-date',{daysAgo:2}),originalRecordedAt:null,savedAt:ANCHOR-2*DAY},
  {...session('legacy-undefined-date',{daysAgo:3}),originalRecordedAt:undefined,savedAt:ANCHOR-3*DAY},
  {...session('legacy-opened-date',{daysAgo:4}),originalRecordedAt:'inválido',savedAt:null,openedAt:ANCHOR-4*DAY},
  {...session('legacy-no-date',{daysAgo:5}),originalRecordedAt:null,savedAt:undefined,openedAt:''}
];
data.sessions.push(...legacyDateSessions);
result=context.analyticsV092Compute(filters(30),ANCHOR);
assert.ok(result.current.some(item=>item.id==='legacy-null-date'),'savedAt real substitui originalRecordedAt nulo');
assert.ok(result.current.some(item=>item.id==='legacy-undefined-date'),'savedAt real substitui originalRecordedAt ausente');
assert.ok(result.current.some(item=>item.id==='legacy-opened-date'),'openedAt real substitui datas inválidas');
assert.ok(!result.current.some(item=>item.id==='legacy-no-date'),'registro sem data permanece fora de período fechado');
result=context.analyticsV092Compute(filters('all'),ANCHOR);
assert.ok(!result.current.some(item=>item.id==='legacy-no-date'),'registro sem data não entra em todo o histórico');
assert.ok(!result.curve.some(point=>point.key==='1970-01-01'),'nenhuma data ausente vira 1970 na curva');

const timerlessBase={status:'saved',deletedAt:null,isNoMeasurement:false,modelId:'m-care',modelNameSnapshot:'Consulta',areaId:'care',clientId:null,originalRecordedAt:ANCHOR-DAY,savedAt:ANCHOR-DAY,pauseIntervals:[]};
data.sessions.push(
  {...timerlessBase,id:'legacy-without-timers'},
  {...timerlessBase,id:'legacy-null-timers',timers:null},
  {...timerlessBase,id:'legacy-empty-timers',timers:[]}
);
assert.doesNotThrow(()=>context.analyticsV092Compute(filters(30),ANCHOR),'registros legados sem timers não derrubam o cálculo');
result=context.analyticsV092Compute(filters(30),ANCHOR);
assert.ok(!result.bottlenecks.some(item=>item.id==='name:undefined'),'timers ausentes não criam etapa fictícia');
assert.ok(result.current.some(item=>item.id==='recent-new'),'sessões normais continuam contribuindo para duração e métricas');
assert.match(context.renderStats(),/Distribuição por modelo/,'painel avançado permanece disponível com timers ausentes, nulos ou vazios');

assert.match(context.renderStats(),/Distribuição por modelo/,'renderização avançada está disponível');
const savedSessions=context.data.sessions;context.data.sessions=null;
assert.equal(context.renderStats(),'<div>fallback</div>','falha de dados incompatíveis preserva painel anterior');
context.data.sessions=savedSessions;
console.log('Analytics avançado: OK');
