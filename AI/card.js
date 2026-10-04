(function(){
'use strict';

const CONFIG={
  repo:'ahmedwwaw1/my',
  path:'AI/data.json',
  bridge:'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge',
  publicKey:(typeof window.__SUPABASE_PUBLIC_KEY__==='string'&&window.__SUPABASE_PUBLIC_KEY__)||
    'sb_publishable_cxalSwUizaYa60BVEcV0eA_UBJ02cws'
};

const params=new URLSearchParams(location.search);
const cardId=String(params.get('id')||'');
const root=document.getElementById('cardDetail');
const status=document.getElementById('detailStatus');
const linkModal=document.getElementById('linkModal');
const linkForm=document.getElementById('linkForm');
const linkStatus=document.getElementById('linkFormStatus');
const saveLinkBtn=document.getElementById('saveLinkBtn');
const linkImageFileInput=linkForm.elements.linkImageFile;
const linkImagePreview=document.getElementById('linkImagePreview');

let items=[];
let card=null;
let editingIndex=-1;

function validUrl(v){
  try{
    const u=new URL(String(v||'').trim());
    return u.protocol==='http:'||u.protocol==='https:';
  }catch(_){return false;}
}

function fileToBase64(file){
  return new Promise(function(resolve,reject){
    const reader=new FileReader();
    reader.onload=function(){
      const value=String(reader.result||'');
      const comma=value.indexOf(',');
      if(comma<0){reject(new Error('تعذر قراءة الصورة.'));return;}
      resolve(value.slice(comma+1));
    };
    reader.onerror=function(){reject(new Error('فشل قراءة الصورة من الجهاز.'));};
    reader.readAsDataURL(file);
  });
}

function fileExtension(name,type){
  const lower=String(name||'').toLowerCase();
  const map={png:'.png',jpg:'.jpg',jpeg:'.jpg',webp:'.webp',gif:'.gif'};
  for(const key in map) if(lower.endsWith('.'+key)) return map[key];
  const byType={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'};
  return byType[type]||'.png';
}

async function bridgeGithub(path,method,body){
  const res=await fetch(CONFIG.bridge,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+CONFIG.publicKey,
      'apikey':CONFIG.publicKey
    },
    body:JSON.stringify({
      action:'github',
      endpoint:'https://api.github.com/repos/'+CONFIG.repo+'/contents/'+path,
      method:method,
      body:body
    })
  });
  const text=await res.text();
  let data=null;
  try{data=JSON.parse(text)}catch(_){data={error:text}};
  if(!res.ok) throw new Error(data&&data.error||data&&data.message||('Bridge HTTP '+res.status));
  return data;
}

async function readJson(){
  const url='https://raw.githubusercontent.com/'+CONFIG.repo+'/main/'+CONFIG.path+'?_v='+Date.now();
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data)) throw new Error('بنية JSON غير صالحة.');
  return data;
}

async function saveJson(nextItems){
  const current=await bridgeGithub(CONFIG.path,'GET');
  const sha=current&&current.sha;
  if(!sha) throw new Error('تعذر الحصول على SHA لملف JSON.');
  const content=JSON.stringify(nextItems,null,2)+'\n';
  const saved=await bridgeGithub(CONFIG.path,'PUT',{
    message:editingIndex>=0?'✏️ تعديل رابط في بطاقة AI':'🔗 إضافة رابط إلى بطاقة AI',
    content:btoa(unescape(encodeURIComponent(content))),
    sha:sha
  });
  if(!saved||!saved.content) throw new Error('GitHub لم يؤكد حفظ ملف JSON.');
}

async function uploadImage(path,base64){
  const saved=await bridgeGithub(path,'PUT',{
    message:'🔗 رفع صورة لرابط بطاقة AI',
    content:base64
  });
  if(!saved||!saved.content) throw new Error('GitHub لم يؤكد رفع صورة الرابط.');
}

function normalizeLinks(item){
  if(Array.isArray(item.links)){
    return item.links.map(function(link){
      return {
        title:String(link&&link.title||''),
        url:String(link&&link.url||''),
        image:String(link&&link.image||'')
      };
    });
  }
  if(item&&item.url){
    return [{
      title:String(item.linkTitle||'الرابط'),
      url:String(item.url||''),
      image:String(item.linkImage||'')
    }];
  }
  return [];
}

