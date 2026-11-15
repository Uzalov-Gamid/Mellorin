// Browser-side audit: hidden panels and intentional scroll containers excluded.
export function audit() {
  const findings=[];
  const visible=el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden';
  const path=el=>[el.tagName.toLowerCase(),el.id?`#${el.id}`:'',[...el.classList].slice(0,3).map(c=>`.${c}`).join('')].join('');
  const report=(kind,el,detail)=>findings.push({kind,element:path(el),text:el.textContent.trim().slice(0,100),detail});
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const css=getComputedStyle(el), box=el.getBoundingClientRect();
    const directText=[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim());
    if (directText && el.clientWidth>0 && el.scrollWidth>el.clientWidth+1 && !['auto','scroll'].includes(css.overflowX)) report('horizontal-overflow',el,`${el.scrollWidth} > ${el.clientWidth}`);
    if (el.matches('button,[role=button],.pill,.chip,input,select')) {
      if (el.clientHeight>0 && el.scrollHeight>el.clientHeight+1) report('control-height-overflow',el,`${el.scrollHeight} > ${el.clientHeight}`);
      for (const child of el.childNodes) if(child.nodeType===Node.TEXT_NODE && child.textContent.trim()) {
        const range=document.createRange();range.selectNodeContents(child);
        for (const rect of range.getClientRects()) if(rect.left<box.left+1 || rect.right>box.right-1 || rect.top<box.top || rect.bottom>box.bottom) report('control-text-outside',el,'Text touches or crosses control border');
      }
    }
    if (['flex','inline-flex'].includes(css.display) && css.flexDirection==='row') {
      const controls=[...el.children].filter(c=>visible(c)&&c.matches('button,.pill,.chip,input,select'));
      for(let i=1;i<controls.length;i++) {const a=controls[0].getBoundingClientRect(),b=controls[i].getBoundingClientRect();if(Math.abs(a.top-b.top)<3 && Math.abs(a.height-b.height)>2) report('row-control-height',controls[i],`${b.height} vs ${a.height}`);}
    }
    if (el.matches('.card,.paper,.night-card,[data-qa-card]') && !['auto','scroll'].includes(css.overflow)) {
      for(const child of el.children) {if(!visible(child)||getComputedStyle(child).position==='absolute')continue;const r=child.getBoundingClientRect();if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)report('outside-card',child,path(el));}
    }
  }
  return findings;
}
