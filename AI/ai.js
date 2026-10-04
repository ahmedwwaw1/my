(function(){
'use strict';

const CONFIG={
  repo:'ahmedwwaw1/my',
  path:'AI/data.json',
  bridge:'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge',
  publicKey:(typeof window.__SUPABASE_PUBLIC_KEY__==='string'&&window.__SUPABASE_PUBLIC_KEY__)||
    'sb_publishable_cxalSwUizaYa60BVEcV0eA_UBJ02cws'
};

const grid=document.getElementById('sectionGrid');
const status=document.getElementById('sectionStatus');
const modal=document.getElementById('cardModal');
const form=document.getElementById('cardForm');
const formStatus=document.getElementById('cardFormStatus');
const saveBtn=document.getElementById('saveCardBtn');
const linkModal=document.getElementById('linkModal');
const linkForm=document.getElementById('linkForm');
const linkFormStatus=document.getElementById('linkFormStatus');
const saveLinkBtn=document.getElementById('saveLinkBtn');
const linkImageFileInput=linkForm.elements.linkImageFile;
const linkImagePreview=document.getElementById('linkImagePreview');
let currentItems=[];

function escHtml(v){
  return String(v??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function validUrl(v){
  if(!String(v||'').trim()) return true;
  try{
    const u=new URL(String(v).trim());
    return u.protocol==='http:'||u.protocol==='https:';
  }catch(_){return false;}
}

function render(items){
  currentItems=Array.isArray(items)?items:[];
  grid.innerHTML='';
  if(!Array.isArray(items)||!items.length){
    status.textContent='لا توجد بطاقات في قسم AI بعد.';
    return;
  }
  status.textContent='';
  const frag=document.createDocumentFragment();
  items.forEach(function(item){
    const card=document.createElement('article');
    card.className='section-card';
    if(item&&item.image){
      const img=document.createElement('img');
      img.src=String(item.image);
      img.alt=String(item.title||'');
      img.loading='lazy';
      card.appendChild(img);
    }
    const body=document.createElement('div');
    body.className='section-card-body';
    const title=document.createElement('h2');
    title.textContent=String(item&&item.title||'بدون عنوان');
    body.appendChild(title);
    const p=document.createElement('p');
    p.textContent=String(item&&item.content||'');
    body.appendChild(p);
    if(item&&item.url){
      const link=document.createElement('a');
      link.className='card-link-preview';
      link.href=String(item.url);
      link.target='_blank';
      link.rel='noopener noreferrer';

      const linkImgSrc=String(item.linkImage||item.image||'').trim();
      if(linkImgSrc){
        const linkImg=document.createElement('img');
        linkImg.className='card-link-image';
        linkImg.src=linkImgSrc;
        linkImg.alt=String(item.linkTitle||item.title||'الرابط');
        linkImg.loading='lazy';
        link.appendChild(linkImg);
      }

      const linkBody=document.createElement('span');
      linkBody.className='card-link-body';
      const linkTitle=document.createElement('strong');
      linkTitle.textContent=String(item.linkTitle||item.title||'فتح الرابط');
      linkBody.appendChild(linkTitle);
      const linkAction=document.createElement('span');
      linkAction.className='card-link-action';
      linkAction.textContent='فتح الرابط ↗';
      linkBody.appendChild(linkAction);
      link.appendChild(linkBody);
      body.appendChild(link);
    }else{
      const createLinkBtn=document.createElement('button');
      createLinkBtn.type='button';
      createLinkBtn.className='create-link-btn';
      createLinkBtn.textContent='🔗 إنشاء رابط';
      createLinkBtn.addEventListener('click',function(){openLinkModal(item.id);});
      body.appendChild(createLinkBtn);
    }
    if(item&&item.url){
      const editLinkBtn=document.createElement('button');
      editLinkBtn.type='button';
      editLinkBtn.className='edit-link-btn';
      editLinkBtn.textContent='✏️ تعديل الرابط';
      editLinkBtn.addEventListener('click',function(){openLinkModal(item.id);});
      body.appendChild(editLinkBtn);
    }
    card.appendChild(body);
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

async function readJson(){
  const url='https://raw.githubusercontent.com/'+CONFIG.repo+'/main/'+CONFIG.path+'?_v='+Date.now();
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data)) throw new Error('بنية JSON غير صالحة.');
  return data;
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
  const byType={ 'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif' };
  return byType[type]||'.png';
}

async function uploadImage(path,base64){
  const saved=await bridgeGithub(path,'PUT',{
    message:'🖼️ رفع صورة من الكمبيوتر لبطاقة قسم AI',
    content:base64
  });
  if(!saved||!saved.content) throw new Error('GitHub لم يؤكد رفع الصورة.');
}

async function saveJson(items){
  const endpoint=CONFIG.path;
  const current=await bridgeGithub(endpoint,'GET');
  const sha=current&&current.sha;
  if(!sha) throw new Error('تعذر الحصول على SHA لملف JSON.');
  const content=JSON.stringify(items,null,2)+'\n';
  const body={
    message:'➕ إضافة بطاقة إلى قسم AI',
    content:btoa(unescape(encodeURIComponent(content))),
    sha:sha
  };
  const saved=await bridgeGithub(endpoint,'PUT',body);
  if(!saved||!saved.content) throw new Error('GitHub لم يؤكد حفظ ملف JSON.');
}

function openModal(){
  modal.hidden=false;
  form.reset();
  formStatus.textContent='';
  setTimeout(function(){form.elements.title.focus()},0);
}
function closeModal(){
  modal.hidden=true;
  formStatus.textContent='';
}
function openLinkModal(id){
  const item=currentItems.find(function(x){return String(x&&x.id)===String(id);});
  if(!item)return;
  linkModal.hidden=false;
  linkForm.dataset.cardId=String(id);
  linkForm.elements.linkTitle.value=String(item.linkTitle||item.title||'');
  linkForm.elements.linkUrl.value=String(item.url||'');
  linkForm.elements.linkImage.value=String(item.linkImage||'');
  linkForm.elements.linkImageFile.value='';
  linkFormStatus.textContent='';
  updateLinkPreview();
  setTimeout(function(){linkForm.elements.linkTitle.focus()},0);
}
function closeLinkModal(){
  linkModal.hidden=true;
  linkFormStatus.textContent='';
  linkForm.dataset.cardId='';
}
function updateLinkPreview(){
  const file=linkImageFileInput&&linkImageFileInput.files&&linkImageFileInput.files[0];
  const typed=String(linkForm.elements.linkImage.value||'').trim();
  const src=file?URL.createObjectURL(file):typed;
  if(!src){
    linkImagePreview.hidden=true;
    linkImagePreview.innerHTML='';
    return;
  }
  linkImagePreview.hidden=false;
  linkImagePreview.innerHTML='';
  const img=document.createElement('img');
  img.src=src;
  img.alt='معاينة صورة الرابط';
  const span=document.createElement('span');
  span.textContent=file?file.name:'معاينة صورة الرابط';
  linkImagePreview.appendChild(img);
  linkImagePreview.appendChild(span);
}
document.getElementById('addCardBtn').addEventListener('click',openModal);
document.getElementById('closeCardModal').addEventListener('click',closeModal);
document.getElementById('cancelCardBtn').addEventListener('click',closeModal);
document.getElementById('closeLinkModal').addEventListener('click',closeLinkModal);
document.getElementById('cancelLinkBtn').addEventListener('click',closeLinkModal);
linkModal.addEventListener('click',function(e){if(e.target===linkModal)closeLinkModal();});
const imageFileInput=form.elements.imageFile;
const imagePreview=document.getElementById('imagePreview');
if(linkImageFileInput&&linkImagePreview){
  linkImageFileInput.addEventListener('change',updateLinkPreview);
}
linkForm.elements.linkImage.addEventListener('input',updateLinkPreview);

if(imageFileInput&&imagePreview){
  imageFileInput.addEventListener('change',function(){
    const file=imageFileInput.files&&imageFileInput.files[0];
    if(!file){imagePreview.hidden=true;imagePreview.innerHTML='';return;}
    if(!file.type.startsWith('image/')||file.size>4*1024*1024){
      imagePreview.hidden=true;imagePreview.innerHTML='';
      return;
    }
    const url=URL.createObjectURL(file);
    imagePreview.hidden=false;
    imagePreview.innerHTML='<img src="'+url+'" alt="معاينة الصورة"><span>'+escHtml(file.name)+'</span>';
  });
}


modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});

linkForm.addEventListener('submit',async function(e){
  e.preventDefault();
  if(saveLinkBtn.disabled)return;
  const id=String(linkForm.dataset.cardId||'');
  const item=currentItems.find(function(x){return String(x&&x.id)===id;});
  if(!item){linkFormStatus.textContent='❌ لم يتم العثور على البطاقة.';return;}

  const linkTitle=String(linkForm.elements.linkTitle.value||'').trim();
  const linkUrl=String(linkForm.elements.linkUrl.value||'').trim();
  const linkImage=String(linkForm.elements.linkImage.value||'').trim();
  const linkImageFile=linkImageFileInput.files&&linkImageFileInput.files[0] ? linkImageFileInput.files[0] : null;

  if(!linkTitle){linkFormStatus.textContent='❌ اكتب عنوان الرابط.';return;}
  if(!validUrl(linkUrl)){linkFormStatus.textContent='❌ رابط الموقع غير صالح.';return;}
  if(!validUrl(linkImage)){linkFormStatus.textContent='❌ رابط صورة الرابط غير صالح.';return;}
  if(linkImageFile){
    if(!linkImageFile.type.startsWith('image/')){linkFormStatus.textContent='❌ الملف المحدد ليس صورة.';return;}
    if(linkImageFile.size>4*1024*1024){linkFormStatus.textContent='❌ حجم صورة الرابط يجب ألا يتجاوز 4MB.';return;}
  }

  saveLinkBtn.disabled=true;
  try{
    let finalLinkImage=linkImage;
    if(linkImageFile){
      linkFormStatus.textContent='⏳ يتم رفع صورة الرابط إلى AI/images/...';
      const base64=await fileToBase64(linkImageFile);
      const ext=fileExtension(linkImageFile.name,linkImageFile.type);
      const safeName='link-'+Date.now()+ext;
      await uploadImage('AI/images/'+safeName,base64);
      finalLinkImage='images/'+safeName;
    }
    item.url=linkUrl;
    item.linkTitle=linkTitle;
    item.linkImage=finalLinkImage;
    linkFormStatus.textContent='⏳ يتم حفظ الرابط في AI/data.json...';
    await saveJson(currentItems);
    render(currentItems);
    linkFormStatus.textContent='✅ تم حفظ الرابط بنجاح.';
    setTimeout(closeLinkModal,700);
  }catch(error){
    linkFormStatus.textContent='❌ '+(error&&error.message||String(error));
  }finally{
    saveLinkBtn.disabled=false;
  }
});

form.addEventListener('submit',async function(e){
  e.preventDefault();
  if(saveBtn.disabled) return;

  const title=String(form.elements.title.value||'').trim();
  const content=String(form.elements.content.value||'');
  const image=String(form.elements.image.value||'').trim();
  const imageFile=form.elements.imageFile.files && form.elements.imageFile.files[0] ? form.elements.imageFile.files[0] : null;
  const url=String(form.elements.url.value||'').trim();

  if(!title){formStatus.textContent='❌ اكتب عنوان البطاقة.';return;}
  if(!validUrl(image)){formStatus.textContent='❌ رابط الصورة غير صالح.';return;}
  if(!validUrl(url)){formStatus.textContent='❌ الرابط غير صالح.';return;}
  if(imageFile){
    if(!imageFile.type.startsWith('image/')){formStatus.textContent='❌ الملف المحدد ليس صورة.';return;}
    if(imageFile.size>4*1024*1024){formStatus.textContent='❌ حجم الصورة يجب ألا يتجاوز 4MB.';return;}
  }

  saveBtn.disabled=true;
  formStatus.textContent='⏳ قراءة قاعدة البيانات...';

  try{
    const items=await readJson();
    const maxId=items.reduce(function(max,item){
      const n=Number(item&&item.id);
      return Number.isFinite(n)?Math.max(max,n):max;
    },0);
    let finalImage=image;
    if(imageFile){
      formStatus.textContent='⏳ يتم رفع الصورة إلى AI/images/...';
      const base64=await fileToBase64(imageFile);
      const ext=fileExtension(imageFile.name,imageFile.type);
      const safeName='card-'+Date.now()+ext;
      const imagePath='AI/images/'+safeName;
      await uploadImage(imagePath,base64);
      finalImage='images/'+safeName;
    }

    items.push({
      id:String(maxId+1),
      title:title,
      content:content,
      image:finalImage,
      url:url
    });

    formStatus.textContent='⏳ يتم حفظ البطاقة في AI/data.json...';
    await saveJson(items);
    render(items);
    formStatus.textContent='✅ تمت إضافة البطاقة بنجاح.';
    setTimeout(closeModal,700);
  }catch(error){
    formStatus.textContent='❌ '+(error&&error.message||String(error));
  }finally{
    saveBtn.disabled=false;
  }
});

readJson()
  .then(render)
  .catch(function(error){
    status.textContent='❌ تعذر تحميل قاعدة بيانات القسم: '+(error&&error.message||String(error));
  });
})(); 
