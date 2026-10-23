import {fresh,apply,legal} from './game.js';

const $ = id=>document.getElementById(id);
const home=$('home-screen'),levels=$('levels-screen'),game=$('game-screen');
const GRID=$('board-grid'),HITS=$('hit-grid'),STATUS=$('turn-status'),HINT=$('board-hint');
let board=fresh(),mode='friend',difficulty=null,manifest={ready:false,models:{}},worker=null;
let generation=0,requestSequence=0,thinkingResolve=null,locked=false,animation=null;
const REDUCED_MOTION=matchMedia('(prefers-reduced-motion: reduce)');
const slotByPos=new Map();

function show(screen){for(const s of [home,levels,game])s.hidden=s!==screen;}
function clearError(){$('level-help').hidden=true;}
function showError(message){$('level-help').textContent=message;$('level-help').hidden=false;}
async function readManifest(){try{const r=await fetch(new URL('./models/manifest.json',document.baseURI),{cache:'no-store'});if(r.ok)manifest=await r.json();}catch{ /* local 2-player works without a model manifest */ }}
function createSlots(){
  GRID.replaceChildren();HITS.replaceChildren();slotByPos.clear();
  for(let r=5;r>=0;r--)for(let c=0;c<7;c++){
    const el=document.createElement('div');el.className='slot';el.dataset.row=r;el.dataset.col=c;
    GRID.append(el);slotByPos.set(`${r}:${c}`,el);
  }
  for(let c=0;c<7;c++){
    const button=document.createElement('button');button.type='button';button.className='hit-column';button.dataset.col=c;
    button.setAttribute('aria-label',`Drop piece in column ${c+1}`);
    button.addEventListener('click',()=>humanMove(c));
    button.addEventListener('pointerenter',()=>updateHover(c));
    button.addEventListener('pointerleave',()=>$('hover-indicator').classList.remove('active'));
    HITS.append(button);
  }
}
function updateHover(col){
  const hit=HITS.children[col];if(!hit)return;
  const rect=hit.getBoundingClientRect(),outer=$('board-outer').getBoundingClientRect();
  $('hover-indicator').classList.add('active');
  $('hover-indicator').style.left=`${rect.left+rect.width/2-outer.left}px`;
  $('hover-indicator').style.background=board.turn===1?'#ed837b':'#efc675';
}
function setInteractions(on){$('board-outer').classList.toggle('can-play',on);for(const button of HITS.children)button.disabled=!on;}
function syncGameUI(){
  const ai=mode==='ai';
  $('game-mode-label').textContent=ai?'You vs AI':'LOCAL MULTIPLAYER';
  $('game-difficulty-label').textContent=ai?difficulty[0].toUpperCase()+difficulty.slice(1):'Two players';
  $('left-name').textContent=ai?'You':'Red';
  $('right-name').textContent=ai?'AI':'Yellow';
  const active = board.finished && board.winner ? board.winner : board.turn;
  $('left-player').classList.toggle('inactive',active!==1);
  $('right-player').classList.toggle('inactive',active!==2);
  if(board.finished){
    if(board.winner===0){STATUS.textContent='A draw';$('result-heading').textContent='A perfect tie.';}
    else if(ai){const won=board.winner===1;STATUS.textContent=won?'You won!':'AI wins';$('result-heading').textContent=won?'Beautifully played.':'Good game.';}
    else{STATUS.textContent=board.winner===1?'Red wins':'Yellow wins';$('result-heading').textContent=`${board.winner===1?'Red':'Yellow'} wins.`;}
    $('result-panel').hidden=false;HINT.textContent='';
  } else if(ai){STATUS.textContent=board.turn===1?'Your turn':'AI thinking…';HINT.textContent=board.turn===1?'Tap a column to drop your piece':'The AI is choosing its move';}
  else{STATUS.textContent=board.turn===1?'Red to play':'Yellow to play';HINT.textContent='Tap a column to drop your piece';}
  setInteractions(!locked&&!board.finished&&!(ai&&board.turn===2));
}
function cancelWork(){
  generation++;
  if(animation){animation.cancel();animation=null;}
  if(worker){worker.terminate();worker=null;}
  if(thinkingResolve){thinkingResolve({error:'Cancelled'});thinkingResolve=null;}
}
function createWorker(){
  worker=new Worker(new URL('./brain.worker.js',import.meta.url),{type:'module'});
  worker.onerror=()=>{if(thinkingResolve){thinkingResolve({error:'AI engine could not load. Check that the model and solver assets were built.'});thinkingResolve=null;}};
}
function resetBoard(){
  cancelWork();board=fresh();locked=false;createSlots();$('hover-indicator').classList.remove('active');$('result-panel').hidden=true;
  if(mode==='ai')createWorker();
  syncGameUI();
}
function begin(m,l=null){mode=m;difficulty=l;clearError();resetBoard();show(game);}
function stopToMenu(){cancelWork();locked=false;clearError();show(home);}
function askAI(){
  const id=++requestSequence;
  const models=manifest.models||{};
  const modelInfo=models[difficulty];
  const simulations=difficulty==='easy'?0:difficulty==='medium'?20:96;
  return new Promise(resolve=>{
    if(!worker)return resolve({error:'AI worker unavailable'});
    let settled=false;
    const done=(value)=>{if(settled)return;settled=true;worker?.removeEventListener('message',handler);if(thinkingResolve===done)thinkingResolve=null;resolve(value);};
    function handler(e){if(e.data.id===id)done(e.data);}
    thinkingResolve=done;
    worker.addEventListener('message',handler);
    worker.postMessage({id,level:difficulty,moves:[...board.moves],simulations,modelUrl:modelInfo?new URL(`./models/${modelInfo.file}`,document.baseURI).href:null});
  });
}
async function drawMove(change){
  const slot=slotByPos.get(`${change.row}:${change.col}`);
  if(!slot)return;
  const disc=document.createElement('span');disc.className=`piece ${change.player===1?'red':'gold'}`;
  slot.append(disc);
  if(REDUCED_MOTION.matches)return;
  const top=$('board').getBoundingClientRect().top;
  const rect=slot.getBoundingClientRect();
  const height=Math.max(40,rect.top-top+rect.height+10);
  const duration=Math.round(Math.min(500,190+Math.sqrt(height)*19));
  const a=disc.animate([
    {transform:`translate3d(0,${-height}px,0)`,offset:0,easing:'cubic-bezier(.38,.02,.77,.5)'},
    {transform:'translate3d(0,3px,0)',offset:.83,easing:'ease-out'},
    {transform:'translate3d(0,-2px,0)',offset:.92,easing:'ease-in-out'},
    {transform:'translate3d(0,0,0)',offset:1}
  ],{duration,fill:'both'});
  animation=a;
  try{await a.finished;}catch{/* cancelled by new game */}
  if(animation===a)animation=null;
  a.cancel();
}
function highlightWinner(){if(!board.finished||!board.winner)return;for(const [r,c] of board.winning){slotByPos.get(`${r}:${c}`)?.classList.add('winning');}}
async function humanMove(col){
  if(locked||board.finished||mode==='ai'&&board.turn===2)return;
  const change=apply(board,col);
  if(!change)return; // a full column remains visually unchanged
  locked=true;syncGameUI();const current=generation;
  const fall=drawMove(change);
  // Critical: start thinking immediately, while the human disc is visibly falling.
  const thinking=(mode==='ai'&&!board.finished)?askAI():null;
  await fall;
  if(current!==generation)return;
  highlightWinner();syncGameUI();
  if(thinking){
    const result=await thinking;
    if(current!==generation)return;
    if(result.error){STATUS.textContent='AI unavailable';HINT.textContent=result.error;locked=false;setInteractions(false);return;}
    const aiChange=apply(board,result.col);
    if(!aiChange){STATUS.textContent='AI move rejected';HINT.textContent='The engine returned an invalid column';return;}
    syncGameUI();await drawMove(aiChange);
    if(current!==generation)return;
    highlightWinner();
  }
  locked=false;syncGameUI();
}

$('choose-ai').addEventListener('click',()=>{clearError();show(levels);});
$('choose-friend').addEventListener('click',()=>begin('friend'));
$('levels-back').addEventListener('click',stopToMenu);
for(const button of document.querySelectorAll('[data-level]'))button.addEventListener('click',()=>{
  const level=button.dataset.level;
  if(level!=='pro'&&(!manifest.ready||!manifest.models?.[level])){
    showError('Your saved AI models aren’t included here yet. Run the one-time model exporter in the ZIP to activate Easy, Medium and Hard. Pro and two-player mode are independent.');return;
  }
  begin('ai',level);
});
$('game-restart').addEventListener('click',resetBoard);
$('play-again').addEventListener('click',resetBoard);
$('change-mode').addEventListener('click',stopToMenu);
$('game-back').addEventListener('click',stopToMenu);
createSlots();syncGameUI();readManifest();
