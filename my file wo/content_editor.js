(function () {
'use strict';

const FILES = [
  'My location data/data.json',
  'My location data/vsa.json',
  'My location data/technical-analysis.json',
  'My location data/Time-analysis.json',
  'My location data/PDF-images.json'
];

const state = { item:null, owner:null, modal:null, busy:false, source:new Map(), timer:null };

const esc = v => String(v ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

function visible(el){
  if(!el) return false;
  const s=getComputedStyle(el);
  return s.display!=='none' && s.visibility!=='hidden';
}

function styles(){
  if(document.getElementById('mm-json-editor-style')) return;
  const s=document.createElement('style');
  s.id='mm-json-editor-style';
  s.textContent=`
.mm-json-add-btn{appearance:none;border:1px solid rgba(56,189,248,.45);background:rgba(56,189,248,.10);color:#67e8f9;border-radius:8px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;transition:.2s;white-space:nowrap;margin-inline-start:8px}
.mm-json-add-btn:hover{background:rgba(56,189,248,.18);transform:translateY(-1px)}
.mm-editor-overlay{position:fixed;inset:0;z-index:200000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(5px);direction:rtl}
.mm-editor-dialog{width:min(560px,96vw);max-height:90vh;overflow:auto;background:#15161c;border:1px solid #303544;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.6);color:#f1f5f9}
.mm-editor-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #272a34}
.mm-editor-head h3{margin:0;font-size:16px;color:#67e8f9}
.mm-editor-close{border:0;background:transparent;color:#aab1bd;font-size:20px;cursor:pointer}
.mm-editor-body{padding:18px}.mm-editor-label{display:block;margin:0 0 7px;color:#cbd5e1;font-size:12px;font-weight:700}
.mm-editor-input,.mm-editor-select{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #343946;border-radius:10px;outline:none;background:#0f1117;color:#f8fafc;font:inherit;margin-bottom:13px}
.mm-editor-input:focus,.mm-editor-select:focus{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.12)}
.mm-editor-hint{margin:-3px 0 13px;color:#7d8797;font-size:11px;line-height:1.6}
.mm-editor-target{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:#0c0f15;border:1px solid #252a35;color:#aeb8c7;font-size:11px;line-height:1.6}
.mm-editor-actions{display:flex;gap:8px;justify-content:flex-start;margin-top:6px}.mm-editor-action{border:0;border-radius:10px;padding:10px 15px;cursor:pointer;font-weight:700}
.mm-editor-save{background:#0891b2;color:#fff}.mm-editor-cancel{background:#252936;color:#d1d5db}
.mm-editor-save:disabled,.mm-editor-cancel:disabled{opacity:.55;cursor:wait}
.mm-editor-status{margin-top:10px;min-height:18px;color:#94a3b8;font-size:11px;white-space:pre-wrap}
`;
  document.head.appendChild(s);
}

function addBtn(label, fn){
  const b=document.createElement('button');
  b.type='button'; b.className='mm-json-add-btn'; b.textContent=label;
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn();});
  return b;
}

function addHeader(id,key,label,fn){
  const h=document.querySelector('#'+id+' h3');
  if(!h || h.querySelector('[data-mm-editor="'+key+'"]')) return;
  h.style.display='flex'; h.style.alignItems='center'; h.style.justifyContent='space-between'; h.style.gap='8px';
  const b=addBtn(label,fn); b.dataset.mmEditor=key; h.appendChild(b);
}

function allItems(){
  try { if(typeof allData!=='undefined' && Array.isArray(allData)) return allData; } catch(_){}
  return [];
}

function findItem(){
  const title=document.getElementById('modalTitle')?.textContent?.trim();
  if(state.item && (!title || String(state.item.title||'').trim()===title)) return state.item;
  const data=allItems();
  return data.find(x=>String(x.title||'').trim()===title) || state.item;
}

function thematicOwner(){ return state.owner || findItem(); }

function allVideos(owner){
  const data=allItems();
  const ordered=owner ? [owner,...data.filter(x=>x!==owner)] : data;
  const out=[], seen=new Set();
  ordered.forEach(item=>{
    if(!Array.isArray(item?.videos)) return;
    item.videos.forEach((video,index)=>{
      const id=String(video?.id||'').trim();
      if(!id || seen.has(id)) return;
      seen.add(id);
      out.push({id,video,item,index,sourceTitle:String(item.title||'').trim()});
    });
  });
  return out;
}

function activeVideo(item){
  const b=document.querySelector('#playlistContainer .chapter-row-btn.active');
  if(b){
    const rawId=String(b.id||'');
    const prefix='playlist-item-';
    if(rawId.startsWith(prefix)){
      const idx=Number(rawId.slice(prefix.length));
      if(Number.isInteger(idx) && idx>=0 && item?.videos?.[idx])
        return {index:idx,video:item.videos[idx],item};
    }
  }

  try {
    if (typeof UnifiedPlayer !== 'undefined') {
      if (UnifiedPlayer.currentType==='youtube' && UnifiedPlayer.apiPlayer && typeof UnifiedPlayer.apiPlayer.getVideoData==='function') {
        const id=String(UnifiedPlayer.apiPlayer.getVideoData()?.video_id||'').trim();
        if(id && Array.isArray(item?.videos)){
          const hit=item.videos.findIndex(v=>extractYouTubeId(v?.url||v?.videoUrl||'')===id);
          if(hit>=0) return {index:hit,video:item.videos[hit],item};
        }
      }
      if (UnifiedPlayer.currentType==='html5' && UnifiedPlayer.element && Array.isArray(item?.videos)) {
        const current=String(UnifiedPlayer.element.currentSrc||UnifiedPlayer.element.src||'').split('?')[0];
        const hit=item.videos.findIndex(v=>String(v?.videoDirectUrl||v?.url||v?.videoUrl||'').split('?')[0]===current);
        if(hit>=0) return {index:hit,video:item.videos[hit],item};
      }
    }
  } catch(_) {}

  if (item?.videos?.length===1) return {index:0,video:item.videos[0],item};
  return null;
}

function extractYouTubeId(url){
  try{
    const u=new URL(String(url||'').trim());
    const host=u.hostname.toLowerCase();
    if(host==='youtu.be') return u.pathname.split('/').filter(Boolean)[0]||'';
    if(host==='youtube.com'||host==='www.youtube.com'||host.endsWith('.youtube.com')){
      return u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop() || '';
    }
  }catch(_){}
  return '';
}

async function getCurrentPlaybackSeconds(){
  try{
    if(typeof UnifiedPlayer==='undefined') return null;
    if(UnifiedPlayer.currentType==='youtube' && UnifiedPlayer.apiPlayer && typeof UnifiedPlayer.apiPlayer.getCurrentTime==='function'){
      const n=Number(UnifiedPlayer.apiPlayer.getCurrentTime());
      return Number.isFinite(n)?Math.max(0,Math.floor(n)):null;
    }
    if(UnifiedPlayer.currentType==='vimeo' && UnifiedPlayer.apiPlayer && typeof UnifiedPlayer.apiPlayer.getCurrentTime==='function'){
      const n=Number(await UnifiedPlayer.apiPlayer.getCurrentTime());
      return Number.isFinite(n)?Math.max(0,Math.floor(n)):null;
    }
    if(UnifiedPlayer.currentType==='facebook' && UnifiedPlayer.apiPlayer){
      const fn=UnifiedPlayer.apiPlayer.getCurrentPosition||UnifiedPlayer.apiPlayer.getCurrentTime;
      if(typeof fn==='function'){
        const n=Number(await fn.call(UnifiedPlayer.apiPlayer));
        return Number.isFinite(n)?Math.max(0,Math.floor(n)):null;
      }
    }
    if(UnifiedPlayer.currentType==='html5' && UnifiedPlayer.element){
      const n=Number(UnifiedPlayer.element.currentTime);
      return Number.isFinite(n)?Math.max(0,Math.floor(n)):null;
    }
  }catch(_){}
  return null;
}

function formatPlaybackTime(seconds){
  const s=Math.max(0,Math.floor(Number(seconds)||0));
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  if(h>0) return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}

async function sourceFile(item){
  if(!item?.id) throw new Error('لم يتم تحديد الدورة الحالية.');
  const id=String(item.id);
  if(state.source.has(id)) return state.source.get(id);

  const fixed={
    vsa:'My location data/vsa.json',
    technical:'My location data/technical-analysis.json',
    time:'My location data/Time-analysis.json'
  };
  const prefix=id.startsWith('technical-')?'technical':id.startsWith('time-')?'time':id.startsWith('vsa-')?'vsa':null;
  if(prefix){
    const f=fixed[prefix];
    const raw=await getGithubFileContent(f);
    const data=JSON.parse(raw);
    if(Array.isArray(data) && data.some(x=>String(x?.id)===id)){state.source.set(id,f);return f;}
  }

  for(const f of FILES){
    try{
      const raw=await getGithubFileContent(f);
      const data=JSON.parse(raw);
      if(Array.isArray(data) && data.some(x=>String(x?.id)===id)){state.source.set(id,f);return f;}
    }catch(_){}
  }
  throw new Error(`لم أجد السجل "${id}" داخل ملفات My location data.`);
}

async function readJson(file){
  const raw=await getGithubFileContent(file);
  if(!raw || typeof raw!=='string' || raw.startsWith('❌')) throw new Error(raw||'تعذر قراءة ملف JSON.');
  let data;
  try{data=JSON.parse(raw)}catch(e){throw new Error('ملف JSON غير صالح: '+e.message);}
  if(!Array.isArray(data)) throw new Error('بنية JSON غير متوقعة: الجذر يجب أن يكون مصفوفة.');
  return data;
}

async function saveJson(file,data,message){
  const result=await writeFile(file,JSON.stringify(data,null,2)+'\\n',message);
  if(typeof result!=='string' || !result.startsWith('✅')) throw new Error(result||'فشل حفظ ملف JSON.');
  return result;
}

function dialog(title,target,html,submit){
  styles();
  if(state.modal) state.modal.remove();
  const o=document.createElement('div');
  o.className='mm-editor-overlay';
  o.innerHTML=`
    <div class="mm-editor-dialog" role="dialog" aria-modal="true">
      <div class="mm-editor-head"><h3>${esc(title)}</h3><button type="button" class="mm-editor-close">✕</button></div>
      <div class="mm-editor-body">
        <div class="mm-editor-target">${target}</div>
        <form class="mm-editor-form">${html}
          <div class="mm-editor-actions">
            <button type="submit" class="mm-editor-action mm-editor-save">حفظ في ملف JSON</button>
            <button type="button" class="mm-editor-action mm-editor-cancel">إلغاء</button>
          </div>
          <div class="mm-editor-status" aria-live="polite"></div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(o); state.modal=o;

  const close=()=>{o.remove();state.modal=null;state.busy=false;};
  o.querySelector('.mm-editor-close').onclick=close;
  o.querySelector('.mm-editor-cancel').onclick=close;
  o.onclick=e=>{if(e.target===o)close();};

  o.querySelector('.mm-editor-form').addEventListener('submit',async e=>{
    e.preventDefault();
    if(state.busy) return;
    state.busy=true;
    const form=e.currentTarget, save=form.querySelector('.mm-editor-save'), cancel=form.querySelector('.mm-editor-cancel'), status=form.querySelector('.mm-editor-status');
    save.disabled=true; cancel.disabled=true; status.textContent='⏳ جارٍ قراءة الملف وتحديثه...';
    try{await submit(new FormData(form),status)}catch(err){
      status.textContent='❌ '+(err?.message||String(err)); save.disabled=false; cancel.disabled=false;
    }finally{state.busy=false;}
  });
  return o;
}

function validUrl(v){
  try{const u=new URL(String(v||'').trim());return u.protocol==='http:'||u.protocol==='https:';}catch(_){return false;}
}
function validTime(v){return /^\\d{1,3}:\\d{2}(?::\\d{2})?$/.test(String(v||'').trim());}

function nextVideoId(item){
  const used=new Set((item?.videos||[]).map(v=>String(v?.id||'')));
  const base=String(item.id||'video');
  let n=1; while(used.has(base+'-'+n)) n++;
  return base+'-'+n;
}

function updateLive(item){
  state.item=item;
  const opener=typeof openDetails==='function'?openDetails:null;
  if(opener) opener(item.id);
}

async function mutate(item,index,message,fn,refresh=true){
  const file=await sourceFile(item);
  const data=await readJson(file);
  const row=data.find(x=>x&&String(x.id)===String(item.id));
  if(!row) throw new Error(`لم يتم العثور على ${item.id} داخل ${file}.`);
  fn(row);
  await saveJson(file,data,message);

  try{Object.assign(item,JSON.parse(JSON.stringify(row)));}catch(_){}
  if(refresh) updateLive(item);
  return file;
}

function lessonEditor(){
  const item=findItem();
  if(!item) return alert('افتح بطاقة الدورة أولاً.');
  const html=`
    <label class="mm-editor-label">اسم الدرس</label>
    <input class="mm-editor-input" name="title" maxlength="240" required placeholder="مثال: المحاضرة الثالثة عشر">
    <label class="mm-editor-label">رابط الدرس</label>
    <input class="mm-editor-input" name="url" maxlength="2000" required dir="ltr" placeholder="https://youtu.be/...">
    <div class="mm-editor-hint">سيُضاف إلى <code>videos[]</code> في نفس ملف JSON للدورة، مع <code>chapters: []</code> وبنفس ترتيب الحقول الحالي.</div>`;
  dialog('📚 إضافة درس جديد',`الدورة: <b>${esc(item.title||item.id)}</b><br>الحفظ سيكون في ملف JSON الأصلي نفسه.`,html,async(fd,status)=>{
    const title=String(fd.get('title')||'').trim(), url=String(fd.get('url')||'').trim();
    if(!title) throw new Error('اكتب اسم الدرس.');
    if(!validUrl(url)) throw new Error('رابط الدرس يجب أن يبدأ بـ http:// أو https://.');
    if((item.videos||[]).some(v=>String(v?.url||'').trim()===url)) throw new Error('هذا الرابط موجود بالفعل في قائمة الدروس.');
    if(!confirm(`سيُضاف الدرس:\\n\\n${title}\\n${url}\\n\\nهل تريد حفظه في ملف JSON؟`)){status.textContent='تم إلغاء الحفظ.';return;}
    status.textContent='⏳ يتم الحفظ عبر GitHub/Bridge...';
    const file=await mutate(item,-1,'📚 إضافة درس جديد من واجهة VSA Academy',row=>{
      if(!Array.isArray(row.videos)) row.videos=[];
      row.videos.push({id:nextVideoId(row),title,url,chapters:[]});
    });
    status.textContent='✅ تمت إضافة الدرس إلى '+file;
    setTimeout(()=>{if(state.modal){state.modal.remove();state.modal=null;}},500);
  });
}

function thematicEditor(topicIndex){
  const item=thematicOwner(), topic=item?.thematic_index?.[topicIndex];
  if(!item||!topic) return alert('تعذر تحديد الفهرس الموضوعي.');
  const catalog=allVideos(item);
  if(!catalog.length) return alert('لا توجد مصادر فيديو متاحة لاختيار المصدر.');
  const current=activeVideo(findItem())?.video?.id || '';
  const opts=catalog.map((entry,i)=>{
    const selected=String(entry.id)===String(current)?' selected':'';
    const label=entry.sourceTitle ? `${entry.sourceTitle} › ${entry.video?.title||entry.id}` : (entry.video?.title||entry.id);
    return `<option value="${esc(entry.id)}"${selected}>${esc(label)} — ${esc(entry.id)}</option>`;
  }).join('');
  const html=`
    <label class="mm-editor-label">مصدر الفيديو</label>
    <select class="mm-editor-select" name="videoId" required>${opts}</select>
    <label class="mm-editor-label">الطابع الزمني</label>
    <input class="mm-editor-input" name="time" required maxlength="12" dir="ltr" placeholder="05:30">
    <label class="mm-editor-label">العنوان</label>
    <input class="mm-editor-input" name="text" required maxlength="500" placeholder="عنوان النقطة أو الموضوع">
    <div class="mm-editor-hint">سيُحفظ السجل بنفس الصيغة الحالية: <code>{ video_id, time, text }</code> داخل <code>thematic_index[].chapters[]</code>، لذلك يمكن جمع مصادر فيديو متعددة في الموضوع نفسه.</div>`;
  dialog('🧠 إضافة طابع إلى الفهرس الموضوعي',`الموضوع: <b>${esc(topic.topic_name||('الموضوع '+(topicIndex+1)))}</b><br>سيتم التعديل في نفس ملف JSON للدورة.`,html,async(fd,status)=>{
    const videoId=String(fd.get('videoId')||'').trim(), time=String(fd.get('time')||'').trim(), text=String(fd.get('text')||'').trim();
    if(!videoId) throw new Error('اختر مصدر الفيديو.');
    if(!validTime(time)) throw new Error('الوقت غير صالح. استخدم MM:SS أو H:MM:SS.');
    if(!text) throw new Error('اكتب عنوان الطابع الزمني.');
    if(!confirm(`سيُضاف إلى "${topic.topic_name||''}":\\n\\n${time} — ${text}\\nالمصدر: ${videoId}\\n\\nهل تريد الحفظ؟`)){status.textContent='تم إلغاء الحفظ.';return;}
    status.textContent='⏳ يتم حفظ الطابع في الفهرس الموضوعي...';
    const file=await mutate(item,-1,'🧠 إضافة طابع إلى الفهرس الموضوعي من واجهة VSA Academy',row=>{
      if(!Array.isArray(row.thematic_index)) row.thematic_index=[];
      const t=row.thematic_index[topicIndex];
      if(!t) throw new Error('الموضوع غير موجود في ملف JSON.');
      if(!Array.isArray(t.chapters)) t.chapters=[];
      t.chapters.push({video_id:videoId,time,text});
    });
    status.textContent='✅ تمت إضافة الطابع إلى '+file;
    setTimeout(()=>{if(state.modal){state.modal.remove();state.modal=null;}},500);
  });
  getCurrentPlaybackSeconds().then(sec=>{
    const input=state.modal?.querySelector('input[name="time"]');
    if(input && sec!==null) input.value=formatPlaybackTime(sec);
  });

}

function thematicSeriesEditor(){
  const item=thematicOwner();
  if(!item) return alert('افتح بطاقة الدورة أولاً.');

  const html=\`
    <label class="mm-editor-label">اسم السلسلة / الموضوع</label>
    <input class="mm-editor-input" name="topicName" maxlength="240" required placeholder="مثال: 🔥 سلسلة حجم التداول العالي (High Volume)">
    <div class="mm-editor-hint">ستُضاف كسلسلة جديدة داخل <code>thematic_index[]</code> بنفس البنية الحالية، وتبدأ بقائمة <code>chapters: []</code>.</div>\`;

  dialog(
    '🧠 إضافة سلسلة جديدة',
    \`الدورة: <b>\${esc(item.title||item.id)}</b><br>سيتم إنشاء سلسلة جديدة داخل نفس ملف JSON.\`,
    html,
    async(fd,status)=>{
      const topicName=String(fd.get('topicName')||'').trim();
      if(!topicName) throw new Error('اكتب اسم السلسلة.');
      if(Array.isArray(item.thematic_index)&&item.thematic_index.some(t=>String(t?.topic_name||'').trim()===topicName))
        throw new Error('هذه السلسلة موجودة بالفعل.');
      if(!confirm(\`ستُضاف سلسلة جديدة:\\n\\n\${topicName}\\n\\nهل تريد حفظها؟\`)){
        status.textContent='تم إلغاء الحفظ.'; return;
      }
      status.textContent='⏳ يتم إنشاء السلسلة في JSON...';
      const file=await mutate(item,-1,'🧠 إضافة سلسلة جديدة إلى الفهرس الموضوعي',row=>{
        if(!Array.isArray(row.thematic_index)) row.thematic_index=[];
        row.thematic_index.push({topic_name:topicName,chapters:[]});
      });
      status.textContent='✅ تمت إضافة السلسلة إلى '+file;
      setTimeout(()=>{if(state.modal){state.modal.remove();state.modal=null;}},500);
    }
  );
}

async function chapterEditor(){
  const currentItem=findItem();
  const av=activeVideo(currentItem);
  if(!currentItem||!av) return alert('اختر درساً من قائمة الدروس أو شغّل فيديو الدرس أولاً.');

  const html=\`
    <label class="mm-editor-label">الطابع الزمني</label>
    <input class="mm-editor-input" name="time" required maxlength="12" dir="ltr" placeholder="12:35">
    <label class="mm-editor-label">العنوان</label>
    <input class="mm-editor-input" name="text" required maxlength="500" placeholder="عنوان الفصل أو النقطة">
    <div class="mm-editor-hint">تمت تعبئة الوقت تلقائياً من موضع الفيديو الحالي. ويمكنك تعديله يدوياً قبل الحفظ.<br>سيُحفظ بنفس الصيغة <code>{ time, text }</code> داخل <code>videos[].chapters[]</code>.</div>\`;

  const modal=dialog(
    '⏱️ إضافة فصل / طابع زمني',
    \`الدرس الحالي: <b>\${esc(av.video.title||av.video.id)}</b><br>سيتم الحفظ في نفس ملف JSON.\`,
    html,
    async(fd,status)=>{
      const time=String(fd.get('time')||'').trim();
      const text=String(fd.get('text')||'').trim();
      if(!validTime(time)) throw new Error('الوقت غير صالح. استخدم MM:SS أو H:MM:SS.');
      if(!text) throw new Error('اكتب عنوان الفصل.');
      if(!confirm(\`سيُضاف للفيديو "\${av.video.title||av.video.id}":\\n\\n\${time} — \${text}\\n\\nهل تريد الحفظ؟\`)){
        status.textContent='تم إلغاء الحفظ.'; return;
      }
      status.textContent='⏳ يتم حفظ الفصل في JSON...';
      const file=await mutate(av.item||currentItem,av.index,'⏱️ إضافة فصل جديد من واجهة VSA Academy',row=>{
        const video=row.videos?.[av.index];
        if(!video) throw new Error('الفيديو المحدد غير موجود في ملف JSON.');
        if(!Array.isArray(video.chapters)) video.chapters=[];
        video.chapters.push({time,text});
      });
      status.textContent='✅ تمت إضافة الفصل إلى '+file;
      setTimeout(()=>{if(state.modal){state.modal.remove();state.modal=null;}},500);
    }
  );

  getCurrentPlaybackSeconds().then(sec=>{
    const input=modal?.querySelector('input[name="time"]');
    if(input && sec!==null) input.value=formatPlaybackTime(sec);
  });
}

function sync(){
  styles();
  const modal=document.getElementById('myModal');
  if(!modal||!visible(modal)) return;
  const item=findItem();
  if(!item) return;
  state.item=item;
  const owner=thematicOwner();
  const av=activeVideo(item);

  if(visible(document.getElementById('playlistSection')))
    addHeader('playlistSection','lesson','➕ إضافة درس',lessonEditor);

  if(av && document.getElementById('chaptersSection')){
    const chaptersSection=document.getElementById('chaptersSection');
    chaptersSection.style.display='block';
    addHeader('chaptersSection','chapter','➕ إضافة طابع',chapterEditor);
  }

  const thematicSection=document.getElementById('thematicSection');
  if(owner?.videos?.length && thematicSection){
    thematicSection.style.display='block';
    addHeader('thematicSection','series','➕ إضافة سلسلة',thematicSeriesEditor);
  }

  if(visible(thematicSection)&&Array.isArray(owner?.thematic_index)){
    document.querySelectorAll('#thematicContainer > div > h4').forEach((h,i)=>{
      if(owner.thematic_index[i]&&!h.querySelector('[data-mm-topic]')){
        const b=addBtn('➕ إضافة طابع',()=>thematicEditor(i));
        b.dataset.mmTopic=String(i);
        h.appendChild(b);
      }
    });
  }
}

function hook(){
  if(typeof openDetails==='function' && typeof window.openDetails==='function' && !window.openDetails.__mmJsonEditorWrapped){
    const original=window.openDetails;
    const wrapped=function(id,...args){
      const result=original.call(this,id,...args);
      try{
        if(typeof allData!=='undefined'&&Array.isArray(allData)) {
          state.item=allData.find(x=>String(x.id)===String(id))||state.item;
          state.owner=state.item;
        }
      }catch(_){}
      setTimeout(sync,80);
      return result;
    };
    wrapped.__mmJsonEditorWrapped=true;
    window.openDetails=wrapped;
  }

  const modal=document.getElementById('myModal');
  if(modal&&!modal.__mmJsonEditorObserver){
    const ob=new MutationObserver(()=>{clearTimeout(state.timer);state.timer=setTimeout(sync,60);});
    ob.observe(modal,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
    modal.__mmJsonEditorObserver=ob;
  }
  document.addEventListener('click',()=>{clearTimeout(state.timer);state.timer=setTimeout(sync,60)},true);
  window.addEventListener('hashchange',()=>setTimeout(sync,100));
}

function init(){
  styles(); hook(); setTimeout(hook,300); setTimeout(sync,500);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();

window.mastermindJsonEditor={version:'1.3.0',refresh:sync,close:()=>state.modal?.remove()};
})();