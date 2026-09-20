'use strict';
/* APP_RELEASE é injetado no pacote gerado; o fallback preserva a execução da
   fonte histórica sem depender do pipeline de publicação. */
if(globalThis.APP_META) globalThis.APP_META=Object.freeze({...globalThis.APP_META,version:/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(String(globalThis.APP_RELEASE||''))?globalThis.APP_RELEASE:'0.8.1'});
