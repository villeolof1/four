/** All AI compute happens off the UI thread. No training or checkpoint writes. */
import {fresh,replay,apply,legal,clone,encode,chooseByPolicy} from './game.js';

let ort=null, wasmModule=null, solver=null;
const sessions=new Map();
const resultsCache=new Map();

async function getSession(level,url) {
  if(sessions.has(level))return sessions.get(level);
  if(!ort) {
    ort=await import('onnxruntime-web/wasm');
    ort.env.wasm.numThreads=1; // works on normal static hosting without cross-origin isolation
    ort.env.wasm.wasmPaths=new URL('../vendor/ort/', import.meta.url).href;
  }
  const session=await ort.InferenceSession.create(url, {executionProviders:['wasm'],graphOptimizationLevel:'all'});
  sessions.set(level,session);return session;
}

async function predict(level,url,positions) {
  const session=await getSession(level,url);
  const batch=positions.length;
  const input=new Float32Array(batch*84);
  for(let i=0;i<batch;i++)input.set(encode(positions[i]),i*84);
  const feeds={[session.inputNames[0]]:new ort.Tensor('float32',input,[batch,2,6,7])};
  const out=await session.run(feeds);
  const logitName=session.outputNames.find(x=>x==='policy_logits')||session.outputNames[0];
  const valueName=session.outputNames.find(x=>x==='value')||session.outputNames[1];
  const logits=out[logitName].data,values=out[valueName].data;
  return positions.map((s,i)=>{
    const legalMoves=legal(s), probs=Array(7).fill(0);
    if(legalMoves.length){
      const max=Math.max(...legalMoves.map(c=>logits[i*7+c]));
      const exps=legalMoves.map(c=>Math.exp(logits[i*7+c]-max));
      const total=exps.reduce((a,b)=>a+b,0);
      legalMoves.forEach((c,j)=>{probs[c]=exps[j]/total;});
    }
    return {policy:probs,value:Number(values[i])};
  });
}

function node(board){return {board,expanded:false,prior:Array(7).fill(0),visits:Array(7).fill(0),totals:Array(7).fill(0),children:new Map()};}
function choose(n){
  const options=legal(n.board),visits=n.visits.reduce((a,b)=>a+b,0);
  let chosen=options[0],best=-Infinity;
  for(const c of options){
    const q=n.visits[c]>0?n.totals[c]/n.visits[c]:0;
    const u=1.5*n.prior[c]*Math.sqrt(visits+1)/(1+n.visits[c]);
    const score=q+u;
    if(score>best){best=score;chosen=c;}
  }
  return chosen;
}
function propagate(path,v){for(let i=path.length-1;i>=0;i--){v=-v;const {node:n,col}=path[i];n.visits[col]++;n.totals[col]+=v;}}
async function learnedMove(level,url,board,simulations){
  const root=node(board); const [first]=await predict(level,url,[board]);
  root.prior=first.policy;root.expanded=true;
  if(!simulations)return chooseByPolicy(first.policy,board);
  for(let sim=0;sim<simulations;sim++){
    let current=root;const path=[];
    while(current.expanded&&!current.board.finished){
      const col=choose(current);path.push({node:current,col});
      if(!current.children.has(col)){const next=clone(current.board);apply(next,col);current.children.set(col,node(next));}
      current=current.children.get(col);
    }
    if(current.board.finished){
      // Value of terminal board from the perspective of next player.
      const v=current.board.winner===0?0:(current.board.winner===current.board.turn?1:-1);
      propagate(path,v);
    } else {
      const [pred]=await predict(level,url,[current.board]);
      current.prior=pred.policy;current.expanded=true;propagate(path,pred.value);
    }
  }
  const choices=legal(board);
  return choices.reduce((best,c)=>root.visits[c]>root.visits[best]?c:best,choices[0]);
}
async function perfectMove(board){
  if(!wasmModule){
    wasmModule=await import('connect-four-ai-wasm');
    await wasmModule.default();
    solver=new wasmModule.Solver();
  }
  // Evaluate every legal successor exactly; no approximate fallback.
  const sequence=board.moves.map(c=>String(c+1)).join('');
  const options=[3,2,4,1,5,0,6].filter(c=>legal(board).includes(c));
  const key=sequence;
  if(resultsCache.has(key))return resultsCache.get(key);
  let best=options[0],bestScore=-Infinity;
  for(const col of options){
    const next=clone(board);apply(next,col);
    // Terminal win is always best; solver may disallow evaluating a finished game.
    if(next.winner===board.turn){resultsCache.set(key,col);return col;}
    const position=wasmModule.Position.fromMoves(sequence+String(col+1));
    const opponentScore=solver.solve(position);
    if(!Number.isFinite(opponentScore))throw new Error('Perfect solver returned a non-finite score');
    const score=-opponentScore;
    if(score>bestScore){best=col;bestScore=score;}
  }
  if(resultsCache.size>250)resultsCache.clear();
  resultsCache.set(key,best);return best;
}
self.onmessage=async(event)=>{
  const {id,level,moves,modelUrl,simulations}=event.data;
  try {
    const board=replay(moves);
    if(board.finished)throw new Error('Game already finished');
    const col=level==='pro'?await perfectMove(board):await learnedMove(level,modelUrl,board,simulations);
    if(!legal(board).includes(col))throw new Error('Engine selected an invalid move');
    self.postMessage({id,col});
  }catch(error){self.postMessage({id,error:String(error?.message||error)});}
};
