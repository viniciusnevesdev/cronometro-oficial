'use strict';

/*
 * Rede de segurança para dados antes de integrações de clientes/analytics.
 *
 * Executa somente em Node, com fixtures sintéticas e uma store em memória.
 * Não abre o IndexedDB do navegador, não importa o app inteiro e não toca em
 * dados reais. Os contratos de migração futura são deliberadamente
 * conservadores: este teste não implementa nem ativa uma migração de clientes.
 */

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));

function sourceContract(){
  const core=read('cronometro-v080-01.js');
  const backup=read('cronometro-v080-05.js');
  const backupPanel=read('cronometro-v087-data-backup.js');
  assert.match(core,/const DB_NAME='cronometro_local_v1';/);
  assert.match(core,/const DB_VERSION=1;/);
  for(const store of ['models','sessions','state']){
    assert.match(core,new RegExp(`createObjectStore\\('${store}',\\{keyPath:'${store==='state'?'key':'id'}'\\}\\)`));
  }
  assert.match(backup,/function validateBackup\(payload\)/);
  assert.match(backup,/async function replaceFromBackup\(payload\)/);
  for(const field of ['models:data.models','sessions:data.sessions','settings:{...data.settings,lastBackupExportAt:createdAt}','currentSession:data.current']){
    assert.ok(backupPanel.includes(field),`exportJSON deve incluir ${field}`);
  }
}

function legacyFixture(){
  return {
    models:[
      {id:'model-general',name:'Rotina',areaId:'area-house',sortOrder:0,timers:[{id:'timer-general',name:'Tarefa'}]},
      {id:'model-client',name:'Atendimento',areaId:'area-care',sortOrder:1,timers:[{id:'timer-client',name:'Consulta'}]}
    ],
    sessions:[
      // A/B/E/H/I: título, duração e ausência de datas/campos devem sobreviver.
      {id:'session-general-legacy',modelId:'model-general',title:'Faxina semanal original',status:'saved',savedAt:1700000200000,originalRecordedAt:1700000000000,timers:[{id:'record-general',templateId:'timer-general',name:'Tarefa',intervals:[{startedAt:1700000000000,endedAt:1700000120000}]}],pauseIntervals:[]},
      // C/F: cliente existente mantém id e relacionamento sem inferência por nome.
      {id:'session-client-existing',modelId:'model-client',areaId:'area-care',title:'Consulta de Ana Silva',clientId:'client-ana',clientNameSnapshot:'Ana Silva',status:'saved',savedAt:1700010200000,originalRecordedAt:1700010000000,timers:[{id:'record-client',templateId:'timer-client',name:'Consulta',intervals:[{startedAt:1700010000000,endedAt:1700010300000}]}],pauseIntervals:[]},
      // D/G/I: nome legado é somente snapshot; não deve virar cliente automaticamente.
      {id:'session-client-legacy-name',modelId:'model-client',areaId:'area-care',title:'Atendimento antigo — Ana Silva',clientId:null,clientNameSnapshot:'Ana Silva',status:'saved',savedAt:1700020200000,originalRecordedAt:1700020000000,timers:[{id:'record-legacy-name',templateId:'timer-client',name:'Consulta',intervals:[{startedAt:1700020000000,endedAt:1700020420000}]}],pauseIntervals:[]},
      // G/I: atendimento de cliente sem cliente e campos opcionais ausentes.
      {id:'session-client-without-client',modelId:'model-client',areaId:'area-care',title:'Retorno sem identificação',status:'saved',savedAt:1700030200000,originalRecordedAt:1700030000000,timers:[{id:'record-no-client',templateId:'timer-client',name:'Consulta',intervals:[{startedAt:1700030000000,endedAt:1700030060000}]}],pauseIntervals:[]}
    ],
    settings:{
      areas:[
        {id:'general',name:'Sem área',type:'generic'},
        {id:'area-house',name:'Casa',type:'generic'},
        {id:'area-care',name:'Atendimentos',type:'clients'}
      ],
      clients:[
        {id:'client-ana',areaId:'area-care',name:'Ana Silva',createdAt:1690000000000,updatedAt:1690000000000,deletedAt:null},
        {id:'client-anna',areaId:'area-care',name:'Anna Silva',createdAt:null,updatedAt:null,deletedAt:null}
      ],
      activeAreaId:'area-house',clientEmptyLabel:'Sem cliente',
      accentColor:'#007AFF',timerSize:'small'
    },
    current:null
  };
}

