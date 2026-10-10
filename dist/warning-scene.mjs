export function sceneProjection([x,y,z],{yaw=.35,pitch=.35,distance=19,width=800,height=330}={}){
  if([x,y,z,yaw,pitch,distance,width,height].some(v=>!Number.isFinite(v))||distance<12||distance>40||width<1||height<1)throw Error('Invalid warning-scene projection.');
  const rx=x*Math.cos(yaw)-z*Math.sin(yaw),rz=x*Math.sin(yaw)+z*Math.cos(yaw),ry=y*Math.cos(pitch)-rz*Math.sin(pitch),depth=distance+y*Math.sin(pitch)+rz*Math.cos(pitch);
  if(depth<=1)return null;const f=Math.min(width,height*2)*.85;
  return {x:width/2+rx*f/depth,y:height*.62-ry*f/depth,depth};
}
export function warningSceneData(report,assessmentId){
  const c=report?.cases?.find(c=>c.assessmentId===assessmentId);
  if(!c||c.records.some(r=>r.synthetic!==true)||typeof report.window?.knownBy!=='string')throw Error('The 3D warning exercise requires a current fictional case.');
  const nodes=c.records.slice(0,12).map((r,i)=>({id:r.recordKey,label:`Report ${i+1}`,date:r.recordedAt,category:r.deniedCodes.length?'denial':r.eligibleCodes.length?'active':'context',position:[Math.cos(i*2.399)*6,1.6,Math.sin(i*2.399)*5]}));
  return {knownBy:report.window.knownBy,state:c.state,warning:c.warning,groups:c.positiveGroups.length,nodes,omitted:Math.max(0,c.records.length-nodes.length),caption:'Abstract source-report layout; coordinates are illustrative and are not target locations, people or attack paths.'};
}
export function warningScene(canvas){
  const ctx=canvas.getContext('2d');let data=null,yaw=.35,frame=null,started=0;
  const palette={active:'#d6dde8',denial:'#b5aabd',context:'#91a3af'};
  const colors={'Watch':'#d7bc70','Warning candidate':'#c4a68c','Contested warning candidate':'#b5aabd','No rule warning':'#8198a2','No report coverage':'#8198a2'};
  function draw(progress=1){
    if(!data||!canvas.isConnected)return;
    const width=canvas.clientWidth||700,height=canvas.clientHeight||330,dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#10141b';ctx.fillRect(0,0,width,height);const project=p=>sceneProjection(p,{yaw,width,height});
    const line=(a,b,color)=>{const p=project(a),q=project(b);if(!p||!q)return;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();};
    for(let n=-8;n<=8;n+=2){line([n,0,-8],[n,0,8],'#2c3542');line([-8,0,n],[8,0,n],'#2c3542');}
    // Abstract volume representing the case context, without facility details.
    const corners=[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1],[-1,2,-1],[1,2,-1],[1,2,1],[-1,2,1]];
    for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])line(corners[a],corners[b],'#567882');
    const stateColor=colors[data.state]??'#91a3af';ctx.setLineDash([4,5]);
    for(const node of data.nodes)line(node.position,[0,2.8,0],'#4b5667');ctx.setLineDash([]);
    const beacon=project([0,3.3,0]);ctx.fillStyle=stateColor;ctx.beginPath();ctx.arc(beacon.x,beacon.y,8+4*progress,0,Math.PI*2);ctx.fill();
    const scale=Math.max(.65,Math.min(1,width/650));ctx.font=`${Math.round(12*scale)}px system-ui`;ctx.textAlign='center';ctx.fillText(data.state,beacon.x,beacon.y-22);
    const nodes=data.nodes.map(node=>({...node,p:project([node.position[0],node.position[1]+(1-progress)*1.6,node.position[2]])})).filter(n=>n.p).sort((a,b)=>b.p.depth-a.p.depth);
    for(const node of nodes){ctx.globalAlpha=.35+.65*progress;ctx.fillStyle=palette[node.category];ctx.beginPath();ctx.arc(node.p.x,node.p.y,6,0,Math.PI*2);ctx.fill();ctx.fillText(node.label,node.p.x,node.p.y+18);}ctx.globalAlpha=1;
    ctx.textAlign='left';ctx.fillStyle='#b5c8d1';ctx.font='12px system-ui';ctx.fillText(`KNOWN BY ${data.knownBy}`,14,22);ctx.fillText('SOURCE REPORTS → RULE WARNING',14,height-16);
  }
  const stop=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;draw(1);};
  function update(next){stop();data=next;started=performance.now();const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick=now=>{const p=Math.min(1,(now-started)/650);draw(p);frame=p<1?requestAnimationFrame(tick):null;};if(reduced)draw(1);else frame=requestAnimationFrame(tick);
  }
  const resize=()=>draw(1);window.addEventListener('resize',resize);
  return {update,rotate:amount=>{if(!Number.isFinite(amount))return;yaw+=amount;draw(1);},stop,destroy:()=>{stop();window.removeEventListener('resize',resize);}};
}
