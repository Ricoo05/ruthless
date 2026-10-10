const rail=document.querySelector('.rail'),header=document.querySelector('.workspace>header');
if(rail&&header){
  rail.id='command-navigation';
  const toggle=document.createElement('button');toggle.id='command-menu';toggle.textContent='Navigation';toggle.setAttribute('aria-controls',rail.id);toggle.setAttribute('aria-expanded','false');header.prepend(toggle);
  const mobile=matchMedia('(max-width:800px)');
  function navigation(open){toggle.setAttribute('aria-expanded',String(open));document.body.classList.toggle('nav-open',open);rail.inert=mobile.matches&&!open;}
  navigation(false);mobile.addEventListener('change',()=>navigation(false));
  toggle.addEventListener('click',()=>navigation(toggle.getAttribute('aria-expanded')!=='true'));
  const railClose=document.createElement('button');railClose.className='command-rail-close';railClose.textContent='Close navigation';railClose.addEventListener('click',()=>{navigation(false);toggle.focus();});rail.prepend(railClose);
  const insignia=document.createElement('button');insignia.className='command-insignia';insignia.textContent='View RUTHLESS insignia';rail.querySelector('.rail-bottom')?.append(insignia);
  const brandDialog=document.createElement('dialog');brandDialog.id='brand-insignia';brandDialog.setAttribute('aria-label','RUTHLESS Divine Sovereign insignia');brandDialog.innerHTML='<button class="insignia-close" aria-label="Close insignia">Close</button><img src="assets/ruthless-divine-sovereign-v3.png" width="1024" height="1536" loading="lazy" alt="RUTHLESS emblem: an engraved goddess covering her eyes with both hands, two wings, two bowing guardians, and an R monogram." />';document.body.append(brandDialog);insignia.addEventListener('click',()=>brandDialog.showModal());brandDialog.querySelector('button').addEventListener('click',()=>brandDialog.close());
  const launch=document.createElement('button');launch.id='command-search';launch.innerHTML='<span>Jump to workspace</span><kbd>Ctrl K</kbd>';header.append(launch);
  const dialog=document.createElement('dialog');dialog.id='command-palette';dialog.setAttribute('aria-label','Jump to workspace');dialog.innerHTML='<div class="command-palette-heading"><h2>Navigate Ruthless</h2><button id="command-close" aria-label="Close navigation search">Esc</button></div><label for="command-query">Search workspaces and tools</label><input id="command-query" type="search" autocomplete="off" placeholder="Collection, media, assessments…"><div id="command-results"></div>';
  document.body.append(dialog);const query=dialog.querySelector('input'),results=dialog.querySelector('#command-results');
  const entries=[...rail.querySelectorAll('nav button,nav a')];
  function list(){results.replaceChildren();for(const original of entries.filter(e=>e.textContent.toLowerCase().includes(query.value.toLowerCase()))){const b=document.createElement('button');b.textContent=original.textContent.trim();b.addEventListener('click',()=>{dialog.close();original.click();});results.append(b);}if(!results.children.length)results.textContent='No workspace matches.';}
  function open(){list();dialog.showModal();query.focus();}
  launch.addEventListener('click',open);dialog.querySelector('#command-close').addEventListener('click',()=>dialog.close());query.addEventListener('input',list);
  query.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click();}});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!brandDialog.open){e.preventDefault();if(dialog.open)dialog.close();else open();}if(e.key==='Escape'){navigation(false);}});
  rail.addEventListener('click',e=>{if(e.target.closest('nav button,nav a'))navigation(false);});
  const labels=[['watch','COLLECT & OBSERVE'],['desk','ANALYZE & REVIEW'],['tasks','WORKFLOW & VALIDATION']];
  for(const [view,text] of labels){const anchor=rail.querySelector(`[data-view="${view}"]`);if(anchor){const label=document.createElement('p');label.className='nav-section';label.textContent=text;anchor.before(label);}}
}
