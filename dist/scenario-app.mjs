import {SCENARIO,SCENARIOS,scenarioFrame,scenarioWorkspace,projectPoint} from './scenario-core.mjs';
const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canvas=$('scenario-canvas'),ctx=canvas.getContext('2d');
let scenarioId=SCENARIO.id,step=0,hypothesis='routine',yaw=.65,playing=false,pace=1,lastTick=0,raf=null,width=800,height=460;
const camera=()=>({yaw,pitch:.7,distance:26,focal:Math.min(width,height)*1.3,cx:width/2,cy:height*.55});
const project=p=>projectPoint(p,camera());
function line(points,color,dashed=false){const projected=points.map(project);if(projected.some(p=>!p))return;ctx.beginPath();projected.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash(dashed?[6,5]:[]);ctx.stroke();ctx.setLineDash([]);}
function polygon(points,color,stroke='#345866'){const projected=points.map(project);if(projected.some(p=>!p))return;ctx.beginPath();projected.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}
function cuboid(x,y,z,sx,sy,sz,color){const v=[[x-sx/2,y,z-sz/2],[x+sx/2,y,z-sz/2],[x+sx/2,y,z+sz/2],[x-sx/2,y,z+sz/2],[x-sx/2,y+sy,z-sz/2],[x+sx/2,y+sy,z-sz/2],[x+sx/2,y+sy,z+sz/2],[x-sx/2,y+sy,z+sz/2]];return [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]].map((indices,i)=>({points:indices.map(n=>v[n]),color:color[i]??color[0]}));}
function label(point,text,color='#7896aa'){const p=project(point);if(!p)return;ctx.fillStyle=color;ctx.font='11px ui-monospace, monospace';ctx.fillText(text,p.x,p.y);}
function ring(position,radius,color,dashed=false){const points=Array.from({length:49},(_,i)=>[position[0]+Math.cos(i*Math.PI/24)*radius,position[1],position[2]+Math.sin(i*Math.PI/24)*radius]);line(points,color,dashed);}
function draw(){
  if(!ctx)return;
  ctx.clearRect(0,0,width,height);const frame=scenarioFrame(step,hypothesis,scenarioId);
  polygon([[-10,0,-8],[10,0,-8],[10,0,8],[-10,0,8]],'#10222c','#27434f');
  for(let i=-10;i<=10;i+=2)line([[i,.01,-8],[i,.01,8]],'#203b46');for(let i=-8;i<=8;i+=2)line([[-10,.01,i],[10,.01,i]],'#203b46');
  polygon([[-2.5,.03,-.5],[4.5,.03,-.5],[4.5,.03,5],[-2.5,.03,5]],'#173747','#6e9dce');
  const surfaces=[...cuboid(0,0,2,2.6,1.5,2.4,['#254756','#315667','#294d5c','#355c68','#426b78']),...cuboid(3,0,2.5,1.3,.9,2,['#223d4b','#284955','#314f5a','#2a4954','#3d626b'])];
  const [x,y,z]=frame.position;
  surfaces.push(...cuboid(x,y-.12,z,.45,.24,.45,['#dbb16b','#ba955d','#c99d5f','#efc67f','#ffe1a1']));
  if(frame.possibleDisruption)surfaces.slice(0,10).forEach(s=>s.color='#654635');
  const sorted=surfaces.map(s=>({...s,depth:s.points.map(project).reduce((n,p)=>n+(p?.depth??0),0)/s.points.length})).sort((a,b)=>b.depth-a.depth);
  sorted.forEach(s=>polygon(s.points,s.color));
  for(const o of frame.observations.filter(o=>o.position)){ring(o.position,.22,'#66ddca');line([[o.position[0],.05,o.position[2]],o.position],'#427f7a',true);label([o.position[0]+.3,o.position[1]+.3,o.position[2]],o.id,'#66ddca');}
  if(step>0)line([frame.scenario.observations[0].position,step<4?frame.position:frame.scenario.observations[2].position],'#edb965',true);
  if(step>4)line([frame.scenario.observations[2].position,frame.position],'#edb965',true);
  if($('show-uncertainty').checked){const radius=.55+Math.max(0,step-4)*.28;ring(frame.position,radius,'#edb965',true);ring([x,y+.25,z],radius*.7,'#8d795b',true);}
  line([[x,.05,z],frame.position],'#9a844f',true);
  if(frame.possibleDisruption)label([0,2.2,2],'ASSUMED SITE DISRUPTION','#e6ab80');
  label([-2.3,.1,5.6],'FICTIONAL CIVILIAN SITE','#95b9d7');label([-9,.1,7],'ABSTRACT SCENE / NO MAP');
  label([x+.5,y+.2,z],scenarioId===SCENARIO.id?'UNIDENTIFIED OBJECT':'REPORT AREA','#f2cc85');
}
function update(){if(!playing)$('play-replay').textContent=step>=8?'Replay from start':'Play replay';const frame=scenarioFrame(step,hypothesis,scenarioId);$('scene-title').textContent=frame.scenario.title;canvas.setAttribute('aria-label',`3D illustration of a fictional site and ${scenarioId===SCENARIO.id?'an unidentified aerial object':'a stationary report-area marker'}. Positions are authored display units. Use the text observation log for accessible context.`);$('replay-step').value=String(step);$('step-output').textContent=`${step.toFixed(1)} / ${SCENARIO.end}`;$('scene-phase').textContent=`Exercise step ${step.toFixed(1)}`;$('scene-mode').textContent=frame.mode;$('hypothesis-description').textContent=frame.explanation;$('observation-count').textContent=frame.observations.length;$('group-count').textContent=frame.sourceGroups;
  $('hypothesis-basis').textContent=(frame.availableSupports.length?`Available report references: ${frame.availableSupports.join(', ')}.`:'No supporting report for this explanation is available yet.')+(frame.missingSupports.length?` Not yet available at this step: ${frame.missingSupports.join(', ')}.`:'');
  $('hypothesis-gap').textContent=frame.verification;$('scenario-status').textContent=frame.possibleDisruption?'Possible site disruption is shown as an assumed outcome. No incident is observed and no attack probability is calculated.':step>4?'Continuation after the last position report is a hypothesis. No likelihood or threat determination has been calculated.':'Reports remain unverified authored controls. Interpolated motion is not a continuous observation.';
  $('scenario-observations').innerHTML=frame.observations.map(o=>`<article class="observation-row"><div class="observation-step">STEP ${o.step}<br>${o.id}</div><div><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p></div><p class="muted">${esc(o.channel)}<br>Group: ${esc(o.group)}<br>AUTHORED / SYNTHETIC</p></article>`).join('');draw();}
