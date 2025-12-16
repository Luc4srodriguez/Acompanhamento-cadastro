// script_lazy_accordion.js
// Patch para renderização preguiçosa (lazy) + paginação dos acordeões
// de Indivíduos e Domicílios, evitando travar o navegador em planilhas grandes.
//
// Como usar (exemplo):
// 1) Depois de processar sua planilha de indivíduos e agrupar por profissional,
//    chame: LazyAccordion.setIndividuosData(individuosPorProfissional);
// 2) Depois de processar sua planilha de domicílios e agrupar por profissional,
//    chame: LazyAccordion.setDomiciliosData(domiciliosPorProfissional);
// 3) Certifique-se de que o HTML tenha os elementos com IDs:
//    - accordionIndividuosContainer
//    - accordionDomiciliosContainer
//    - searchIndividuos, searchDomicilios
//    - toggleIndividuosCriticos, toggleDomiciliosCriticos
//
// Estrutura esperada de dados:
//
//   individuosPorProfissional = {
//     "NOME DO PROFISSIONAL": [
//       { id: "123", nome: "Fulano", microarea: "01", tempoSemAtualizarMeses: 26, ... },
//       ...
//     ],
//     ...
//   }
//
//   domiciliosPorProfissional = {
//     "NOME DO PROFISSIONAL": [
//       { idDomicilio: "ABC", microarea: "02", tempoSemAtualizarMeses: 5, ... },
//       ...
//     ],
//     ...
//   }
//
// Você pode ter mais campos dentro de cada item; o componente monta a linha
// de forma genérica, exibindo todos os pares chave:valor, ou você pode adaptar
// a função renderItemRow() para um layout mais específico.

