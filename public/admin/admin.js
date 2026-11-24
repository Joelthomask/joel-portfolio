const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];const S={user:null,data:null,page:'overview',dirty:false,deletedProjects:[],deletedMediaPaths:[],pendingUploads:[]};const nav=[['overview','layout-dashboard','Overview'],['projects','folder-kanban','Projects'],['home','house','Home / Hero'],['about','user-round','About'],['toolkit','wrench','Toolkit'],['contact','mail','Contact'],['media','images','Media Library'],['settings','settings','Settings']];const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const glyphs={'layout-dashboard':'▦','folder-kanban':'▤','house':'⌂','user-round':'◉','wrench':'⌁','mail':'✉','images':'▧','settings':'⚙','github':'◉','app-window':'▣','plus':'+','arrow-up-right':'↗','pencil':'✎','trash-2':'×','save':'↓','git-pull-request':'⑂','upload':'↑','external-link':'↗','search':'⌕','image':'▧','log-out':'⇥','copy':'▣','star':'☆','code-2':'‹›'};const ic=n=>`<span class="icon-glyph" aria-hidden="true">${glyphs[n]||'·'}</span>`;function icons(){}
let progressState=null;
function progressModal(title,steps){
  progressState={title,steps:steps.map((label,i)=>({label,status:i===0?'active':'waiting'})),active:0};
  let el=document.getElementById('operation-progress');
  if(!el){el=document.createElement('div');el.id='operation-progress';el.className='operation-progress-backdrop';document.body.append(el);}
  drawProgress();
}
function drawProgress(){
  const s=progressState;if(!s)return;
  const done=s.steps.filter(x=>x.status==='done').length;
  const pct=Math.round(done/s.steps.length*100);
  const active=s.steps.find(x=>x.status==='active');
  const el=document.getElementById('operation-progress');
  el.innerHTML=`<div class="operation-progress-card" role="dialog" aria-modal="true" aria-labelledby="operation-progress-title">
    <div class="operation-progress-top"><span class="eyebrow">PORTFOLIO ADMIN</span><span class="operation-live"><i></i> WORKING</span></div>
    <h2 id="operation-progress-title">${esc(s.title)}</h2>
    <div class="operation-progress-percent">${pct}%</div>
    <div class="operation-progress-track"><span style="width:${pct}%"></span></div>
    <p class="operation-current">${active?esc(active.label):'Finishing up...'}</p>
    <div class="operation-steps">${s.steps.map((x,i)=>`<div class="operation-step ${x.status}"><span class="operation-step-icon">${x.status==='done'?'✓':x.status==='active'?'<i></i>':String(i+1).padStart(2,'0')}</span><span>${esc(x.label)}</span><small>${x.status==='done'?'Completed':x.status==='active'?'In progress':'Waiting'}</small></div>`).join('')}</div>
    <p class="operation-note">Progress reflects completed stages. GitHub may take variable time while processing the request.</p>
  </div>`;
}
function progressDone(){
  if(!progressState)return;
  progressState.steps.forEach(x=>x.status='done');drawProgress();
  const el=document.getElementById('operation-progress');
  if(el){const card=el.querySelector('.operation-progress-card');card.insertAdjacentHTML('beforeend','<div class="operation-result success">✓ Operation completed successfully</div><button class="btn primary operation-close" type="button">Done</button>');el.querySelector('.operation-close').onclick=()=>{el.remove();progressState=null;};}
}
function progressFail(error){
  if(!progressState)return;
  const active=progressState.steps.find(x=>x.status==='active');
  if(active)active.status='failed';
  drawProgress();
  const el=document.getElementById('operation-progress');
  if(el){const card=el.querySelector('.operation-progress-card');card.insertAdjacentHTML('beforeend',`<div class="operation-result failed">Operation failed</div><pre class="operation-error">${esc(error?.message||String(error))}</pre><button class="btn operation-close" type="button">Close</button>`);el.querySelector('.operation-close').onclick=()=>{el.remove();progressState=null;};}
}
function progressStep(index){
  if(!progressState)return;
  progressState.steps.forEach((x,i)=>x.status=i<index?'done':i===index?'active':'waiting');
  progressState.active=index;drawProgress();
}

