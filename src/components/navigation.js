(function(ns){
  const tabs=[['overview','Обзор'],['comparison','Сравнение ТЦ'],['tenant-mix','Tenant mix'],['tenants','Арендаторы'],['upcoming','Скоро открытие']];
  function render(active){const root=document.getElementById('topNav');root.innerHTML=tabs.map(([id,label])=>`<button class="nav-button ${active===id?'active':''}" data-tab-button="${id}" type="button" aria-current="${active===id?'page':'false'}">${label}</button>`).join('');}
  function show(active){document.querySelectorAll('.tab-page').forEach(page=>page.hidden=page.dataset.tab!==active);render(active);}
  ns.navigation={tabs,render,show};
})(window.TenantMixV2=window.TenantMixV2||{});