(function () {
  const PAGE_SIZE = 50;

  const state = {
    individuosPorProfissional: {},  // { profissional: [registros...] }
    domiciliosPorProfissional: {},  // { profissional: [registros...] }

    // filtros
    searchIndividuos: "",
    searchDomicilios: "",
    showOnlyCriticosIndividuos: false,
    showOnlyCriticosDomicilios: false,

    // paginação
    paginaIndividuosPorProfissional: {}, // { profissional: numeroPagina }
    paginaDomiciliosPorProfissional: {}, // { profissional: numeroPagina }

    // se já carregou o corpo daquele profissional (para não recriar tudo toda vez)
    individuosBodyInicializado: {},       // { profissional: true/false }
    domiciliosBodyInicializado: {},
  };

  // ======== Funções auxiliares de filtragem =========

  function normalizarTexto(str) {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function passaFiltroBusca(item, termoNormalizado) {
    if (!termoNormalizado) return true;
    const campos = Object.values(item || {});
    for (const valor of campos) {
      if (normalizarTexto(valor).includes(termoNormalizado)) return true;
    }
    return false;
  }

  function ehCritico(item) {
    // Critério padrão: tempoSemAtualizarMeses >= 24
    // Ajuste aqui se o seu dado tiver outro campo/regra.
    const t = Number(item.tempoSemAtualizarMeses ?? item.mesesSemAtualizar ?? 0);
    return t >= 24;
  }

  function filtrarLista(lista, termoBusca, somenteCriticos) {
    const termoNorm = normalizarTexto(termoBusca);
    return (lista || []).filter((item) => {
      if (somenteCriticos && !ehCritico(item)) return false;
      if (!passaFiltroBusca(item, termoNorm)) return false;
      return true;
    });
  }

  // ======== Renderização de linhas de dados =========

  function renderItemRow(item) {
    // Monta uma linha simples com chave: valor.
    // Adapte se quiser um layout mais bonitinho.
    const parts = [];
    for (const [ch, v] of Object.entries(item)) {
      if (v === undefined || v === null || v === "") continue;
      parts.push(`<strong>${ch}:</strong> ${String(v)}`);
    }
    return `<li class="accordion-item-row">${parts.join(" · ")}</li>`;
  }

  function renderPaginaLista(listaFiltrada, pagina) {
    const total = listaFiltrada.length;
    const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const paginaAjustada = Math.min(Math.max(1, pagina), totalPaginas);

    const inicio = (paginaAjustada - 1) * PAGE_SIZE;
    const fim = inicio + PAGE_SIZE;
    const slice = listaFiltrada.slice(inicio, fim);

    const linhasHtml = slice.map(renderItemRow).join("");

    return {
      pagina: paginaAjustada,
      totalPaginas,
      html: linhasHtml,
      totalRegistros: total,
    };
  }

  // ======== Renderização dos acordeões (cabeçalhos apenas) =========

  function criarAccordionProfissionais(containerId, dataMap, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    const nomes = Object.keys(dataMap || {}).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );

    if (nomes.length === 0) {
      container.innerHTML = `
        <div class="accordion-empty">
          Nenhum registro encontrado para este filtro.
        </div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    nomes.forEach((profNome) => {
      const wrapper = document.createElement("div");
      wrapper.className = "accordion-item";

      const header = document.createElement("button");
      header.className = "accordion-header";
      header.type = "button";
      header.setAttribute("data-profissional", profNome);
      header.setAttribute("data-tipo", tipo);
      header.innerHTML = `
        <div class="accordion-header-main">
          <span class="accordion-prof-name">${profNome}</span>
          <span class="accordion-prof-count">${(dataMap[profNome] || []).length} cadastros</span>
        </div>
        <span class="accordion-toggle-indicator">+</span>
      `;

      const body = document.createElement("div");
      body.className = "accordion-body";
      body.style.display = "none";
      body.innerHTML = `
        <ul class="accordion-items-list"></ul>
        <div class="accordion-pagination">
          <button class="btn-page btn-page-prev" type="button">Anterior</button>
          <span class="page-info"></span>
          <button class="btn-page btn-page-next" type="button">Próxima</button>
        </div>
      `;

      wrapper.appendChild(header);
      wrapper.appendChild(body);
      fragment.appendChild(wrapper);
    });

    container.appendChild(fragment);
  }

  // ======== Abertura/fechamento + paginação dos acordeões =========

  function obterListaProfissional(tipo, profNome) {
    if (tipo === "individuos") {
      return state.individuosPorProfissional[profNome] || [];
    }
    if (tipo === "domicilios") {
      return state.domiciliosPorProfissional[profNome] || [];
    }
    return [];
  }

  function getFiltro(tipo) {
    if (tipo === "individuos") {
      return {
        busca: state.searchIndividuos,
        critico: state.showOnlyCriticosIndividuos,
      };
    }
    if (tipo === "domicilios") {
      return {
        busca: state.searchDomicilios,
        critico: state.showOnlyCriticosDomicilios,
      };
    }
    return { busca: "", critico: false };
  }

  function getPaginaAtual(tipo, profNome) {
    if (tipo === "individuos") {
      return state.paginaIndividuosPorProfissional[profNome] || 1;
    }
    if (tipo === "domicilios") {
      return state.paginaDomiciliosPorProfissional[profNome] || 1;
    }
    return 1;
  }

  function setPaginaAtual(tipo, profNome, pagina) {
    if (tipo === "individuos") {
      state.paginaIndividuosPorProfissional[profNome] = pagina;
    } else if (tipo === "domicilios") {
      state.paginaDomiciliosPorProfissional[profNome] = pagina;
    }
  }

  function renderBodyProfissional(headerEl, abrirAcordeon, paginaForcada) {
    const profNome = headerEl.getAttribute("data-profissional");
    const tipo = headerEl.getAttribute("data-tipo"); // "individuos" | "domicilios"

    const wrapper = headerEl.parentElement;
    const body = wrapper.querySelector(".accordion-body");
    const listEl = body.querySelector(".accordion-items-list");
    const pageInfoEl = body.querySelector(".page-info");
    const prevBtn = body.querySelector(".btn-page-prev");
    const nextBtn = body.querySelector(".btn-page-next");

    if (!abrirAcordeon) {
      body.style.display = "none";
      headerEl.querySelector(".accordion-toggle-indicator").textContent = "+";
      return;
    }

    body.style.display = "block";
    headerEl.querySelector(".accordion-toggle-indicator").textContent = "−";

    const dadosOriginais = obterListaProfissional(tipo, profNome);
    const { busca, critico } = getFiltro(tipo);

    const listaFiltrada = filtrarLista(dadosOriginais, busca, critico);

    let paginaAtual = paginaForcada || getPaginaAtual(tipo, profNome) || 1;
    const resultadoPagina = renderPaginaLista(listaFiltrada, paginaAtual);
    paginaAtual = resultadoPagina.pagina;

    setPaginaAtual(tipo, profNome, paginaAtual);

    listEl.innerHTML = resultadoPagina.html;
    pageInfoEl.textContent = `Página ${paginaAtual} de ${resultadoPagina.totalPaginas} · ${resultadoPagina.totalRegistros} registros`;

    prevBtn.disabled = paginaAtual <= 1;
    nextBtn.disabled = paginaAtual >= resultadoPagina.totalPaginas;

    // Liga eventos dos botões (uma única vez por body)
    if (!body.__paginationBound) {
      body.__paginationBound = true;

      prevBtn.addEventListener("click", () => {
        const atual = getPaginaAtual(tipo, profNome);
        if (atual > 1) {
          setPaginaAtual(tipo, profNome, atual - 1);
          renderBodyProfissional(headerEl, true, atual - 1);
        }
      });

      nextBtn.addEventListener("click", () => {
        const atual = getPaginaAtual(tipo, profNome);
        setPaginaAtual(tipo, profNome, atual + 1);
        renderBodyProfissional(headerEl, true, atual + 1);
      });
    }
  }

  function bindAccordionClick(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.addEventListener("click", (evt) => {
      const header = evt.target.closest(".accordion-header");
      if (!header) return;

      const body = header.parentElement.querySelector(".accordion-body");
      const isOpen = body.style.display === "block";
      renderBodyProfissional(header, !isOpen);
    });
  }

  // ======== Atualização dos acordeões inteiros (quando filtros mudam) =========

  function atualizarAccordionIndividuos() {
    criarAccordionProfissionais(
      "accordionIndividuosContainer",
      state.individuosPorProfissional,
      "individuos"
    );
    bindAccordionClick("accordionIndividuosContainer");
  }

  function atualizarAccordionDomicilios() {
    criarAccordionProfissionais(
      "accordionDomiciliosContainer",
      state.domiciliosPorProfissional,
      "domicilios"
    );
    bindAccordionClick("accordionDomiciliosContainer");
  }

  // ======== Integração com campos de busca e botões de filtro =========

  function initSearchAndFilter() {
    const searchInd = document.getElementById("searchIndividuos");
    if (searchInd) {
      searchInd.addEventListener("input", (e) => {
        state.searchIndividuos = e.target.value || "";
        // ao mexer na busca, reinicia páginas
        state.paginaIndividuosPorProfissional = {};
        atualizarAccordionIndividuos();
      });
    }

    const searchDom = document.getElementById("searchDomicilios");
    if (searchDom) {
      searchDom.addEventListener("input", (e) => {
        state.searchDomicilios = e.target.value || "";
        state.paginaDomiciliosPorProfissional = {};
        atualizarAccordionDomicilios();
      });
    }

    const toggleInd = document.getElementById("toggleIndividuosCriticos");
    if (toggleInd) {
      toggleInd.addEventListener("click", () => {
        state.showOnlyCriticosIndividuos = !state.showOnlyCriticosIndividuos;
        toggleInd.textContent = state.showOnlyCriticosIndividuos
          ? "Mostrar Todos"
          : "Mostrar Apenas Críticos";
        state.paginaIndividuosPorProfissional = {};
        atualizarAccordionIndividuos();
      });
    }

    const toggleDom = document.getElementById("toggleDomiciliosCriticos");
    if (toggleDom) {
      toggleDom.addEventListener("click", () => {
        state.showOnlyCriticosDomicilios = !state.showOnlyCriticosDomicilios;
        toggleDom.textContent = state.showOnlyCriticosDomicilios
          ? "Mostrar Todos"
          : "Mostrar Apenas Críticos";
        state.paginaDomiciliosPorProfissional = {};
        atualizarAccordionDomicilios();
      });
    }
  }

  // ======== API pública =========

  const LazyAccordion = {
    setIndividuosData(mapPorProfissional) {
      state.individuosPorProfissional = mapPorProfissional || {};
      state.paginaIndividuosPorProfissional = {};
      atualizarAccordionIndividuos();
    },

    setDomiciliosData(mapPorProfissional) {
      state.domiciliosPorProfissional = mapPorProfissional || {};
      state.paginaDomiciliosPorProfissional = {};
      atualizarAccordionDomicilios();
    },

    // Se quiser forçar re-render geral (por exemplo, após mudar filtros externos):
    refresh() {
      atualizarAccordionIndividuos();
      atualizarAccordionDomicilios();
    },
  };

  window.LazyAccordion = LazyAccordion;

  // Inicializa integração com campos de busca/filtros quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSearchAndFilter);
  } else {
    initSearchAndFilter();
  }
})();
