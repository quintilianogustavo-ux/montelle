// Dados Mockados Iniciais (Carrega se o LocalStorage estiver vazio)
const dadosIniciais = [
    { id: "1", nome: "Vestido Floral Primavera", descricao: "Vestido leve e fluido 100% algodão.", categoria: "Vestidos", preco: 189.90, tamanho: "M", estoque: 10, imagem: "" },
    { id: "2", nome: "Blusa Crepe Ampla", descricao: "Blusa casual elegante para o dia a dia.", categoria: "Blusas", preco: 89.90, tamanho: "P", estoque: 2, imagem: "" },
    { id: "3", nome: "Calça Pantalona Linho", descricao: "Cintura alta, caimento reto perfeito.", categoria: "Calças", preco: 210.00, tamanho: "G", estoque: 5, imagem: "" },
    { id: "4", nome: "Cinto Couro Fivela", descricao: "Acessório premium ajustável.", categoria: "Acessórios", preco: 45.00, tamanho: "Único", estoque: 1, imagem: "" }
];

// Estado da Aplicação em Memória
let produtos = JSON.parse(localStorage.getItem('montelle_produtos')) || dadosIniciais;
let carrinho = [];

// Inicialização da Página
document.addEventListener("DOMContentLoaded", () => {
    salvarDadosNoStorage();
    renderizarCatalogo();
    renderizarTabelaAdmin();
});

// Salvar no LocalStorage (RNF10)
function salvarDadosNoStorage() {
    localStorage.setItem('montelle_produtos', JSON.stringify(produtos));
}

// Alavanca de Abas (SPA)
function alternarAba(aba) {
    document.getElementById('aba-loja').classList.add('hidden');
    document.getElementById('aba-admin').classList.add('hidden');
    document.getElementById('btn-loja').classList.remove('active');
    document.getElementById('btn-admin').classList.remove('active');

    if (aba === 'loja') {
        document.getElementById('aba-loja').classList.remove('hidden');
        document.getElementById('btn-loja').classList.add('active');
        renderizarCatalogo();
    } else {
        document.getElementById('aba-admin').classList.remove('hidden');
        document.getElementById('btn-admin').classList.add('active');
        renderizarTabelaAdmin();
    }
}

// ================= LÓGICA DA LOJA (CLIENTE) =================

