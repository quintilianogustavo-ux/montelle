"use strict";
/* =====================================================================
   comum.js  -  Código compartilhado pelas DUAS páginas (loja e admin).
   Contém: utilitários (formatar, escapar, avisos) e o "Store", que é
   o nosso banco de dados (localStorage) com todas as regras de negócio.
   ===================================================================== */

const Util = {
  // Formata número como moeda brasileira (ex.: 59.9 -> "R$ 59,90")
  brl: (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),

  // Troca caracteres perigosos por versões seguras (evita injeção de HTML/XSS)
  esc: (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),

  // Gera um identificador único (usado para evitar compra duplicada - RN17)
  uid: () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),

  data: (iso) => new Date(iso).toLocaleString("pt-BR"),

  // Mensagem de sucesso/erro na tela (RF22 / RII10)
  toast(msg, tipo = "ok") {
    let raiz = document.getElementById("toasts");
    if (!raiz) {
      raiz = document.createElement("div");
      raiz.id = "toasts";
      raiz.setAttribute("role", "status");
      raiz.setAttribute("aria-live", "polite");
      document.body.appendChild(raiz);
    }
    const t = document.createElement("div");
    t.className = "toast " + tipo;
    t.textContent = msg;
    raiz.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  },
};

// Qualquer elemento com data-fechar fecha o <dialog> em que está
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-fechar]");
  if (b) b.closest("dialog").close();
});

