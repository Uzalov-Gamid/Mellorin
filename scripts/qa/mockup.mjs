// Evaluates only trusted, local design sources; never vault content.
export function renderMockup({sources, name, collapsed}) {
  function render(name, props = {}) {
    const source = sources[name];
    if (!source) throw Error(`Missing mockup import: ${name}`);
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const script = doc.querySelector('script[data-dc-script]');
    const schema = JSON.parse(script?.getAttribute('data-props') || '{}');
    const defaults = Object.fromEntries(Object.entries(schema).filter(([k])=>!k.startsWith('$')).map(([k,v])=>[k,v.default]));
    const values = script ? new (Function('DCLogic', `${script.textContent}; return Component;`)(class {}))() : {};
    values.props = {...defaults,...props};
    const context = values.renderVals?.() || {};
    doc.querySelectorAll('script').forEach(el=>el.remove());
    const lookup = (expression, ctx) => expression.trim() === 'true' ? true : expression.trim() === 'false' ? false : expression.trim().split('.').reduce((v,k)=>v?.[k],ctx);
    const raw = (value,ctx) => lookup(value?.match(/^\s*{{(.*?)}}\s*$/)?.[1] ?? value ?? '',ctx);
    const interpolate = (value,ctx) => value.replace(/{{(.*?)}}/g,(_,e)=>String(lookup(e,ctx) ?? ''));
    function visit(node,ctx) {
      if (node.nodeType === Node.TEXT_NODE) {node.textContent=interpolate(node.textContent,ctx);return;}
      if (!(node instanceof Element)) return;
      if (node.localName === 'dc-import') {
        const attrs=Object.fromEntries([...node.attributes].map(a=>[a.name,interpolate(a.value,ctx)]));
        if (collapsed && attrs.name === 'Sidebar') {attrs.collapsed='true';node.parentElement.style.width='72px';}
        const holder=doc.createElement('div');holder.style.display='contents';holder.innerHTML=render(attrs.name,attrs);node.replaceWith(holder);return;
      }
      if (node.localName === 'sc-if') {
        if (!raw(node.getAttribute('value'),ctx)) {node.remove();return;}
      }
      if (node.localName === 'sc-for') {
        const list=raw(node.getAttribute('list'),ctx);
        if (!Array.isArray(list)) throw Error(`Invalid loop in ${name}`);
        for (const value of list) for (const child of [...node.childNodes]) {const copy=child.cloneNode(true);node.before(copy);visit(copy,{...ctx,[node.getAttribute('as')]:value});}
        node.remove();return;
      }
      for (const attribute of [...node.attributes]) node.setAttribute(attribute.name,interpolate(attribute.value,ctx));
      for (const child of [...node.childNodes]) visit(child,ctx);
      if (['x-dc','helmet','sc-if'].includes(node.localName)) node.replaceWith(...node.childNodes);
    }
    for (const child of [...doc.body.childNodes]) visit(child,context);
    // DOMParser may move styles into head while repairing custom wrappers.
    return [...doc.head.querySelectorAll('style')].map(n=>n.outerHTML).join('')+doc.body.innerHTML;
  }
  document.body.innerHTML=render(name);
  if (document.body.textContent.includes('{{')) throw Error(`Unresolved template: ${name}`);
}
