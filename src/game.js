/** Pure 7x6 Connect Four rules, independent of any AI. Rows 0..5 are bottom-up. */
export const WIDTH = 7, HEIGHT = 6;
export function fresh() { return {cells: Array.from({length:HEIGHT},()=>Array(WIDTH).fill(0)), heights:Array(WIDTH).fill(0), moves:[], turn:1, winner:0, finished:false, winning:[]}; }
export function legal(s) {if (s.finished) return []; return s.heights.flatMap((h,c)=>h<HEIGHT?[c]:[]);}
export function clone(s) {return {cells:s.cells.map(r=>r.slice()),heights:s.heights.slice(), moves:s.moves.slice(),turn:s.turn,winner:s.winner,finished:s.finished,winning:s.winning.map(([r,c])=>[r,c])};}
export function apply(s,c) {
  if (!Number.isInteger(c)||c<0||c>=WIDTH||s.finished||s.heights[c]>=HEIGHT) return null;
  const p=s.turn,r=s.heights[c]++;s.cells[r][c]=p;s.moves.push(c);
  const directions=[[1,0],[0,1],[1,1],[1,-1]];
  for (const [dr,dc] of directions) {
    let chain=[[r,c]];
    for(const sign of [-1,1]) {let rr=r+dr*sign,cc=c+dc*sign; while(rr>=0&&rr<HEIGHT&&cc>=0&&cc<WIDTH&&s.cells[rr][cc]===p) {chain.push([rr,cc]);rr+=dr*sign;cc+=dc*sign;}}
    if(chain.length>=4){s.winner=p;s.finished=true;s.winning=chain;break;}
  }
  if (!s.finished && s.moves.length===WIDTH*HEIGHT) s.finished=true;
  s.turn=3-p;
  return {row:r,col:c,player:p,finished:s.finished,winner:s.winner};
}
export function replay(moves){const s=fresh();for(const c of moves){if(apply(s,c)===null)throw new Error('Invalid saved move sequence');}return s;}
export function encode(s) {
  // Mirrors original fourai/ai/network.py: channels (current/opponent), row-major top-first.
  const v=new Float32Array(2*HEIGHT*WIDTH);
  for(let row=0;row<HEIGHT;row++)for(let col=0;col<WIDTH;col++){
    const x=s.cells[row][col]; const index=(HEIGHT-1-row)*WIDTH+col;
    if(x===s.turn)v[index]=1;else if(x===3-s.turn)v[HEIGHT*WIDTH+index]=1;
  }
  return v;
}
export function chooseByPolicy(policy,s) {
  const choices=legal(s);if(!choices.length)return null;
  return choices.reduce((best,c)=>policy[c]>policy[best]?c:best,choices[0]);
}