const Store = (function () {
  const CH = {
    produtos: "montelle_produtos",
    categorias: "montelle_categorias",
    pedidos: "montelle_pedidos",
    carrinho: "montelle_carrinho",
    auditoria: "montelle_auditoria",
    config: "montelle_config",
  };

  // Fluxo permitido de situação do pedido (RN14)
  const STATUS_FLUXO = {
    Pendente: ["Pago", "Cancelado"],
    Pago: ["Enviado", "Cancelado"],
    Enviado: ["Entregue", "Cancelado"],
    Entregue: [],
    Cancelado: [],
  };

  function ler(chave, padrao) {
    try {
      const t = localStorage.getItem(chave);
      return t ? JSON.parse(t) : padrao;
    } catch (e) {
      return padrao;
    }
  }
  function gravar(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
  }

  // ---------- dados iniciais (só na primeira vez) ----------
  function semear() {
    if (localStorage.getItem(CH.produtos)) return;
    const cats = [
      { id: "c1", nome: "Camisetas" },
      { id: "c2", nome: "Calças" },
      { id: "c3", nome: "Vestidos" },
      { id: "c4", nome: "Acessórios" },
    ];
    const v = (tamanho, cor, estoque) => ({ tamanho, cor, estoque });
    const prods = [
      { id: "p1", nome: "Camiseta Básica Algodão", descricao: "Camiseta 100% algodão, corte reto e toque macio.", categoriaId: "c1", preco: 59.9, emoji: "👕", fundo: "#e9dfd3", imagem: "", ativo: true, variacoes: [v("M", "Branca", 10), v("M", "Preta", 8), v("G", "Branca", 5), v("G", "Preta", 2)] },
      { id: "p2", nome: "Camiseta Oversized", descricao: "Modelagem ampla, ideal para o dia a dia.", categoriaId: "c1", preco: 89.9, emoji: "👕", fundo: "#d9e2dc", imagem: "", ativo: true, variacoes: [v("P", "Verde", 6), v("M", "Verde", 6), v("G", "Cinza", 4)] },
      { id: "p3", nome: "Calça Jeans Slim", descricao: "Jeans com elastano, caimento ajustado.", categoriaId: "c2", preco: 159.9, emoji: "👖", fundo: "#d5dce8", imagem: "", ativo: true, variacoes: [v("38", "Azul", 7), v("40", "Azul", 9), v("42", "Azul", 3)] },
      { id: "p4", nome: "Calça Alfaiataria", descricao: "Tecido leve e elegante para o trabalho.", categoriaId: "c2", preco: 189.9, emoji: "👖", fundo: "#e4dcd0", imagem: "", ativo: true, variacoes: [v("38", "Preta", 5), v("40", "Preta", 5), v("40", "Bege", 0)] },
      { id: "p5", nome: "Vestido Midi Floral", descricao: "Vestido midi com estampa floral e viscose leve.", categoriaId: "c3", preco: 179.9, emoji: "👗", fundo: "#f0dde0", imagem: "", ativo: true, variacoes: [v("P", "Floral", 4), v("M", "Floral", 6), v("G", "Floral", 2)] },
      { id: "p6", nome: "Vestido Preto Clássico", descricao: "Peça atemporal para qualquer ocasião.", categoriaId: "c3", preco: 199.9, emoji: "👗", fundo: "#dcd7dc", imagem: "", ativo: true, variacoes: [v("P", "Preto", 3), v("M", "Preto", 3)] },
      { id: "p7", nome: "Bolsa Tote", descricao: "Bolsa espaçosa em material sintético resistente.", categoriaId: "c4", preco: 129.9, emoji: "👜", fundo: "#ecdcc5", imagem: "", ativo: true, variacoes: [v("Único", "Caramelo", 8), v("Único", "Preta", 6)] },
      { id: "p8", nome: "Cinto de Couro", descricao: "Cinto de couro legítimo com fivela metálica.", categoriaId: "c4", preco: 69.9, emoji: "🧵", fundo: "#e2d6c8", imagem: "", ativo: true, variacoes: [v("M", "Marrom", 12), v("G", "Marrom", 1)] },
    ];
    gravar(CH.categorias, cats);
    gravar(CH.produtos, prods);
    gravar(CH.pedidos, []);
    gravar(CH.auditoria, []);
    gravar(CH.config, { estoqueMinimo: 3, proximoPedido: 1, pagamentos: ["Pix", "Cartão de crédito", "Boleto"] });
  }
  semear();

  // ---------- leitura / escrita ----------
  const listarProdutos = () => ler(CH.produtos, []);
  const salvarProdutos = (l) => gravar(CH.produtos, l);
  const listarCategorias = () => ler(CH.categorias, []);
  const salvarCategorias = (l) => gravar(CH.categorias, l);
  const listarPedidos = () => ler(CH.pedidos, []);
  const carrinho = () => ler(CH.carrinho, []);
  const salvarCarrinho = (l) => gravar(CH.carrinho, l);
  const config = () => ler(CH.config, { estoqueMinimo: 3, proximoPedido: 1, pagamentos: ["Pix"] });
  const salvarConfig = (c) => gravar(CH.config, c);
  const auditoria = () => ler(CH.auditoria, []);

  // RNF14 - registra operações administrativas
  function registrar(acao, detalhe) {
    const log = auditoria();
    const admin = sessionStorage.getItem("montelle_admin_sessao") === "1";
    log.unshift({ data: new Date().toISOString(), usuario: admin ? "admin" : "cliente", acao, detalhe });
    gravar(CH.auditoria, log.slice(0, 300));
  }

  // ---------- estoque ----------
  const estoqueTotal = (p) => p.variacoes.reduce((s, v) => s + v.estoque, 0);

  // Retorna "ok" | "baixo" | "indisponivel" (RN13 / RF16)
  function situacaoEstoque(p) {
    const min = config().estoqueMinimo;
    if (estoqueTotal(p) === 0) return "indisponivel";
    if (p.variacoes.some((v) => v.estoque <= min)) return "baixo";
    return "ok";
  }

  // ---------- pedidos ----------
  // Cria o pedido validando tudo ANTES de mexer no estoque (RN04, RN08, RN16, RN17)
  function criarPedido(itens, cliente, pagamento, token) {
    const pedidos = listarPedidos();

    // RN17: se o mesmo token já gerou pedido, devolve o existente
    const repetido = pedidos.find((p) => p.token === token);
    if (repetido) return { ok: true, pedido: repetido, duplicado: true };

    if (!itens.length) return { ok: false, erro: "O carrinho está vazio." };

    const produtos = listarProdutos();
    const linhas = [];
    let total = 0;

    for (const it of itens) {
      const p = produtos.find((x) => x.id === it.produtoId);
      if (!p || !p.ativo) return { ok: false, erro: "Um dos produtos não está mais disponível." };
      const v = p.variacoes.find((x) => x.tamanho === it.tamanho && x.cor === it.cor);
      if (!v) return { ok: false, erro: `A variação escolhida de "${p.nome}" não existe mais.` };
      if (!Number.isInteger(it.qtd) || it.qtd <= 0) return { ok: false, erro: "Quantidade inválida." };
      if (it.qtd > v.estoque)
        return { ok: false, erro: `Estoque insuficiente para "${p.nome}" (${it.tamanho}/${it.cor}). Disponível: ${v.estoque}.` };
      if (!(p.preco > 0)) return { ok: false, erro: "Preço inválido em um dos produtos." };
      // "foto" do item: preço e nome ficam gravados no pedido (RN12, RN19)
      linhas.push({ produtoId: p.id, nome: p.nome, tamanho: it.tamanho, cor: it.cor, qtd: it.qtd, precoUnit: p.preco });
      total += p.preco * it.qtd;
    }

    // Tudo validado: agora sim baixa o estoque (RN05, RF15)
    for (const l of linhas) {
      const v = produtos.find((x) => x.id === l.produtoId).variacoes.find((x) => x.tamanho === l.tamanho && x.cor === l.cor);
      v.estoque -= l.qtd;
    }
    salvarProdutos(produtos);

    const cfg = config();
    const pedido = {
      id: "MS-" + String(cfg.proximoPedido).padStart(5, "0"), // RN11
      token,
      data: new Date().toISOString(),
      itens: linhas,
      total: Math.round(total * 100) / 100,
      cliente,
      pagamento,
      status: "Pendente",
    };
    cfg.proximoPedido += 1;
    salvarConfig(cfg);
    pedidos.unshift(pedido);
    gravar(CH.pedidos, pedidos);
    return { ok: true, pedido };
  }

  // Muda a situação respeitando o fluxo; cancelar devolve o estoque (RN14, RN15)
  function mudarStatus(id, novo) {
    const pedidos = listarPedidos();
    const ped = pedidos.find((p) => p.id === id);
    if (!ped) return { ok: false, erro: "Pedido não encontrado." };
    if (!STATUS_FLUXO[ped.status].includes(novo)) return { ok: false, erro: `Não é possível ir de "${ped.status}" para "${novo}".` };

    if (novo === "Cancelado") {
      const produtos = listarProdutos();
      for (const l of ped.itens) {
        const p = produtos.find((x) => x.id === l.produtoId);
        const v = p && p.variacoes.find((x) => x.tamanho === l.tamanho && x.cor === l.cor);
        if (v) v.estoque += l.qtd;
      }
      salvarProdutos(produtos);
    }
    const antes = ped.status;
    ped.status = novo;
    gravar(CH.pedidos, pedidos);
    registrar("Situação do pedido", `${id}: ${antes} → ${novo}`);
    return { ok: true };
  }

  return {
    STATUS_FLUXO, listarProdutos, salvarProdutos, listarCategorias, salvarCategorias,
    listarPedidos, carrinho, salvarCarrinho, config, salvarConfig, auditoria, registrar,
    estoqueTotal, situacaoEstoque, criarPedido, mudarStatus,
  };
})();
