(function(ns){
  const fmt=value=>ns.analytics.fmt.format(value??0);const delta=(value,median)=>median==null?'нет медианы':`${value>=median?'+':''}${fmt(value-median)} к медиане`;
  function card(label,value,benchmark,method,tone=''){return `<article class="panel kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value ${tone}">${value}</div><div class="kpi-benchmark">${benchmark}</div><button class="method-button" type="button" title="${method}" aria-label="Методика: ${method}">Как считается</button></article>`;}
  function render(ctx){const focusCount=ctx.scope.focusBrands.size;const unique=ctx.scope.exclusiveFocus.size;const share=focusCount?unique/focusCount*100:0;const medianBrands=ctx.brandMedian;const rank=`${ctx.rank}-е из ${ctx.malls.length}`;return `<div class="kpi-grid">
    ${card('Бренды фокусного ТЦ',fmt(focusCount),`Медиана ${fmt(medianBrands)} · место ${rank}`,`Количество нормализованных брендов в ${ctx.state.focus}. ${delta(focusCount,medianBrands)}.`,'focus')}
    ${card('Эксклюзивы в группе',fmt(unique),ctx.scope.scopeLabel,'Бренд есть в фокусном ТЦ и отсутствует у выбранных конкурентов.')}
    ${card('Доля эксклюзивов',`${fmt(share)}%`,`из ${fmt(focusCount)} брендов`,'Эксклюзивы фокусного ТЦ / все бренды фокусного ТЦ × 100%.')}
    ${card('Пересечение с группой',fmt(ctx.scope.intersection.size),`${fmt(focusCount?ctx.scope.intersection.size/focusCount*100:0)}% состава`,'Бренды фокусного ТЦ, представленные минимум в одном другом объекте выбранной группы.')}
    ${card('Категорийные пробелы',fmt(ctx.categoryGaps),'ниже медианы группы','Число категорий, где абсолютное количество брендов фокусного ТЦ ниже медианы текущей группы.')}
    ${card('Бренды для рассмотрения',fmt(ctx.gaps.length),`порог: от ${ctx.state.gapN} конкурентов`,'Подтвержденные бренды, отсутствующие в фокусном ТЦ и представленные минимум у N выбранных конкурентов.')}
  </div>`;}
  ns.kpi={render};
})(window.TenantMixV2=window.TenantMixV2||{});
