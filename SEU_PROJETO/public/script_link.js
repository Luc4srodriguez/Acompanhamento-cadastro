// Script adicional para funcionalidade de links compartilháveis
// VERSÃO BACK-END: Usa fetch() para /api/share
// MODIFICADO: Força o uso do IP específico nos links copiados
// MODIFICADO: Recebe ID codificado do servidor
// MODIFICADO: generateScopedLink envia DADOS COMPLETOS filtrados para 'gestor'

// Garante que o escopo global tenha referências
window.__NOVETECH__ = window.__NOVETECH__ || {};

const API_BASE_URL = '/api';
const PUBLIC_BASE_URL = 'http://187.33.235.254:5865/';

/**
 * Envia payload para /api/share e retorna ID codificado
 */
async function sendPayloadToServer(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let errorMsg = 'Falha na resposta do servidor.';
      try { const err = await response.json(); errorMsg = err.error || errorMsg; } catch (_) {}
      throw new Error(errorMsg);
    }
    const { id } = await response.json(); // Recebe ID codificado
    return id; // Retorna o ID codificado
  } catch (err) {
    console.error('Erro ao enviar dados para o servidor:', err);
     if (err.message.includes('fetch') || err instanceof TypeError) {
      alert('Não foi possível gerar o link.\n\nErro de rede. O servidor de back-end está rodando e acessível?');
    } else if (err.message.toLowerCase().includes('payload too large')) {
       alert('Não foi possível gerar o link.\n\nCausa provável: Os arquivos são muito grandes e excedem o limite do *servidor* (configurado para 50mb).');
    } else {
       alert('Não foi possível gerar o link.\n\nErro: ' + err.message);
    }
    return null;
  }
}

/**
 * Gera o link para Profissional
 */
async function generateShareableLink(professionalName) {
  if (!professionalName) { alert('Selecione um profissional.'); return null; }
  if (typeof dadosIndividuos === 'undefined' || typeof dadosDomicilios === 'undefined') { alert('Dados não carregados.'); return null; }
  const ind = (dadosIndividuos || []).filter(p => p.acs === professionalName);
  const dom = (dadosDomicilios || []).filter(d => d.acs === professionalName);
  if (ind.length === 0 && dom.length === 0) { alert('Nenhum dado para este profissional.'); return null; }
  const normalizedInd = ind.map(d => ({ tipo: 'individuo', acs: d.acs, estabelecimento: d.estabelecimento, nome: d.nome, cpf: d.cpf, dataNascimento: d.dataNascimento, ultimaAtualizacao: d.ultimaAtualizacao, mesesSemAtualizar: d.mesesSemAtualizar, microArea: d.microArea ?? null, tempoSemAtualizar: d.tempoSemAtualizar ?? null, _monthsSince: d._monthsSince ?? d.mesesSemAtualizar }));
  const normalizedDom = dom.map(d => ({ tipo: 'domicilio', acs: d.acs, estabelecimento: d.estabelecimento, endereco: d.endereco, numero: d.numero, bairro: d.bairro, responsavel: d.responsavel, dataCadastro: d.dataCadastro, ultimaAtualizacao: d.ultimaAtualizacao, mesesSemAtualizar: d.mesesSemAtualizar, microArea: d.microArea ?? null, tempoSemAtualizar: d.tempoSemAtualizar ?? null, _monthsSince: d._monthsSince ?? d.mesesSemAtualizar }));
  const combinedPayload = { dados: [...normalizedInd, ...normalizedDom] };
  const encodedSessionId = await sendPayloadToServer(combinedPayload);
  if (!encodedSessionId) return null;
  return `profissional.html?id=${encodedSessionId}`;
}

/**
 * Gera o link para Coordenador ou Gestor
 */
async function generateScopedLink(role, options = {}) {
  try {
    if (typeof dadosIndividuos === 'undefined' || typeof dadosDomicilios === 'undefined') {
      alert('Os dados ainda não foram carregados.'); return null;
    }

    let historicoDados = [];
    try {
      historicoDados = JSON.parse(localStorage.getItem('cadastroHistorico') || '[]');
    } catch (e) { console.warn("Não foi possível ler o histórico.", e); }

    // Cria cópias para não modificar os dados originais
    let individuosPayloadFull = Array.isArray(dadosIndividuos) ? [...dadosIndividuos] : [];
    let domiciliosPayloadFull = Array.isArray(dadosDomicilios) ? [...dadosDomicilios] : [];

    const payload = {
      role,
      scope: options.scope || {},
      dados: {
        individuos: [],
        domicilios: [],
        historico: historicoDados // Coordenador recebe histórico
      },
      meta: {
        generatedAt: new Date().toISOString(),
        unidadeSelecionada: document.getElementById('filterUnidade')?.value || null
      }
    };

    if (role === 'gestor') {
      const unidadeId = options.unidadeId || payload.meta.unidadeSelecionada;
      if (!unidadeId || unidadeId === '') {
        alert('Selecione uma unidade específica para gerar o link do Gestor.');
        return null;
      }
      payload.scope.unidadeId = unidadeId;
      const normalize = (v) => (v == null ? '' : String(v)).toLowerCase().trim();
      const unidadeIdNorm = normalize(unidadeId);

      // *** MODIFICAÇÃO AQUI: Envia dados COMPLETOS, mas filtrados ***
      payload.dados.individuos = individuosPayloadFull
        .filter(d => normalize(d.estabelecimento) === unidadeIdNorm);
        // .map(stripToReportFields); // <-- REMOVIDO
      payload.dados.domicilios = domiciliosPayloadFull
        .filter(d => normalize(d.estabelecimento) === unidadeIdNorm);
        // .map(stripToReportFields); // <-- REMOVIDO

      delete payload.dados.historico; // Gestor não vê histórico agregado

    } else { // Assume Coordenador ou outro role que precisa de dados completos
      payload.dados.individuos = individuosPayloadFull;
      payload.dados.domicilios = domiciliosPayloadFull;
      // Mantém histórico para Coordenador
    }


    const encodedSessionId = await sendPayloadToServer(payload);
    if (!encodedSessionId) return null;

    const targetHtml = (role === 'coordenador') ? 'coordenador.html' : 'gestor.html';
    return `${targetHtml}?id=${encodedSessionId}`;

  } catch (err) {
    console.error(`Erro ao gerar link para ${role}:`, err);
    alert(`Não foi possível gerar o link do ${role}.\n\nVerifique o console.`);
    return null;
  }
}