function toast(t){let e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),3000)}const LOCAL_DEMO = ['localhost','127.0.0.1'].includes(location.hostname);
let demoContent = null;
async function loadDemoContent(){
  if(demoContent) return demoContent;
  const read = async path => { const r=await fetch(path); if(!r.ok) throw Error(`Could not load ${path}`); return r.json(); };
  const [site,about,contact,toolkit] = await Promise.all([
    read('/src/content/site.json'), read('/src/content/about.json'),
    read('/src/content/contact.json'), read('/src/content/toolkit.json')
  ]);
  // Discover the current project JSON files instead of relying on stale slugs.
  const listingResponse = await fetch('/src/content/projects/');
  if (!listingResponse.ok) throw Error('Could not discover local project files.');
  const listingHtml = await listingResponse.text();
  const listingDoc = new DOMParser().parseFromString(listingHtml, 'text/html');
  const projectFiles = [...listingDoc.querySelectorAll('a[href]')]
    .map(link => decodeURIComponent(link.getAttribute('href') || ''))
    .filter(href => href.toLowerCase().endsWith('.json'))
    .map(href => href.split('/').pop())
    .filter(Boolean);
  if (!projectFiles.length) throw Error('No project JSON files were found in /src/content/projects/.');
  const projects = await Promise.all(projectFiles.map(async filename => {
    const fileId = filename.replace(/\.json$/i, '');
    const project = await read(`/src/content/projects/${encodeURIComponent(filename)}`);
    delete project.slug;
    return { ...project, _fileId: fileId };
  }));
  const media=[];
  demoContent={site,about,contact,toolkit,projects,media,draftBranch:null,hasDraft:false};
  return demoContent;
}
async function req(url,opt={}){
  if(LOCAL_DEMO){
    if(url==='/api/admin/me') return {authenticated:true,user:{login:'local-preview',name:'Local UI Preview'}};
    if(url==='/api/admin/content') return await loadDemoContent();
    if(url==='/api/admin/media') {
      const body=JSON.parse(opt.body||'{}');
      const file={name:body.name||'preview-image',url:`/uploads/${body.name||'preview-image'}`};
      demoContent.media.push(file); return {file};
    }
    if(url==='/api/admin/draft'){const body=JSON.parse(opt.body||'{}');demoContent.hasDraft=true;const media=(body.uploads||[]).map(x=>({name:x.name,url:'/uploads/'+x.name}));return {branch:'local-preview-only',saved:true,media};}
    if(url==='/api/admin/publish'){demoContent.hasDraft=false;return {published:true,message:'Preview mode: publish action simulated. No GitHub changes were made.'};}
    if(url==='/api/admin/logout') return {ok:true};
  }
  let r=await fetch(url,{...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});
  let raw=await r.text(),d={};
  try{d=raw?JSON.parse(raw):{}}catch{d={error:raw.slice(0,500)}}
  if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);
  return d;
}function login(msg=''){$('#app').innerHTML=`<div class="login"><div class="loginbox"><div class="brand"><div class="logo">J.</div><div><b>JOEL THOMAS</b><small>PORTFOLIO ADMIN</small></div></div><div class="eyebrow" style="margin-top:28px">PRIVATE WORKSPACE</div><h1>Manage your portfolio.</h1><p>A focused workspace for your projects, profile, toolkit and media. Sign in with the authorized GitHub account.</p>${msg?`<div class="note">${esc(msg)}</div>`:''}<a class="btn primary" href="/api/admin/login">${ic('github')} Continue with GitHub</a><div class="note">Your GitHub credentials are handled by GitHub. The admin session is stored in a secure, HTTP-only cookie.</div></div></div>`;icons()}function shell(body){let title=nav.find(n=>n[0]===S.page)?.[2]||'Overview';$('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="logo">J.</div><div><b>JOEL THOMAS</b><small>PORTFOLIO ADMIN</small></div></div><div class="label">Workspace</div><nav class="nav">${nav.map(n=>`<button data-page="${n[0]}" class="${S.page===n[0]?'active':''}">${ic(n[1])}${n[2]}</button>`).join('')}</nav><div class="side-user"><div class="avatar">${esc((S.user.login||'J')[0].toUpperCase())}</div><div><b style="font-size:11px">${esc(S.user.name||S.user.login)}</b><small>Administrator</small></div></div></aside><main class="main"><header class="top"><div class="crumb">Workspace / <strong>${title}</strong></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="status" id="draft-status"><i class="dot"></i> ${S.data.hasDraft?'Draft saved':'GitHub connected'}</span><button class="btn small" id="save-global">Save draft</button><button class="btn primary small" id="publish-global">Publish</button><button class="btn small" id="logout">Sign out</button></div></header><section class="content">${body}</section></main></div>`;$$('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));$('#save-global').onclick=saveDraft;$('#publish-global').onclick=publishDraft;$('#logout').onclick=async()=>{const button=$('#logout');button.disabled=true;try{await req('/api/admin/logout',{method:'POST'});S.user=null;S.data=null;login('You have signed out of Portfolio Admin. GitHub may still remember your account, so Continue with GitHub can sign you back in without asking for your password.');}catch(e){toast(`Sign out failed: ${e.message}`);button.disabled=false;}};icons()}function head(k,t,d,a=''){return `<div class="head"><div><div class="eyebrow">${k}</div><h1>${t}</h1><p>${d}</p></div>${a}</div>`}function overview(){let p=S.data.projects||[];return head('Portfolio workspace',`Good evening, ${esc(S.user.name||S.user.login||'there')}.`,'Manage the content and presentation of your portfolio.')+`<div class="grid stats"><div class="stat"><small>Total projects</small><strong>${p.length}</strong><em>Projects in your portfolio</em></div><div class="stat"><small>Featured projects</small><strong>${p.filter(x=>x.featured).length}</strong><em>Highlighted on your website</em></div><div class="stat"><small>Toolkit items</small><strong>${S.data.toolkit.technologies?.length||0}</strong><em>Technologies and tools</em></div><div class="stat"><small>Media files</small><strong>${S.data.media.length}</strong><em>Uploaded assets</em></div></div><div class="grid columns"><div class="panel"><h2>Recent projects</h2>${p.slice().sort((a,b)=>(a.sortOrder||99)-(b.sortOrder||99)).slice(0,5).map(x=>`<div class="activity"><div class="ico">${ic('app-window')}</div><div style="flex:1;font-size:12px">${esc(x.title)}<small>${esc(x.category||x.projectType||'Project')}</small></div><button class="btn small" data-edit="${esc(x._fileId)}">Edit</button></div>`).join('')}</div><div class="panel"><h2>Quick actions</h2><button class="quick" data-page="projects">${ic('plus')} Add a project ${ic('arrow-up-right')}</button><button class="quick" data-page="home">${ic('house')} Edit homepage ${ic('arrow-up-right')}</button><button class="quick" data-page="toolkit">${ic('wrench')} Update toolkit ${ic('arrow-up-right')}</button><a class="quick" href="/" target="_blank">${ic('external-link')} View live portfolio</a></div></div>`}function projects(){return head('Content management','Projects','Create, edit and organize the work displayed on your portfolio.',`<button class="btn primary" id="new">${ic('plus')} New project</button>`)+`<div class="toolbar"><input class="input" id="search" placeholder="Search projects…"></div><div class="list">${(S.data.projects||[]).slice().sort((a,b)=>(a.sortOrder||99)-(b.sortOrder||99)).map(p=>`<div class="project"><div class="thumb">${p.image?`<img src="${esc(p.image)}">`:ic('image')}</div><div><div class="ptitle">${esc(p.title)}</div><div class="meta">${esc(p.category||p.projectType||'Project')}</div><span class="tag ${p.featured?'cyan':''}">${p.featured?'Featured':'Standard'}</span>${p.showLiveDemo&&p.liveDemoUrl?'<span class="tag">Live demo</span>':''}</div><div class="actions"><button class="btn small" data-edit="${esc(p._fileId)}">${ic('pencil')} Edit</button><button class="btn small danger" data-del="${esc(p._fileId)}">${ic('trash-2')}</button></div></div>`).join('')||'<div class="empty">No projects yet.</div>'}</div>`}const f=(l,n,v='',area=false,span=false)=>`<div class="field ${span?'span2':''}"><label>${l}</label>${area?`<textarea name="${n}">${esc(v)}</textarea>`:`<input name="${n}" value="${esc(v)}">`}</div>`;function section(key){key=key==='home'?'site':key;let d=S.data[key]||{};let defs={site:['Home / Hero','Edit the first impression visitors get from your portfolio.',[['Greeting','greeting'],['Name','name'],['Role','role'],['Description','description',1],['GitHub URL','github'],['LinkedIn URL','linkedin']]],about:['About','Update your biography and portrait.',[['Heading line one','headingLineOne'],['Heading line two','headingLineTwo'],['Paragraph one','paragraphOne',1],['Paragraph two','paragraphTwo',1],['Portrait path','portrait']]],contact:['Contact','Manage the ways people can reach you.',[['Heading line one','headingLineOne'],['Heading line two','headingLineTwo'],['Description','description',1],['WhatsApp URL','whatsapp'],['Email address','email'],['Location','location']]]};let c=defs[key];return head('Site content',c[0],c[1])+`<form class="editor" id="section-form" data-key="${key}"><div class="formgrid">${c[2].filter(x=>x[1]!=='portrait').map(x=>f(x[0],x[1],d[x[1]],!!x[2],!!x[2])).join('')}${key==='about'?`<div class="field span2"><label>About photo</label><div class="portrait-picker"><img id="portrait-preview" src="${esc(d.portrait||'')}" alt="Current About photo"><div><select class="input" name="portrait" id="portrait-select"><option value="">Choose a media file…</option>${S.data.media.map(m=>`<option value="${esc(m.url)}" ${d.portrait===m.url?'selected':''}>${esc(m.name)}</option>`).join('')}</select><label class="btn small" for="portrait-upload">Replace photo</label><input hidden type="file" id="portrait-upload" accept="image/png,image/jpeg,image/webp,image/gif"><small>Choose an existing image or upload a replacement. No photo editing tools.</small></div></div></div>`:''}</div><div style="display:flex;justify-content:flex-end"><button class="btn primary">${ic('save')} Apply changes</button></div></form>`}function toolkit(){return head('Site content','My Toolkit','Manage technologies and tools displayed on your portfolio.',`<button class="btn primary" id="addtech">${ic('plus')} Add technology</button>`)+`<div class="panel"><h2>Technologies</h2><div class="list">${S.data.toolkit.technologies.map((t,i)=>`<div class="project"><div class="thumb">${esc(t.symbol)}</div><div><div class="ptitle">${esc(t.name)}</div><div class="meta">${esc(t.detail)}</div></div><div class="actions"><button class="btn small" data-tech="${i}">Edit</button><button class="btn small danger" data-techdel="${i}">Delete</button></div></div>`).join('')}</div><div style="text-align:right;margin-top:16px"></div></div>`}function media(){const items=[...S.data.media.filter(m=>!S.deletedMediaPaths.includes(m.path)),...S.pendingUploads.map(m=>({name:m.name,url:m.preview,staged:true,path:m.replacePath||''}))];return head('Assets','Media library','All image assets tracked in your portfolio repository, including existing site images and uploads.',`<label class="btn primary" for="upload">${ic('upload')} Upload images</label><input hidden type="file" id="upload" multiple accept="image/*">`)+`<div class="media-summary">${items.length} visible assets · ${S.data.media.length} tracked in GitHub · ${S.pendingUploads.length} pending uploads</div><div class="grid media-grid">${items.map((m,i)=>`<div class="media-card"><img src="${esc(m.url)}" alt="${esc(m.name)}"><div class="media-name">${esc(m.name)}</div><div class="meta">${esc(m.path||'New upload')}${m.usedBy?.length?`<br>Used in: ${esc(m.usedBy.join(', '))}`:''}${m.staged?' · Not saved yet':''}</div>${m.staged?'<span class="tag cyan">Pending draft</span>':`<div class="media-actions"><a class="btn small" href="${esc(m.url)}" download>Download</a><button class="btn small" data-copy="${esc(m.url)}">Copy path</button><button class="btn small" data-replace="${esc(m.path)}">Replace</button><button class="btn small danger" data-media-del="${esc(m.path)}">Delete</button></div>`}</div>`).join('')||'<div class="empty">No image assets found.</div>'}</div>`}function settings(){return head('Configuration','Settings','Publishing and account configuration.')+`<div class="panel"><h2>Publishing</h2><p class="meta">Your edits are stored in a persistent draft branch. Use Save draft whenever you want to keep your progress. Select Publish when you are ready to update the live portfolio. Vercel deploys automatically after publishing.</p><div class="tag ${S.data.hasDraft?'cyan':''}">${S.data.hasDraft?'Draft available':'No saved draft'}</div></div>`}function render(){let b=S.page==='overview'?overview():S.page==='projects'?projects():['home','about','contact'].includes(S.page)?section(S.page):S.page==='toolkit'?toolkit():S.page==='media'?media():settings();shell(b);$$('[data-page]').forEach(x=>x.onclick=()=>go(x.dataset.page));$$('[data-edit]').forEach(x=>x.onclick=()=>editProject(x.dataset.edit));$$('[data-del]').forEach(x=>x.onclick=()=>delProject(x.dataset.del));$$('[data-tech]').forEach(x=>x.onclick=()=>editTech(+x.dataset.tech));$$('[data-techdel]').forEach(x=>x.onclick=()=>{S.data.toolkit.technologies.splice(+x.dataset.techdel,1);S.dirty=true;render()});$$('[data-copy]').forEach(x=>x.onclick=()=>navigator.clipboard.writeText(x.dataset.copy).then(()=>toast('Path copied')));$('#new')?.addEventListener('click',()=>editProject());$('#search')?.addEventListener('input',e=>$$('.project').forEach(x=>x.style.display=x.textContent.toLowerCase().includes(e.target.value.toLowerCase())?'grid':'none'));$('#save')?.addEventListener('click',saveDraft);$('#section-form')?.addEventListener('submit',e=>{e.preventDefault();S.data[e.target.dataset.key]=Object.fromEntries(new FormData(e.target));S.dirty=true;toast('Changes updated. Click Save draft in the top bar to keep them.')});$('#addtech')?.addEventListener('click',()=>editTech());$('#upload')?.addEventListener('change',upload);$$('[data-media-del]').forEach(x=>x.onclick=()=>{const m=S.data.media.find(v=>v.path===x.dataset.mediaDel);if(!m)return;if(m.usedBy?.length){toast(`Cannot delete: this image is used in ${m.usedBy.join(', ')}. Replace those references first.`);return}if(!confirm(`Delete ${m.name} from the media library?`))return;S.deletedMediaPaths.push(m.path);S.dirty=true;render()});$$('[data-replace]').forEach(x=>x.onclick=()=>{const m=S.data.media.find(v=>v.path===x.dataset.replace);if(!m)return;const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';input.onchange=()=>stageReplacement(input.files?.[0],m.path);input.click()});$('#portrait-select')?.addEventListener('change',e=>{const img=$('#portrait-preview');if(img)img.src=e.target.value});$('#portrait-upload')?.addEventListener('change',e=>stagePortrait(e.target.files?.[0]));icons()}function go(p){S.page=p;render()}function modal(title,body,cb){let e=document.createElement('div');e.className='modalbg';e.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><div class="modalhead"><h2>${title}</h2><button type="button" class="btn small" data-close aria-label="Close dialog">Close</button></div>${body}</div>`;document.body.append(e);const closeButton=e.querySelector('[data-close]');const close=event=>{event?.preventDefault();event?.stopPropagation();e.remove()};closeButton?.addEventListener('click',close);let downOnBackdrop=false;e.addEventListener('mousedown',event=>{downOnBackdrop=event.target===e});e.addEventListener('click',event=>{if(event.target===e&&downOnBackdrop)close(event);downOnBackdrop=false});cb?.(e);icons();return e}function editProject(fileId){
 let p=fileId?S.data.projects.find(x=>x._fileId===fileId):{title:'',category:'',description:'',tags:[],projectType:'Web Apps',featured:false,sortOrder:99,showLiveDemo:false,liveDemoUrl:'',sourceCodeUrl:'',overview:'',features:[],image:'',images:[],date:'',role:''};
 let gallery=[...(p.images?.length?p.images:(p.image?[p.image]:[]))];let projectPending=[];
 const galleryMarkup=()=>gallery.map((url,i)=>`<div class="project-image-row"><img src="${esc(url)}" alt="Project image ${i+1}"><span>Image ${i+1}${i===0?' · Primary':''}</span><button type="button" class="btn small" data-img-up="${i}" ${i===0?'disabled':''}>↑</button><button type="button" class="btn small" data-img-down="${i}" ${i===gallery.length-1?'disabled':''}>↓</button><button type="button" class="btn small danger" data-img-remove="${i}">Remove</button></div>`).join('');
 let body=`<form id="pf"><div class="formgrid">${f('Project title','title',p.title)}${f('Category','category',p.category)}<div class="field"><label>Project type</label><select name="projectType" class="input">${['Web Apps','AI / ML','Desktop Apps','Databases','Others'].map(x=>`<option ${p.projectType===x?'selected':''}>${x}</option>`).join('')}</select></div>${f('Short description','description',p.description,true,true)}${f('Detailed overview','overview',p.overview||'',true,true)}${f('Technologies (comma separated)','tags',(p.tags||[]).join(', '),true,true)}${f('Key features (one per line)','features',(p.features||[]).join('\n'),true,true)}${f('Live demo URL','liveDemoUrl',p.liveDemoUrl||'')}${f('Source code URL','sourceCodeUrl',p.sourceCodeUrl||'')}${f('Project date','date',p.date||'')}${f('Your role','role',p.role||'')}${f('Sort order','sortOrder',p.sortOrder||99)}</div><div class="field span2 project-gallery-editor"><label>Project images</label><p class="meta">Add images one at a time. Repeat to add more, then reorder them with ↑ and ↓. The first image is the main preview; up to five are shown in the project gallery.</p><div id="project-image-list">${galleryMarkup()}</div><label class="btn small primary" for="project-image-upload">${ic('upload')} Add project image(s)</label><input hidden type="file" id="project-image-upload" accept="image/png,image/jpeg,image/webp,image/gif" multiple><small>PNG, JPEG, WebP or GIF. Select one or multiple images. Project images are automatically resized and compressed to WebP when smaller, then saved with your next draft.</small></div><div class="switchrow"><div><strong>Featured project</strong><small>Highlight on the portfolio.</small></div><input class="switch" type="checkbox" name="featured" ${p.featured?'checked':''}></div><div class="switchrow"><div><strong>Show Live Demo</strong><small>Requires a demo URL.</small></div><input class="switch" type="checkbox" name="showLiveDemo" ${p.showLiveDemo?'checked':''}></div><div style="text-align:right;margin-top:14px"><button class="btn primary">Save project</button></div></form>`;
 let d=modal(fileId?'Edit project':'New project',body,e=>{
   const refreshGallery=()=>{const box=$('#project-image-list',e);if(box)box.innerHTML=galleryMarkup();bindGallery()};
   const bindGallery=()=>{
    $$('[data-img-up]',e).forEach(b=>b.onclick=()=>{let i=+b.dataset.imgUp;[gallery[i-1],gallery[i]]=[gallery[i],gallery[i-1]];refreshGallery()});
    $$('[data-img-down]',e).forEach(b=>b.onclick=()=>{let i=+b.dataset.imgDown;[gallery[i+1],gallery[i]]=[gallery[i],gallery[i+1]];refreshGallery()});
    $$('[data-img-remove]',e).forEach(b=>b.onclick=()=>{gallery.splice(+b.dataset.imgRemove,1);refreshGallery()});
   };
   bindGallery();
   // Prevent Enter in single-line inputs from submitting and closing the editor.
   $('#pf',e).addEventListener('keydown',ev=>{
    if(ev.key==='Enter'&&ev.target instanceof HTMLInputElement)ev.preventDefault();
   });
   $('#project-image-upload',e).onchange=async ev=>{
    const files=[...(ev.target.files||[])];
    if(!files.length){ev.target.value='';return}
    try{
      for(const file of files){
        const item=await fileToUpload(file,null,true);
        if(!item)continue;
        item.projectFileId=fileId||'';
        item.projectImage=true;
        S.pendingUploads.push(item);projectPending.push(item);
        gallery.push(item.preview);S.dirty=true;
      }
      refreshGallery();
      toast(`${files.length} image${files.length===1?'':'s'} added.`);
    }catch(err){toast(`Could not read image: ${err.message}`)}
    finally{ev.target.value=''}
   };
   $('#pf',e).onsubmit=x=>{
    x.preventDefault();
    let fd=new FormData(x.target),v=Object.fromEntries(fd);
    v.featured=fd.has('featured');v.showLiveDemo=fd.has('showLiveDemo');
    v.tags=v.tags.split(',').map(s=>s.trim()).filter(Boolean);
    v.features=v.features.split('\n').map(s=>s.trim()).filter(Boolean);
    v.images=gallery.slice();v.image=v.images[0]||'';
    v.sortOrder=Number(v.sortOrder||99);
    if(!v.title)return toast('Project title is required');
    if(v.showLiveDemo&&!v.liveDemoUrl)return toast('Enter a live demo URL or disable the toggle');
    let i=fileId?S.data.projects.findIndex(q=>q._fileId===fileId):-1;
    if(i<0){
      v._fileId=`project-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      S.data.projects.push(v);
    }else{
      v._fileId=fileId;
      S.data.projects[i]=v;
    }
    projectPending.forEach(u=>{u.projectFileId=v._fileId;u.imageOrder=v.images.findIndex(url=>url===u.preview)});
    S.dirty=true;d.remove();render();toast('Project changes applied. Click Save draft in the top bar to keep them.');
   };
 });
}
function delProject(fileId){const project=S.data.projects.find(x=>x._fileId===fileId);if(!project||!confirm(`Delete ${project.title}?`))return;S.data.projects=S.data.projects.filter(x=>x._fileId!==fileId);S.deletedProjects.push(fileId);S.dirty=true;render()}function editTech(i){let t=i===undefined?{name:'',symbol:'',detail:''}:S.data.toolkit.technologies[i];let d=modal(i===undefined?'Add technology':'Edit technology',`<form id="tf">${f('Name','name',t.name)}${f('Symbol','symbol',t.symbol)}${f('Description','detail',t.detail)}<button class="btn primary">Save item</button></form>`,e=>$('#tf',e).onsubmit=x=>{x.preventDefault();let v=Object.fromEntries(new FormData(x.target));if(i===undefined)S.data.toolkit.technologies.push(v);else S.data.toolkit.technologies[i]=v;S.dirty=true;d.remove();render()})}async function upload(e){const files=[...(e.target.files||[])];let total=S.pendingUploads.reduce((n,x)=>n+x.bytes,0);for(const file of files){if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){toast(`${file.name}: use PNG, JPEG, WebP or GIF.`);continue}if(file.size>2.8*1024*1024||total+file.size>2.8*1024*1024){toast(`${file.name}: keep the combined images in this save under 2.8 MB.`);continue}try{const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=rej;r.readAsDataURL(file)});S.pendingUploads.push({name:file.name,type:file.type,base64:dataUrl.split(',')[1],preview:dataUrl,bytes:file.size});total+=file.size;S.dirty=true;}catch(err){toast(`Could not read ${file.name}: ${err.message}`)}}render();if(S.pendingUploads.length)toast('Images staged. Click Save draft to save them together with your content.');e.target.value=''}async function fileToUpload(file,replacePath=null,compress=false){
 if(!file)return null;
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){toast('Use PNG, JPEG, WebP or GIF images.');return null}
 let uploadFile=file;
 if(compress && file.type!=='image/gif'){
  try{
   const bitmap=await createImageBitmap(file);
   const maxSide=1920,scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d',{alpha:true});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));
   if(blob && blob.size<file.size)uploadFile=new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp',lastModified:Date.now()});
  }catch(err){console.warn('Project image compression skipped:',err)}
 }
 const total=S.pendingUploads.reduce((n,x)=>n+x.bytes,0);
 if(uploadFile.size>2.8*1024*1024||total+uploadFile.size>2.8*1024*1024){toast('After compression, keep combined image uploads under 2.8 MB per Save draft.');return null}
 const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=rej;r.readAsDataURL(uploadFile)});
 return {name:uploadFile.name,type:uploadFile.type,base64:dataUrl.split(',')[1],preview:dataUrl,bytes:uploadFile.size,replacePath,originalName:file.name,compressed:uploadFile!==file}
}
async function stageReplacement(file,path){try{const item=await fileToUpload(file,path);if(!item)return;S.pendingUploads.push(item);S.dirty=true;toast('Replacement staged. Save draft to apply it.');render()}catch(e){toast(`Could not read image: ${e.message}`)}}
async function stagePortrait(file){try{const item=await fileToUpload(file);if(!item)return;S.pendingUploads.push(item);S.dirty=true;const pendingUrl=item.preview;item.isPortrait=true;toast('New About photo selected. Save draft to upload and apply it.');render();const preview=$('#portrait-preview');if(preview)preview.src=pendingUrl}catch(e){toast(`Could not read image: ${e.message}`)}}
async function saveDraft(showToast=true,forPublish=false){
 if(!S.dirty&&!S.pendingUploads.length&&!S.deletedProjects.length&&!S.deletedMediaPaths.length){
  if(showToast)toast(S.data.hasDraft?'Your latest changes are already saved.':'There are no changes to save.');
  return true;
 }
 const steps=['Preparing content and project files','Preparing image uploads','Sending changes to GitHub','GitHub processing draft commit','Refreshing saved draft status'];
 progressModal(forPublish?'Preparing publication':'Saving draft',steps);
 const button=$('#save-global');if(button)button.disabled=true;
 try{
  progressStep(0);
  const files={'src/content/site.json':S.data.site,'src/content/about.json':S.data.about,'src/content/contact.json':S.data.contact,'src/content/toolkit.json':S.data.toolkit};
  S.data.projects.forEach(p=>{
    const {_fileId,...content}=p;
    delete content.slug;
    if(!_fileId)throw new Error(`Project "${p.title}" is missing its internal file ID. Reload the Admin before saving.`);
    files[`src/content/projects/${_fileId}.json`]=content;
   });
  progressStep(1);
  const uploads=S.pendingUploads.map(({name,type,base64,replacePath,isPortrait,projectFileId,projectImage,imageOrder})=>({name,type,base64,...(replacePath?{replacePath}:{}),...(isPortrait?{isPortrait:true}:{}),...(projectImage?{projectFileId,projectImage:true,imageOrder}: {})}));
  progressStep(2);
  progressStep(3);
  const r=await req('/api/admin/draft',{method:'POST',body:JSON.stringify({files,uploads,deletePaths:[...S.deletedProjects.map(fileId=>`src/content/projects/${fileId}.json`),...S.deletedMediaPaths]})});
  S.data.draftBranch=r.branch;S.data.hasDraft=true;S.dirty=false;S.deletedProjects=[];S.pendingUploads=[];S.deletedMediaPaths=[];
  progressStep(4);
  S.data=await req('/api/admin/content');
  if($('#draft-status'))$('#draft-status').innerHTML='<i class="dot"></i> Draft saved';
  if(!forPublish)progressDone();
  if(showToast)toast('Draft saved in one GitHub commit. Continue editing or publish when ready.');
  return true;
 }catch(e){progressFail(e);if(showToast)toast(`Could not save draft: ${e.message}`);return false}
 finally{const b=$('#save-global');if(b)b.disabled=false}
}
async function publishDraft(){
 if(!confirm('Publish the saved portfolio changes to your live website?'))return;
 const button=$('#publish-global');if(button)button.disabled=true;
 const needsSave=S.dirty||!S.data.hasDraft;
 if(!needsSave)progressModal('Publishing portfolio',['Validating saved draft','Merging changes into GitHub main','Triggering Vercel deployment','Refreshing publication status']);
 try{
  if(needsSave){const saved=await saveDraft(false,true);if(!saved)return;}
  progressModal('Publishing portfolio',['Validating saved draft','Merging changes into GitHub main','Triggering Vercel deployment','Refreshing publication status']);
  progressStep(0);
  progressStep(1);
  const result=await req('/api/admin/publish',{method:'POST',body:'{}'});
  progressStep(2);
  progressStep(3);
  S.data=await req('/api/admin/content');S.dirty=false;S.deletedProjects=[];render();
  progressDone();
  toast(result.message||'Portfolio changes merged. Vercel deployment may still be building.');
 }catch(e){progressFail(e);toast(`Publish failed: ${e.message}`)}
 finally{const b=$('#publish-global');if(b)b.disabled=false}
}
async function start(){try{let me=await req('/api/admin/me');if(!me.authenticated)return login();S.user=me.user;S.data=await req('/api/admin/content');S.page='overview';render()}catch(e){login(e.message)}}start();