function duration(session){
  return (session.timers||[]).reduce((sum,timer)=>sum+(timer.intervals||[]).reduce((inner,interval)=>inner+Math.max(0,(interval.endedAt||0)-interval.startedAt),0),0);
}

function migrationContext(fixture){
  let uidNumber=0;
  const writes=[];
  const context={
    console,JSON,Math,Date,setTimeout:()=>0,clearTimeout:()=>{},
    data:clone(fixture),ui:{},UI_CONFIG:{timerModes:{}},
    clone,uid:()=>`synthetic-${++uidNumber}`,now:()=>1800000000000,
    put:async(store,value)=>{writes.push([store,clone(value)]);return value;},
    persistSettings:async()=>{writes.push(['state:settings',clone(context.data.settings)]);},
    persistCurrent:async()=>{writes.push(['state:current',clone(context.data.current)]);},
    modelById:id=>context.data.models.find(model=>model.id===id),
    timerDuration:(timer,at)=>timer.intervals.reduce((sum,interval)=>sum+Math.max(0,(interval.endedAt??at)-interval.startedAt),0),
    sessionTotal:session=>(session.timers||[]).reduce((sum,timer)=>sum+context.timerDuration(timer,session.savedAt),0),
    activeModels:()=>context.data.models.filter(model=>!model.deletedAt),
    recordDateMs:session=>session.originalRecordedAt??session.savedAt??0,fmtDate:()=>'',fmtDateTime:()=>'',esc:value=>String(value??''),svgIcon:()=>'',shell:value=>value,
    applyTheme:()=>{},renderSettings:()=>'',renderClientProfile:()=>'',render:()=>{},document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null},
    window:{visualViewport:null,open:()=>{}},requestAnimationFrame:callback=>callback(),confirm:()=>false,alert:()=>{},toast:()=>{},iosTextPrompt:async()=>null
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(read('cronometro-v080-06.js'),context,{filename:'cronometro-v080-06.js'});
  vm.runInContext(read('cronometro-v082-01.js'),context,{filename:'cronometro-v082-01.js'});
  vm.runInContext(read('cronometro-v082-02.js'),context,{filename:'cronometro-v082-02.js'});
  vm.runInContext(read('cronometro-v091-client-directory.js'),context,{filename:'cronometro-v091-client-directory.js'});
  return {context,writes};
}

function assertConservativeMigration(before,after){
  assert.deepEqual(after.sessions.map(session=>session.id).sort(),before.sessions.map(session=>session.id).sort(),'migração não pode criar ou apagar sessões');
  assert.equal(new Set(after.sessions.map(session=>session.id)).size,after.sessions.length,'migração deve ser idempotente quanto a IDs');
  for(const oldSession of before.sessions){
    const current=after.sessions.find(session=>session.id===oldSession.id);
    assert.ok(current,`sessão ${oldSession.id} deve sobreviver`);
    assert.equal(current.title,oldSession.title,`título original de ${oldSession.id} não pode mudar`);
    assert.equal(duration(current),duration(oldSession),`duração de ${oldSession.id} não pode mudar`);
    if(!Object.hasOwn(oldSession,'createdAt'))assert.equal(Object.hasOwn(current,'createdAt'),false,`não pode inventar createdAt em ${oldSession.id}`);
  }
  const beforeAreas=new Map(before.settings.areas.map(area=>[area.id,area]));
  for(const area of after.settings.areas){
    const old=beforeAreas.get(area.id);
    if(old?.type==='generic')assert.equal(area.type,'generic',`área genérica ${area.id} não pode virar clientes`);
    if(old?.type==='clients')assert.equal(area.type,'clients',`área de clientes ${area.id} não pode perder o tipo`);
  }
  const beforeClients=new Map(before.settings.clients.map(client=>[client.id,client]));
  for(const [id,client] of beforeClients){
    const current=after.settings.clients.find(item=>item.id===id);
    assert.deepEqual(current,client,`cliente existente ${id} deve ser preservado sem mesclar homônimos`);
  }
}

