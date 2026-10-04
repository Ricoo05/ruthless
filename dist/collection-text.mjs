// Template contents are inert and never attached to the document. Only plain
// strings leave this parser; no source nodes, attributes or URLs are rendered.
export function extractSourceText(html,documentRef=document){
  const template=documentRef.createElement('template');template.innerHTML=html;
  template.content.querySelectorAll('script,style,template,noscript,iframe,object,embed,svg,math,head,[hidden],[aria-hidden="true"]').forEach(node=>node.remove());
  const blocks=new Set(['P','DIV','SECTION','ARTICLE','H1','H2','H3','H4','H5','H6','LI','UL','OL','BLOCKQUOTE','PRE','TABLE','TR']);
  const output=[];
  function walk(node,depth=0){
    if(depth>100)throw new Error('Source HTML nesting exceeds the extraction limit.');
    if(node.nodeType===3){output.push(node.nodeValue);return;}
    if(node.nodeType!==1&&node.nodeType!==11)return;
    if(node.nodeType===1&&/display\s*:\s*none|visibility\s*:\s*hidden/i.test(node.getAttribute('style')??''))return;
    if(node.nodeName==='BR'){output.push('\n');return;}
    const block=blocks.has(node.nodeName);if(block)output.push('\n\n');
    for(const child of node.childNodes)walk(child,depth+1);
    if(node.nodeName==='TD'||node.nodeName==='TH')output.push(' ');
    if(block)output.push('\n\n');
  }
  walk(template.content);
  return output.join('').replace(/\r/g,'').replace(/[\t\f\v ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
