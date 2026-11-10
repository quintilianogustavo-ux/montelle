"use strict";
/* =====================================================================
   loja.js - comportamento da página do CLIENTE (index.html)
   RF01-RF08, RF21, RF22, RN01-RN04, RN08, RN17, RII02-RII11, RII15, RII19
   ===================================================================== */
(function () {
  const $ = (s) => document.querySelector(s);
  const { esc, brl, toast } = Util;

  // Estado atual da tela (o que o cliente escolheu até agora)
  let categoriaAtual = "todas";
  let termoBusca = "";
  let produtoAberto = null;
  let selTam = null;
  let selCor = null;
  let tokenCompra = null;   // identifica UMA tentativa de compra (RN17)
  let enviando = false;

  const produtosVisiveis = () => Store.listarProdutos().filter((p) => p.ativo); // RN01
  const unicos = (arr) => [...new Set(arr)];
  const achaVar = (p, t, c) => p.variacoes.find((v) => v.tamanho === t && v.cor === c);

  function visualHTML(p, classe = "visual") {
    const conteudo = p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}">` : `<span aria-hidden="true">${esc(p.emoji || "🛍️")}</span>`;
    return `<div class="${classe}" style="background:${esc(p.fundo || "#eee")}">${conteudo}</div>`;
  }

  // ---------------- CATEGORIAS (RF03) ----------------
  function renderCategorias() {
    const cats = Store.listarCategorias();
    const botoes = [{ id: "todas", nome: "Todas" }, ...cats];
    $("#categorias").innerHTML = botoes
      .map((c) => `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${c.id === categoriaAtual}">${esc(c.nome)}</button>`)
      .join("");
  }

  // ---------------- CATÁLOGO (RF01, RF02, RF04) ----------------
  function renderCatalogo() {
    let lista = produtosVisiveis();
    if (categoriaAtual !== "todas") lista = lista.filter((p) => p.categoriaId === categoriaAtual);
    if (termoBusca) {
      const t = termoBusca.toLowerCase();
      lista = lista.filter((p) => (p.nome + " " + p.descricao).toLowerCase().includes(t));
    }
    $("#resultado-info").textContent = termoBusca ? `${lista.length} resultado(s) para "${termoBusca}"` : "";

    if (!lista.length) {
      $("#grade").innerHTML = `<p class="vazio">Nenhum produto encontrado.</p>`;
      return;
    }
    $("#grade").innerHTML = lista
      .map((p) => {
        const total = Store.estoqueTotal(p);
        const etq = total === 0 ? ["indisponivel", "Esgotado"] : total <= 5 ? ["baixo", "Últimas unidades"] : ["ok", "Disponível"];
        return `<article class="card">
          <button class="card-btn" type="button" data-prod="${esc(p.id)}" aria-label="Ver detalhes de ${esc(p.nome)}">
            ${visualHTML(p)}
            <div class="card-corpo">
              <h3>${esc(p.nome)}</h3>
              <div class="preco">${brl(p.preco)}</div>
              <span class="etq ${etq[0]}">${etq[1]}</span>
            </div>
          </button>
        </article>`;
      })
      .join("");
  }

  // ---------------- DETALHES DO PRODUTO (RII05, RII06) ----------------
  function abrirProduto(id) {
    produtoAberto = produtosVisiveis().find((p) => p.id === id);
    if (!produtoAberto) return;
    const tams = unicos(produtoAberto.variacoes.map((v) => v.tamanho));
    const cores = unicos(produtoAberto.variacoes.map((v) => v.cor));
    selTam = tams.length === 1 ? tams[0] : null;   // se só há uma opção, já seleciona
    selCor = cores.length === 1 ? cores[0] : null;
    renderProduto();
    $("#dlg-produto").showModal();
  }

  function renderProduto() {
    const p = produtoAberto;
    const cat = (Store.listarCategorias().find((c) => c.id === p.categoriaId) || {}).nome || "";
    const tams = unicos(p.variacoes.map((v) => v.tamanho));
    const cores = unicos(p.variacoes.map((v) => v.cor));
    $("#dp-titulo").textContent = p.nome;

    // Uma opção fica desabilitada se não existir NENHUMA variação com estoque nela
    const temEstoque = (campo, valor) => p.variacoes.some((v) => v[campo] === valor && v.estoque > 0);

    let disp = `<p class="dica">Selecione tamanho e cor.</p>`;
    let podeComprar = false;
    if (selTam && selCor) {
      const v = achaVar(p, selTam, selCor);
      if (!v) disp = `<p class="erro">Combinação indisponível.</p>`;
      else if (v.estoque === 0) disp = `<span class="etq indisponivel">Esgotado nesta combinação</span>`;
      else { disp = `<span class="etq ${v.estoque <= 3 ? "baixo" : "ok"}">${v.estoque} em estoque</span>`; podeComprar = true; }
    }

    $("#dp-corpo").innerHTML = `
      ${visualHTML(p, "visual visual-grande")}
      <p class="dica">${esc(cat)}</p>
      <p>${esc(p.descricao)}</p>
      <p class="preco" style="font-size:1.4rem">${brl(p.preco)}</p>
      <div class="rotulo" id="lbl-tam">Tamanho</div>
      <div class="opcoes" role="group" aria-labelledby="lbl-tam">
        ${tams.map((t) => `<button type="button" class="opcao" data-tam="${esc(t)}" aria-pressed="${t === selTam}" ${temEstoque("tamanho", t) ? "" : "disabled"}>${esc(t)}</button>`).join("")}
      </div>
      <div class="rotulo" id="lbl-cor">Cor</div>
      <div class="opcoes" role="group" aria-labelledby="lbl-cor">
        ${cores.map((c) => `<button type="button" class="opcao" data-cor="${esc(c)}" aria-pressed="${c === selCor}" ${temEstoque("cor", c) ? "" : "disabled"}>${esc(c)}</button>`).join("")}
      </div>
      <div style="margin:.4rem 0 .8rem">${disp}</div>
      <div class="campo" style="max-width:130px">
        <label for="qtd">Quantidade</label>
        <input id="qtd" type="number" min="1" step="1" value="1" ${podeComprar ? "" : "disabled"}>
      </div>
      <button class="btn" type="button" id="btn-add" style="width:100%" ${podeComprar ? "" : "disabled"}>Adicionar ao carrinho</button>`;
  }

  // ---------------- CARRINHO (RF05, RF06) ----------------
  // Junta cada item do carrinho com o produto atual (para ter preço/estoque atualizados)
  function linhasCarrinho() {
    const prods = Store.listarProdutos();
    return Store.carrinho()
      .map((it, i) => {
        const p = prods.find((x) => x.id === it.produtoId);
        const v = p && achaVar(p, it.tamanho, it.cor);
        return p && p.ativo && v ? { ...it, i, p, v } : null;
      })
      .filter(Boolean);
  }

  function atualizarBadge() {
    $("#badge").textContent = Store.carrinho().reduce((s, i) => s + i.qtd, 0);
  }

  function adicionarAoCarrinho() {
    const p = produtoAberto;
    if (!selTam || !selCor) return toast("Selecione tamanho e cor.", "erro");
    const v = achaVar(p, selTam, selCor);
    const qtd = Number($("#qtd").value);
    if (!Number.isInteger(qtd) || qtd <= 0) return toast("Informe uma quantidade inteira maior que zero.", "erro"); // RN03
    const cart = Store.carrinho();
    const existente = cart.find((i) => i.produtoId === p.id && i.tamanho === selTam && i.cor === selCor);
    const jaTem = existente ? existente.qtd : 0;
    if (jaTem + qtd > v.estoque) return toast(`Estoque insuficiente. Você já tem ${jaTem} no carrinho e há ${v.estoque} disponível(is).`, "erro"); // RN03/RN04
    if (existente) existente.qtd += qtd;
    else cart.push({ produtoId: p.id, tamanho: selTam, cor: selCor, qtd });
    Store.salvarCarrinho(cart);
    atualizarBadge();
    $("#dlg-produto").close();
    toast("Produto adicionado ao carrinho!");
  }

  function renderCarrinho() {
    const linhas = linhasCarrinho();
    const corpo = $("#dc-corpo");
    if (!linhas.length) {
      corpo.innerHTML = `<p class="vazio">Seu carrinho está vazio.</p>`;
      return;
    }
    const total = linhas.reduce((s, l) => s + l.p.preco * l.qtd, 0);
    corpo.innerHTML =
      linhas.map((l) => `
        <div class="linha-carrinho">
          ${visualHTML(l.p, "mini-visual")}
          <div>
            <strong>${esc(l.p.nome)}</strong><br>
            <span class="dica">${esc(l.tamanho)} · ${esc(l.cor)} · ${brl(l.p.preco)}</span><br>
            <span class="qtd-ctrl">
              <button type="button" data-acao="menos" data-i="${l.i}" aria-label="Diminuir quantidade">−</button>
              <span aria-label="Quantidade">${l.qtd}</span>
              <button type="button" data-acao="mais" data-i="${l.i}" aria-label="Aumentar quantidade">+</button>
            </span>
          </div>
          <div style="text-align:right">
            <strong>${brl(l.p.preco * l.qtd)}</strong><br>
            <button type="button" class="btn sec mini" data-acao="remover" data-i="${l.i}">Remover</button>
          </div>
        </div>`).join("") +
      `<div class="total-linha"><span>Total</span><span>${brl(total)}</span></div>
       <button class="btn" type="button" id="btn-checkout" style="width:100%">Finalizar compra</button>`;
  }

  function mexerNoCarrinho(acao, i) {
    const cart = Store.carrinho();
    const it = cart[i];
    if (!it) return;
    if (acao === "remover") cart.splice(i, 1);
    if (acao === "menos") { it.qtd -= 1; if (it.qtd <= 0) cart.splice(i, 1); }
    if (acao === "mais") {
      const p = Store.listarProdutos().find((x) => x.id === it.produtoId);
      const v = p && achaVar(p, it.tamanho, it.cor);
      if (!v || it.qtd + 1 > v.estoque) return toast("Quantidade máxima em estoque atingida.", "erro");
      it.qtd += 1;
    }
    Store.salvarCarrinho(cart);
    atualizarBadge();
    renderCarrinho();
  }

  // ---------------- FINALIZAR COMPRA (RF07, RF08, RF21) ----------------
  function abrirCheckout() {
    const linhas = linhasCarrinho();
    if (!linhas.length) return toast("Seu carrinho está vazio.", "erro");
    tokenCompra = Util.uid(); // novo "código" para esta tentativa de compra
    const total = linhas.reduce((s, l) => s + l.p.preco * l.qtd, 0);
    $("#dk-resumo").innerHTML =
      linhas.map((l) => `${l.qtd}× ${esc(l.p.nome)} (${esc(l.tamanho)}/${esc(l.cor)}) — ${brl(l.p.preco * l.qtd)}`).join("<br>") +
      `<br><strong>Total: ${brl(total)}</strong>`;
    $("#ck-pag").innerHTML = `<option value="">Selecione...</option>` + Store.config().pagamentos.map((f) => `<option>${esc(f)}</option>`).join("");
    document.querySelectorAll("#form-checkout .erro").forEach((e) => (e.textContent = ""));
    document.querySelectorAll("#form-checkout [aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
    $("#dlg-carrinho").close();
    $("#dlg-checkout").showModal();
  }

  function marcar(idCampo, idErro, msg) {
    const c = $(idCampo);
    $(idErro).textContent = msg || "";
    if (msg) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
    return !msg;
  }

  function validarFormulario() {
    const nome = $("#ck-nome").value.trim();
    const email = $("#ck-email").value.trim();
    const tel = $("#ck-tel").value.replace(/\D/g, "");
    const end = $("#ck-end").value.trim();
    const pag = $("#ck-pag").value;
    const r = [
      marcar("#ck-nome", "#err-nome", nome.length < 3 ? "Informe seu nome completo." : ""),
      marcar("#ck-email", "#err-email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "" : "Informe um e-mail válido."),
      marcar("#ck-tel", "#err-tel", tel.length < 10 || tel.length > 11 ? "Informe um telefone com DDD." : ""),
      marcar("#ck-end", "#err-end", end.length < 8 ? "Informe o endereço completo." : ""),
      marcar("#ck-pag", "#err-pag", pag ? "" : "Escolha uma forma de pagamento."),
    ];
    return r.every(Boolean) ? { nome, email, telefone: $("#ck-tel").value.trim(), endereco: end, pagamento: pag } : null;
  }

  function confirmarPedido(e) {
    e.preventDefault();
    if (enviando) return;               // impede clique duplo (RN17)
    const dados = validarFormulario();  // RII16: formulário inválido não é enviado
    if (!dados) return toast("Corrija os campos destacados.", "erro");

    enviando = true;
    const btn = $("#btn-confirmar");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>Processando...`; // RII15

    setTimeout(() => {
      const itens = Store.carrinho();
      const { pagamento, ...cliente } = dados;
      const res = Store.criarPedido(itens, cliente, pagamento, tokenCompra);
      enviando = false;
      btn.disabled = false;
      btn.textContent = "Confirmar pedido";
      if (!res.ok) { toast(res.erro, "erro"); renderCarrinho(); return; }

      Store.salvarCarrinho([]);
      atualizarBadge();
      $("#dlg-checkout").close();
      $("#form-checkout").reset();
      mostrarConfirmacao(res.pedido);
      renderCatalogo(); // o estoque mudou
    }, 700);
  }

  // RII19 - mensagem final com número do pedido e resumo
  function mostrarConfirmacao(ped) {
    $("#dok-corpo").innerHTML = `
      <h2 id="dok-titulo">Pedido confirmado! 🎉</h2>
      <p>Número do pedido</p>
      <p class="num">${esc(ped.id)}</p>
      <div class="resumo-ped" style="text-align:left">
        ${ped.itens.map((l) => `${l.qtd}× ${esc(l.nome)} (${esc(l.tamanho)}/${esc(l.cor)}) — ${brl(l.precoUnit * l.qtd)}`).join("<br>")}
        <br><strong>Total: ${brl(ped.total)}</strong><br>
        Pagamento: ${esc(ped.pagamento)}<br>
        Entrega: ${esc(ped.cliente.endereco)}
      </div>
      <p class="dica">Guarde o número do pedido para acompanhamento.</p>
      <button class="btn" type="button" data-fechar>Continuar comprando</button>`;
    $("#dlg-ok").showModal();
  }

  // ---------------- EVENTOS (ligam tudo) ----------------
  $("#categorias").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    categoriaAtual = b.dataset.cat;
    renderCategorias();
    renderCatalogo();
  });
  $("#grade").addEventListener("click", (e) => {
    const b = e.target.closest("[data-prod]");
    if (b) abrirProduto(b.dataset.prod);
  });
  $("#form-busca").addEventListener("submit", (e) => { e.preventDefault(); termoBusca = $("#busca").value.trim(); renderCatalogo(); });
  $("#busca").addEventListener("input", (e) => { termoBusca = e.target.value.trim(); renderCatalogo(); });

  $("#dp-corpo").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tam]");
    const c = e.target.closest("[data-cor]");
    if (t) { selTam = t.dataset.tam; renderProduto(); }
    else if (c) { selCor = c.dataset.cor; renderProduto(); }
    else if (e.target.id === "btn-add") adicionarAoCarrinho();
  });

  $("#btn-carrinho").addEventListener("click", () => { renderCarrinho(); $("#dlg-carrinho").showModal(); });
  $("#dc-corpo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (b) mexerNoCarrinho(b.dataset.acao, Number(b.dataset.i));
    if (e.target.id === "btn-checkout") abrirCheckout();
  });
  $("#form-checkout").addEventListener("submit", confirmarPedido);

  // ---------------- INÍCIO ----------------
  renderCategorias();
  renderCatalogo();
  atualizarBadge();
})();
