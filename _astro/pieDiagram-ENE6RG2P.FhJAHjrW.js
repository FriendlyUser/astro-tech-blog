import{p as at}from"./chunk-JWPE2WC7.Biqe_1t-.js";import{a2 as T,a5 as B,b5 as nt,g as rt,s as it,a as ot,b as st,o as lt,n as ct,_ as g,l as G,c as ut,A as dt,D as gt,K as pt,e as ht,p as ft,B as mt}from"./mermaid.core.DTcXGTUp.js";import{p as vt}from"./cynefin-VYW2F7L2.C2j6RqQc.js";import{d as Z}from"./arc.BlWYj6xN.js";import{o as xt}from"./ordinal.BYWQX77i.js";function St(t,r){return r<t?-1:r>t?1:r>=t?0:NaN}function yt(t){return t}function wt(){var t=yt,r=St,y=null,b=T(0),l=T(B),p=T(0);function i(e){var n,s=(e=nt(e)).length,h,w,$=0,f=new Array(s),o=new Array(s),D=+b.apply(this,arguments),E=Math.min(B,Math.max(-B,l.apply(this,arguments)-D)),k,L=Math.min(Math.abs(E)/s,p.apply(this,arguments)),u=L*(E<0?-1:1),A;for(n=0;n<s;++n)(A=o[f[n]=n]=+t(e[n],n,e))>0&&($+=A);for(r!=null?f.sort(function(M,m){return r(o[M],o[m])}):y!=null&&f.sort(function(M,m){return y(e[M],e[m])}),n=0,w=$?(E-s*u)/$:0;n<s;++n,D=k)h=f[n],A=o[h],k=D+(A>0?A*w:0)+u,o[h]={data:e[h],index:n,value:A,startAngle:D,endAngle:k,padAngle:L};return o}return i.value=function(e){return arguments.length?(t=typeof e=="function"?e:T(+e),i):t},i.sortValues=function(e){return arguments.length?(r=e,y=null,i):r},i.sort=function(e){return arguments.length?(y=e,r=null,i):y},i.startAngle=function(e){return arguments.length?(b=typeof e=="function"?e:T(+e),i):b},i.endAngle=function(e){return arguments.length?(l=typeof e=="function"?e:T(+e),i):l},i.padAngle=function(e){return arguments.length?(p=typeof e=="function"?e:T(+e),i):p},i}var At=mt.pie,I={sections:new Map,showData:!1},F=I.sections,V=I.showData,Ct=structuredClone(At),$t=g(()=>structuredClone(Ct),"getConfig"),Dt=g(()=>{F=new Map,V=I.showData,ft()},"clear"),Tt=g(({label:t,value:r})=>{if(r<0)throw new Error(`"${t}" has invalid value: ${r}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);F.has(t)||(F.set(t,r),G.debug(`added new section: ${t}, with value: ${r}`))},"addSection"),bt=g(()=>F,"getSections"),kt=g(t=>{V=t},"setShowData"),zt=g(()=>V,"getShowData"),q={getConfig:$t,clear:Dt,setDiagramTitle:ct,getDiagramTitle:lt,setAccTitle:st,getAccTitle:ot,setAccDescription:it,getAccDescription:rt,addSection:Tt,getSections:bt,setShowData:kt,getShowData:zt},Et=g((t,r)=>{at(t,r),r.setShowData(t.showData),t.sections.map(r.addSection)},"populateDb"),Mt={parse:g(async t=>{const r=await vt("pie",t);G.debug(r),Et(r,q)},"parse")},Rt=g(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieCircle.highlighted{
    scale: 1.05;
    opacity: 1;
  }
  .pieCircle.highlightedOnHover:hover{
    transition-duration: 250ms;
    scale: 1.05;
    opacity: 1;
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),Lt=Rt,Wt=g(t=>{const r=[...t.values()].reduce((l,p)=>l+p,0),y=[...t.entries()].map(([l,p])=>({label:l,value:p})).filter(l=>l.value/r*100>=1);return wt().value(l=>l.value).sort(null)(y)},"createPieArcs"),_t=g((t,r,y,b)=>{G.debug(`rendering pie chart
`+t);const l=b.db,p=ut(),i=dt(l.getConfig(),p.pie),e=40,n=18,s=4,h=450,w=h,$=gt(r),f=$.append("g");f.attr("transform","translate("+w/2+","+h/2+")");const{themeVariables:o}=p;let[D]=pt(o.pieOuterStrokeWidth);D??=2;const E=i.legendPosition,k=i.textPosition,L=i.donutHole>0&&i.donutHole<=.9?i.donutHole:0,u=Math.min(w,h)/2-e,A=Z().innerRadius(L*u).outerRadius(u),M=Z().innerRadius(u*k).outerRadius(u*k),m=f.append("g");m.append("circle").attr("cx",0).attr("cy",0).attr("r",u+D/2).attr("class","pieOuterCircle");const W=l.getSections(),J=Wt(W),Q=[o.pie1,o.pie2,o.pie3,o.pie4,o.pie5,o.pie6,o.pie7,o.pie8,o.pie9,o.pie10,o.pie11,o.pie12];let H=0;W.forEach(a=>{H+=a});const U=J.filter(a=>(a.data.value/H*100).toFixed(0)!=="0"),N=xt(Q).domain([...W.keys()]);m.selectAll("mySlices").data(U).enter().append("path").attr("d",A).attr("fill",a=>N(a.data.label)).attr("class",a=>{let c="pieCircle";return i.highlightSlice==="hover"?c+=" highlightedOnHover":i.highlightSlice===a.data.label&&(c+=" highlighted"),c}),m.selectAll("mySlices").data(U).enter().append("text").text(a=>(a.data.value/H*100).toFixed(0)+"%").attr("transform",a=>"translate("+M.centroid(a)+")").style("text-anchor","middle").attr("class","slice");const Y=f.append("text").text(l.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText"),R=[...W.entries()].map(([a,c])=>({label:a,value:c})),C=f.selectAll(".legend").data(R).enter().append("g").attr("class","legend");C.append("rect").attr("width",n).attr("height",n).style("fill",a=>N(a.label)).style("stroke",a=>N(a.label)),C.append("text").attr("x",n+s).attr("y",n-s).text(a=>l.getShowData()?`${a.label} [${a.value}]`:a.label);const z=Math.max(...C.selectAll("text").nodes().map(a=>a?.getBoundingClientRect().width??0));let _=h,O=w+e;const d=n+s,P=R.length*d;switch(E){case"center":C.attr("transform",(a,c)=>{const v=d*R.length/2,x=-z/2-(n+s),S=c*d-v;return"translate("+x+","+S+")"});break;case"top":_+=P,C.attr("transform",(a,c)=>{const v=u,x=-z/2-(n+s),S=c*d-v;return`translate(${x}, ${S})`}),m.attr("transform",()=>`translate(0, ${P+d})`);break;case"bottom":_+=P,C.attr("transform",(a,c)=>{const v=-u-d,x=-z/2-(n+s),S=c*d-v;return"translate("+x+","+S+")"});break;case"left":O+=n+s+z,C.attr("transform",(a,c)=>{const v=d*R.length/2,x=-u-(n+s),S=c*d-v;return"translate("+x+","+S+")"}),m.attr("transform",()=>`translate(${z+n+s}, 0)`);break;default:O+=n+s+z,C.attr("transform",(a,c)=>{const v=d*R.length/2,x=12*n,S=c*d-v;return"translate("+x+","+S+")"});break}const j=Y.node()?.getBoundingClientRect().width??0,tt=w/2-j/2,et=w/2+j/2,K=Math.min(0,tt),X=Math.max(O,et)-K;$.attr("viewBox",`${K} 0 ${X} ${_}`),ht($,_,X,i.useMaxWidth)},"draw"),Ft={draw:_t},It={parser:Mt,db:q,renderer:Ft,styles:Lt};export{It as diagram};
