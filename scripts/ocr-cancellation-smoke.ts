/** Optional real-worker check: npx tsx scripts/ocr-cancellation-smoke.ts image.png */
import { createWorker } from 'tesseract.js';
import { withOcrCancellation } from '../web/src/ocr-engine';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const image=process.argv[2];if(!image)throw new Error('Pass an OCR test image.');
const cache=fileURLToPath(new URL('../../ocr-model-cache/',import.meta.url));mkdirSync(cache,{recursive:true});
const controller=new AbortController();let started=false;
const worker=await createWorker('eng',1,{cachePath:cache,errorHandler:()=>{},logger:(event)=>{if(event.status==='recognizing text'&&!started){started=true;controller.abort();void worker.terminate();}}});
const begin=Date.now();
try{await assert.rejects(withOcrCancellation(worker.recognize(image),controller.signal),/cancelled/);assert.equal(started,true);console.log(JSON.stringify({realTesseractWorker:true,cancelled:true,settledMilliseconds:Date.now()-begin}));}finally{await worker.terminate();}
