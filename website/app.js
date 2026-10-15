const sample = {
  demand: 12,
  nodes: [{id:'A',cap:8},{id:'B',cap:6},{id:'C',cap:10},{id:'D',cap:9},{id:'E',cap:7},{id:'F',cap:8}],
  edges: [['A','B',18],['A','D',31],['A','E',20],['B','C',22],['B','D',38],['B','F',41],['C','D',16],['C','F',19],['C','E',41],['D','E',25],['D','F',14],['E','F',28]]
};
let data=structuredClone(sample), latest=null, route={from:'A',to:'F'}, animationPhase='done', animationRunId=0;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function edgeKey(a,b){return [a,b].sort().join('|');}
function renderEditors(){
  $('#demandInput').value=data.demand; $('#serverCount').textContent=data.nodes.length;
  $('#nodeEditor').innerHTML=data.nodes.map((n,i)=>`<label class="node-input"><span class="server-badge">${esc(n.id)}</span><span class="node-input-name">Server ${esc(n.id)}</span><input aria-label="Capacity for server ${esc(n.id)}" data-node="${i}" type="number" min="0" max="999" value="${n.cap}"><span class="unit">units</span></label>`).join('');
  $('#linkCount').textContent=`${data.edges.length} links`;
  const opts=data.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.id)}</option>`).join('');
  $('#edgeEditor').innerHTML=data.edges.map((e,i)=>`<div class="edge-row"><select aria-label="Link endpoint 1" data-edge="${i}" data-part="0">${opts}</select><span class="dash">—</span><select aria-label="Link endpoint 2" data-edge="${i}" data-part="1">${opts}</select><input aria-label="Latency in milliseconds" data-edge="${i}" data-part="2" type="number" min="1" max="999" value="${e[2]}"><span class="ms">ms</span><button type="button" data-remove="${i}" aria-label="Remove link ${esc(e[0])} to ${esc(e[1])}">×</button></div>`).join('');
  $$('#edgeEditor select[data-edge]').forEach(el=>el.value=data.edges[+el.dataset.edge][+el.dataset.part]);
  const oldFrom=$('#sourceSelect').value||route.from, oldTo=$('#targetSelect').value||route.to;
  $('#sourceSelect').innerHTML=opts; $('#targetSelect').innerHTML=opts;
  $('#sourceSelect').value=data.nodes.some(n=>n.id===oldFrom)?oldFrom:data.nodes[0]?.id;
  $('#targetSelect').value=data.nodes.some(n=>n.id===oldTo)?oldTo:(data.nodes[1]?.id||data.nodes[0]?.id);
  route={from:$('#sourceSelect').value,to:$('#targetSelect').value};
}
function readEditors(){
  data.demand=Number($('#demandInput').value);
  $$('#nodeEditor input').forEach(el=>data.nodes[+el.dataset.node].cap=Number(el.value));
  const next=[]; $$('#edgeEditor .edge-row').forEach(row=>{const s=row.querySelectorAll('select'),lat=Number(row.querySelector('input').value);next.push([s[0].value,s[1].value,lat]);}); data.edges=next;
}
class DSU{constructor(n){this.p=Array.from({length:n},(_,i)=>i);this.r=Array(n).fill(0)}find(x){if(this.p[x]!==x)this.p[x]=this.find(this.p[x]);return this.p[x]}union(a,b){a=this.find(a);b=this.find(b);if(a===b)return false;if(this.r[a]<this.r[b])[a,b]=[b,a];this.p[b]=a;if(this.r[a]===this.r[b])this.r[a]++;return true}}
class Heap{constructor(){this.a=[]}push(x){const a=this.a;a.push(x);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=x[0])break;a[i]=a[p];i=p}a[i]=x}pop(){const a=this.a;if(!a.length)return null;const root=a[0],last=a.pop();if(a.length){let i=0;while(true){const l=i*2+1,r=l+1;if(l>=a.length)break;const c=r<a.length&&a[r][0]<a[l][0]?r:l;if(a[c][0]>=last[0])break;a[i]=a[c];i=c}a[i]=last}return root}get length(){return this.a.length}}
function calculate(){
  readEditors();const n=data.nodes.length,ids=data.nodes.map(x=>x.id),ix=new Map(ids.map((id,i)=>[id,i]));
  if(!Number.isInteger(data.demand)||data.demand<1)throw Error('Task demand must be a positive whole number.');
  if(n<2)throw Error('Add at least two servers to analyze a network.');
  for(const node of data.nodes)if(!Number.isInteger(node.cap)||node.cap<0)throw Error(`Capacity for server ${node.id} must be a whole number of 0 or more.`);
  const seen=new Set();
  for(const e of data.edges){if(e[0]===e[1])throw Error('A network link must connect two different servers.');if(!Number.isInteger(e[2])||e[2]<1)throw Error('Every link needs a positive whole-number latency.');const key=edgeKey(e[0],e[1]);if(seen.has(key))throw Error(`There is more than one link between ${e[0]} and ${e[1]}. Remove the duplicate link.`);seen.add(key);if(!ix.has(e[0])||!ix.has(e[1]))throw Error('A link refers to a server that no longer exists.');}
  const es=data.edges.map(([a,b,w])=>({a,b,w,ai:ix.get(a),bi:ix.get(b)}));
  const sorted=[...es].sort((a,b)=>a.w-b.w||a.a.localeCompare(b.a)||a.b.localeCompare(b.b));const dsu=new DSU(n),mst=[];let mstWeight=0;
  for(const e of sorted)if(dsu.union(e.ai,e.bi)){mst.push(e);mstWeight+=e.w;}
  if(mst.length!==n-1)throw Error('The network is disconnected. Add links so every server can reach every other server.');
  const adj=Array.from({length:n},()=>[]);for(const e of es){adj[e.ai].push([e.bi,e.w]);adj[e.bi].push([e.ai,e.w]);}
  const parents=[];
  const dist=Array.from({length:n},(_,src)=>{const d=Array(n).fill(Infinity),prev=Array(n).fill(-1);d[src]=0;const h=new Heap();h.push([0,src]);while(h.length){const [cost,u]=h.pop();if(cost!==d[u])continue;for(const [v,w] of adj[u])if(cost+w<d[v]){d[v]=cost+w;prev[v]=u;h.push([d[v],v]);}}parents.push(prev);return d;});
  const costs=dist.map(row=>row.reduce((a,b)=>a+b,0)/n),totalCap=data.nodes.reduce((a,x)=>a+x.cap,0);
  if(totalCap<data.demand)throw Error(`Total capacity (${totalCap}) is below task demand (${data.demand}). Increase capacity or lower demand.`);
  if(totalCap>5000)throw Error('Total capacity is too large for this classroom demo. Keep the sum at 5,000 units or below.');
  const dp=Array(totalCap+1).fill(Infinity),take=Array.from({length:n},()=>Array(totalCap+1).fill(false));dp[0]=0;
  for(let i=0;i<n;i++){const cap=data.nodes[i].cap,cost=costs[i];for(let c=totalCap;c>=cap;c--){if(Number.isFinite(dp[c-cap])&&dp[c-cap]+cost<dp[c]){dp[c]=dp[c-cap]+cost;take[i][c]=true;}}}
  let bestCap=-1;for(let c=data.demand;c<=totalCap;c++)if(dp[c]<(bestCap<0?Infinity:dp[bestCap]))bestCap=c;
  if(bestCap<0||!Number.isFinite(dp[bestCap]))throw Error('No capacity-feasible placement could be found.');
  let c=bestCap,chosen=[];for(let i=n-1;i>=0;i--)if(take[i][c]){chosen.push(data.nodes[i].id);c-=data.nodes[i].cap;}chosen.reverse();
  return{mst,mstWeight,dist,parents,costs,chosen,bestCap,cost:dp[bestCap]};
}
function findRoute(result,from,to){const ids=data.nodes.map(n=>n.id),s=ids.indexOf(from),t=ids.indexOf(to);if(s<0||t<0||!Number.isFinite(result.dist[s][t]))return null;let path=[],u=t;while(u!==-1){path.push(ids[u]);if(u===s)break;u=result.parents[s][u];}if(path[path.length-1]!==from)return null;return{path:path.reverse(),distance:result.dist[s][t]};}
function drawGraph(result){
  const W=720,H=350,cx=W/2,cy=165,rx=Math.min(278,W*.39),ry=122,pos={};data.nodes.forEach((n,i)=>{const angle=-Math.PI/2+i*2*Math.PI/data.nodes.length;pos[n.id]=[cx+rx*Math.cos(angle),cy+ry*Math.sin(angle)];});
  const mstSet=new Set(result.mst.map(e=>edgeKey(e.a,e.b))),mstOrder=new Map(result.mst.map((e,i)=>[edgeKey(e.a,e.b),i])),path=findRoute(result,route.from,route.to),pathSet=new Set(),pathOrder=new Map();if(path)for(let i=0;i<path.path.length-1;i++){const k=edgeKey(path.path[i],path.path[i+1]);pathSet.add(k);pathOrder.set(k,i);}
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Interactive server network. Green links form the minimum spanning tree; blue links show the selected shortest route.">`;
  // Place each weight at a slightly different point along its edge and nudge it
  // away from the line. This keeps labels legible where several links cross.
  const labelLayout={
    'A|B':[.58,-13], 'A|D':[.36,18], 'A|E':[.52,-13], 'B|C':[.52,17],
    'B|D':[.66,-16], 'B|F':[.50,-14], 'C|D':[.55,16], 'C|E':[.48,16],
    'C|F':[.50,-16], 'D|E':[.50,-15], 'D|F':[.55,15], 'E|F':[.48,-15]
  };
  data.edges.forEach(([a,b,w],i)=>{const [x1,y1]=pos[a],[x2,y2]=pos[b],key=edgeKey(a,b),tree=mstSet.has(key),inPath=pathSet.has(key),length=Math.hypot(x2-x1,y2-y1),delay=(mstOrder.get(key)||0)*190,[t,nudge]=labelLayout[key]||[.5,(i%2?1:-1)*12],nx=-(y2-y1)/length,ny=(x2-x1)/length,lx=x1+(x2-x1)*t+nx*nudge,ly=y1+(y2-y1)*t+ny*nudge;svg+=`<line class="edge ${tree?'tree':''} ${inPath?'route-edge':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="--edge-length:${length}px;--edge-delay:${delay}ms;--path-delay:${(pathOrder.get(key)||0)*180}ms"/><text class="edge-label" x="${lx}" y="${ly}" text-anchor="middle">${w} ms</text>`;});
  data.nodes.forEach(node=>{const [x,y]=pos[node.id],placed=result.chosen.includes(node.id),onRoute=path?.path.includes(node.id);svg+=`<g class="node ${placed?'placed':''} ${onRoute?'on-route':''}"><circle cx="${x}" cy="${y}" r="29"/><text x="${x}" y="${y-5}">${esc(node.id)}</text><text class="capacity-label" x="${x}" y="${y+12}">${node.cap} units</text></g>`;});svg+='</svg>';$('#graph').className=`graph phase-${animationPhase}`;$('#graph').innerHTML=svg;
}
function updateRoute(){if(!latest)return;route={from:$('#sourceSelect').value,to:$('#targetSelect').value};const r=findRoute(latest,route.from,route.to);if(!r){$('#routeResult').textContent='No route is available between these servers.';}else{$('#routeResult').innerHTML=`<b>${esc(route.from)} → ${esc(route.to)}</b><span>${r.path.map(esc).join(' → ')}</span><strong>${r.distance} ms</strong>`;}drawGraph(latest);}
function show(result){latest=result;$('#mstMetric').textContent=`${result.mstWeight} ms`;
  $('#demandMetric').textContent=`${data.demand} units`;$('#capacityMetric').textContent=`${result.bestCap} units`;$('#costMetric').textContent=result.cost.toFixed(2);
  $('#placementSummary').textContent=`Selected ${result.chosen.join(' + ')} · capacity ${result.bestCap} covers demand ${data.demand}.`;
  $('#routeStatus').textContent=`${data.nodes.length} Dijkstra runs complete`;
  $('#placements').innerHTML=data.nodes.map((node,i)=>{const selected=result.chosen.includes(node.id);return `<div class="placement-row ${selected?'selected':''}"><span class="node-chip">${esc(node.id)}</span><div><b>Server ${esc(node.id)} ${selected?'· selected':''}</b><small>Capacity ${node.cap} units · mean shortest-path distance ${result.costs[i].toFixed(2)} ms</small></div><span class="cost-pill">${result.costs[i].toFixed(2)}</span></div>`}).join('');
  let table='<thead><tr><th>From / to</th>'+data.nodes.map(n=>`<th>${esc(n.id)}</th>`).join('')+'</tr></thead><tbody>';result.dist.forEach((row,i)=>{table+=`<tr><th>${esc(data.nodes[i].id)}</th>`+row.map((d,j)=>`<td class="${i===j?'diag':''}">${Number.isFinite(d)?`${d} ms`:'—'}</td>`).join('')+'</tr>';});$('#distTable').innerHTML=table+'</tbody>';
  $('#inputMessage').textContent='Simulation updated from the current inputs. Values are illustrative.';updateRoute();
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function setRunButtons(disabled){$('#runBtn').disabled=disabled;$('#runBtnSide').disabled=disabled;}
async function run(animate=true){const token=++animationRunId;try{const result=calculate();animationPhase=animate?'mst':'done';show(result);$('#inputMessage').classList.remove('error');if(!animate){$('#demoStep').textContent='Simulation complete';return;}setRunButtons(true);$('#demoStep').textContent='Step 1 of 3 · Building minimum spanning tree';await pause(1650);if(token!==animationRunId)return;animationPhase='path';drawGraph(latest);$('#demoStep').textContent='Step 2 of 3 · Tracing shortest route';await pause(1250);if(token!==animationRunId)return;animationPhase='placement';drawGraph(latest);$('#demoStep').textContent='Step 3 of 3 · Selecting capacity-feasible servers';await pause(1000);if(token!==animationRunId)return;animationPhase='done';drawGraph(latest);$('#demoStep').textContent='Simulation complete';setRunButtons(false);}catch(e){animationPhase='done';latest=null;$('#graph').className='graph phase-done';$('#inputMessage').textContent=e.message;$('#inputMessage').classList.add('error');$('#demoStep').textContent='Check inputs to run';setRunButtons(false);}}
function reset(){animationRunId++;animationPhase='done';setRunButtons(false);data=structuredClone(sample);latest=null;route={from:'A',to:'F'};$('#inputMessage').classList.remove('error');renderEditors();run();}
$('#runBtn').onclick=run;$('#runBtnSide').onclick=run;$('#resetBtn').onclick=reset;
$('#addNodeBtn').onclick=()=>{if(data.nodes.length>=12){$('#inputMessage').textContent='The visualization supports up to 12 servers.';return;}const id=String.fromCharCode(65+data.nodes.length);data.nodes.push({id,cap:6});renderEditors();$('#inputMessage').textContent=`Server ${id} added. Connect it to the network before running.`;};
$('#addEdgeBtn').onclick=()=>{if(data.nodes.length<2)return;const pairs=new Set(data.edges.map(e=>edgeKey(e[0],e[1])));let pair=null;for(let i=0;i<data.nodes.length&&!pair;i++)for(let j=i+1;j<data.nodes.length;j++)if(!pairs.has(edgeKey(data.nodes[i].id,data.nodes[j].id))){pair=[data.nodes[i].id,data.nodes[j].id,20];break;}if(!pair){$('#inputMessage').textContent='Every pair of servers already has a link.';return;}data.edges.push(pair);renderEditors();$('.link-details').open=true;};
$('#edgeEditor').addEventListener('click',e=>{const i=e.target.dataset.remove;if(i!==undefined){data.edges.splice(+i,1);renderEditors();}});
$('#sourceSelect').addEventListener('change',updateRoute);$('#targetSelect').addEventListener('change',updateRoute);
$('#inputMessage').classList.remove('error');renderEditors();run(false);