// RF01/RF02 - Renderização Dinâmica do Catálogo
function renderizarCatalogo(produtosFiltrados = produtos) {
    const grid = document.getElementById('lista-produtos');
    grid.innerHTML = '';

    // Filtra apenas produtos com estoque > 0 e ativos (RN01)
    const disponiveis = produtosFiltrados.filter(p => p.estoque > 0);

    if (disponiveis.length === 0) {
        grid.innerHTML = '<p class="subtext">Nenhum produto disponível no momento.</p>';
        return;
    }

    disponiveis.forEach(prod => {
        const imgUrl = prod.imagem || 'https://unsplash.com';
        grid.innerHTML += `
            <div class="product-card">
                <img src="${imgUrl}" alt="${prod.nome}">
                <div class="product-info">
                    <div>
                        <div class="product-title">${prod.nome}</div>
                        <div class="product-desc">${prod.descricao}</div>
                    </div>
                    <div>
                        <div class="product-price">R$ ${prod.preco.toFixed(2)}</div>
                        <p class="subtext">Tam: <strong>${prod.tamanho}</strong> (${prod.estoque} disponíveis)</p>
                        <button class="btn-primary w-100" style="margin-top:10px;" onclick="adicionarAoCarrinho('${prod.id}')">
                            Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// RF04/RF03 - Filtro Avançado em Tempo Real
function filtrarProdutos() {
    const busca = document.getElementById('busca-produto').value.toLowerCase();
    const categoria = document.getElementById('filtro-categoria').value;

    const filtrados = produtos.filter(p => {
        const matchesBusca = p.nome.toLowerCase().includes(busca) || p.descricao.toLowerCase().includes(busca);
        const matchesCategoria = categoria === "" || p.categoria === categoria;
        return matchesBusca && matchesCategoria;
    });

    renderizarCatalogo(filtrados);
}

// RF05 - Controle do Carrinho de Compras
function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);
    const itemNoCarrinho = carrinho.find(item => item.id === id);

    // RN03/RN04 - Validação de Limites de Estoque
    if (itemNoCarrinho) {
        if (itemNoCarrinho.quantidade >= produto.estoque) {
            exibirToast("Quantidade máxima atingida de acordo com o estoque disponível.", "error");
            return;
        }
        itemNoCarrinho.quantidade++;
    } else {
        carrinho.push({ id: produto.id, nome: produto.nome, preco: produto.preco, tamanho: produto.tamanho, quantidade: 1 });
    }

    exibirToast(`"${produto.nome}" adicionado ao carrinho!`, "success");
    renderizarCarrinho();
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    renderizarCarrinho();
}

// RF06 - Resumo Financeiro do Pedido
function renderizarCarrinho() {
    const lista = document.getElementById('itens-carrinho');
    const totalTxt = document.getElementById('total-valor');
    const btnFinalizar = document.getElementById('btn-finalizar');
    
    lista.innerHTML = '';
    let total = 0;

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        total += subtotal;

        lista.innerHTML += `
            <div class="carrinho-item">
                <div>
                    <strong>${item.nome}</strong><br>
                    <span class="subtext">Tam: ${item.tamanho} | Qtd: ${item.quantidade}</span>
                </div>
                <div>
                    <span>R$ ${subtotal.toFixed(2)}</span>
                    <button class="carrinho-item-remove" onclick="removerDoCarrinho('${item.id}')">×</button>
                </div>
            </div>
        `;
    });

    totalTxt.innerText = `R$ ${total.toFixed(2)}`;
    btnFinalizar.disabled = carrinho.length === 0;
}

// RF07/RN04/RN05 - Finalização Crítica de Venda e Dedução de Estoque
function finalizarCompra() {
    // RN08 - Dupla verificação/Validação em lote de segurança antes de fechar pedido
    for (let item of carrinho) {
        const prodOriginal = produtos.find(p => p.id === item.id);
        if (!prodOriginal || prodOriginal.estoque < item.quantidade) {
            exibirToast(`Falha operacional: O item "${item.nome}" esgotou enquanto estava no carrinho!`, "error");
            return;
        }
    }

    // Processa a venda efetiva (Deduz do estoque)
    carrinho.forEach(item => {
        const prodOriginal = produtos.find(p => p.id === item.id);
        prodOriginal.estoque -= item.quantidade; // RN05 - Atualização Automática
    });

    // RN11 - Identificador Único de Simulação de Venda
    const idPedidoAleatorio = Math.floor(100000 + Math.random() * 900000);
    
    carrinho = []; // Limpa carrinho
    salvarDadosNoStorage();
    renderizarCarrinho();
    renderizarCatalogo();
    
    exibirToast(`Pedido #${idPedidoAleatorio} confirmado com sucesso! Estoque atualizado.`, "success");
}

// ================= ÁREA ADMINISTRATIVA =================

// RF14/RF16 - Renderização da Tabela de Controle de Estoque
function renderizarTabelaAdmin() {
    const tbody = document.getElementById('tabela-admin-produtos');
    tbody.innerHTML = '';

    produtos.forEach(prod => {
        // Alerta de Estoque Mínimo (Limite fixado em 3 unidades - RF16/RN13/RII14)
        const classeAlerta = prod.estoque <= 3 ? 'estoque-baixo' : '';

        tbody.innerHTML += `
            <tr class="${classeAlerta}">
                <td><strong>${prod.nome}</strong></td>
                <td>${prod.categoria}</td>
                <td>${prod.tamanho}</td>
                <td>R$ ${prod.preco.toFixed(2)}</td>
                <td>${prod.estoque} un</td>
                <td>
                    <button class="btn-warning-sm" onclick="carregarEdicao('${prod.id}')">Editar</button>
                    <button class="btn-danger-sm" onclick="excluirProduto('${prod.id}')">Excluir</button>
                </td>
            </tr>
        `;
    });
}

// RF10/RF11 - Salvar Cadastro ou Edição (RF21 - Validação Nativamente do HTML)
function salvarProduto(event) {
    event.preventDefault();

    const id = document.getElementById('prod-id').value;
    const nome = document.getElementById('prod-nome').value;
    const descricao = document.getElementById('prod-descricao').value;
    const categoria = document.getElementById('prod-categoria').value;
    const preco = parseFloat(document.getElementById('prod-preco').value);
    const tamanho = document.getElementById('prod-tamanho').value;
    const estoque = parseInt(document.getElementById('prod-estoque').value);
    const imagem = document.getElementById('prod-imagem').value;

    // RN02 - Prevenir que valores financeiros negativos passem
    if (preco < 0) {
        exibirToast("O preço do produto não pode ser um número negativo.", "error");
        return;
    }

    if (id) {
        // Edição (RF11)
        const idx = produtos.findIndex(p => p.id === id);
        produtos[idx] = { id, nome, descricao, categoria, preco, tamanho, estoque, imagem };
        exibirToast("Produto atualizado com sucesso!", "success");
    } else {
        // Cadastro (RF10)
        const novoProd = {
            id: Date.now().toString(), // ID Único gerado por Timestamp
            nome, descricao, categoria, preco, tamanho, estoque, imagem
        };
        produtos.push(novoProd);
        exibirToast("Novo produto cadastrado com sucesso!", "success");
    }

    salvarDadosNoStorage();
    limparFormularioAdmin();
    renderizarTabelaAdmin();
}

function carregarEdicao(id) {
    const prod = produtos.find(p => p.id === id);
    
    document.getElementById('prod-id').value = prod.id;