function renderCard(){
  root.innerHTML='';

  const article=document.createElement('article');
  article.className='detail-card';

  if(card.image){
    const img=document.createElement('img');
    img.className='detail-card-image';
    img.src=String(card.image);
    img.alt=String(card.title||'');
    img.loading='eager';
    article.appendChild(img);
  }

  const body=document.createElement('div');
  body.className='detail-card-body';

  const title=document.createElement('h1');
  title.textContent=String(card.title||'بدون عنوان');
  body.appendChild(title);

  if(String(card.content||'').trim()){
    const content=document.createElement('p');
    content.className='detail-card-content';
    content.textContent=String(card.content||'');
    body.appendChild(content);
  }

  article.appendChild(body);
  root.appendChild(article);
}

function renderLinks(){
  const linksGrid=document.getElementById('linksGrid');
  linksGrid.innerHTML='';
  const links=normalizeLinks(card);

  if(!links.length){
    document.getElementById('linksEmpty').hidden=false;
    return;
  }
  document.getElementById('linksEmpty').hidden=true;

  const frag=document.createDocumentFragment();
  links.forEach(function(link,index){
    const wrap=document.createElement('div');
    wrap.className='detail-link-row';

    const a=document.createElement('a');
    a.className='detail-link-card';
    a.href=String(link.url||'#');
    a.target='_blank';
    a.rel='noopener noreferrer';

    if(link.image){
      const img=document.createElement('img');
      img.className='detail-link-image';
      img.src=String(link.image);
      img.alt=String(link.title||'الرابط');
      img.loading='lazy';
      img.addEventListener('error',function(){
        img.style.display='none';
      });
      a.appendChild(img);
    }

    const body=document.createElement('span');
    body.className='detail-link-body';

    const title=document.createElement('strong');
    title.textContent=String(link.title||'فتح الرابط');
    body.appendChild(title);

    const urlText=document.createElement('span');
    urlText.className='detail-link-url';
    urlText.textContent=String(link.url||'');
    body.appendChild(urlText);

    const openText=document.createElement('span');
    openText.className='detail-link-open';
    openText.textContent='فتح في صفحة جديدة ↗';
    body.appendChild(openText);

    a.appendChild(body);
    wrap.appendChild(a);

    const actions=document.createElement('div');
    actions.className='detail-link-actions';

    const edit=document.createElement('button');
    edit.type='button';
    edit.className='edit-link-btn';
    edit.textContent='✏️ تعديل';
    edit.addEventListener('click',function(){openLinkModal(index);});

    const del=document.createElement('button');
    del.type='button';
    del.className='delete-link-btn';
    del.textContent='🗑️ حذف';
    del.addEventListener('click',function(){deleteLink(index);});

    actions.appendChild(edit);
    actions.appendChild(del);
    wrap.appendChild(actions);

    frag.appendChild(wrap);
  });

  linksGrid.appendChild(frag);
}

function openLinkModal(index){
  editingIndex=index;
  const links=normalizeLinks(card);
  const link=links[index]||{title:'',url:'',image:''};

  linkModal.hidden=false;
  linkForm.elements.linkTitle.value=link.title;
  linkForm.elements.linkUrl.value=link.url;
  linkForm.elements.linkImage.value=link.image;
  linkImageFileInput.value='';
  linkStatus.textContent='';
  document.getElementById('linkDialogTitle').textContent=index>=0?'✏️ تعديل الرابط':'🔗 إنشاء رابط';
  updateLinkPreview();
  setTimeout(function(){linkForm.elements.linkTitle.focus()},0);
}

function closeLinkModal(){
  linkModal.hidden=true;
  linkForm.reset();
  linkStatus.textContent='';
  editingIndex=-1;
  updateLinkPreview();
}

function updateLinkPreview(){
  const file=linkImageFileInput.files&&linkImageFileInput.files[0];
  const typed=String(linkForm.elements.linkImage.value||'').trim();
  const src=file?URL.createObjectURL(file):typed;

  linkImagePreview.innerHTML='';
  if(!src){
    linkImagePreview.hidden=true;
    return;
  }

  linkImagePreview.hidden=false;
  const img=document.createElement('img');
  img.src=src;
  img.alt='معاينة صورة الرابط';
  const span=document.createElement('span');
  span.textContent=file?file.name:'معاينة صورة الرابط';
  linkImagePreview.appendChild(img);
  linkImagePreview.appendChild(span);
}

