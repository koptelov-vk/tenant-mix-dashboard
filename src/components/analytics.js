(function(ns){
  const data=window.__TENANT_DATA__;
  const mallByName=new Map(data.mallSummary.map(item=>[item.mall,item]));
  const fmt=new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1});
  const median=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2};
  const slug=value=>String(value||"").toLocaleLowerCase("ru-RU").replaceAll("ё","е").replace(/[^a-zа-я0-9]+/g,"-").replace(/^-|-$/g,"");
  const qualityRank={"Высокая":3,"Средняя":2,"Низкая":1};
  function defaultState(){return{focus:"Фантастика",tab:"overview",groups:["superregional"],geos:["nn","regions"],category:"Все категории",metric:"absolute",gapN:3,selectedMalls:[],cities:[],brands:[],tenants:[],sourceTypes:[],qualities:[],upcomingStatuses:[],glaMin:null,glaMax:null,gbaMin:null,gbaMax:null,hideSmall:true,search:""};}
  function groupId(mall){return mall.mallClass==="Районный"?"district":mall.mallClass==="Региональный"?"regional":mall.mallClass==="Суперрегиональный"?"superregional":"no-area";}
  function geoId(mall){if(mall.city==="Москва")return"moscow";if(mall.city==="Санкт-Петербург")return"spb";if(mall.city==="НН")return"nn";return"regions";}
  function selectedMalls(state){
    let malls=data.mallSummary.filter(mall=>(!state.groups.length||state.groups.includes(groupId(mall)))&&(!state.geos.length||state.geos.includes(geoId(mall))));
    if(state.selectedMalls.length)malls=malls.filter(mall=>state.selectedMalls.includes(mall.mall));
    if(state.cities.length)malls=malls.filter(mall=>state.cities.includes(mall.city));
    malls=malls.filter(mall=>(state.glaMin==null||mall.gla>=state.glaMin)&&(state.glaMax==null||mall.gla<=state.glaMax)&&(state.gbaMin==null||mall.gba>=state.gbaMin)&&(state.gbaMax==null||mall.gba<=state.gbaMax));
    const focus=mallByName.get(state.focus);
    if(focus&&!malls.some(mall=>mall.mall===focus.mall))malls.unshift(focus);
    return [focus,...malls.filter(mall=>mall.mall!==state.focus)].filter(Boolean);
  }
  function filteredRows(state,malls){
    const mallSet=new Set(malls.map(item=>item.mall));
    return data.rows.filter(row=>mallSet.has(row.mall)&&(state.category==="Все категории"||row.category===state.category)&&(!state.brands.length||state.brands.includes(row.brandNormalized))&&(!state.tenants.length||state.tenants.includes(row.brand))&&(!state.sourceTypes.length||state.sourceTypes.includes(row.sourceType))&&(!state.qualities.length||state.qualities.includes(row.sourceQuality)));
  }
  function categoryStats(state,malls){
    const categories=state.category==="Все категории"?data.categoryMatrix.categories:[state.category];
    return categories.map(category=>{
      const values=malls.map(mall=>({mall:mall.mall,count:mall.categoryCounts[category]||0,share:mall.brandCount?(mall.categoryCounts[category]||0)/mall.brandCount:0,density:mall.glaConfirmed?(mall.categoryCounts[category]||0)/mall.gla*10000:null}));
      const focus=values.find(item=>item.mall===state.focus)||{count:0,share:0,density:null};
      return{category,values,focus,countMedian:median(values.map(v=>v.count)),shareMedian:median(values.map(v=>v.share)),densityMedian:median(values.map(v=>v.density).filter(Number.isFinite)),min:Math.min(...values.map(v=>v.count)),max:Math.max(...values.map(v=>v.count))};
    });
  }
  function brandScope(rows,malls,state){
    const presence=new Map();
    rows.forEach(row=>{if(!presence.has(row.brandNormalized))presence.set(row.brandNormalized,new Set());presence.get(row.brandNormalized).add(row.mall)});
    const focusBrands=new Set(rows.filter(row=>row.mall===state.focus).map(row=>row.brandNormalized));
    const uniqueGroup=new Set([...presence].filter(([,set])=>set.size===1).map(([brand])=>brand));
    const exclusiveFocus=new Set([...focusBrands].filter(brand=>presence.get(brand)?.size===1));
    const intersection=new Set([...focusBrands].filter(brand=>(presence.get(brand)?.size||0)>=2));
    const uniqueGlobal=new Set([...focusBrands].filter(brand=>data.brandPresence[brand]?.mallCount===1));
    return{presence,focusBrands,uniqueGroup,exclusiveFocus,intersection,uniqueGlobal,scopeLabel:`Уникальность рассчитана внутри группы из ${malls.length} объектов`};
  }
  function gapCandidates(state,malls,scope){
    const competitors=new Set(malls.filter(mall=>mall.mall!==state.focus).map(mall=>mall.mall));
    return(data.brandGaps[state.focus]||[]).map(brandKey=>{const item=data.brandPresence[brandKey];const present=item.malls.filter(mall=>competitors.has(mall));const source=item.sources.find(value=>value.url&&value.quality!=="Низкая")||item.sources[0]||{};return{...item,malls:present,mallCount:present.length,share:competitors.size?present.length/competitors.size:0,source};}).filter(item=>item.mallCount>=state.gapN&&(state.category==="Все категории"||item.category===state.category)).sort((a,b)=>b.mallCount-a.mallCount||a.brand.localeCompare(b.brand,"ru"));
  }
  function similarity(state,malls){const allowed=new Set(malls.map(item=>item.mall));return data.mallSimilarity.filter(item=>item.focus===state.focus&&allowed.has(item.mall)).sort((a,b)=>b.jaccard-a.jaccard);}
  function context(state){
    const malls=selectedMalls(state);const rows=filteredRows(state,malls);const scope=brandScope(rows,malls,state);const categories=categoryStats(state,malls);const gaps=gapCandidates(state,malls,scope);const similarities=similarity(state,malls);const focus=mallByName.get(state.focus);const counts=malls.map(mall=>mall.brandCount);const rank=[...malls].sort((a,b)=>b.brandCount-a.brandCount).findIndex(mall=>mall.mall===state.focus)+1;
    const focusCategories=categories.filter(item=>item.focus.count>0||item.countMedian>0);const categoryGaps=focusCategories.filter(item=>item.focus.count<item.countMedian).length;
    return{state,malls,rows,scope,categories,gaps,similarities,focus,rank,brandMedian:median(counts),categoryGaps};
  }
  function metricValue(mall,category,metric){const count=mall.categoryCounts[category]||0;if(metric==="share")return mall.brandCount?count/mall.brandCount:0;if(metric==="density")return mall.glaConfirmed?count/mall.gla*10000:null;return count;}
  function ordinal(value){return `${value}-${value===3?"е":"е"}`;}
  function executive(ctx){
    const lines=[];const total=ctx.malls.length;lines.push(`${ctx.state.focus} занимает ${ordinal(ctx.rank)} место из ${total} объектов по количеству брендов.`);
    const shares=ctx.categories.map(item=>({category:item.category,delta:(item.focus.share-item.shareMedian)*100})).filter(item=>Number.isFinite(item.delta)).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
    const above=shares.find(item=>item.delta>0.5);const below=shares.find(item=>item.delta<-.5);
    if(above)lines.push(`Доля категории «${above.category}» на ${fmt.format(above.delta)} п.п. выше медианы группы.`);
    if(below)lines.push(`Доля категории «${below.category}» на ${fmt.format(Math.abs(below.delta))} п.п. ниже медианы группы.`);
    lines.push(`Эксклюзивы фокусного объекта составляют ${ctx.scope.focusBrands.size?fmt.format(ctx.scope.exclusiveFocus.size/ctx.scope.focusBrands.size*100):0}% его состава (${ctx.scope.exclusiveFocus.size} брендов).`);
    if(ctx.gaps.length)lines.push(`${ctx.gaps.length} брендов присутствуют минимум у ${ctx.state.gapN} конкурентов, но отсутствуют в ${ctx.state.focus}.`);
    if(ctx.similarities[0])lines.push(`Наибольшее сходство состава брендов — с ${ctx.similarities[0].mall}: индекс Жаккара ${fmt.format(ctx.similarities[0].jaccard*100)}%.`);
    return lines.slice(0,5);
  }
  ns.analytics={data,mallByName,fmt,median,slug,qualityRank,defaultState,groupId,geoId,selectedMalls,filteredRows,categoryStats,brandScope,gapCandidates,similarity,context,metricValue,executive};
})(window.TenantMixV2=window.TenantMixV2||{});