async function migrationTests(){
  const before=legacyFixture();
  const {context}=migrationContext(before);
  await context.migrateV080Data();
  await context.migrateV082Data();
  const once=clone(context.data);
  assertConservativeMigration(before,once);

  assert.equal(context.sessionAreaId(context.data.sessions.find(session=>session.id==='session-general-legacy')),'area-house','sessão antiga herda somente a área do modelo');
  assert.equal(context.data.sessions.find(session=>session.id==='session-client-existing').clientId,'client-ana','atendimento existente preserva o cliente');
  assert.equal(context.data.sessions.find(session=>session.id==='session-client-legacy-name').clientId,null,'nome legado não é inferido como cliente nesta migração');
  assert.equal(context.data.sessions.find(session=>session.id==='session-client-without-client').clientId,undefined,'sessão sem cliente continua sem associação inventada');
  assert.equal(context.clientById('client-ana').name,'Ana Silva');
  assert.notEqual(context.clientById('client-ana').id,context.clientById('client-anna').id,'nomes parecidos não podem ser mesclados');

  await context.migrateV082Data();
  assert.deepEqual(clone(context.data),once,'rodar a migração existente duas vezes não pode duplicar ou corromper dados');

  const created=await context.createClient('Ana Silva','area-care');
  assert.equal(created.id,'client-ana','cadastro usa equivalência normalizada somente dentro da mesma área');
  const another=await context.createClient('Ana Silva','area-house');
  assert.notEqual(another.id,'client-ana','clientes de áreas diferentes continuam entidades distintas');
  await clientDirectoryTests(context);
}

async function clientDirectoryTests(context){
  context.ui.clientDirectoryAreaId='area-care';
  assert.deepEqual(clone(context.clientDirectoryAreas().map(area=>area.id)).sort(),['area-care'],'diretório só oferece áreas do tipo clients');
  assert.match(context.clientDirectoryRows('Ana','area-care'),/Ana Silva/,'busca encontra cliente existente');
  assert.doesNotMatch(context.clientDirectoryRows('Ana','area-care'),/Ana Silva[\s\S]*Anna Silva/,'nomes semelhantes permanecem entradas distintas e ordenadas');
  assert.equal(context.areaType('area-house'),'generic','área genérica permanece intacta e fora do seletor do diretório');

  let answers=['Bruno Lima','(11) 99999-0000'];
  context.iosTextPrompt=async()=>answers.shift();
  await context.createDirectoryClient();
  const created=context.data.settings.clients.find(client=>client.name==='Bruno Lima');
  assert.ok(created,'diretório cria cliente novo');
  assert.equal(created.areaId,'area-care');
  assert.equal(created.createdAt,1800000000000,'cliente novo recebe data real de criação');
  assert.equal(created.whatsapp,'(11) 99999-0000');
  const totalAfterCreate=context.data.settings.clients.length;
  answers=['Bruno Lima'];context.iosTextPrompt=async()=>answers.shift();
  await context.createDirectoryClient();
  assert.equal(context.data.settings.clients.length,totalAfterCreate,'criação repetida não duplica cliente existente');

  const originalTitle=context.data.sessions.find(session=>session.id==='session-client-existing').title;
  answers=['Ana S.','(11) 98888-0000'];context.iosTextPrompt=async()=>answers.shift();
  await context.editDirectoryClient('client-ana');
  assert.equal(context.clientById('client-ana').name,'Ana S.','edição atualiza o cadastro');
  assert.equal(context.data.sessions.find(session=>session.id==='session-client-existing').clientNameSnapshot,'Ana S.','edição atualiza snapshot de relação');
  assert.equal(context.data.sessions.find(session=>session.id==='session-client-existing').title,originalTitle,'edição não altera título histórico');
  answers=['Anna Silva'];context.iosTextPrompt=async()=>answers.shift();
  await context.editDirectoryClient('client-ana');
  assert.equal(context.clientById('client-ana').name,'Ana S.','edição não une clientes com nomes semelhantes');
  assert.equal(context.clientById('client-anna').createdAt,null,'cliente legado sem createdAt permanece sem data inventada');

  context.confirm=()=>true;
  const sessionBefore=clone(context.data.sessions.find(session=>session.id==='session-client-existing'));
  await context.deleteDirectoryClient('client-ana');
  assert.ok(context.clientById('client-ana').deletedAt,'exclusão é lógica');
  assert.deepEqual(clone(context.data.sessions.find(session=>session.id==='session-client-existing')),sessionBefore,'exclusão não apaga nem desvincula histórico');
  assert.equal(context.clientDirectoryClients('', 'area-care').some(client=>client.id==='client-ana'),false,'cliente excluído sai da lista ativa');
}

