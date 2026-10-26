const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const KEY='montelle_db_v1';
const seed=()=>({seq:1,cats:['Camisetas','Vestidos','Calças','Acessórios'],pays:['Pix','Cartão de crédito','Pagamento na retirada'],log:[],orders:[],
 products:[
 {id:1,name:'Camiseta Básica Algodão',desc:'Camiseta 100% algodão, modelagem reta.',cat:'Camisetas',price:59.9,active:1,min:3,em:'👕',v:[{s:'P',c:'Branco',q:8},{s:'M',c:'Branco',q:6},{s:'M',c:'Preto',q:2},{s:'G',c:'Preto',q:5}]},
 {id:2,name:'Camiseta Oversized',desc:'Tecido encorpado, caimento amplo.',cat:'Camisetas',price:89.9,active:1,min:3,em:'👚',v:[{s:'M',c:'Cinza',q:7},{s:'G',c:'Cinza',q:4}]},
 {id:3,name:'Vestido Midi Floral',desc:'Vestido leve com estampa floral.',cat:'Vestidos',price:179.9,active:1,min:2,em:'👗',v:[{s:'P',c:'Floral',q:3},{s:'M',c:'Floral',q:4},{s:'G',c:'Floral',q:1}]},
 {id:4,name:'Vestido Preto Clássico',desc:'Corte elegante para qualquer ocasião.',cat:'Vestidos',price:219,active:1,min:2,em:'🖤',v:[{s:'M',c:'Preto',q:5}]},
 {id:5,name:'Calça Jeans Reta',desc:'Jeans com elastano, cintura alta.',cat:'Calças',price:199.9,active:1,min:3,em:'👖',v:[{s:'38',c:'Azul',q:6},{s:'40',c:'Azul',q:6},{s:'42',c:'Azul',q:0}]},
 {id:6,name:'Calça de Alfaiataria',desc:'Tecido fluido com vinco marcado.',cat:'Calças',price:229.9,active:1,min:2,em:'🩳',v:[{s:'38',c:'Bege',q:3},{s:'40',c:'Bege',q:2}]},
 {id:7,name:'Bolsa Tiracolo',desc:'Bolsa compacta em couro sintético.',cat:'Acessórios',price:149.9,active:1,min:2,em:'👜',v:[{s:'Único',c:'Caramelo',q:9}]},
 {id:8,name:'Cinto de Couro',desc:'Cinto clássico com fivela metálica.',cat:'Acessórios',price:79.9,active:1,min:2,em:'🧣',v:[{s:'Único',c:'Marrom',q:12}]}]});
