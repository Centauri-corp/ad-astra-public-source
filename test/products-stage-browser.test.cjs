'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {PRODUCT_SCENES}=require('../lib/products-solutions-graphics.cjs');
const html=fs.readFileSync(require.resolve('../public/products/index.html'),'utf8');
const source=fs.readFileSync(require.resolve('../public/products/app.js'),'utf8');

function browser({missingStage=false}={}){
  const nodes=[];
  const document={activeElement:null};
  for(const match of html.matchAll(/<[^>]+\bdata-product-(?:direction|panel)="[^"]+"[^>]*>/g)){
    const attributes=Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    const classes=new Set();
    const node={
      id:attributes.id,attributes,
      dataset:{productDirection:attributes['data-product-direction'],productPanel:attributes['data-product-panel']},
      tabIndex:Number(attributes.tabindex),hidden:/\bhidden(?:\s|>)/.test(match[0]),handlers:{},
      classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},
      setAttribute(name,value){attributes[name]=value;},
      getAttribute(name){return attributes[name];},
      addEventListener(name,handler){this.handlers[name]=handler;},
      focus(){document.activeElement=this;},
      emit(name,details={}){let prevented=false;this.handlers[name]?.({...details,preventDefault(){prevented=true;}});return prevented;}
    };
    nodes.push(node);
  }
  const controls=nodes.filter(n=>n.dataset.productDirection);
  const panels=nodes.filter(n=>n.dataset.productPanel);
  const stage={dataset:{}},heroLabel={textContent:''};
  document.querySelectorAll=selector=>selector==='[data-product-direction]'?controls:selector==='[data-product-panel]'?panels:[];
  document.querySelector=selector=>selector==='.stage-orbit'?(missingStage?null:stage):selector==='.hero-art [data-product-label]'?heroLabel:null;
  const unexpected=()=>{throw Error('A local scene selection attempted an external action');};
  vm.runInNewContext(source,{document,fetch:unexpected,requestAnimationFrame:unexpected,localStorage:{setItem:unexpected},navigator:{mediaDevices:{getUserMedia:unexpected}}});
  return {document,controls,panels,stage,heroLabel};
}

test('authored tabs expose distinct labelled panels and an accurate no-script default',()=>{
  const page=browser();
  assert.equal(page.controls.length,4);
  assert.equal(page.panels.length,4);
  for(const button of page.controls){
    const panel=page.panels.find(p=>p.id===button.attributes['aria-controls']);
    assert.equal(button.attributes.role,'tab');
    assert.equal(panel.attributes.role,'tabpanel');
    assert.equal(panel.attributes['aria-labelledby'],button.id);
    assert.equal(panel.dataset.productPanel,button.dataset.productDirection);
    assert.ok(html.includes(PRODUCT_SCENES[button.dataset.productDirection].title));
    assert.ok(html.includes(PRODUCT_SCENES[button.dataset.productDirection].description));
  }
  assert.deepEqual(page.panels.filter(p=>!p.hidden).map(p=>p.dataset.productPanel),['beyond-physics']);
  assert.deepEqual(page.controls.map(b=>b.attributes['aria-selected']),['true','false','false','false']);
  assert.deepEqual(page.controls.map(b=>b.tabIndex),[0,-1,-1,-1]);
});

test('vertical keyboard movement wraps and changes only focus until explicit selection',()=>{
  const page=browser();
  const [first,second,,last]=page.controls;
  first.focus();
  assert.equal(first.emit('keydown',{key:'ArrowDown'}),true);
  assert.equal(page.document.activeElement,second);
  assert.equal(page.stage.dataset.motif,'orbital-knowledge-field');
  assert.equal(first.attributes['aria-selected'],'true');
  assert.equal(second.emit('keydown',{key:'End'}),true);
  assert.equal(page.document.activeElement,last);
  last.emit('keydown',{key:'ArrowDown'});
  assert.equal(page.document.activeElement,first);
  first.emit('keydown',{key:'ArrowUp'});
  assert.equal(page.document.activeElement,last);
  last.emit('keydown',{key:'Home'});
  assert.equal(page.document.activeElement,first);
  for(const key of ['Tab','ArrowLeft','ArrowRight','Enter',' '])assert.equal(first.emit('keydown',{key}),false);
  first.emit('keydown',{key:'ArrowDown'});
  second.emit('blur',{relatedTarget:page.panels[0]});
  assert.deepEqual(page.controls.map(button=>button.tabIndex),[0,-1,-1,-1]);
});

test('explicit selection synchronizes motif, accessible readout and the sole active tab',()=>{
  const page=browser();
  for(const button of page.controls){
    button.emit('click');
    const id=button.dataset.productDirection;
    assert.equal(page.stage.dataset.motif,PRODUCT_SCENES[id].motif);
    assert.deepEqual(page.panels.filter(p=>!p.hidden).map(p=>p.dataset.productPanel),[id]);
    assert.deepEqual(page.controls.filter(b=>b.attributes['aria-selected']==='true'),[button]);
    assert.deepEqual(page.controls.filter(b=>b.tabIndex===0),[button]);
    assert.equal(button.classList.contains('active'),true);
  }
});

test('inherited or unknown directions cannot corrupt the stage and missing markup stays inert',()=>{
  const page=browser();
  for(const id of ['constructor','__proto__','unknown']){
    page.controls[1].dataset.productDirection=id;
    page.controls[1].emit('click');
    assert.equal(page.stage.dataset.motif,'orbital-knowledge-field');
    assert.equal(page.panels.filter(p=>!p.hidden).length,1);
    assert.equal(page.panels[0].hidden,false);
  }
  assert.doesNotThrow(()=>browser({missingStage:true}));
});
