
// script_link.js - versão atualizada
// Responsável por gerar links compartilháveis (Coordenador / Gestor)
// e aplicar a visão limitada no modo "coordenador" (Dashboard + Vínculos APS).

(function () {
  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function buildSharedUrl(opts) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();

    if (opts.modo) params.set("modo", opts.modo);
    if (opts.unidade) params.set("unidade", opts.unidade);
    if (opts.profissional) params.set("profissional", opts.profissional);
    if (opts.tab) params.set("tab", opts.tab);

    url.search = params.toString();
    return url.toString();
  }

  function copyToClipboardOrPrompt(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(function () {
          alert("Link copiado para a área de transferência!");
        })
        .catch(function () {
          window.prompt("Copie o link abaixo:", url);
        });
    } else {
      window.prompt("Copie o link abaixo:", url);
    }
  }

  function aplicarModoCompartilhado() {
    const params = getParams();
    const modo = params.get("modo");
    const unidade = params.get("unidade");
    const profissional = params.get("profissional");
    const tab = params.get("tab");

    const selectUnidade = document.getElementById("filterUnidade");
    const selectProfissional = document.getElementById("filterProfissional");
    const selectProfDownload = document.getElementById("selectProfissionalDownload");

    // Pré-seleciona filtros, se vierem na URL
    if (selectUnidade && unidade) {
      selectUnidade.value = unidade;
      // disparamos o change para que o script principal atualize o restante da UI
      selectUnidade.dispatchEvent(new Event("change"));
    }

    if (selectProfissional && profissional) {
      selectProfissional.value = profissional;
      selectProfissional.dispatchEvent(new Event("change"));
    }

    if (selectProfDownload && profissional) {
      selectProfDownload.value = profissional;
    }

    // Aplica aba inicial, se especificada
    if (tab) {
      const targetButton = document.querySelector('.tab-button[data-tab="' + tab + '"]');
      if (targetButton) {
        targetButton.click();
      }
    }

    // Ajuste específico para o modo coordenador:
    // Exibir apenas: Dashboard + Vínculos APS
    if (modo === "coordenador") {
      const allowedTabs = new Set(["dashboard", "vinculos"]);

      const tabButtons = document.querySelectorAll(".tab-button");
      tabButtons.forEach(function (btn) {
        const tabName = btn.dataset.tab;
        if (!allowedTabs.has(tabName)) {
          btn.style.display = "none";
        } else {
          btn.style.display = "";
        }
      });

      const tabContents = document.querySelectorAll(".tab-content");
      tabContents.forEach(function (content) {
        const id = content.id || ""; // ex: "tab-dashboard"
        const tabName = id.startsWith("tab-") ? id.substring(4) : null;
        if (!tabName || !allowedTabs.has(tabName)) {
          content.style.display = "none";
        } else {
          // Deixamos a lógica de "active" para o script principal; só garantimos visibilidade.
          // O script principal controla qual conteúdo fica com a classe "active".
        }
      });

      // Garante que pelo menos o Dashboard fique ativo se a aba atual foi escondida.
      const activeButton = document.querySelector(".tab-button.active");
      if (!activeButton || activeButton.style.display === "none") {
        const dashButton = document.querySelector('.tab-button[data-tab="dashboard"]');
        if (dashButton) {
          dashButton.click();
        }
      }
    }
  }

  function configurarBotoesCompartilhamento() {
    const btnCoordenador = document.getElementById("btnLinkCoordenador");
    const btnGestor = document.getElementById("btnLinkGestor");
    const btnGenerateLink = document.getElementById("btnGenerateLink");
    const selectUnidade = document.getElementById("filterUnidade");
    const selectProfDownload = document.getElementById("selectProfissionalDownload");

    if (btnCoordenador) {
      btnCoordenador.addEventListener("click", function () {
        const url = buildSharedUrl({
          modo: "coordenador",
          tab: "dashboard"
        });
        copyToClipboardOrPrompt(url);
      });
    }

    if (btnGestor) {
      btnGestor.addEventListener("click", function () {
        const unidade = (selectUnidade && selectUnidade.value) ? selectUnidade.value : "";
        const url = buildSharedUrl({
          modo: "gestor",
          unidade: unidade || undefined,
          tab: "dashboard"
        });
        copyToClipboardOrPrompt(url);
      });
    }

    if (btnGenerateLink && selectProfDownload) {
      // Habilita / desabilita conforme a seleção de profissional
      function atualizarEstadoBotao() {
        btnGenerateLink.disabled = !selectProfDownload.value;
      }
      atualizarEstadoBotao();
      selectProfDownload.addEventListener("change", atualizarEstadoBotao);

      btnGenerateLink.addEventListener("click", function () {
        const unidade = (selectUnidade && selectUnidade.value) ? selectUnidade.value : "";
        const profissional = selectProfDownload.value;

        if (!profissional) {
          alert("Selecione um profissional para gerar o link.");
          return;
        }

        const url = buildSharedUrl({
          modo: "gestor",
          unidade: unidade || undefined,
          profissional: profissional,
          tab: "relatorio-prof-ind"
        });
        copyToClipboardOrPrompt(url);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    try {
      aplicarModoCompartilhado();
      configurarBotoesCompartilhamento();
    } catch (e) {
      console.error("Erro ao aplicar lógica de compartilhamento:", e);
    }
  });
})();
