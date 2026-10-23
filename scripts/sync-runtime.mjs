// Copies just the ONNX WebAssembly engine needed for standalone Netlify deployment.
import {readdirSync, mkdirSync, copyFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
const from='node_modules/onnxruntime-web/dist',to='public/vendor/ort';
if(!existsSync(from)){console.error('Install dependencies with npm install first');process.exit(1);}
mkdirSync(to,{recursive:true});let files=0;
for(const f of readdirSync(from)){
 if(/^ort-wasm.*\.(?:mjs|wasm)$/.test(f)){copyFileSync(join(from,f),join(to,f));files++;}
}
if(!files)throw new Error('No ONNX runtime wasm assets found');
console.log(`Prepared ${files} ONNX runtime files for deployment`);
