import {fresh,apply,legal} from './game.js';

const $ = id=>document.getElementById(id);
const home=$('home-screen'),levels=$('levels-screen'),game=$('game-screen');
const GRID=$('board-grid'),HITS=$('hit-grid'),STATUS=$('turn-status'),HINT=$('board-hint');
let board=fresh(),mode='friend',difficulty=null,manifest={ready:false,models:{}},worker=null;
let startingSide='human',humanPlayer=1,aiPlayer=2;
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
  const leftDisc=ai?humanPlayer:1,rightDisc=ai?aiPlayer:2;
  for(const [id,disc] of [['left-player',leftDisc],['right-player',rightDisc]]){
    const side=$(id),avatar=side.querySelector('.avatar');
    side.dataset.disc=disc===1?'red':'gold';
    avatar.classList.toggle('red-avatar',disc===1);
    avatar.classList.toggle('gold-avatar',disc===2);
  }
  const active=board.finished&&board.winner?board.winner:board.turn;
  for(const [id,disc] of [['left-player',leftDisc],['right-player',rightDisc]]){
    $(id).classList.toggle('active',active===disc);
    $(id).classList.toggle('inactive',active!==disc);
  }
  STATUS.dataset.turn=active===1?'red':'gold';
  STATUS.classList.toggle('game-over',board.finished);
  if(board.finished){
    if(board.winner===0){STATUS.textContent='Draw';$('result-heading').textContent='A perfect tie.';}
    else if(ai){const won=board.winner===humanPlayer;STATUS.textContent=won?'You won!':'AI wins';$('result-heading').textContent=won?'Beautifully played.':'Good game.';}
    else{STATUS.textContent=board.winner===1?'Red wins':'Yellow wins';$('result-heading').textContent=`${board.winner===1?'Red':'Yellow'} wins.`;}
    $('result-panel').hidden=false;HINT.textContent='';
  } else if(ai){
    const humanTurn=board.turn===humanPlayer;
    STATUS.textContent=humanTurn?'Your turn':'AI thinking…';
    HINT.textContent=humanTurn?'Tap a column to drop your piece':'The AI is choosing its move';
  } else {
    STATUS.textContent=board.turn===1?"Red's turn":"Yellow's turn";
    HINT.textContent='Tap a column to drop your piece';
  }
  setInteractions(!locked&&!board.finished&&!(ai&&board.turn===aiPlayer));
}
function cancelWork(preserveIdleWorker=false){
  // Retain a warmed AI engine between games, but terminate any computation
  // that is still in flight so stale replies cannot affect the next board.
  const busy=Boolean(thinkingResolve);
  generation++;
  if(animation){animation.cancel();animation=null;}
  if(worker&&(!preserveIdleWorker||busy)){worker.terminate();worker=null;}
  if(thinkingResolve){thinkingResolve({error:'Cancelled'});thinkingResolve=null;}
}
function createWorker(){
  worker=new Worker(new URL('./brain.worker.js',import.meta.url),{type:'module'});
  worker.onerror=()=>{if(thinkingResolve){thinkingResolve({error:'AI engine could not load. Check that the model and solver assets were built.'});thinkingResolve=null;}};
}
function resetBoard(){
  cancelWork(true);board=fresh();locked=mode==='ai'&&aiPlayer===1;createSlots();$('hover-indicator').classList.remove('active');$('result-panel').hidden=true;
  if(mode==='ai'&&!worker)createWorker();
  syncGameUI();
  if(locked){const current=generation;queueMicrotask(()=>{if(current===generation)void playAiTurn(current);});}
}
function begin(m,l=null){
  mode=m;difficulty=l;
  humanPlayer=mode==='ai'&&startingSide==='ai'?2:1;
  aiPlayer=3-humanPlayer;
  clearError();resetBoard();show(game);
}
function stopToMenu(){cancelWork();locked=false;clearError();show(home);}
function askAI(){
  const id=++requestSequence;
  const models=manifest.models||{};
  const modelInfo=models[difficulty];
  const simulations=difficulty==='easy'?0:difficulty==='medium'?10:96;
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
  // Measure before inserting the disc to avoid a forced layout reflow
  // immediately after a DOM mutation. The animation uses transforms only.
  const still=REDUCED_MOTION.matches;
  const top=still?0:$('board').getBoundingClientRect().top;
  const rect=still?null:slot.getBoundingClientRect();
  const disc=document.createElement('span');disc.className=`piece ${change.player===1?'red':'gold'}`;
  slot.append(disc);
  if(still)return;
  const distance=Math.max(42,rect.top-top+rect.height+12);
  // Acceleration-like fall; impact, tiny rebound and a final settle.
  // Flight time grows with the square root of travel distance (gravity).
  const flight=Math.max(185,Math.min(465,Math.sqrt(2*distance/5600)*1000));
  const duration=Math.round(flight+118),impact=flight/duration;
  const bounce=Math.min(7,Math.max(3,rect.height*.09));
  const a=disc.animate([
    {transform:`translate3d(0,${-distance}px,0) scale(1)`,offset:0,easing:'cubic-bezier(.33,0,.90,.50)'},
    {transform:'translate3d(0,0,0) scale(1.055,.93)',offset:impact,easing:'cubic-bezier(.18,.7,.42,1)'},
    {transform:`translate3d(0,${-bounce}px,0) scale(.99,1.015)`,offset:impact+(1-impact)*.48,easing:'ease-in'},
    {transform:'translate3d(0,0,0) scale(1.018,.987)',offset:impact+(1-impact)*.78,easing:'ease-out'},
    {transform:'translate3d(0,0,0) scale(1)',offset:1}
  ],{duration,fill:'both'});
  animation=a;
  try{await a.finished;}catch{/* interrupted by restart or mode change */}
  if(animation===a)animation=null;
  a.cancel();
}
function highlightWinner(){if(!board.finished||!board.winner)return;for(const [r,c] of board.winning){slotByPos.get(`${r}:${c}`)?.classList.add('winning');}}
async function playAiTurn(current,thinking=null){
  const result=await (thinking||askAI());
  if(current!==generation)return;
  if(result.error){
    STATUS.textContent='AI unavailable';HINT.textContent=result.error;
    locked=true;setInteractions(false);return;
  }
  const aiChange=apply(board,result.col);
  if(!aiChange){STATUS.textContent='AI move rejected';HINT.textContent='The engine returned an invalid column';return;}
  syncGameUI();
  await drawMove(aiChange);
  if(current!==generation)return;
  highlightWinner();locked=false;syncGameUI();
}
async function humanMove(col){
  if(locked||board.finished||mode==='ai'&&board.turn!==humanPlayer)return;
  const change=apply(board,col);
  if(!change)return; // Full columns are never visually tinted.
  locked=true;syncGameUI();const current=generation;
  // Start AI reasoning immediately; show the human disc before waiting for it.
  const thinking=(mode==='ai'&&!board.finished)?askAI():null;
  await drawMove(change);
  if(current!==generation)return;
  highlightWinner();
  if(thinking){await playAiTurn(current,thinking);return;}
  locked=false;syncGameUI();
}
$('choose-ai').addEventListener('click',()=>{clearError();show(levels);});
$('choose-friend').addEventListener('click',()=>begin('friend'));
$('levels-back').addEventListener('click',stopToMenu);
for(const button of document.querySelectorAll('[data-start]'))button.addEventListener('click',()=>{
  startingSide=button.dataset.start;
  for(const option of document.querySelectorAll('[data-start]')){
    const chosen=option===button;option.classList.toggle('selected',chosen);option.setAttribute('aria-pressed',String(chosen));
  }
});
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
