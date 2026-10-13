(() => {
  'use strict';
  const rootURL = new URL('../../', document.currentScript.src);
  const data = window.PLACE_DATA;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:0}).format(n) + ' ₽';
  const url = file => new URL(file, rootURL).href;
  const ids = new Set(data.properties.map(p=>p.id));
  let storageAvailable = true;
  const state = {saved:[],compare:[]};
  for (const key of ['saved','compare']) {
    try { const value=JSON.parse(localStorage.getItem('novo-oktyabrsky:'+key)||'[]'); state[key]=Array.isArray(value)?[...new Set(value.filter(id=>ids.has(id)))].slice(0,key==='compare'?3:100):[]; }
    catch { storageAvailable=false; }
  }
  let toastTimer;
  function toast(message) { const el=$('.toast');if(!el)return;el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true},3500); }
  function persist(key) { try{localStorage.setItem('novo-oktyabrsky:'+key,JSON.stringify(state[key]));}catch{storageAvailable=false;} }
  async function copy(text, fallback) {
    try { if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(text);toast('Скопировано. Можно использовать при обращении в офис.'); }
    catch {toast('Автоматическое копирование недоступно. Выделите и скопируйте текст вручную.');if(fallback){fallback.hidden=false;fallback.textContent=text;fallback.setAttribute('tabindex','-1');fallback.focus();} }
  }
  function updateStateUI(){
    $$('[data-save]').forEach(b=>{const on=state.saved.includes(b.dataset.save);b.setAttribute('aria-pressed',String(on));const p=data.properties.find(p=>p.id===b.dataset.save);if(b.classList.contains('save-button')){b.textContent=on?'♥':'♡';b.setAttribute('aria-label',(on?'Убрать из избранного: ':'Сохранить: ')+p.title);}else b.textContent=on?'В избранном ♥':'Сохранить вариант ♡';});
    $$('[data-compare]').forEach(b=>{const on=state.compare.includes(b.dataset.compare);b.setAttribute('aria-pressed',String(on));b.textContent=on?'✓ В сравнении':'＋ Сравнить';});
    $$('[data-saved-count]').forEach(el=>{el.textContent=state.saved.length;});
    const bar=$('.compare-bar');if(bar){bar.hidden=state.compare.length===0||!!$('[data-compare-page]');$('[data-compare-count]').textContent=`Выбрано: ${state.compare.length} / 3`;}
  }
  function toggleSaved(id){state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];persist('saved');updateStateUI();if(!storageAvailable)toast('Вариант сохранён до закрытия этой страницы.');if(catalogApply)catalogApply();}
  function toggleCompare(id){if(state.compare.includes(id))state.compare=state.compare.filter(x=>x!==id);else if(state.compare.length>=3){toast('Можно сравнить до трёх вариантов. Уберите один, чтобы добавить другой.');return;}else state.compare.push(id);persist('compare');updateStateUI();if($('[data-compare-page]'))renderCompare();}
  let catalogApply;
  document.addEventListener('DOMContentLoaded',()=>{
    const header=$('.p-header'),toggle=$('.nav-button'),nav=$('.p-nav');
    if(header&&toggle&&nav){
      const close=(focus=false)=>{header.classList.remove('is-open');document.body.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню');toggle.textContent='☰';if(focus)toggle.focus();};
      toggle.addEventListener('click',()=>{if(header.classList.contains('is-open'))close();else{header.classList.add('is-open');document.body.classList.add('menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Закрыть меню');toggle.textContent='×';$('a',nav)?.focus();}});
      $$('a',nav).forEach(a=>a.addEventListener('click',()=>close()));
      $('.header-contact')?.addEventListener('click',()=>close());
      document.addEventListener('keydown',e=>{if(!header.classList.contains('is-open'))return;if(e.key==='Escape'){e.preventDefault();close(true);}if(e.key==='Tab'){const items=[...$$('a',nav),$('.header-contact'),toggle];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
      document.addEventListener('pointerdown',e=>{if(!header.contains(e.target))close();});
      window.addEventListener('resize',()=>{if(window.innerWidth>900)close();});
    }
    document.addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save&&ids.has(save.dataset.save))toggleSaved(save.dataset.save);const compare=e.target.closest('[data-compare]');if(compare&&ids.has(compare.dataset.compare))toggleCompare(compare.dataset.compare);if(e.target.closest('[data-clear-compare]')){state.compare=[];persist('compare');updateStateUI();}});
    updateStateUI();
    setupCatalog();setupDistricts();setupBudget();setupSeller();
    if($('[data-compare-page]'))renderCompare();
  });
  window.addEventListener('storage',e=>{if(!['novo-oktyabrsky:saved','novo-oktyabrsky:compare'].includes(e.key))return;const key=e.key.split(':')[1];try{const a=JSON.parse(e.newValue||'[]');state[key]=Array.isArray(a)?[...new Set(a.filter(id=>ids.has(id)))].slice(0,key==='compare'?3:100):[];}catch{state[key]=[];}updateStateUI();catalogApply?.();if($('[data-compare-page]'))renderCompare();});
  function setupCatalog(){
    const root=$('[data-catalog]');if(!root)return;
    const form=$('form',root),params=new URLSearchParams(location.search);
    const allowed=['','flat','room','house','land','new','commercial','rent'];
    let type=params.has('type')?params.get('type'):root.dataset.defaultType;
    if(!allowed.includes(type))type='';
    let savedOnly=params.get('saved')==='1';
    for(const name of ['search','district','rooms','max','sort'])if(params.has(name))form.elements[name].value=params.get(name);
    const cards=$$('[data-property]',root),grid=$('[data-property-grid]',root);
    catalogApply=()=>{
      let count=0;const f=form.elements;
      const search=f.search.value.trim().toLocaleLowerCase('ru');
      const max=f.max.value===''?Infinity:Number(f.max.value);
      cards.forEach(card=>{const p=data.properties.find(p=>p.id===card.dataset.property);const rooms=Number(f.rooms.value);const match=(!type||p.type===type)&&(!f.district.value||p.district===f.district.value)&&(!search||[p.title,p.address,p.sourceId||''].join(' ').toLocaleLowerCase('ru').includes(search))&&Number.isFinite(p.price)&&p.price<=max&&max>=0&&(!rooms||(rooms===4?p.rooms>=4:p.rooms===rooms))&&(!savedOnly||state.saved.includes(p.id));card.hidden=!match;if(match)count++;});
      cards.sort((a,b)=>f.sort.value==='price-asc'?Number(a.dataset.price)-Number(b.dataset.price):f.sort.value==='price-desc'?Number(b.dataset.price)-Number(a.dataset.price):data.properties.findIndex(p=>p.id===a.dataset.property)-data.properties.findIndex(p=>p.id===b.dataset.property)).forEach(c=>grid.appendChild(c));
      const empty=$('[data-empty]',root);grid.appendChild(empty);empty.hidden=count>0;
      $('[data-empty-text]',root).textContent=savedOnly?'В избранном пока нет вариантов с такими параметрами. Откройте весь каталог или измените фильтры.':'Подборка объектов готовится. Расскажите, что вы ищете: район, тип недвижимости и бюджет. Актуальные варианты обсудим лично.';
      $('[data-catalog-count]',root).textContent=(savedOnly?'В избранном · ':'')+`Показано: ${count} из ${data.properties.length}`;
      $$('[data-filter-type]',root).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filterType===type)));
      const q=new URLSearchParams();if(type)q.set('type',type);else if(root.dataset.defaultType)q.set('type','');if(savedOnly)q.set('saved','1');for(const name of ['search','district','rooms','max','sort']){const v=f[name].value;if(v&&v!=='default')q.set(name,v);}history.replaceState(null,'',location.pathname+(q.size?'?'+q:'')+location.hash);
    };
    $$('[data-filter-type]',root).forEach(b=>b.addEventListener('click',()=>{type=b.dataset.filterType;catalogApply();}));
    form.addEventListener('input',catalogApply);form.addEventListener('change',catalogApply);form.addEventListener('submit',e=>{e.preventDefault();catalogApply();});
    $('[data-reset-filters]',root).addEventListener('click',()=>{form.reset();type='';savedOnly=false;catalogApply();});
    catalogApply();
  }
  function setupDistricts(){
    $$('[data-district-explorer]').forEach(root=>{
      const panel=$('[data-district-detail]',root),prefix=root.dataset.prefix||'';
      const render=id=>{const d=data.districts.find(d=>d.id===id)||data.districts[0];$$('[data-district]',root).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.district===d.id)));panel.innerHTML=`<span class="eyebrow" style="margin-bottom:12px">${esc(d.label)}</span><h3>${esc(d.name)}</h3><p>${esc(d.lead)}</p><dl class="district-meta"><div><dt>Застройка</dt><dd>${esc(d.housing)}</dd></div><div><dt>Маршрут</dt><dd>${esc(d.route)}</dd></div><div><dt>До покупки</dt><dd>${esc(d.check)}</dd></div></dl><div class="district-actions"><a class="p-button p-button--light" href="${prefix}catalog.html?district=${d.id}">Варианты в направлении ↗</a><a class="text-link" href="${prefix}${d.page}">Подробнее ↗</a></div>`;};
      $$('[data-district]',root).forEach(b=>b.addEventListener('click',()=>render(b.dataset.district)));
      render(new URLSearchParams(location.search).get('district')||'center');
    });
    const c=$('[data-district-compare]');if(!c)return;
    c.id='compare-districts';
    const render=()=>{const a=data.districts.find(d=>d.id===$('select[name="district-a"]',c).value),b=data.districts.find(d=>d.id===$('select[name="district-b"]',c).value);const output=$('[data-district-table]',c);if(a.id===b.id){output.innerHTML='<p>Выберите два разных направления для сравнения.</p>';return;}output.innerHTML=`<table><caption class="eyebrow" style="text-align:left;margin-bottom:15px">Сравнение двух направлений</caption><thead><tr><th scope="col">Что важно</th><th scope="col">${esc(a.name)}</th><th scope="col">${esc(b.name)}</th></tr></thead><tbody>${[['Жильё','housing'],['Ваш маршрут','route'],['До покупки','check'],['Ориентиры','anchor']].map(([label,key])=>`<tr><td>${label}</td><td>${esc(a[key])}</td><td>${esc(b[key])}</td></tr>`).join('')}</tbody></table>`;};
    $('[data-show-district-compare]',c).addEventListener('click',render);render();
  }
  function renderCompare(){
    const root=$('[data-comparison]');if(!root)return;
    const chosen=state.compare.map(id=>data.properties.find(p=>p.id===id)).filter(Boolean);
    if(!chosen.length){root.innerHTML=`<div class="empty-state"><h2>Ваши варианты будут здесь.</h2><p>Выберите до трёх объектов в каталоге и нажмите «Сравнить» на карточке каждого.</p><a class="p-button" href="${url('catalog.html')}">Перейти к выбору ↗</a></div>`;return;}
    root.innerHTML=`<div class="compare-container"><table class="compare-table"><caption class="eyebrow" style="text-align:left;padding-bottom:15px">Сведения из публичных объявлений · наличие уточняется</caption><thead><tr><th scope="col">Ваш выбор</th>${chosen.map(p=>`<th scope="col"><button class="compare-remove" data-remove-compare="${p.id}" aria-label="Убрать из сравнения: ${esc(p.title)}">×</button><span class="eyebrow">${esc(p.typeName)}</span><h3><a href="${url('objects/'+p.id+'.html')}">${esc(p.title)}</a></h3><a class="text-link" href="${url('objects/'+p.id+'.html')}">Открыть объект ↗</a></th>`).join('')}</tr></thead><tbody>${[['Цена в объявлении',p=>`<span class="compare-price">${money(p.price)}</span>`],['Адрес',p=>esc(p.address)],['Площадь',p=>p.area?`${p.area} м²`:p.land?`${p.land} соток`:'Уточняется'],['Комнат',p=>p.rooms||'—'],['Этаж',p=>esc(p.floor||'—')],['Особенности',p=>esc(p.note)],['Перед просмотром',p=>esc(p.checks.join(' · '))],['Бюджет переезда',p=>`<a class="text-link" href="${url('budget.html?price='+p.price)}">Посчитать ↗</a>`]].map(([label,value])=>`<tr><td>${label}</td>${chosen.map(p=>`<td>${value(p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    $$('[data-remove-compare]',root).forEach(b=>b.addEventListener('click',()=>toggleCompare(b.dataset.removeCompare)));
  }
  function setupBudget(){
    const root=$('[data-budget]');if(!root)return;const form=$('form',root),out=name=>$(`[data-budget-out="${name}"]`,root);let summary='';
    const price=new URLSearchParams(location.search).get('price');if(price!==null&&Number.isFinite(Number(price))&&Number(price)>0&&Number(price)<=1e9){form.elements.price.value=price;form.elements.down.value=String(Math.round(Number(price)*.2));}
    const calculate=()=>{const values={};let error='';for(const name of ['price','down','repair','moving','fees','reserve','years','rate']){const el=form.elements[name];values[name]=el.value===''?0:Number(el.value);if(!el.validity.valid||!Number.isFinite(values[name])||values[name]<0)error='Проверьте исходные данные: суммы не могут быть отрицательными или превышать предел поля.';}
      const {price,down,repair,moving,fees,reserve,years,rate}=values;
      if(down>price)error='Первоначальный взнос не может быть больше стоимости недвижимости.';
      if(years<1||years>40||!Number.isInteger(years))error='Укажите срок кредита от 1 до 40 полных лет.';
      const e=$('[data-budget-error]',root);e.textContent=error;e.hidden=!error;
      const copyButton=$('[data-copy-budget]',root);copyButton.disabled=!!error;
      if(error){['total','cash','loan','extras','payment','interest'].forEach(n=>out(n).textContent='—');summary='';return;}
      const extras=repair+moving+fees+reserve,loan=price-down,n=years*12,r=rate/1200;
      const pay=loan===0?0:r===0?loan/n:loan*r/(1-Math.pow(1+r,-n));
      out('total').textContent=money(price+extras);out('cash').textContent=money(down+extras);out('loan').textContent=money(loan);out('extras').textContent=money(extras);
      const hasRate=form.elements.rate.value!==''||loan===0;
      out('payment').textContent=hasRate?money(pay):'Введите ставку';out('interest').textContent=hasRate?money(Math.max(0,pay*n-loan)):'—';
      summary=`Бюджет покупки и переезда\nНедвижимость: ${money(price)}\nРемонт: ${money(repair)}\nПереезд: ${money(moving)}\nСделка и другие расходы: ${money(fees)}\nРезерв: ${money(reserve)}\nПолный бюджет: ${money(price+extras)}\nСвои средства сейчас: ${money(down+extras)}\nСумма кредита: ${money(loan)}\nСрок: ${years} лет\nСтавка: ${form.elements.rate.value===''?'не указана':rate+'%'}\nПлатёж: ${hasRate?money(pay):'нужна ставка'}\nПредварительный расчёт по вашим значениям.`;
    };
    form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',calculate);calculate();
    const manual=document.createElement('pre');manual.className='brief-text';manual.hidden=true;manual.style.color='var(--ink)';$('.budget-result',root).appendChild(manual);
    $('[data-copy-budget]',root).addEventListener('click',()=>{if(summary)copy(summary,manual);});
  }
  function setupSeller(){const root=$('[data-seller-brief]');if(!root)return;const form=$('form',root),output=$('.seller-brief-output',root),text=$('[data-brief-text]',root);form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const f=form.elements,d=data.districts.find(d=>d.id===f.district.value);text.textContent=`Хочу обсудить продажу недвижимости.\nТип: ${f.type.value}\nНаправление: ${d?.name||'уточним в разговоре'}\nПлощадь: ${f.area.value?f.area.value+(f.type.value==='Участок'?' соток':' м²'):'уточним в разговоре'}\nСроки: ${f.time.value}\nНужно обсудить: документы, подготовку к продаже, условия работы и следующий шаг.`;output.hidden=false;});$('[data-copy-brief]',root).addEventListener('click',()=>copy(text.textContent,text));}
})();
