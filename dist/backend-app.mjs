import {workspaceConnection} from './backend-client.mjs';
import {serializeWorkspace} from './threat-core.mjs';

export function backendDesk({getWorkspace,canLeave,isDirty,replaceWorkspace,markSaved,feedback}) {
  const $=id=>document.getElementById(id),client=workspaceConnection({origin:location.origin});
  let preview=null;
  function draw(){
    const s=client.state(),p=s.profile,b=s.binding;
    $('backend-status').textContent=s.busy?'Waiting for the local server…':!p?'Workspace is in this tab. Connect to the configured local backend to retain server versions.':`${p.subject} · ${p.tenantId} · ${p.role} (local credential) · ${p.storageMode==='temporary_test_database'?'temporary test storage':'encrypted local storage'} · ${b?`${b.workspaceId} / confirmed revision ${b.revision}${client.matches(getWorkspace())?' / current applied work matches':' / local work differs'}`:'no stored workspace loaded'}${s.conflict?' · revision conflict — local work retained':s.uncertain?' · save outcome unconfirmed — inspect server version':''}`;
    $('backend-save').disabled=s.busy||!b||p?.role!=='analyst'||s.conflict||s.uncertain;
    $('backend-inspect').disabled=s.busy||!p||p.role==='auditor';
    $('backend-disconnect').hidden=!p;$('backend-disconnect').disabled=s.busy;
    $('backend-connect').disabled=s.busy;$('backend-workspace').disabled=s.busy||!p;
    document.querySelector('main').inert=s.busy;
    for(const id of ['backend-connect-submit','backend-load','backend-create'])$(id).disabled=s.busy;
  }
  async function operation(fn){try{const promise=fn();draw();await promise;}catch(e){feedback(e.message,true);$('backend-error').textContent=e.message;}finally{draw();}}
  async function inspect(){
    if(!canLeave())return;const id=$('backend-workspace').value,base=getWorkspace();preview=null;
    await operation(async()=>{
      let snapshot;
      try{snapshot=await client.inspect(id);}catch(e){if(e.status!==404)throw e;snapshot=null;}
      if(getWorkspace()!==base)throw new Error('The current workspace changed. Inspect the stored version again.');
      preview={snapshot,base,id};$('backend-replace-ack').checked=false;$('backend-replace-line').hidden=!snapshot||!isDirty();$('backend-create-ack').checked=false;$('backend-create-line').hidden=!!snapshot;
      $('backend-preview-context').textContent=snapshot?`Stored revision ${snapshot.revision}: ${snapshot.workspace.assessments.length} assessments, ${snapshot.workspace.documents.length} sources, ${snapshot.workspace.evidence.length} evidence records. Compare this read-only JSON with your current applied work before loading. Imported review labels remain unverified.`:'No stored version exists. Explicitly create it from the current applied session; the server will reject any concurrent creation.';
      $('backend-preview-json').value=snapshot?serializeWorkspace(snapshot.workspace):'';$('backend-preview-json').hidden=!snapshot;document.querySelector('label[for="backend-preview-json"]').hidden=!snapshot;
      $('backend-load').hidden=!snapshot;$('backend-create').hidden=!!snapshot||client.state().profile?.role!=='analyst';$('backend-preview-error').textContent='';$('backend-preview-dialog').showModal();
    });
  }
  async function save(){if(!canLeave())return;const base=getWorkspace();await operation(async()=>{const saved=await client.save(base);if(getWorkspace()===base)markSaved();feedback(`Server confirmed ${saved.workspaceId} revision ${saved.revision}. Local review labels remain unverified; this is a storage receipt.`);});}
  document.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.id==='backend-connect'){if(!canLeave())return;$('backend-error').textContent='';$('backend-credential').value='';$('backend-connect-notice').textContent=client.state().available?'Use the configured local workspace credential. It stays in memory, clears from this form immediately and is lost on reload. This does not authenticate a real agency identity.':'Connection requires the configured loopback backend. Hosted previews and the ordinary static server continue to use manual JSON recovery.';$('backend-connect-submit').hidden=!client.state().available;$('backend-connect-dialog').showModal();}
    else if(b.id==='backend-inspect')await inspect();
    else if(b.id==='backend-save')await save();
    else if(b.id==='backend-disconnect'){client.disconnect();$('backend-workspace').replaceChildren();feedback('Local backend disconnected. Your current work is retained in this tab.');draw();}
    else if(b.id==='backend-load'){
      try{if(!preview?.snapshot||getWorkspace()!==preview.base||!canLeave())throw new Error('Current work changed; inspect the stored version again.');if(isDirty()&&!$('backend-replace-ack').checked)throw new Error('Acknowledge replacement of unsaved local work first.');const workspace=client.accept(preview.snapshot);replaceWorkspace(workspace);preview=null;$('backend-preview-dialog').close();feedback('Stored workspace loaded after validation. Its server revision is now the save precondition.');draw();}catch(e){$('backend-preview-error').textContent=e.message;}
    }else if(b.id==='backend-create'){
      if(!preview||preview.snapshot||getWorkspace()!==preview.base||!canLeave()){ $('backend-preview-error').textContent='Current work changed; inspect the stored version again.';return;}
      if(!$('backend-create-ack').checked){$('backend-preview-error').textContent='Acknowledge creation from the current applied session first.';return;}
      client.prepareCreate(preview.id);$('backend-preview-dialog').close();preview=null;await save();
    }
  });
  $('backend-connect-form').addEventListener('submit',async event=>{
    event.preventDefault();const credential=$('backend-credential').value;$('backend-credential').value='';$('backend-error').textContent='';
    await operation(async()=>{const p=await client.connect(credential);const options=p.workspaceIds.map(id=>{const option=document.createElement('option');option.value=id;option.textContent=id;return option;});$('backend-workspace').replaceChildren(...options);$('backend-connect-dialog').close();feedback('Local credential accepted. Inspect and load an assigned stored workspace, or explicitly create a missing one, before saving.');});
  });
  $('backend-workspace').addEventListener('change',()=>{client.detach();preview=null;draw();feedback('Stored workspace selection changed. Inspect and load it before saving; local work is retained.');});
  draw();return {isBusy:()=>client.state().busy,refresh:draw,detach:()=>{client.detach();draw();}};
}