function pause(){playing=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;$('play-replay').textContent=step>=8?'Replay from start':'Play replay';}
function tick(time){if(!playing)return;if(lastTick){const delta=Math.min((time-lastTick)/1000,.15);step=Math.min(8,step+delta*.5*pace);}lastTick=time;update();if(step>=8){pause();return;}raf=requestAnimationFrame(tick);}
$('play-replay').addEventListener('click',()=>{if(playing){pause();return;}if(step>=8)step=0;playing=true;lastTick=0;$('play-replay').textContent='Pause replay';raf=requestAnimationFrame(tick);});
$('reset-replay').addEventListener('click',()=>{pause();step=0;update();});
$('replay-step').addEventListener('input',e=>{pause();step=Number(e.target.value);update();});
$('replay-pace').addEventListener('change',e=>pace=Number(e.target.value));
$('scenario-exercise').addEventListener('change',e=>{pause();scenarioId=e.target.value;step=0;hypothesis='routine';$('scenario-hypothesis').innerHTML=SCENARIOS.find(s=>s.id===scenarioId).hypotheses.map(h=>`<option value="${h.id}">${esc(h.label)}</option>`).join('');update();});
$('scenario-hypothesis').addEventListener('change',e=>{pause();hypothesis=e.target.value;update();});
$('rotate-left').addEventListener('click',()=>{yaw-=.25;draw();});$('rotate-right').addEventListener('click',()=>{yaw+=.25;draw();});$('reset-view').addEventListener('click',()=>{yaw=.65;draw();});$('show-uncertainty').addEventListener('change',draw);
$('prepare-scenario').addEventListener('click',()=>{pause();const prepared=scenarioWorkspace(step,hypothesis,scenarioId);$('scenario-workspace-json').value=prepared.json;$('prepared-context').textContent=`${prepared.observationCount} available synthetic reports staged at step ${step.toFixed(1)}. Scenario adds zero evidence records. No workspace is saved or replaced.`;$('scenario-workspace-dialog').showModal();});
$('close-scenario-workspace').addEventListener('click',()=>$('scenario-workspace-dialog').close());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);
if(ctx)new ResizeObserver(()=>{const size=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);width=Math.max(1,size.width);height=Math.max(1,size.height);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx?.setTransform(ratio,0,0,ratio,0,0);draw();}).observe(canvas);
if(!ctx){canvas.replaceWith(Object.assign(document.createElement('p'),{textContent:'3D drawing is unavailable in this browser. The observation log, hypothesis controls and workspace preparation remain available.'}));}
update();