async function deleteLink(index){
  const links=normalizeLinks(card);
  if(!links[index])return;
  if(!confirm('هل تريد حذف هذا الرابط من البطاقة؟'))return;

  status.textContent='⏳ يتم حذف الرابط...';
  try{
    links.splice(index,1);
    card.links=links;
    delete card.url;
    delete card.linkTitle;
    delete card.linkImage;

    if(links[0]){
      card.url=links[0].url;
      card.linkTitle=links[0].title;
      card.linkImage=links[0].image;
    }

    await saveJson(items);
    status.textContent='✅ تم حذف الرابط.';
    renderLinks();
  }catch(error){
    status.textContent='❌ '+(error&&error.message||String(error));
  }
}

document.getElementById('backToAI').addEventListener('click',function(){
  location.href='AI.html';
});
document.getElementById('addLinkBtn').addEventListener('click',function(){
  openLinkModal(-1);
});
document.getElementById('closeLinkModal').addEventListener('click',closeLinkModal);
document.getElementById('cancelLinkBtn').addEventListener('click',closeLinkModal);
linkModal.addEventListener('click',function(e){
  if(e.target===linkModal)closeLinkModal();
});
linkForm.elements.linkImage.addEventListener('input',updateLinkPreview);
linkImageFileInput.addEventListener('change',updateLinkPreview);

linkForm.addEventListener('submit',async function(e){
  e.preventDefault();

  const title=String(linkForm.elements.linkTitle.value||'').trim();
  const url=String(linkForm.elements.linkUrl.value||'').trim();
  const imageUrl=String(linkForm.elements.linkImage.value||'').trim();
  const imageFile=linkImageFileInput.files&&linkImageFileInput.files[0] ? linkImageFileInput.files[0] : null;

  if(!title){linkStatus.textContent='❌ اكتب عنوان الرابط.';return;}
  if(!validUrl(url)){linkStatus.textContent='❌ رابط الموقع غير صالح.';return;}
  if(imageUrl&&!validUrl(imageUrl)){linkStatus.textContent='❌ رابط صورة الرابط غير صالح.';return;}
  if(imageFile){
    if(!imageFile.type.startsWith('image/')){linkStatus.textContent='❌ الملف المحدد ليس صورة.';return;}
    if(imageFile.size>4*1024*1024){linkStatus.textContent='❌ حجم صورة الرابط يجب ألا يتجاوز 4MB.';return;}
  }

  saveLinkBtn.disabled=true;
  linkStatus.textContent='⏳ حفظ الرابط...';

  try{
    const links=normalizeLinks(card);
    let finalImage=imageUrl;

    if(imageFile){
      linkStatus.textContent='⏳ يتم رفع صورة الرابط إلى AI/images/...';
      const base64=await fileToBase64(imageFile);
      const ext=fileExtension(imageFile.name,imageFile.type);
      const safeName='link-'+Date.now()+ext;
      await uploadImage('AI/images/'+safeName,base64);
      finalImage='images/'+safeName;
    }

    const entry={title:title,url:url,image:finalImage};
    if(editingIndex>=0) links[editingIndex]=entry;
    else links.push(entry);

    card.links=links;
    card.url=links[0] ? links[0].url : '';
    card.linkTitle=links[0] ? links[0].title : '';
    card.linkImage=links[0] ? links[0].image : '';

    await saveJson(items);
    renderLinks();
    closeLinkModal();
    status.textContent='✅ تم حفظ الرابط بنجاح.';
  }catch(error){
    linkStatus.textContent='❌ '+(error&&error.message||String(error));
  }finally{
    saveLinkBtn.disabled=false;
  }
});

(async function(){
  try{
    if(!cardId) throw new Error('معرّف البطاقة غير موجود.');
    status.textContent='⏳ جارٍ تحميل البطاقة...';
    items=await readJson();
    card=items.find(function(item){return String(item&&item.id||'')===cardId;});
    if(!card) throw new Error('لم يتم العثور على البطاقة.');
    renderCard();
    renderLinks();
    status.textContent='';
  }catch(error){
    status.textContent='❌ '+(error&&error.message||String(error));
  }
})();
})();
