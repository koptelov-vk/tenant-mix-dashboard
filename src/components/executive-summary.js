(function(ns){
  function render(ctx){const lines=ns.analytics.executive(ctx);return `<article class="panel"><div class="panel-head"><div><span class="eyebrow">Executive summary</span><h2>Ключевые выводы</h2></div><span class="status-pill">По текущему срезу</span></div><ol class="summary-list">${lines.map((line,index)=>`<li><span class="summary-index">${index+1}</span><p>${line}</p></li>`).join('')}</ol></article>`;}
  ns.executiveSummary={render};
})(window.TenantMixV2=window.TenantMixV2||{});