function memoryBackupContext(seed){
  const rows={models:new Map(),sessions:new Map(),state:new Map()};
  const keyFor=(store,value)=>store==='state'?value.key:value.id;
  for(const store of Object.keys(rows))for(const value of seed[store]||[])rows[store].set(keyFor(store,value),clone(value));
  const db={
    transaction(names){
      const transaction={
        objectStore(store){
          return {
            clear(){rows[store].clear();},
            put(value){rows[store].set(keyFor(store,value),clone(value));}
          };
        },
        set oncomplete(handler){queueMicrotask(handler);},
        set onerror(_handler){},set onabort(_handler){}
      };
      return transaction;
    }
  };
  const context={
    console,JSON,Date,Math,Blob:globalThis.Blob,File:globalThis.File,
    db,data:{models:[],sessions:[],settings:{runtimeOnly:true},current:null},ui:{},
    APP_META:{dataSchemaVersion:5,factoryDataVersion:1},FACTORY_SEED_STATE_KEY:'factorySeedVersion',
    clone,now:()=>1800000000000,dayKey:()=> '2027-01-15',toast:()=>{},render:()=>{},confirm:()=>true,alert:()=>{},
    navigator:{},document:{body:{appendChild:()=>{}},createElement:()=>({click:()=>{},remove:()=>{}})},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},
    getAll:async store=>[...rows[store].values()].map(clone),
    getState:async key=>clone(rows.state.get(key)?.value),
    persistCurrent:async()=>{},activeModels:()=>context.data.models.filter(model=>!model.deletedAt),
    newSession:model=>({id:'new-current',modelId:model.id,status:'active',timers:[]})
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(read('cronometro-v080-05.js'),context,{filename:'cronometro-v080-05.js'});
  return {context,rows};
}

async function backupTests(){
  const fixture=legacyFixture();
  const payload={schemaVersion:5,exportedAt:'2024-01-01T00:00:00.000Z',models:fixture.models,sessions:fixture.sessions,settings:fixture.settings,currentSession:null};
  const {context}=memoryBackupContext({
    models:[{id:'discard-me'}],sessions:[{id:'discard-me'}],state:[{key:'settings',value:{discard:true}}]
  });
  assert.equal(context.validateBackup(payload),true,'backup sintético válido deve ser aceito');
  assert.equal(Boolean(context.validateBackup({models:[],sessions:[],settings:null})),false,'backup inválido deve ser recusado');
  await context.replaceFromBackup(clone(payload));

  assert.deepEqual(context.data.models,fixture.models,'restore preserva modelos e suas áreas');
  assert.deepEqual(context.data.sessions,fixture.sessions,'restore preserva sessões, títulos, tempos e relacionamentos');
  for(const key of ['areas','clients','activeAreaId','clientEmptyLabel','accentColor','timerSize']){
    assert.deepEqual(context.data.settings[key],fixture.settings[key],`restore preserva configuração ${key}`);
  }
  assert.equal(context.data.sessions.find(session=>session.id==='session-client-existing').clientId,'client-ana');
  assert.equal(context.data.sessions.find(session=>session.id==='session-client-legacy-name').clientId,null);
}

function analyticsSafetyTests(){
  const facts=[
    {id:'existing',areaId:'area-care',clientId:'client-ana',clientCreatedAt:1690000000000,sessionCreatedAt:1700000000000},
    {id:'new-real-date',areaId:'area-care',clientId:'client-new',clientCreatedAt:1700000000000,sessionCreatedAt:1700000100000},
    {id:'migrated-no-date',areaId:'area-care',clientId:'client-migrated',clientCreatedAt:null,sessionCreatedAt:1700000200000},
    {id:'without-client',areaId:'area-care',clientId:null,clientCreatedAt:null,sessionCreatedAt:1700000300000},
    {id:'other-area',areaId:'area-house',clientId:'client-other',clientCreatedAt:1700000400000,sessionCreatedAt:1700000500000}
  ];
  const lifecycle=fact=>fact.clientId==null?'without-client':Number.isFinite(fact.clientCreatedAt)?'dated-client':'migrated-without-date';
  assert.equal(lifecycle(facts[0]),'dated-client');
  assert.equal(lifecycle(facts[1]),'dated-client');
  assert.equal(lifecycle(facts[2]),'migrated-without-date','cliente migrado sem data real nunca pode contar como novo');
  assert.equal(lifecycle(facts[3]),'without-client');
  assert.notEqual(facts[0].areaId,facts[4].areaId,'analytics futura deve manter recorte por área');
}

(async()=>{
  sourceContract();
  await migrationTests();
  await backupTests();
  analyticsSafetyTests();
  console.log('Rede de segurança de dados: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
