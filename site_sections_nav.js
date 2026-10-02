(function(){
'use strict';
const sections=[{"name":"AI","folder":"AI","html":"AI.html","css":"style.css","js":"ai.js","json":"data.json"}];
const nav=document.querySelector('nav');
if(!nav)return;
const addBtn=document.getElementById('mm-add-section-btn');
sections.forEach(function(section){
  if(!section||!section.folder||!section.html)return;
  const exists=Array.from(nav.querySelectorAll('a[data-mm-section-folder]')).some(function(a){return String(a.dataset.mmSectionFolder||'')===String(section.folder);});
  if(exists)return;
  const a=document.createElement('a');
  a.dataset.mmSectionFolder=String(section.folder);
  a.href=encodeURI(String(section.folder)+'/'+String(section.html));
  a.textContent=String(section.name||section.folder);
  a.title='فتح قسم '+String(section.name||section.folder);
  if(addBtn)nav.insertBefore(a,addBtn);else nav.appendChild(a);
});
})();