// --- Funções de UI (Copiar Link, Mensagens) ---
function copyToClipboard(text) {
  if (!text) return; const fullUrl = new URL(text, PUBLIC_BASE_URL).href;
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(fullUrl).then(() => showSuccessMessage("✅ Link copiado!")).catch(err => { console.warn('Clipboard falhou:', err); fallbackCopyToClipboard(fullUrl); }); }
  else { fallbackCopyToClipboard(fullUrl); }
}
function fallbackCopyToClipboard(text) {
  const ta = document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.focus(); ta.select();
  try { if (document.execCommand('copy')) { showSuccessMessage("✅ Link copiado!"); } else { showLinkInModal(text); } } catch (err) { console.error('Copy fallback falhou:', err); showLinkInModal(text); } finally { document.body.removeChild(ta); }
}
function showSuccessMessage(message) {
  const toast=document.createElement('div'); toast.style.cssText=`position:fixed; top:20px; right:20px; z-index:10000; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; padding:1rem 1.5rem; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); max-width:350px; animation:slideIn 0.25s ease-out`; toast.innerHTML=`<div style="display:flex;align-items:center;gap:.75rem;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><div style="white-space:pre-line;">${message}</div></div>`; const style=document.createElement('style'); style.textContent=`@keyframes slideIn{from{transform:translateX(320px);opacity:0}to{transform:translateX(0);opacity:1}}`; document.head.appendChild(style); document.body.appendChild(toast); setTimeout(()=>{ toast.style.animation='slideIn 0.2s ease-out reverse'; setTimeout(()=>toast.remove(), 200); }, 2600);
}
function showLinkInModal(text) {
  const overlay=document.createElement('div'); overlay.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10000;`; const card=document.createElement('div'); card.style.cssText=`background:#fff;padding:2rem;border-radius:10px;max-width:640px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,.2);`; card.innerHTML=`<h3 style="margin-top:0;color:#333">Link gerado</h3><p style="color:#666">Copie o link abaixo:</p><textarea readonly style="width:100%;height:110px;padding:.75rem;border:2px solid #e0e0e0;border-radius:6px;font-family:monospace;font-size:.9rem;resize:none;" onclick="this.select()">${text}</textarea><button id="__close_modal__" style="margin-top:1rem;padding:.75rem 1.25rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Fechar</button>`; overlay.appendChild(card); document.body.appendChild(overlay); const btnClose=card.querySelector('#__close_modal__'); btnClose.addEventListener('click',()=>overlay.remove()); overlay.addEventListener('click',(e)=>{if(e.target===overlay)overlay.remove();});
}


// --- Inicialização dos Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  const selectProfissionalDownload = document.getElementById('selectProfissionalDownload');
  const btnGenerateLink = document.getElementById('btnGenerateLink');
  const btnDownloadPDF = document.getElementById('btnDownloadPDF');
  const updateButtonsState = () => {
      const hasValue = selectProfissionalDownload && !!selectProfissionalDownload.value;
      if (btnGenerateLink) btnGenerateLink.disabled = !hasValue;
      if (btnDownloadPDF) btnDownloadPDF.disabled = !hasValue;
  };

  if (selectProfissionalDownload) {
      selectProfissionalDownload.addEventListener('change', updateButtonsState);
      updateButtonsState();
  }

  const btnCoord = document.getElementById('btnLinkCoordenador');
  if (btnCoord) {
    const originalCoordHTML = btnCoord.innerHTML;
    btnCoord.addEventListener('click', async () => {
      btnCoord.disabled = true; btnCoord.textContent = 'Gerando...';
      const url = await generateScopedLink('coordenador', { scope: { all: true } });
      if (url) copyToClipboard(url);
      btnCoord.disabled = false; btnCoord.innerHTML = originalCoordHTML;
    });
  }

  const btnGestor = document.getElementById('btnLinkGestor');
  if (btnGestor) {
    const originalGestorHTML = btnGestor.innerHTML;
    btnGestor.addEventListener('click', async () => {
      btnGestor.disabled = true; btnGestor.textContent = 'Gerando...';
      const unidade = document.getElementById('filterUnidade')?.value || null;
      const url = await generateScopedLink('gestor', { unidadeId: unidade });
      if (url) copyToClipboard(url);
      btnGestor.disabled = false; btnGestor.innerHTML = originalGestorHTML;
    });
  }

   if (btnGenerateLink && selectProfissionalDownload) {
      const originalLinkHTML = btnGenerateLink.innerHTML;
       btnGenerateLink.addEventListener('click', async () => {
          btnGenerateLink.disabled = true;
          btnGenerateLink.textContent = 'Gerando...';
          const selectedProfessional = selectProfissionalDownload.value;
          const link = await generateShareableLink(selectedProfessional);
          if (link) copyToClipboard(link);
          updateButtonsState();
          btnGenerateLink.innerHTML = originalLinkHTML;
       });
   }
});