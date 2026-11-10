"use strict";
/* =====================================================================
   admin.js - comportamento do PAINEL ADMINISTRATIVO (admin.html)
   RF09-RF20, RF22, RN09-RN15, RNF04, RNF14, RII11-RII14
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const { esc, brl, toast } = Util;

  const SESSAO = "montelle_admin_sessao";
  const USUARIO = "admin";
  const SENHA = "montelle123"; // DEMONSTRAÇÃO: num sistema real isso ficaria no servidor

  let abaAtual = "produtos";
  let soBaixo = false; // filtro da aba Estoque

  const logado = () => sessionStorage.getItem(SESSAO) === "1";
  const catNome = (id) => (Store.listarCategorias().find((c) => c.id === id) || { nome: "—" }).nome;
  const conteudo = $("#conteudo");

  // ---------------- LOGIN (RF09, RN10) ----------------
  function atualizarTela() {
    $("#tela-login").hidden = logado();
    $("#painel").hidden = !logado();
    $("#btn-sair").hidden = !logado();
    if (logado()) renderAba();
  }

  $("#form-login").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("#lg-user").value.trim() === USUARIO && $("#lg-pass").value === SENHA) {
      sessionStorage.setItem(SESSAO, "1");
      $("#lg-erro").textContent = "";
      $("#form-login").reset();
      atualizarTela();
    } else {
      $("#lg-erro").textContent = "Usuário ou senha incorretos.";
    }
  });
  $("#btn-sair").addEventListener("click", () => { sessionStorage.removeItem(SESSAO); atualizarTela(); });

  // ---------------- ABAS ----------------
  $("#abas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-aba]");
    if (b) { abaAtual = b.dataset.aba; renderAba(); }
  });

  function renderAba() {
    if (!logado()) return; // RN10: sem login, nada é desenhado
    document.querySelectorAll(".aba").forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === abaAtual));
    ({ produtos: abaProdutos, categorias: abaCategorias, estoque: abaEstoque, pedidos: abaPedidos, vendas: abaVendas, auditoria: abaAuditoria })[abaAtual]();
  }

  const etiqueta = (p) => {
    const s = Store.situacaoEstoque(p);
    return s === "indisponivel" ? `<span class="etq indisponivel">Indisponível</span>` : s === "baixo" ? `<span class="etq baixo">Estoque baixo</span>` : `<span class="etq ok">Ok</span>`;
  };

  // ---------------- PRODUTOS (RF10-RF12, RII13) ----------------
  function abaProdutos() {
    const ps = Store.listarProdutos();
    conteudo.innerHTML = `
      <div class="barra"><h2>Produtos</h2><button class="btn" data-acao="novo">+ Novo produto</button></div>
      <div class="tabela-wrap"><table>
        <caption class="sr-only">Lista de produtos cadastrados</caption>
        <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Situação</th><th>Catálogo</th><th>Ações</th></tr></thead>
        <tbody>${ps.length ? ps.map((p) => {
          const s = Store.situacaoEstoque(p);
          return `<tr class="${s === "indisponivel" ? "critico" : s === "baixo" ? "alerta" : ""}">
            <td>${esc(p.emoji || "")} ${esc(p.nome)}</td><td>${esc(catNome(p.categoriaId))}</td><td>${brl(p.preco)}</td>
            <td>${Store.estoqueTotal(p)}</td><td>${etiqueta(p)}</td><td>${p.ativo ? "Ativo" : "Inativo"}</td>
            <td><button class="btn sec mini" data-acao="editar" data-id="${esc(p.id)}">Editar</button>
                <button class="btn sec mini" data-acao="ativar" data-id="${esc(p.id)}">${p.ativo ? "Desativar" : "Ativar"}</button>
                <button class="btn perigo mini" data-acao="excluir" data-id="${esc(p.id)}">Excluir</button></td></tr>`;
        }).join("") : `<tr><td colspan="7" class="vazio">Nenhum produto cadastrado.</td></tr>`}</tbody>
      </table></div>`;
  }

  function linhaVariacao(v = { tamanho: "", cor: "", estoque: 0 }) {
    return `<div class="var-linha">
      <input aria-label="Tamanho" placeholder="Tamanho (ex.: M)" value="${esc(v.tamanho)}" data-f="tamanho">
      <input aria-label="Cor" placeholder="Cor (ex.: Preta)" value="${esc(v.cor)}" data-f="cor">
      <input aria-label="Estoque" type="number" min="0" step="1" value="${esc(v.estoque)}" data-f="estoque">
      <button type="button" class="btn sec mini" data-acao="rm-var" aria-label="Remover variação">×</button></div>`;
  }

  function abrirFormProduto(id) {
    const p = id ? Store.listarProdutos().find((x) => x.id === id) : null;
    const cats = Store.listarCategorias();
    if (!cats.length) return toast("Cadastre uma categoria antes.", "erro");
    $("#dlg-titulo").textContent = p ? "Editar produto" : "Novo produto";
    $("#dlg-corpo").innerHTML = `
      <form id="form-prod" novalidate data-id="${p ? esc(p.id) : ""}">
        <p class="dica">Campos com * são obrigatórios.</p>
        <div class="campo"><label for="f-nome">Nome *</label><input id="f-nome" value="${p ? esc(p.nome) : ""}"><span class="erro" id="e-nome"></span></div>
        <div class="campo"><label for="f-desc">Descrição</label><textarea id="f-desc" rows="2">${p ? esc(p.descricao) : ""}</textarea></div>
        <div class="campo"><label for="f-cat">Categoria *</label>
          <select id="f-cat">${cats.map((c) => `<option value="${esc(c.id)}" ${p && p.categoriaId === c.id ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></div>
        <div class="campo"><label for="f-preco">Preço (R$) *</label><input id="f-preco" type="number" step="0.01" min="0.01" value="${p ? p.preco : ""}"><span class="erro" id="e-preco"></span></div>
        <div class="campo"><label for="f-img">URL da imagem (opcional)</label><input id="f-img" value="${p ? esc(p.imagem || "") : ""}"></div>
        <div class="campo"><label for="f-emoji">Emoji de ilustração (opcional)</label><input id="f-emoji" maxlength="4" value="${p ? esc(p.emoji || "") : "👕"}"></div>
        <div class="campo"><label><input type="checkbox" id="f-ativo" ${!p || p.ativo ? "checked" : ""}> Produto ativo no catálogo</label></div>
        <div class="rotulo">Variações e estoque *</div>
        <div id="vars">${(p ? p.variacoes : [{ tamanho: "", cor: "Única", estoque: 0 }]).map(linhaVariacao).join("")}</div>
        <span class="erro" id="e-vars"></span>
        <button type="button" class="btn sec mini" data-acao="add-var">+ Adicionar variação</button>
        <hr>
        <button class="btn" type="submit">Salvar produto</button>
      </form>`;
    $("#dlg").showModal();
  }

  function salvarProduto(e) {
    e.preventDefault();
    const id = e.target.dataset.id;
    const nome = $("#f-nome").value.trim();
    const preco = Number($("#f-preco").value);
    let ok = true;
    $("#e-nome").textContent = nome.length < 2 ? ((ok = false), "Informe o nome do produto.") : "";
    $("#e-preco").textContent = !(preco > 0) ? ((ok = false), "Informe um preço maior que zero.") : ""; // RN02

    const variacoes = [...document.querySelectorAll("#vars .var-linha")].map((l) => ({
      tamanho: $('[data-f="tamanho"]', l).value.trim(),
      cor: $('[data-f="cor"]', l).value.trim() || "Única",
      estoque: Number($('[data-f="estoque"]', l).value),
    }));
    let msgVar = "";
    if (!variacoes.length) msgVar = "Adicione ao menos uma variação.";
    else if (variacoes.some((v) => !v.tamanho)) msgVar = "Todas as variações precisam de tamanho.";
    else if (variacoes.some((v) => !Number.isInteger(v.estoque) || v.estoque < 0)) msgVar = "Estoque deve ser um inteiro igual ou maior que zero.";
    else if (new Set(variacoes.map((v) => v.tamanho + "|" + v.cor)).size !== variacoes.length) msgVar = "Há variações repetidas (mesmo tamanho e cor).";
    $("#e-vars").textContent = msgVar;
    if (msgVar) ok = false;
    if (!ok) return toast("Corrija os campos destacados.", "erro");

    const lista = Store.listarProdutos();
    const dados = {
      nome, descricao: $("#f-desc").value.trim(), categoriaId: $("#f-cat").value, preco: Math.round(preco * 100) / 100,
      imagem: $("#f-img").value.trim(), emoji: $("#f-emoji").value.trim() || "🛍️", ativo: $("#f-ativo").checked, variacoes,
    };
    if (id) {
      const p = lista.find((x) => x.id === id);
      if (p.preco !== dados.preco) Store.registrar("Alteração de preço", `${p.nome}: ${brl(p.preco)} → ${brl(dados.preco)}`);
      Object.assign(p, dados);
      Store.registrar("Produto editado", p.nome);
    } else {
      lista.push({ id: Util.uid(), fundo: "#ece3d8", ...dados });
      Store.registrar("Produto cadastrado", nome);
    }
    Store.salvarProdutos(lista);
    $("#dlg").close();
    toast("Produto salvo com sucesso!");
    renderAba();
  }

  // ---------------- CATEGORIAS (RF13) ----------------
  function abaCategorias() {
    const cats = Store.listarCategorias();
    conteudo.innerHTML = `
      <div class="barra"><h2>Categorias</h2></div>
      <form id="form-cat" class="linha-cat" novalidate>
        <label class="sr-only" for="nova-cat">Nome da nova categoria</label>
        <input id="nova-cat" placeholder="Nova categoria"><button class="btn" type="submit">Adicionar</button></form>
      <div class="tabela-wrap" style="padding:.5rem 1rem">${cats.map((c) => `
        <div class="linha-cat"><label class="sr-only" for="c-${esc(c.id)}">Nome da categoria</label>
          <input id="c-${esc(c.id)}" value="${esc(c.nome)}">
          <button class="btn sec mini" data-acao="cat-salvar" data-id="${esc(c.id)}">Salvar</button>
          <button class="btn perigo mini" data-acao="cat-excluir" data-id="${esc(c.id)}">Excluir</button></div>`).join("") || `<p class="vazio">Nenhuma categoria.</p>`}</div>`;
  }

  // ---------------- ESTOQUE (RF14, RF16, RII14) ----------------
  function abaEstoque() {
    const min = Store.config().estoqueMinimo;
    const linhas = [];
    Store.listarProdutos().forEach((p) => p.variacoes.forEach((v) => linhas.push({ p, v })));
    const mostrar = soBaixo ? linhas.filter((l) => l.v.estoque <= min) : linhas;
    conteudo.innerHTML = `
      <div class="barra"><h2>Controle de estoque</h2>
        <form id="form-min" style="display:flex;gap:.5rem;align-items:center" novalidate>
          <label for="min">Estoque mínimo:</label><input id="min" type="number" min="0" step="1" value="${min}" style="width:80px;padding:.4rem">
          <button class="btn sec mini" type="submit">Salvar</button></form></div>
      <label><input type="checkbox" id="so-baixo" ${soBaixo ? "checked" : ""}> Mostrar apenas estoque baixo ou indisponível</label>
      <div class="tabela-wrap" style="margin-top:.7rem"><table>
        <caption class="sr-only">Estoque por variação</caption>
        <thead><tr><th>Produto</th><th>Tamanho</th><th>Cor</th><th>Quantidade</th><th>Situação</th><th></th></tr></thead>
        <tbody>${mostrar.map(({ p, v }) => `<tr class="${v.estoque === 0 ? "critico" : v.estoque <= min ? "alerta" : ""}"
            data-p="${esc(p.id)}" data-t="${esc(v.tamanho)}" data-c="${esc(v.cor)}">
          <td>${esc(p.nome)}</td><td>${esc(v.tamanho)}</td><td>${esc(v.cor)}</td>
          <td><label class="sr-only" for="q-${esc(p.id + v.tamanho + v.cor)}">Quantidade</label>
              <input id="q-${esc(p.id + v.tamanho + v.cor)}" type="number" min="0" step="1" value="${v.estoque}" style="width:80px;padding:.35rem"></td>
          <td>${v.estoque === 0 ? `<span class="etq indisponivel">Indisponível</span>` : v.estoque <= min ? `<span class="etq baixo">Baixo</span>` : `<span class="etq ok">Ok</span>`}</td>
          <td><button class="btn mini" data-acao="est-salvar">Atualizar</button></td></tr>`).join("") || `<tr><td colspan="6" class="vazio">Nada para mostrar.</td></tr>`}</tbody>
      </table></div>`;
  }

  // ---------------- PEDIDOS (RF17-RF19) ----------------
  function abaPedidos() {
    const ps = Store.listarPedidos();
    conteudo.innerHTML = `
      <div class="barra"><h2>Pedidos</h2></div>
      <div class="tabela-wrap"><table>
        <caption class="sr-only">Histórico de pedidos</caption>
        <thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Situação</th><th></th></tr></thead>
        <tbody>${ps.length ? ps.map((o) => `<tr>
          <td><strong>${esc(o.id)}</strong></td><td>${Util.data(o.data)}</td><td>${esc(o.cliente.nome)}</td>
          <td>${o.itens.reduce((s, l) => s + l.qtd, 0)}</td><td>${brl(o.total)}</td>
          <td><label class="sr-only" for="st-${esc(o.id)}">Situação do pedido ${esc(o.id)}</label>
            <select id="st-${esc(o.id)}" data-pedido="${esc(o.id)}" ${Store.STATUS_FLUXO[o.status].length ? "" : "disabled"}>
              <option selected>${esc(o.status)}</option>${Store.STATUS_FLUXO[o.status].map((s) => `<option>${s}</option>`).join("")}</select></td>
          <td><button class="btn sec mini" data-acao="ver-pedido" data-id="${esc(o.id)}">Detalhes</button></td></tr>`).join("")
          : `<tr><td colspan="7" class="vazio">Nenhum pedido realizado ainda.</td></tr>`}</tbody>
      </table></div>`;
  }

  function detalhePedido(id) {
    const o = Store.listarPedidos().find((x) => x.id === id);
    if (!o) return;
    $("#dlg-titulo").textContent = "Pedido " + o.id;
    $("#dlg-corpo").innerHTML = `
      <p><strong>Data:</strong> ${Util.data(o.data)} · <strong>Situação:</strong> ${esc(o.status)} · <strong>Pagamento:</strong> ${esc(o.pagamento)}</p>
      <p><strong>Cliente:</strong> ${esc(o.cliente.nome)} · ${esc(o.cliente.email)} · ${esc(o.cliente.telefone)}<br><strong>Entrega:</strong> ${esc(o.cliente.endereco)}</p>
      <div class="tabela-wrap"><table><thead><tr><th>Item</th><th>Var.</th><th>Qtd</th><th>Unit.</th><th>Subtotal</th></tr></thead><tbody>
        ${o.itens.map((l) => `<tr><td>${esc(l.nome)}</td><td>${esc(l.tamanho)}/${esc(l.cor)}</td><td>${l.qtd}</td><td>${brl(l.precoUnit)}</td><td>${brl(l.precoUnit * l.qtd)}</td></tr>`).join("")}
      </tbody></table></div><p class="total-linha"><span>Total</span><span>${brl(o.total)}</span></p>`;
    $("#dlg").showModal();
  }

  // ---------------- VENDAS (RF17, RF20) ----------------
  function abaVendas() {
    const validos = Store.listarPedidos().filter((o) => o.status !== "Cancelado");
    const receita = validos.reduce((s, o) => s + o.total, 0);
    const unidades = validos.reduce((s, o) => s + o.itens.reduce((a, l) => a + l.qtd, 0), 0);
    const ranking = {};
    validos.forEach((o) => o.itens.forEach((l) => (ranking[l.nome] = (ranking[l.nome] || 0) + l.qtd)));
    const top = Object.entries(ranking).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const ps = Store.listarProdutos();
    const baixos = ps.filter((p) => Store.situacaoEstoque(p) !== "ok").length;
    conteudo.innerHTML = `
      <div class="barra"><h2>Resumo comercial</h2></div>
      <div class="indicadores">
        <div class="indicador">Receita (sem cancelados)<strong>${brl(receita)}</strong></div>
        <div class="indicador">Pedidos válidos<strong>${validos.length}</strong></div>
        <div class="indicador">Unidades vendidas<strong>${unidades}</strong></div>
        <div class="indicador">Ticket médio<strong>${brl(validos.length ? receita / validos.length : 0)}</strong></div>
        <div class="indicador">Produtos com estoque baixo<strong>${baixos}</strong></div>
      </div>
      <h3>Mais vendidos</h3>
      <div class="tabela-wrap"><table><thead><tr><th>Produto</th><th>Unidades</th></tr></thead><tbody>
        ${top.map(([n, q]) => `<tr><td>${esc(n)}</td><td>${q}</td></tr>`).join("") || `<tr><td colspan="2" class="vazio">Sem vendas ainda.</td></tr>`}</tbody></table></div>`;
  }

  // ---------------- AUDITORIA (RNF14) ----------------
  function abaAuditoria() {
    const log = Store.auditoria();
    conteudo.innerHTML = `
      <div class="barra"><h2>Registro de operações</h2></div>
      <div class="tabela-wrap"><table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>
        ${log.map((l) => `<tr><td>${Util.data(l.data)}</td><td>${esc(l.usuario)}</td><td>${esc(l.acao)}</td><td>${esc(l.detalhe)}</td></tr>`).join("") || `<tr><td colspan="4" class="vazio">Nenhum registro.</td></tr>`}</tbody></table></div>`;
  }

  // ---------------- EVENTOS DA ÁREA DE CONTEÚDO ----------------
  conteudo.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b || !logado()) return;
    const id = b.dataset.id;
    const acao = b.dataset.acao;

    if (acao === "novo") abrirFormProduto(null);
    if (acao === "editar") abrirFormProduto(id);
    if (acao === "ver-pedido") detalhePedido(id);

    if (acao === "ativar") {
      const l = Store.listarProdutos(); const p = l.find((x) => x.id === id);
      p.ativo = !p.ativo; Store.salvarProdutos(l);
      Store.registrar(p.ativo ? "Produto ativado" : "Produto desativado", p.nome);
      toast(p.ativo ? "Produto ativado." : "Produto desativado."); renderAba();
    }
    if (acao === "excluir") {
      const l = Store.listarProdutos(); const p = l.find((x) => x.id === id);
      if (!confirm(`Excluir "${p.nome}"? Os pedidos antigos continuarão preservados.`)) return; // RII11, RN09
      Store.salvarProdutos(l.filter((x) => x.id !== id));
      Store.registrar("Produto excluído", p.nome);
      toast("Produto excluído."); renderAba();
    }

    if (acao === "cat-salvar") {
      const nome = $("#c-" + id).value.trim();
      if (nome.length < 2) return toast("Informe um nome para a categoria.", "erro");
      const l = Store.listarCategorias(); l.find((c) => c.id === id).nome = nome;
      Store.salvarCategorias(l); Store.registrar("Categoria editada", nome); toast("Categoria salva."); renderAba();
    }
    if (acao === "cat-excluir") {
      if (Store.listarProdutos().some((p) => p.categoriaId === id)) return toast("Existem produtos nesta categoria. Mova-os antes de excluir.", "erro");
      if (!confirm("Excluir esta categoria?")) return;
      Store.salvarCategorias(Store.listarCategorias().filter((c) => c.id !== id));
      Store.registrar("Categoria excluída", id); toast("Categoria excluída."); renderAba();
    }

    if (acao === "est-salvar") {
      const tr = b.closest("tr");
      const novo = Number($("input", tr).value);
      if (!Number.isInteger(novo) || novo < 0) return toast("Informe um inteiro igual ou maior que zero.", "erro");
      const l = Store.listarProdutos(); const p = l.find((x) => x.id === tr.dataset.p);
      const v = p.variacoes.find((x) => x.tamanho === tr.dataset.t && x.cor === tr.dataset.c);
      Store.registrar("Estoque atualizado", `${p.nome} (${v.tamanho}/${v.cor}): ${v.estoque} → ${novo}`);
      v.estoque = novo; Store.salvarProdutos(l); toast("Estoque atualizado."); renderAba();
    }
  });

  conteudo.addEventListener("change", (e) => {
    if (e.target.id === "so-baixo") { soBaixo = e.target.checked; renderAba(); }
    if (e.target.dataset.pedido) {
      const novo = e.target.value;
      if (novo === "Cancelado" && !confirm("Cancelar o pedido devolve os itens ao estoque. Continuar?")) return renderAba();
      const r = Store.mudarStatus(e.target.dataset.pedido, novo);
      toast(r.ok ? "Situação atualizada." : r.erro, r.ok ? "ok" : "erro");
      renderAba();
    }
  });

  conteudo.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.id === "form-cat") {
      const nome = $("#nova-cat").value.trim();
      if (nome.length < 2) return toast("Informe o nome da categoria.", "erro");
      const l = Store.listarCategorias(); l.push({ id: Util.uid(), nome });
      Store.salvarCategorias(l); Store.registrar("Categoria criada", nome); toast("Categoria criada."); renderAba();
    }
    if (e.target.id === "form-min") {
      const n = Number($("#min").value);
      if (!Number.isInteger(n) || n < 0) return toast("Informe um inteiro igual ou maior que zero.", "erro");
      const c = Store.config(); c.estoqueMinimo = n; Store.salvarConfig(c);
      Store.registrar("Estoque mínimo alterado", String(n)); toast("Estoque mínimo salvo."); renderAba();
    }
  });

  // Eventos dentro da janela (formulário de produto)
  $("#dlg-corpo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    if (b.dataset.acao === "add-var") $("#vars").insertAdjacentHTML("beforeend", linhaVariacao());
    if (b.dataset.acao === "rm-var") b.closest(".var-linha").remove();
  });
  $("#dlg-corpo").addEventListener("submit", (e) => { if (e.target.id === "form-prod") salvarProduto(e); });

  atualizarTela();
})();