let mem=null;
function load(){try{const r=localStorage.getItem(KEY);if(r)return JSON.parse(r)}catch(e){}return mem||seed()}
let DB=load();
function save(){mem=DB;try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}}
const S={view:'store',cat:'Todas',q:'',cart:[],admin:false,tab:'prod',user:'admin',ck:false};
let busy=false;
function toast(m,t=2600){const e=$('#toast');e.textContent=m;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',t)}
function modal(h){$('#md').innerHTML=h;$('#ov').classList.add('on')}
function close(){$('#ov').classList.remove('on')}
$('#ov').addEventListener('click',e=>{if(e.target.id==='ov')close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
function ask(msg,fn){modal(`<h2>Confirmação</h2><p>${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button onclick="close()">Cancelar</button><button class="p" id="yes">Confirmar</button></div>`);$('#yes').onclick=()=>{close();fn()}}
function audit(a){DB.log.unshift({d:new Date().toLocaleString('pt-BR'),u:S.user,a});DB.log=DB.log.slice(0,100)}
const stockOf=p=>p.v.reduce((a,x)=>a+x.q,0);
function go(v){S.view=v;render()}
function render(){
  $('#cc').textContent=S.cart.reduce((a,i)=>a+i.qty,0);
  $('#app').innerHTML=S.view==='store'?storeView():(S.admin?adminView():loginView());
}
/* ---------- LOJA ---------- */
function storeView(){
  const t=S.q.trim().toLowerCase();
  const list=DB.products.filter(p=>p.active&&(S.cat==='Todas'||p.cat===S.cat)&&(!t||(p.name+' '+p.desc+' '+p.cat).toLowerCase().includes(t)));
  const chips=['Todas',...DB.cats].map(c=>`<button class="chip ${S.cat===c?'on':''}" onclick="S.cat='${esc(c)}';render()">${esc(c)}</button>`).join('');
  return `<h1 style="font-family:Georgia,serif">Catálogo</h1><div class="chips" role="group" aria-label="Categorias">${chips}</div>`+
  (list.length?`<div class="grid">${list.map(p=>{const q=stockOf(p);const st=q===0?'<span class="tag bad">Esgotado</span>':q<=p.min?'<span class="tag warn">Últimas unidades</span>':'<span class="tag ok">Disponível</span>';
  return `<div class="card" tabindex="0" onclick="detail(${p.id})" onkeydown="if(event.key==='Enter')detail(${p.id})"><div class="ph">${p.em}</div><div class="b"><div>${esc(p.name)}</div><div class="price">${brl(p.price)}</div>${st}</div></div>`}).join('')}</div>`:'<p class="mut">Nenhum produto encontrado.</p>');
}
function detail(id){
  const p=DB.products.find(x=>x.id===id);if(!p)return;
  const sizes=[...new Set(p.v.filter(x=>x.q>0).map(x=>x.s))];
  if(!sizes.length){modal(`<h2>${esc(p.name)}</h2><div class="ph" style="border-radius:8px">${p.em}</div><p>${esc(p.desc)}</p><p class="bad">Produto esgotado.</p><button onclick="close()">Fechar</button>`);return}
  modal(`<h2>${esc(p.name)}</h2><div class="ph" style="border-radius:8px">${p.em}</div><p>${esc(p.desc)}</p><p class="mut">Categoria: ${esc(p.cat)}</p><div class="price" style="font-size:1.3rem">${brl(p.price)}</div>
  <div class="row"><div><label for="ds">Tamanho</label><select id="ds" onchange="fillColors(${id})">${sizes.map(s=>`<option>${esc(s)}</option>`).join('')}</select></div>
  <div><label for="dc">Cor</label><select id="dc" onchange="showQ(${id})"></select></div>
  <div><label for="dq">Quantidade</label><input id="dq" type="number" min="1" value="1"></div></div>
  <p id="dst" class="mut"></p><div class="err" id="de"></div>
  <div class="row" style="justify-content:flex-end"><button onclick="close()">Fechar</button><button class="p" onclick="addCart(${id})">Adicionar ao carrinho</button></div>`);
  fillColors(id);
}
function fillColors(id){const p=DB.products.find(x=>x.id===id),s=$('#ds').value;$('#dc').innerHTML=p.v.filter(x=>x.s===s&&x.q>0).map(x=>`<option>${esc(x.c)}</option>`).join('');showQ(id)}
function showQ(id){const p=DB.products.find(x=>x.id===id),v=p.v.find(x=>x.s===$('#ds').value&&x.c===$('#dc').value);$('#dst').textContent=v?(v.q+' unidade(s) em estoque'):''}
const varOf=(p,s,c)=>p.v.find(x=>x.s===s&&x.c===c);
function addCart(id){
  const p=DB.products.find(x=>x.id===id),s=$('#ds').value,c=$('#dc').value,n=Number($('#dq').value),v=varOf(p,s,c);
  if(!Number.isInteger(n)||n<1){$('#de').textContent='Informe uma quantidade inteira e positiva.';return}
  const ex=S.cart.find(i=>i.pid===id&&i.s===s&&i.c===c),tot=n+(ex?ex.qty:0);
  if(!v||tot>v.q){$('#de').textContent='Quantidade acima do estoque disponível ('+(v?v.q:0)+').';return}
  if(ex)ex.qty=tot;else S.cart.push({pid:id,s,c,qty:n});
  close();render();toast('Produto adicionado ao carrinho.');
}
function cartLines(){return S.cart.map(i=>{const p=DB.products.find(x=>x.id===i.pid);return {...i,p,v:p&&varOf(p,i.s,i.c)}}).filter(l=>l.p)}
const cartTotal=()=>cartLines().reduce((a,l)=>a+l.p.price*l.qty,0);
function openCart(){
  S.ck=false;const L=cartLines();
  if(!L.length){modal('<h2>Carrinho</h2><p class="mut">Seu carrinho está vazio.</p><button onclick="close()">Fechar</button>');return}
  modal(`<h2>Seu carrinho</h2><div class="tw"><table><tr><th>Produto</th><th>Qtd</th><th>Subtotal</th><th></th></tr>${L.map((l,i)=>`<tr><td>${esc(l.p.name)}<br><small class="mut">${esc(l.s)} · ${esc(l.c)} · ${brl(l.p.price)}</small></td><td><input type="number" min="1" value="${l.qty}" style="width:70px" aria-label="Quantidade" onchange="setQty(${i},this.value)"></td><td>${brl(l.p.price*l.qty)}</td><td><button class="d" aria-label="Remover" onclick="S.cart.splice(${i},1);render();openCart()">✕</button></td></tr>`).join('')}</table></div>
  <p style="text-align:right;font-size:1.2rem">Total: <b>${brl(cartTotal())}</b></p>
  <div class="row" style="justify-content:flex-end"><button onclick="close()">Continuar comprando</button><button class="p" onclick="checkout()">Finalizar compra</button></div>`);
}
function setQty(i,v){const l=cartLines()[i],n=Number(v);if(!Number.isInteger(n)||n<1){toast('Quantidade inválida.');return openCart()}
  if(!l.v||n>l.v.q){toast('Acima do estoque disponível.');return openCart()}S.cart[i].qty=n;render();openCart()}
function checkout(){
  modal(`<h2>Finalizar compra</h2><form id="f" onsubmit="return false" novalidate>
  <label for="n">Nome completo <i>*</i></label><input id="n" autocomplete="name"><div class="err" data-e="n"></div>
  <div class="row"><div><label for="em">E-mail <i>*</i></label><input id="em" type="email" autocomplete="email"><div class="err" data-e="em"></div></div>
  <div><label for="tl">Telefone <i>*</i></label><input id="tl" type="tel" autocomplete="tel" placeholder="(41) 99999-9999"><div class="err" data-e="tl"></div></div></div>
  <label for="ad">Endereço de entrega <i>*</i></label><input id="ad" autocomplete="street-address"><div class="err" data-e="ad"></div>
  <label for="pg">Forma de pagamento <i>*</i></label><select id="pg">${DB.pays.map(x=>`<option>${esc(x)}</option>`).join('')}</select>
  <p class="mut" style="font-size:.8rem">Seus dados pessoais serão usados somente para o processamento do pedido (LGPD).</p>
  <p style="text-align:right">Total: <b>${brl(cartTotal())}</b></p>
  <div class="row" style="justify-content:flex-end"><button type="button" onclick="openCart()">Voltar</button><button type="button" class="p" id="ok" onclick="placeOrder()">Confirmar pedido</button></div></form>`);
}
function placeOrder(){
  if(busy)return;
  const g=id=>$('#'+id).value.trim(),E={};
  if(g('n').length<3)E.n='Informe seu nome completo.';
  if(!/^\S+@\S+\.\S+$/.test(g('em')))E.em='Informe um e-mail válido.';
  if(g('tl').replace(/\D/g,'').length<10)E.tl='Informe um telefone válido com DDD.';
  if(g('ad').length<8)E.ad='Informe o endereço completo.';
  document.querySelectorAll('[data-e]').forEach(e=>e.textContent=E[e.dataset.e]||'');
  if(Object.keys(E).length)return;
  // RN08: revalida estoque
  const L=cartLines();
  for(const l of L){if(!l.p.active||!l.v||l.qty>l.v.q){toast('Estoque insuficiente para "'+l.p.name+'". Revise o carrinho.',4000);return openCart()}}
  busy=true;$('#ok').disabled=true;$('#ok').innerHTML='<span class="sp"></span>';
  setTimeout(()=>{
    L.forEach(l=>l.v.q-=l.qty);                               // RF15
    const id='MT-'+String(DB.seq++).padStart(6,'0');           // RN11
    DB.orders.unshift({id,date:new Date().toLocaleString('pt-BR'),status:'Pendente',
      cli:{n:g('n'),em:g('em'),tl:g('tl'),ad:g('ad')},pay:$('#pg').value,
      items:L.map(l=>({pid:l.pid,name:l.p.name,s:l.s,c:l.c,qty:l.qty,price:l.p.price})),   // RN12/RN19
      total:cartTotal()});
    const o=DB.orders[0];save();S.cart=[];busy=false;render();
    modal(`<h2>Pedido confirmado! 🎉</h2><p>Número do pedido: <b>${o.id}</b></p><ul>${o.items.map(i=>`<li>${i.qty}× ${esc(i.name)} (${esc(i.s)}/${esc(i.c)})</li>`).join('')}</ul><p>Total: <b>${brl(o.total)}</b> · ${esc(o.pay)}</p><button class="p" onclick="close()">Voltar à loja</button>`);
  },700);
}
/* ---------- ADMIN ---------- */
function loginView(){return `<div class="md" style="max-width:380px"><h2>Acesso administrativo</h2><form onsubmit="return false"><label for="lu">Usuário</label><input id="lu" autocomplete="username"><label for="lp">Senha</label><input id="lp" type="password" autocomplete="current-password"><div class="err" id="le"></div><button class="p" style="width:100%;margin-top:.5rem" onclick="login()">Entrar</button><p class="mut" style="font-size:.8rem">Demonstração: <b>admin</b> / <b>montelle123</b>. Em produção, a autenticação deve ser feita no servidor.</p></form></div>`}
function login(){if($('#lu').value==='admin'&&$('#lp').value==='montelle123'){S.admin=true;audit('Login no painel');save();render()}else $('#le').textContent='Usuário ou senha inválidos.'}
function logout(){S.admin=false;render()}
function adminView(){
  const T=[['prod','Produtos'],['cat','Categorias'],['est','Estoque'],['ped','Pedidos'],['ven','Vendas'],['aud','Auditoria']];
  return `<div class="row" style="margin-bottom:.5rem"><h1 style="font-family:Georgia,serif;margin:0">Painel administrativo</h1><button onclick="logout()">Sair</button></div>
  <div class="tabs">${T.map(t=>`<button class="${S.tab===t[0]?'on':''}" onclick="S.tab='${t[0]}';render()">${t[1]}</button>`).join('')}</div>`+({prod:aProd,cat:aCat,est:aEst,ped:aPed,ven:aVen,aud:aAud}[S.tab])();
}
function aProd(){
  return `<button class="p" onclick="prodForm()">+ Novo produto</button><div class="tw" style="margin-top:.8rem"><table><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Situação</th><th></th></tr>
  ${DB.products.map(p=>`<tr><td>${p.em} ${esc(p.name)}</td><td>${esc(p.cat)}</td><td>${brl(p.price)}</td><td>${stockOf(p)}</td><td>${p.active?'<span class="ok">Ativo</span>':'<span class="mut">Inativo</span>'}</td>
  <td style="white-space:nowrap"><button onclick="prodForm(${p.id})">Editar</button> <button class="d" onclick="delProd(${p.id})">Excluir</button></td></tr>`).join('')}</table></div>`;
}
function prodForm(id){
  const p=id?DB.products.find(x=>x.id===id):{name:'',desc:'',cat:DB.cats[0],price:'',min:3,em:'👕',active:1,v:[{s:'M',c:'Único',q:0}]};
  modal(`<h2>${id?'Editar':'Novo'} produto</h2><form onsubmit="return false" novalidate>
  <label for="pn">Nome <i>*</i></label><input id="pn" value="${esc(p.name)}">
  <label for="pd">Descrição</label><textarea id="pd" rows="2">${esc(p.desc)}</textarea>
  <div class="row"><div><label for="pc">Categoria</label><select id="pc">${DB.cats.map(c=>`<option ${c===p.cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
  <div><label for="pp">Preço (R$) <i>*</i></label><input id="pp" type="number" min="0" step="0.01" value="${p.price}"></div>
  <div><label for="pm">Estoque mínimo</label><input id="pm" type="number" min="0" value="${p.min}"></div>
  <div><label for="pe">Ícone</label><input id="pe" value="${esc(p.em)}" maxlength="2"></div></div>
  <label for="pv">Variações — uma por linha: Tamanho, Cor, Quantidade</label><textarea id="pv" rows="5">${p.v.map(x=>[x.s,x.c,x.q].join(', ')).join('\n')}</textarea>
  <label><input type="checkbox" id="pa" ${p.active?'checked':''} style="width:auto"> Produto ativo no catálogo</label>
  <div class="err" id="pe2"></div><div class="row" style="justify-content:flex-end"><button type="button" onclick="close()">Cancelar</button><button type="button" class="p" onclick="saveProd(${id||0})">Salvar</button></div></form>`);
}
function saveProd(id){
  const name=$('#pn').value.trim(),price=parseFloat($('#pp').value),err=m=>$('#pe2').textContent=m;
  if(!name)return err('Informe o nome do produto.');
  if(!(price>=0))return err('Informe um preço válido (não negativo).');
  const v=[];
  for(const ln of $('#pv').value.split('\n').map(x=>x.trim()).filter(Boolean)){
    const [s,c,q]=ln.split(',').map(x=>x.trim()),n=Number(q);
    if(!s||!c||!Number.isInteger(n)||n<0)return err('Variação inválida: "'+ln+'". Use Tamanho, Cor, Quantidade (inteiro ≥ 0).');
    if(v.some(x=>x.s===s&&x.c===c))return err('Variação repetida: '+s+' / '+c);
    v.push({s,c,q:n});
  }
  if(!v.length)return err('Cadastre ao menos uma variação.');
  const d={name,desc:$('#pd').value.trim(),cat:$('#pc').value,price,min:Math.max(0,parseInt($('#pm').value)||0),em:$('#pe').value||'👕',active:$('#pa').checked?1:0,v};
  if(id){const p=DB.products.find(x=>x.id===id);if(p.price!==price)audit(`Preço de "${name}": ${brl(p.price)} → ${brl(price)}`);Object.assign(p,d);audit('Produto editado: '+name)}
  else{DB.products.push({id:Date.now(),...d});audit('Produto cadastrado: '+name)}
  save();close();render();toast('Produto salvo com sucesso.');
}
function delProd(id){const p=DB.products.find(x=>x.id===id),used=DB.orders.some(o=>o.items.some(i=>i.pid===id));
  ask(used?'Este produto possui pedidos registrados e será apenas desativado (histórico preservado). Continuar?':'Excluir "'+p.name+'" definitivamente?',()=>{
    if(used)p.active=0;else DB.products=DB.products.filter(x=>x.id!==id);
    S.cart=S.cart.filter(i=>i.pid!==id||used&&false);audit((used?'Produto desativado: ':'Produto excluído: ')+p.name);save();render();toast('Operação concluída.')})}
function aCat(){
  return `<div class="row" style="max-width:420px"><input id="nc" placeholder="Nova categoria" aria-label="Nova categoria"><button class="p" onclick="addCat()">Adicionar</button></div><div class="err" id="ce"></div>
  <div class="tw"><table>${DB.cats.map((c,i)=>`<tr><td>${esc(c)}</td><td>${DB.products.filter(p=>p.cat===c).length} produto(s)</td><td style="text-align:right"><button onclick="renCat(${i})">Renomear</button> <button class="d" onclick="delCat(${i})">Remover</button></td></tr>`).join('')}</table></div>`}
function addCat(){const v=$('#nc').value.trim();if(!v)return $('#ce').textContent='Informe o nome da categoria.';
  if(DB.cats.some(c=>c.toLowerCase()===v.toLowerCase()))return $('#ce').textContent='Categoria já existe.';DB.cats.push(v);audit('Categoria criada: '+v);save();render();toast('Categoria criada.')}
function renCat(i){modal(`<h2>Renomear categoria</h2><input id="rc" value="${esc(DB.cats[i])}"><div class="err" id="re"></div><div class="row" style="justify-content:flex-end;margin-top:.6rem"><button onclick="close()">Cancelar</button><button class="p" onclick="doRen(${i})">Salvar</button></div>`)}
function doRen(i){const v=$('#rc').value.trim();if(!v)return $('#re').textContent='Informe um nome.';const o=DB.cats[i];DB.products.forEach(p=>{if(p.cat===o)p.cat=v});DB.cats[i]=v;audit(`Categoria ${o} → ${v}`);save();close();render();toast('Categoria atualizada.')}
function delCat(i){const c=DB.cats[i];if(DB.products.some(p=>p.cat===c))return toast('Há produtos nesta categoria. Mova-os antes de remover.',3500);
  ask('Remover a categoria "'+c+'"?',()=>{DB.cats.splice(i,1);if(S.cat===c)S.cat='Todas';audit('Categoria removida: '+c);save();render();toast('Categoria removida.')})}
function aEst(){
  const low=DB.products.filter(p=>stockOf(p)<=p.min).length;
  return `<p>${low?`<span class="warn">⚠ ${low} produto(s) com estoque baixo ou indisponível.</span>`:'<span class="ok">Estoque dentro do esperado.</span>'}</p><div class="tw"><table><tr><th>Produto</th><th>Variação</th><th>Quantidade</th><th>Situação</th></tr>
  ${DB.products.flatMap(p=>p.v.map((v,j)=>{const t=stockOf(p);return `<tr class="${v.q===0?'out':t<=p.min?'low':''}"><td>${esc(p.name)}<br><small class="mut">mín. ${p.min}</small></td><td>${esc(v.s)} / ${esc(v.c)}</td>
  <td><input type="number" min="0" value="${v.q}" style="width:90px" aria-label="Estoque" onchange="setStock(${p.id},${j},this.value)"></td><td>${v.q===0?'<span class="bad">Indisponível</span>':t<=p.min?'<span class="warn">Estoque baixo</span>':'<span class="ok">OK</span>'}</td></tr>`})).join('')}</table></div>`}
function setStock(pid,j,val){const n=Number(val),p=DB.products.find(x=>x.id===pid);if(!Number.isInteger(n)||n<0){toast('Quantidade inválida.');return render()}
  audit(`Estoque "${p.name}" ${p.v[j].s}/${p.v[j].c}: ${p.v[j].q} → ${n}`);p.v[j].q=n;save();render();toast('Estoque atualizado.')}
const FLOW={Pendente:['Pago','Cancelado'],Pago:['Enviado','Cancelado'],Enviado:['Entregue','Cancelado'],Entregue:[],Cancelado:[]};
function aPed(){
  if(!DB.orders.length)return '<p class="mut">Nenhum pedido registrado ainda.</p>';
  return `<div class="tw"><table><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Total</th><th>Situação</th><th></th></tr>${DB.orders.map(o=>`<tr><td>${o.id}</td><td>${o.date}</td><td>${esc(o.cli.n)}</td><td>${brl(o.total)}</td>
  <td><select aria-label="Situação" onchange="setSt('${o.id}',this.value)"><option>${o.status}</option>${FLOW[o.status].map(s=>`<option>${s}</option>`).join('')}</select></td><td><button onclick="ordDet('${o.id}')">Detalhes</button></td></tr>`).join('')}</table></div>`}
function setSt(id,s){const o=DB.orders.find(x=>x.id===id);if(!FLOW[o.status].includes(s))return render();
  const run=()=>{if(s==='Cancelado')o.items.forEach(i=>{const p=DB.products.find(x=>x.id===i.pid),v=p&&varOf(p,i.s,i.c);if(v)v.q+=i.qty}); // RN15
    audit(`Pedido ${id}: ${o.status} → ${s}`);o.status=s;save();render();toast('Situação atualizada.')};
  s==='Cancelado'?ask('Cancelar o pedido '+id+'? O estoque será devolvido.',run):run()}
function ordDet(id){const o=DB.orders.find(x=>x.id===id);modal(`<h2>Pedido ${o.id}</h2><p class="mut">${o.date} · ${o.status}</p><p><b>${esc(o.cli.n)}</b><br>${esc(o.cli.em)} · ${esc(o.cli.tl)}<br>${esc(o.cli.ad)}<br>Pagamento: ${esc(o.pay)}</p>
  <ul>${o.items.map(i=>`<li>${i.qty}× ${esc(i.name)} (${esc(i.s)}/${esc(i.c)}) — ${brl(i.price*i.qty)}</li>`).join('')}</ul><p>Total: <b>${brl(o.total)}</b></p><button onclick="close()">Fechar</button>`)}
function aVen(){
  const ok=DB.orders.filter(o=>o.status!=='Cancelado'),rev=ok.reduce((a,o)=>a+o.total,0),top={};
  ok.forEach(o=>o.items.forEach(i=>top[i.name]=(top[i.name]||0)+i.qty));
  const tp=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return `<div class="kpi"><div>Pedidos válidos<b>${ok.length}</b></div><div>Faturamento<b>${brl(rev)}</b></div><div>Ticket médio<b>${brl(ok.length?rev/ok.length:0)}</b></div><div>Cancelados<b>${DB.orders.length-ok.length}</b></div></div>
  <h3>Produtos mais vendidos</h3>${tp.length?`<table>${tp.map(t=>`<tr><td>${esc(t[0])}</td><td>${t[1]} un.</td></tr>`).join('')}</table>`:'<p class="mut">Sem vendas ainda.</p>'}
  <p><button class="d" onclick="ask('Restaurar dados de demonstração? Pedidos e alterações serão apagados.',()=>{DB=seed();save();S.cart=[];render()})">Restaurar dados de demonstração</button></p>`}
function aAud(){return DB.log.length?`<div class="tw"><table><tr><th>Data</th><th>Usuário</th><th>Operação</th></tr>${DB.log.map(l=>`<tr><td>${l.d}</td><td>${esc(l.u)}</td><td>${esc(l.a)}</td></tr>`).join('')}</table></div>`:'<p class="mut">Nenhuma operação registrada.</p>'}
render();
