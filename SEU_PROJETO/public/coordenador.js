// ========================================================================
// SCRIPT DEDICADO PARA COORDENADOR.HTML
// ATUALIZADO: MÁSCARAS, PRIVACIDADE E COLUNAS AJUSTADAS
// ========================================================================

// --- Estado Global ---
let dadosIndividuos = [];
let dadosDomicilios = [];
let unidadeChartInd = null;
let unidadeChartDom = null;
let historicoChartCombinado = null; 
let dashboardChart = null;
let activeAccordionCharts = {};
if (typeof window.unitCharts === 'undefined') window.unitCharts = {};
let showAllIndividuos = false;
let showAllDomicilios = false;
const CRITICAL_MONTHS_THRESHOLD = 3;
let sortState = {
  individuos: { key: 'mesesSemAtualizar', order: 'desc' },
  domicilios: { key: 'mesesSemAtualizar', order: 'desc' }
};

// --- Constantes ---
const API_BASE_URL = '/api';
const PUBLIC_BASE_URL = 'http://26.153.86.109:3000/'; 
const BUCKET_COLORS = {
  'Até 4 meses': 'rgba(212, 237, 218, 0.9)', 
  '5 a 12 meses': 'rgba(209, 236, 241, 0.9)', 
  '13 a 24 meses': 'rgba(255, 243, 205, 0.9)',
  'Mais de 2 anos': 'rgba(248, 215, 218, 0.9)' 
};
const BUCKET_BORDERS = {
  'Até 4 meses': '#68D391', 
  '5 a 12 meses': '#63B3ED', 
  '13 a 24 meses': '#F6E05E', 
  'Mais de 2 anos': '#FC8181'  
};
const BUCKET_CLASSES = {
  'Até 4 meses': 'cat-0-4',
  '5 a 12 meses': 'cat-5-12',
  '13 a 24 meses': 'cat-13-24',
  'Mais de 2 anos': 'cat-25-plus'
};
const BUCKET_ORDER = ['Até 4 meses', '5 a 12 meses', '13 a 24 meses', 'Mais de 2 anos'];

// --- Funções Utilitárias Essenciais ---
const norm = (s = '') => String(s).toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
const toDateBR = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return !isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';
};

// --- FUNÇÕES DE MÁSCARA (PRIVACIDADE) ---
function maskDocumento(val) {
  if (!val) return '';
  const s = String(val).replace(/\D/g, ''); 
  if (s.length === 0) return '';
  if (s.length < 3) return s;
  return s.substring(0, 3) + '.***.***';
}

function maskDataNascimento(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `**/**/${d.getFullYear()}`;
}

function maskResponsavel(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (s.length === 0) return '';
  if (s.length <= 3) return s;
  return s.substring(0, 3) + '***';
}
// ---------------------------------------------

function bucket(months) {
  if (!Number.isFinite(months)) return 'Mais de 2 anos';
  if (months <= 4) return 'Até 4 meses';
  if (months <= 12) return '5 a 12 meses';
  if (months <= 24) return '13 a 24 meses';
  return 'Mais de 2 anos';
}
function bucketCategory(rawText, months) {
  const s = String(rawText || '').toLowerCase();
  if (/\bmais\s*de\s*2\s*ano/.test(s) || />\s*2\s*ano/.test(s) || /\b2\+\s*ano/.test(s)) {
    return 'Mais de 2 anos';
  }
  return bucket(months);
}

// --- Funções de Comunicação com Back-end ---
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
    const { id } = await response.json(); 
    return id;
  } catch (err) {
    console.error('Erro ao enviar dados para o servidor:', err);
    alert('Erro ao gerar link: ' + err.message);
    return null;
  }
}

// --- Funções de Geração de Link ---
async function generateShareableLinkProf(professionalName) {
  if (!professionalName) {
    alert('Por favor, selecione um profissional primeiro.');
    return null;
  }
  if (!dadosIndividuos || !dadosDomicilios) {
    alert('Os dados do painel ainda não foram carregados.');
    return null;
  }

  const ind = (dadosIndividuos || []).filter(p => p.acs === professionalName);
  const dom = (dadosDomicilios || []).filter(d => d.acs === professionalName);

  if (ind.length === 0 && dom.length === 0) {
    alert('Nenhum dado encontrado para este profissional nos dados carregados.');
    return null;
  }

  const normalizedInd = ind.map(d => ({
    tipo: 'individuo', acs: d.acs, estabelecimento: d.estabelecimento, nome: d.nome,
    cpf: d.cpf, sus: d.sus, dataNascimento: d.dataNascimento, ultimaAtualizacao: d.ultimaAtualizacao,
    mesesSemAtualizar: d.mesesSemAtualizar, microArea: d.microArea ?? null,
    tempoSemAtualizar: d.tempoSemAtualizar ?? null, _monthsSince: d._monthsSince ?? d.mesesSemAtualizar
  }));
  const normalizedDom = dom.map(d => ({
    tipo: 'domicilio', acs: d.acs, estabelecimento: d.estabelecimento, endereco: d.endereco,
    numero: d.numero, bairro: d.bairro, responsavel: d.responsavel, dataCadastro: d.dataCadastro,
    ultimaAtualizacao: d.ultimaAtualizacao, mesesSemAtualizar: d.mesesSemAtualizar,
    microArea: d.microArea ?? null, tempoSemAtualizar: d.tempoSemAtualizar ?? null,
    _monthsSince: d._monthsSince ?? d.mesesSemAtualizar
  }));

  const combinedPayload = { dados: [...normalizedInd, ...normalizedDom] };

  const sessionId = await sendPayloadToServer(combinedPayload);
  if (!sessionId) return null;

  return `profissional.html?id=${sessionId}`;
}

// --- Funções de UI (Copiar Link, Mensagens) ---
function copyToClipboard(text) { 
  if (!text) return;
  const fullUrl = new URL(text, PUBLIC_BASE_URL).href; 
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showSuccessMessage("✅ Link copiado!\n\nCompartilhe este link.");
    }).catch(err => {
      console.warn('navigator.clipboard falhou, usando fallback:', err);
      fallbackCopyToClipboard(fullUrl);
    });
  } else {
    fallbackCopyToClipboard(fullUrl);
  }
}

function fallbackCopyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand('copy');
    if (ok) {
      showSuccessMessage("✅ Link copiado!\n\nCompartilhe este link.");
    } else {
      showLinkInModal(text);
    }
  } catch (err) {
    console.error('execCommand(copy) falhou:', err);
    showLinkInModal(text);
  } finally {
    document.body.removeChild(ta);
  }
}

function showSuccessMessage(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed; top:20px; right:20px; z-index:10000; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; padding:1rem 1.5rem; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); max-width:350px; animation:slideIn 0.25s ease-out`;
  toast.innerHTML = `<div style="display:flex;align-items:center;gap:.75rem;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><div style="white-space:pre-line;">${message}</div></div>`;
  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn{from{transform:translateX(320px);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.2s ease-out reverse';
    setTimeout(() => toast.remove(), 200);
  }, 2600);
}

function showLinkInModal(text) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;padding:2rem;border-radius:10px;max-width:640px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,.2);';
  card.innerHTML = `<h3 style="margin-top:0;color:#333">Link gerado</h3><p style="color:#666">Copie o link abaixo:</p><textarea readonly style="width:100%;height:110px;padding:.75rem;border:2px solid #e0e0e0;border-radius:6px;font-family:monospace;font-size:.9rem;resize:none;" onclick="this.select()">${text}</textarea><button id="__close_modal__" style="margin-top:1rem;padding:.75rem 1.25rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Fechar</button>`;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const btnClose = card.querySelector('#__close_modal__');
  btnClose.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// --- Funções de Renderização (Acordeão, Relatórios, etc.) ---

function gerarDashboard(individuosFiltrados, domiciliosFiltrados) {
    const totalIndEl = document.getElementById('kpiTotalIndividuos');
    const totalDomEl = document.getElementById('kpiTotalDomicilios');
    const totalCadEl = document.getElementById('kpiTotalCadastros');
    const critTotEl = document.getElementById('kpiCriticosTotal');
    const critIndEl = document.getElementById('kpiCriticosIndividuos');
    const critDomEl = document.getElementById('kpiCriticosDomicilios');
    const atual12El = document.getElementById('kpiAtualizados12m');
    const micro00El = document.getElementById('kpiMicroArea00');
    const canvas = document.getElementById('dashboardChart');
  
    if (!totalIndEl || !canvas) return;
  
    const ind = Array.isArray(individuosFiltrados) ? individuosFiltrados : [];
    const dom = Array.isArray(domiciliosFiltrados) ? domiciliosFiltrados : [];
  
    const totalInd = ind.length;
    const totalDom = dom.length;
    const totalCad = totalInd + totalDom;
  
    const isCritico = (item) => {
      const months = Number.isFinite(item._monthsSince)
        ? item._monthsSince
        : (Number.isFinite(item.mesesSemAtualizar) ? item.mesesSemAtualizar : Infinity);
      const micro = String(item.microArea ?? '').padStart(2, '0');
      return micro === '00' || months > 4;
    };
  
    const isAtualizado12m = (item) => {
      const months = Number.isFinite(item._monthsSince)
        ? item._monthsSince
        : (Number.isFinite(item.mesesSemAtualizar) ? item.mesesSemAtualizar : Infinity);
      return months <= 12;
    };
  
    const countCritInd = ind.filter(isCritico).length;
    const countCritDom = dom.filter(isCritico).length;
    const countAtual12 = ind.filter(isAtualizado12m).length + dom.filter(isAtualizado12m).length;
  
    const countMicro00 = ind.concat(dom).filter(item => {
      const m = String(item.microArea ?? '').padStart(2, '0');
      return m === '00';
    }).length;
  
    totalIndEl.textContent = totalInd.toLocaleString('pt-BR');
    totalDomEl.textContent = totalDom.toLocaleString('pt-BR');
    totalCadEl.textContent = totalCad.toLocaleString('pt-BR');
  
    critTotEl.textContent = (countCritInd + countCritDom).toLocaleString('pt-BR');
    critIndEl.textContent = countCritInd.toLocaleString('pt-BR');
    critDomEl.textContent = countCritDom.toLocaleString('pt-BR');
  
    atual12El.textContent = countAtual12.toLocaleString('pt-BR');
    micro00El.textContent = countMicro00.toLocaleString('pt-BR');
  
    const buckets = { 'Até 4 meses': 0, '5 a 12 meses': 0, '13 a 24 meses': 0, 'Mais de 2 anos': 0 };
  
    const acumular = (item) => {
      const months = Number.isFinite(item._monthsSince) ? item._monthsSince :
                     (Number.isFinite(item.mesesSemAtualizar) ? item.mesesSemAtualizar : Infinity);
      const cat = bucketCategory(item.tempoSemAtualizar, months);
      if (!buckets.hasOwnProperty(cat)) return;
      buckets[cat]++;
    };
  
    ind.forEach(acumular);
    dom.forEach(acumular);
  
    const labels = Object.keys(buckets);
    const data = labels.map(l => buckets[l]);
    
    const BUCKET_COLORS_CHART = {
      'Até 4 meses': 'rgba(102, 187, 106, 0.7)', '5 a 12 meses': 'rgba(66, 165, 245, 0.7)',
      '13 a 24 meses': 'rgba(255, 159, 64, 0.7)', 'Mais de 2 anos': 'rgba(255, 99, 132, 0.7)'
    };
    const BUCKET_BORDERS_CHART = {
      'Até 4 meses': 'rgba(102, 187, 106, 1)', '5 a 12 meses': 'rgba(66, 165, 245, 1)',
      '13 a 24 meses': 'rgba(255, 159, 64, 1)', 'Mais de 2 anos': 'rgba(255, 99, 132, 1)'
    };
  
    if (dashboardChart) { try { dashboardChart.destroy(); } catch (e) {} }
  
    const ctx = canvas.getContext('2d');
    dashboardChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Quantidade de cadastros',
          data,
          backgroundColor: labels.map(l => BUCKET_COLORS_CHART[l] || 'rgba(99,102,241,0.15)'),
          borderColor: labels.map(l => BUCKET_BORDERS_CHART[l] || '#4F46E5'),
          borderWidth: 1.5, borderRadius: 6, maxBarThickness: 48
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y.toLocaleString('pt-BR')} cadastros` } } },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { precision: 0 } } }
      }
    });
}

function atualizarFiltros(dados) {
  const unidades = new Set();
  const profissionais = new Set();
  dados.forEach(item => {
    if (item.estabelecimento) unidades.add(item.estabelecimento);
    if (item.acs) profissionais.add(item.acs);
  });
  const selU = document.getElementById('filterUnidade');
  if(selU) {
    selU.innerHTML = `<option value="">Todas</option>` + Array.from(unidades).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(u => `<option value="${u}">${u}</option>`).join('');
  }
  const selP = document.getElementById('filterProfissional');
  if(selP) {
    selP.innerHTML = `<option value="">Todos</option>` + Array.from(profissionais).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(p => `<option value="${p}">${p}</option>`).join('');
  }
}

function getFilterFunction() {
  const u = document.getElementById('filterUnidade')?.value || '';
  const p = document.getElementById('filterProfissional')?.value || '';
  return (row) => (!u || row.estabelecimento === u) && (!p || row.acs === p);
}

// --- POPULAR TABELA INDIVÍDUOS (COM MÁSCARAS E SEPARAÇÃO) ---
function popularTabelaIndividuos(dados) {
  const container = document.getElementById('accordionIndividuosContainer');
  if(!container) return;
  container.innerHTML = '';

  const dadosParaExibir = dados.filter(item =>
    showAllIndividuos ||
    String(item.microArea).padStart(2,'0') === '00' ||
    item._monthsSince >= CRITICAL_MONTHS_THRESHOLD
  );

  if (!dadosParaExibir.length) {
    container.innerHTML = `<em>${showAllIndividuos ? 'Nenhum indivíduo para exibir.' : 'Nenhum cadastro crítico encontrado.'}</em>`;
    return;
  }

  const headers = `
    <th data-sort="nome" data-type="string">Nome</th> 
    <th data-sort="cpf" data-type="string">CPF</th> 
    <th data-sort="sus" data-type="string">SUS</th> 
    <th data-sort="dataNascimento" data-type="date">Nasc.</th> 
    <th data-sort="microArea" data-type="string">Micro Área</th> 
    <th data-sort="ultimaAtualizacao" data-type="date">Últ. Atual.</th> 
    <th data-sort="tempoSemAtualizar" data-type="string">Tempo</th> 
  `;

  const groupedByProfissional = new Map();
  dadosParaExibir.forEach(item => {
    const profissional = item.acs || '(Sem Profissional)';
    if (!groupedByProfissional.has(profissional)) groupedByProfissional.set(profissional, []);
    groupedByProfissional.get(profissional).push(item);
  });

  const sortedGroups = Array.from(groupedByProfissional.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

  sortedGroups.forEach(([profissional, individuos]) => {
    const unidade = individuos[0]?.estabelecimento || 'N/A';
    const chartId = `chart-ind-${norm(profissional)}`;

    const rowsHtml = individuos.map(item => {
      const cat = bucketCategory(item.tempoSemAtualizar, item._monthsSince);
      let rowClass = BUCKET_CLASSES[cat] || '';
      if(String(item.microArea).padStart(2, '0') === '00') {
        rowClass = 'micro-area-00';
      }

      // LÓGICA INTELIGENTE CPF/SUS
      let rawCpf = String(item.cpf || '').replace(/\D/g, '');
      let rawSus = String(item.sus || '').replace(/\D/g, '');
      let finalCpf = '';
      let finalSus = '';

      if (rawCpf.length > 11) { finalSus = rawCpf; } else if (rawCpf.length > 0) { finalCpf = rawCpf; }
      if (rawSus.length > 11) { finalSus = rawSus; } else if (rawSus.length > 0 && rawSus.length <= 11) { if (!finalCpf) finalCpf = rawSus; }

      return `<tr class="${rowClass}" data-category="${cat}">
        <td><a href="#" data-profissional="${item.acs}" class="profissional-link">${item.nome || ''}</a></td>
        <td>${maskDocumento(finalCpf)}</td>
        <td>${maskDocumento(finalSus)}</td>
        <td>${maskDataNascimento(item.dataNascimento)}</td>
        <td>${item.microArea || ''}</td>
        <td>${toDateBR(item.ultimaAtualizacao) || ''}</td>
        <td>${item.tempoSemAtualizar || ''}</td>
        </tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="accordion-item"><div class="accordion-header"><h3>${profissional}</h3><div class="info"><span class="unidade-info">${unidade}</span><span class="count">${individuos.length}</span></div></div>
      <div class="accordion-content"><div id="accordionIndividuosContent" class="accordion-content-grid">
          <div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div>
          <div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
      </div></div></div>`);
  });
}

// --- POPULAR TABELA DOMICÍLIOS (COM MÁSCARA E COLUNA REMOVIDA) ---
function popularTabelaDomicilios(dados) {
  const container = document.getElementById('accordionDomiciliosContainer');
   if(!container) return;
  container.innerHTML = '';

  const dadosParaExibir = dados.filter(item =>
    showAllDomicilios ||
    String(item.microArea).padStart(2,'0') === '00' ||
    item._monthsSince >= CRITICAL_MONTHS_THRESHOLD
  );

  if (!dadosParaExibir.length) {
    container.innerHTML = `<em>${showAllDomicilios ? 'Nenhum domicílio para exibir.' : 'Nenhum cadastro crítico encontrado.'}</em>`;
    return;
  }

  const headers = `
    <th data-sort="endereco" data-type="string">Logradouro</th> 
    <th data-sort="numero" data-type="string">Nº</th> 
    <th data-sort="bairro" data-type="string">Bairro</th> 
    <th data-sort="responsavel" data-type="string">Responsável</th> 
    <th data-sort="microArea" data-type="string">Micro Área</th> 
    <th data-sort="dataCadastro" data-type="date">Cadastro</th> 
    <th data-sort="mesesSemAtualizar" data-type="numeric">Meses ⇅</th>
  `;

  const groupedByProfissional = new Map();
  dadosParaExibir.forEach(item => {
    const profissional = item.acs || '(Sem Profissional)';
    if (!groupedByProfissional.has(profissional)) groupedByProfissional.set(profissional, []);
    groupedByProfissional.get(profissional).push(item);
  });

  const sortedGroups = Array.from(groupedByProfissional.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

  sortedGroups.forEach(([profissional, domicilios]) => {
    const unidade = domicilios[0]?.estabelecimento || 'N/A';
    const chartId = `chart-dom-${norm(profissional)}`;

    const rowsHtml = domicilios.map(item => {
       const cat = bucketCategory(item.tempoSemAtualizar, item._monthsSince);
       let rowClass = BUCKET_CLASSES[cat] || '';
       if(String(item.microArea).padStart(2, '0') === '00') {
         rowClass = 'micro-area-00';
       }

      return `<tr class="${rowClass}" data-category="${cat}">
        <td>${item.endereco||''}</td>
        <td>${item.numero||''}</td>
        <td>${item.bairro||''}</td>
        <td>${maskResponsavel(item.responsavel)}</td>
        <td>${item.microArea||''}</td>
        <td>${toDateBR(item.dataCadastro) || ''}</td>
        <td>${item.mesesSemAtualizar ?? 'N/A'}</td>
      </tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="accordion-item"><div class="accordion-header"><h3>${profissional}</h3><div class="info"><span class="unidade-info">${unidade}</span><span class="count">${domicilios.length}</span></div></div>
      <div class="accordion-content"><div id="accordionDomiciliosContent" class="accordion-content-grid">
          <div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div>
          <div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
      </div></div></div>`);
  });
}

function handleAccordionClick(e) {
    const header = e.target.closest('.accordion-header');
    if (header) {
      const item = header.parentElement;
      if (!item) return;
      const wasActive = item.classList.contains('active');

      if (!wasActive) {
          const canvas = item.querySelector('canvas');
          if (canvas && !activeAccordionCharts[canvas.id]) {
              const container = item.closest('.accordion-container');
              if(!container) return;
              const dados = container.id === 'accordionIndividuosContainer' ? dadosIndividuos : dadosDomicilios;
              const profissionalH3 = header.querySelector('h3');
              if (!profissionalH3) return;
              const profissional = profissionalH3.textContent;
              const profData = dados.filter(d => (d.acs || '(Sem Profissional)') === profissional);

              const bucketCounts = { 'Até 4 meses':0, '5 a 12 meses':0, '13 a 24 meses':0, 'Mais de 2 anos':0 };
              profData.forEach(d => bucketCounts[bucketCategory(d.tempoSemAtualizar, d._monthsSince)]++);
              renderAccordionChart(canvas.id, bucketCounts);
          }
      }

      const parentContainer = item.parentElement;
      if (parentContainer) {
        parentContainer.querySelectorAll('.accordion-item.active').forEach(i => {
            if (i !== item || wasActive) {
                 i.classList.remove('active');
            }
        });
      }

      if (!wasActive) {
        item.classList.add('active');
      }
    }
    const link = e.target.closest('.profissional-link');
    if (link) {
      e.preventDefault();
      const prof = link.dataset.profissional;
      const filterProfSelect = document.getElementById('filterProfissional');
      if (prof && filterProfSelect) {
        filterProfSelect.value = prof;
        aplicarFiltrosEViews();
        switchTab('detalhesProfissional');
      }
    }
}

function renderAccordionChart(canvasId, bucketData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if(activeAccordionCharts[canvasId]) { try { activeAccordionCharts[canvasId].destroy(); } catch(e){} }

  const ctx = canvas.getContext('2d');
  const labels = Object.keys(bucketData);
  const data = Object.values(bucketData);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Cadastros',
        data,
        backgroundColor: labels.map(label => BUCKET_COLORS[label]),
        borderColor: labels.map(label => BUCKET_BORDERS[label]),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true }, x: { ticks: { precision: 0 } } },
      plugins: { legend: { display: false }, title: { display: true, text: 'Status de Atualização' } },
      onClick: (evt) => {
        const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (points.length) {
            const firstPoint = points[0];
            const clickedLabel = chart.data.labels[firstPoint.index];
            const accordionItem = canvas.closest('.accordion-item');
            if(!accordionItem) return;
            const tbody = accordionItem.querySelector('tbody');
            if (!tbody) return;
            const currentFilter = tbody.dataset.activeFilter;

            if (currentFilter === clickedLabel) {
                tbody.removeAttribute('data-active-filter');
                tbody.querySelectorAll('tr').forEach(tr => tr.style.display = '');
            } else {
                tbody.dataset.activeFilter = clickedLabel;
                tbody.querySelectorAll('tr').forEach(tr => {
                    tr.style.display = tr.dataset.category === clickedLabel ? '' : 'none';
                });
            }
        }
      }
    }
  });
  activeAccordionCharts[canvasId] = chart;
}

function pesquisarAccordion(containerId, term) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = container.querySelectorAll(`.accordion-item`);
  const q = (term || '').toLowerCase();
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
}

function sortData(type) {
  const state = sortState[type];
  const data = (type === 'individuos') ? dadosIndividuos : dadosDomicilios;
  const { key, order, dataType } = state;

  data.sort((a, b) => {
    let valA = a[key] ?? '';
    let valB = b[key] ?? '';

    if (dataType === 'numeric' || dataType === 'date') {
        let numA = (dataType === 'date') ? new Date(valA).getTime() : parseFloat(valA);
        let numB = (dataType === 'date') ? new Date(valB).getTime() : parseFloat(valB);
        numA = Number.isFinite(numA) ? numA : (order === 'asc' ? Infinity : -Infinity);
        numB = Number.isFinite(numB) ? numB : (order === 'asc' ? Infinity : -Infinity);
      return (numA - numB) * (order === 'asc' ? 1 : -1);
    } else {
      return String(valA).localeCompare(String(valB), 'pt-BR') * (order === 'asc' ? 1 : -1);
    }
  });
}

function handleSortClick(e) {
  const header = e.target.closest('th[data-sort]');
  if (!header) return;

  const sortKey = header.dataset.sort;
  const dataType = header.dataset.type || 'string';
  const table = header.closest('table');
  if (!table) return;

  const tabContent = header.closest('.tab-content');
  if (!tabContent) return;

  const tableType = (tabContent.id === 'tab-individuos') ? 'individuos' : 'domicilios';

  const state = sortState[tableType];

  if (state.key === sortKey) {
    state.order = state.order === 'asc' ? 'desc' : 'asc';
  } else {
    state.key = sortKey;
    state.dataType = dataType;
    state.order = (dataType === 'numeric' || dataType === 'date') ? 'desc' : 'asc';
  }

  sortData(tableType);
  aplicarFiltrosEViews();
}

function gerarRelatorioPorUnidadeInd(dados) {
    const container = document.getElementById('relatorioContainerInd');
    if (!container) return; container.innerHTML = '';
    if (!dados.length) { container.innerHTML = `<div class="rel-card"><em>Nenhum indivíduo para exibir.</em></div>`; return; }
    const countsByUnit = new Map(); dados.forEach(item => { const unit = item.estabelecimento || '(Sem Unidade)'; countsByUnit.set(unit, (countsByUnit.get(unit) || 0) + 1); });
    const labels = Array.from(countsByUnit.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR')); const individuosData = labels.map(unit => countsByUnit.get(unit));
    container.insertAdjacentHTML('beforeend', `<section class="rel-card"><h2>Total de Indivíduos por Unidade</h2><div class="chart-container" style="height: 400px;"><canvas id="relatorio-unidade-ind-chart"></canvas></div></section>`);
    const chartEl = document.getElementById('relatorio-unidade-ind-chart'); if(!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (unidadeChartInd) { try { unidadeChartInd.destroy(); } catch(e){} }
    unidadeChartInd = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Indivíduos', data: individuosData, backgroundColor: 'rgba(255, 99, 132, 0.7)', borderColor: 'rgb(255, 99, 132)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Total de Cadastros de Indivíduos' } } } });
    const byUnit = new Map(); dados.forEach(item => { const u = item.estabelecimento || '(Sem Unidade)'; if (!byUnit.has(u)) byUnit.set(u, []); byUnit.get(u).push(item); });
    const unitsSorted = Array.from(byUnit.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    unitsSorted.forEach(un => { const individuos = byUnit.get(un); const bucketsInd = Object.fromEntries(BUCKET_ORDER.map(k => [k, 0])); individuos.forEach(it => { const cat = bucketCategory(it.tempoSemAtualizar, it._monthsSince); if (bucketsInd[cat] !== undefined) bucketsInd[cat]++; }); container.insertAdjacentHTML('beforeend', `<section class="rel-card"><h3>Unidade: <a href="#" data-unidade="${un}">${un}</a> (Indivíduos)</h3><div class="rel-card-content"><div class="chart-container-half"><canvas id="chart-unidade-ind-${norm(un)}"></canvas></div></div></section>`); (function () { const indCanvas = document.getElementById(`chart-unidade-ind-${norm(un)}`); if (indCanvas) { const chartId = `chart-unidade-ind-${norm(un)}`; const ex1 = window.unitCharts[chartId]; if (ex1) { try { ex1.destroy(); } catch (e) { } } const ctx1 = indCanvas.getContext('2d'); const labels1 = BUCKET_ORDER; const data1 = labels1.map(l => bucketsInd[l] || 0); window.unitCharts[chartId] = new Chart(ctx1, { type: 'bar', data: { labels: labels1, datasets: [{ label: 'Indivíduos', data: data1, backgroundColor: labels1.map(l => BUCKET_COLORS[l]), borderColor: labels1.map(l => BUCKET_BORDERS[l]), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: true }, title: { display: true, text: 'Indivíduos — Período de Atualização' } } } }); } })(); });
}
function gerarRelatorioPorUnidadeDom(dados) {
    const container = document.getElementById('relatorioContainerDom');
    if (!container) return; container.innerHTML = '';
     if (!dados.length) { container.innerHTML = `<div class="rel-card"><em>Nenhum domicílio para exibir.</em></div>`; return; }
    const countsByUnit = new Map(); dados.forEach(item => { const unit = item.estabelecimento || '(Sem Unidade)'; countsByUnit.set(unit, (countsByUnit.get(unit) || 0) + 1); });
    const labels = Array.from(countsByUnit.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR')); const domiciliosData = labels.map(unit => countsByUnit.get(unit));
    container.insertAdjacentHTML('beforeend', `<section class="rel-card"><h2>Total de Domicílios por Unidade</h2><div class="chart-container" style="height: 400px;"><canvas id="relatorio-unidade-dom-chart"></canvas></div></section>`);
    const chartEl = document.getElementById('relatorio-unidade-dom-chart'); if(!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (unidadeChartDom) { try { unidadeChartDom.destroy(); } catch(e){} }
    unidadeChartDom = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Domicílios', data: domiciliosData, backgroundColor: 'rgba(54, 162, 235, 0.7)', borderColor: 'rgb(54, 162, 235)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Total de Cadastros de Domicílios' } } } });
    const byUnit = new Map(); dados.forEach(item => { const u = item.estabelecimento || '(Sem Unidade)'; if (!byUnit.has(u)) byUnit.set(u, []); byUnit.get(u).push(item); });
    const unitsSorted = Array.from(byUnit.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    unitsSorted.forEach(un => { const domicilios = byUnit.get(un); const bucketsDom = Object.fromEntries(BUCKET_ORDER.map(k => [k, 0])); domicilios.forEach(it => { const cat = bucketCategory(it.tempoSemAtualizar, it._monthsSince); if (bucketsDom[cat] !== undefined) bucketsDom[cat]++; }); container.insertAdjacentHTML('beforeend', `<section class="rel-card"><h3>Unidade: <a href="#" data-unidade="${un}">${un}</a> (Domicílios)</h3><div class="rel-card-content"><div class="chart-container-half"><canvas id="chart-unidade-dom-${norm(un)}"></canvas></div></div></section>`); (function () { const domCanvas = document.getElementById(`chart-unidade-dom-${norm(un)}`); if (domCanvas) { const chartId = `chart-unidade-dom-${norm(un)}`; const ex2 = window.unitCharts[chartId]; if (ex2) { try { ex2.destroy(); } catch (e) { } } const ctx2 = domCanvas.getContext('2d'); const labels2 = BUCKET_ORDER; const data2 = labels2.map(l => bucketsDom[l] || 0); window.unitCharts[chartId] = new Chart(ctx2, { type: 'bar', data: { labels: labels2, datasets: [{ label: 'Domicílios', data: data2, backgroundColor: labels2.map(l=>BUCKET_COLORS[l]), borderColor: labels2.map(l=>BUCKET_BORDERS[l]), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: true }, title: { display: true, text: 'Domicílios — Período de Atualização' } } } }); } })(); });
}
function gerarRelatorioPorProfissionalInd(dadosInd) {
    const cont = document.getElementById('relatorioProfissionalContainerInd');
    if (!cont) return; cont.innerHTML = '';
    const byProf = new Map(); dadosInd.forEach(r => { const p = r.acs || '(Sem ACS)'; const u = r.estabelecimento || '(Sem unidade)'; if (!byProf.has(p)) byProf.set(p, { unidade: u, totalIndividuos: 0 }); byProf.get(p).totalIndividuos++; }); const profissionais = Array.from(byProf.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR')); if (!profissionais.length) { cont.innerHTML = `<div class="rel-card"><em>Nenhum indivíduo para exibir.</em></div>`; return; } const rows = profissionais.map(p => { const data = byProf.get(p); return `<tr><td><a href="#" data-profissional="${p}">${p}</a></td><td>${data.unidade}</td><td>${data.totalIndividuos}</td></tr>`; }).join(''); cont.insertAdjacentHTML('beforeend', `<section class="rel-card"><h2>Relatório de Indivíduos por Profissional</h2><div class="table-container"><table><thead><tr><th>ACS</th><th>Unidade</th><th>Total de Indivíduos</th></tr></thead><tbody>${rows || `<tr><td colspan="3"><em>Sem registros.</em></td></tr>`}</tbody></table></div></section>`);
}
function gerarRelatorioPorProfissionalDom(dadosDom) {
    const cont = document.getElementById('relatorioProfissionalContainerDom');
    if (!cont) return; cont.innerHTML = '';
    const byProf = new Map(); dadosDom.forEach(r => { const p = r.acs || '(Sem ACS)'; const u = r.estabelecimento || '(Sem unidade)'; if (!byProf.has(p)) byProf.set(p, { unidade: u, totalDomicilios: 0 }); byProf.get(p).totalDomicilios++; }); const profissionais = Array.from(byProf.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR')); if (!profissionais.length) { cont.innerHTML = `<div class="rel-card"><em>Nenhum domicílio para exibir.</em></div>`; return; } const rows = profissionais.map(p => { const data = byProf.get(p); return `<tr><td><a href="#" data-profissional="${p}">${p}</a></td><td>${data.unidade}</td><td>${data.totalDomicilios}</td></tr>`; }).join(''); cont.insertAdjacentHTML('beforeend', `<section class="rel-card"><h2>Relatório de Domicílios por Profissional</h2><div class="table-container"><table><thead><tr><th>ACS</th><th>Unidade</th><th>Total de Domicílios</th></tr></thead><tbody>${rows || `<tr><td colspan="3"><em>Sem registros.</em></td></tr>`}</tbody></table></div></section>`);
}

function gerarHistoricoChart() {
  const messageEl = document.getElementById('historicoChartMessage');
  const canvas = document.getElementById('historicoChartCombinado'); 

  if (!messageEl || !canvas) {
    if(messageEl) messageEl.textContent = "Erro: Elementos do gráfico não foram encontrados.";
    return;
  }

  let historico = [];
  try {
    historico = JSON.parse(localStorage.getItem('cadastroHistorico') || '[]');
  } catch (e) {
    console.error("Falha ao ler histórico do localStorage:", e);
    historico = [];
  }

  if (historicoChartCombinado) {
    try { historicoChartCombinado.destroy(); } catch (e) { }
    historicoChartCombinado = null;
  }

  if (historico.length === 0) {
    messageEl.textContent = "Nenhum histórico de processamento encontrado.";
    canvas.style.display = 'none'; 
    return;
  }

  messageEl.textContent = ""; 
  canvas.style.display = 'block'; 

  const labels = historico.map(snapshot => {
    try {
      return new Date(snapshot.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', });
    } catch (e) { return 'Data Inválida'; }
  });

  const datasets = [
    { label: 'Até 4 meses', data: historico.map(s => s.counts['Até 4 meses'] || 0), borderColor: BUCKET_BORDERS['Até 4 meses'], backgroundColor: BUCKET_COLORS['Até 4 meses'], fill: false, tension: 0.1, pointRadius: 4, },
    { label: '5 a 12 meses', data: historico.map(s => s.counts['5 a 12 meses'] || 0), borderColor: BUCKET_BORDERS['5 a 12 meses'], backgroundColor: BUCKET_COLORS['5 a 12 meses'], fill: false, tension: 0.1, pointRadius: 4, },
    { label: '13 a 24 meses', data: historico.map(s => s.counts['13 a 24 meses'] || 0), borderColor: BUCKET_BORDERS['13 a 24 meses'], backgroundColor: BUCKET_COLORS['13 a 24 meses'], fill: false, tension: 0.1, pointRadius: 4, },
    { label: 'Mais de 2 anos', data: historico.map(s => s.counts['Mais de 2 anos'] || 0), borderColor: BUCKET_BORDERS['Mais de 2 anos'], backgroundColor: BUCKET_COLORS['Mais de 2 anos'], fill: false, tension: 0.1, pointRadius: 4, }
  ];

  const ctx = canvas.getContext('2d');
  historicoChartCombinado = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Nº de Cadastros' }, ticks: { precision: 0 } }, x: { title: { display: true, text: 'Data do Processamento' } } },
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, } }, title: { display: true, text: 'Evolução Total de Cadastros por Categoria', font: { size: 16 } }, tooltip: { mode: 'index', intersect: false, } },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    }
  });
}

function gerarDashboard(individuosFiltrados, domiciliosFiltrados) {
    const totalIndEl = document.getElementById('kpiTotalIndividuos');
    const totalDomEl = document.getElementById('kpiTotalDomicilios');
    const totalCadEl = document.getElementById('kpiTotalCadastros');
    const critTotEl = document.getElementById('kpiCriticosTotal');
    const critIndEl = document.getElementById('kpiCriticosIndividuos');
    const critDomEl = document.getElementById('kpiCriticosDomicilios');
    const atual12El = document.getElementById('kpiAtualizados12m');
    const micro00El = document.getElementById('kpiMicroArea00');
    const canvas = document.getElementById('dashboardChart');
  
    if (!totalIndEl || !canvas) return;
  
    const ind = Array.isArray(individuosFiltrados) ? individuosFiltrados : [];
    const dom = Array.isArray(domiciliosFiltrados) ? domiciliosFiltrados : [];
  
    const totalInd = ind.length;
    const totalDom = dom.length;
    const totalCad = totalInd + totalDom;
  
    const isCritico = (item) => {
      const months = Number.isFinite(item._monthsSince) ? item._monthsSince : (Number.isFinite(item.mesesSemAtualizar) ? item.mesesSemAtualizar : Infinity);
      const micro = String(item.microArea ?? '').padStart(2, '0');
      return micro === '00' || months > 4;
    };
  
    const isAtualizado12m = (item) => {
      const months = Number.isFinite(item._monthsSince) ? item._monthsSince : (Number.isFinite(item.mesesSemAtualizar) ? item.mesesSemAtualizar : Infinity);
      return months <= 12;
    };
  
    const countCritInd = ind.filter(isCritico).length;
    const countCritDom = dom.filter(isCritico).length;
    const countAtual12 = ind.filter(isAtualizado12m).length + dom.filter(isAtualizado12m).length;
    const countMicro00 = ind.concat(dom).filter(item => { const m = String(item.microArea ?? '').padStart(2, '0'); return m === '00'; }).length;
  
    totalIndEl.textContent = totalInd.toLocaleString('pt-BR');
    totalDomEl.textContent = totalDom.toLocaleString('pt-BR');
    totalCadEl.textContent = totalCad.toLocaleString('pt-BR');
    critTotEl.textContent = (countCritInd + countCritDom).toLocaleString('pt-BR');
    critIndEl.textContent = countCritInd.toLocaleString('pt-BR');
    critDomEl.textContent = countCritDom.toLocaleString('pt-BR');
    atual12El.textContent = countAtual12.toLocaleString('pt-BR');
    micro00El.textContent = countMicro00.toLocaleString('pt-BR');
  
    const buckets = { 'Até 4 meses': 0, '5 a 12 meses': 0, '13 a 24 meses': 0, 'Mais de 2 anos': 0 };
    const acumular = (item) => {
      const months = Number.isFinite(item._monthsSince) ? item._monthsSince : (Number.isFinite(item.mesesSemAtualizar) ? item.mesesSemAtualizar : Infinity);
      const cat = bucketCategory(item.tempoSemAtualizar, months);
      if (!buckets.hasOwnProperty(cat)) return;
      buckets[cat]++;
    };
    ind.forEach(acumular);
    dom.forEach(acumular);
  
    const labels = Object.keys(buckets);
    const data = labels.map(l => buckets[l]);
    
    const BUCKET_COLORS_CHART = { 'Até 4 meses': 'rgba(102, 187, 106, 0.7)', '5 a 12 meses': 'rgba(66, 165, 245, 0.7)', '13 a 24 meses': 'rgba(255, 159, 64, 0.7)', 'Mais de 2 anos': 'rgba(255, 99, 132, 0.7)' };
    const BUCKET_BORDERS_CHART = { 'Até 4 meses': 'rgba(102, 187, 106, 1)', '5 a 12 meses': 'rgba(66, 165, 245, 1)', '13 a 24 meses': 'rgba(255, 159, 64, 1)', 'Mais de 2 anos': 'rgba(255, 99, 132, 1)' };
  
    if (dashboardChart) { try { dashboardChart.destroy(); } catch (e) {} }
    const ctx = canvas.getContext('2d');
    dashboardChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Quantidade de cadastros', data, backgroundColor: labels.map(l => BUCKET_COLORS_CHART[l] || 'rgba(99,102,241,0.15)'), borderColor: labels.map(l => BUCKET_BORDERS_CHART[l] || '#4F46E5'), borderWidth: 1.5, borderRadius: 6, maxBarThickness: 48
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y.toLocaleString('pt-BR')} cadastros` } } },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { precision: 0 } } }
      }
    });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  const tabContent = document.getElementById(`tab-${tabId}`);

  if (tabButton) tabButton.classList.add('active');
  if (tabContent) tabContent.classList.add('active');

  const filterFn = getFilterFunction();

  Object.values(activeAccordionCharts).forEach(chart => { try { chart.destroy(); } catch(e){} });
  activeAccordionCharts = {};

  if (tabId === 'dashboard') { gerarDashboard(dadosIndividuos.filter(filterFn), dadosDomicilios.filter(filterFn)); }
  else if (tabId === 'individuos') { popularTabelaIndividuos(dadosIndividuos.filter(filterFn)); }
  else if (tabId === 'domicilios') { popularTabelaDomicilios(dadosDomicilios.filter(filterFn)); }
  else if (tabId === 'relatorio-unidade-ind') { gerarRelatorioPorUnidadeInd(dadosIndividuos.filter(filterFn)); }
  else if (tabId === 'relatorio-unidade-dom') { gerarRelatorioPorUnidadeDom(dadosDomicilios.filter(filterFn)); }
  else if (tabId === 'relatorio-prof-ind') { gerarRelatorioPorProfissionalInd(dadosIndividuos.filter(filterFn)); }
  else if (tabId === 'relatorio-prof-dom') { gerarRelatorioPorProfissionalDom(dadosDomicilios.filter(filterFn)); }
  else if (tabId === 'historico') { gerarHistoricoChart(); }
}

function aplicarFiltrosEViews() {
  const filterFn = getFilterFunction();
  const activeTabButton = document.querySelector('.tab-button.active');
  const activeTab = activeTabButton ? activeTabButton.dataset.tab : 'dashboard'; 

  Object.values(activeAccordionCharts).forEach(chart => { try { chart.destroy(); } catch(e){} });
  activeAccordionCharts = {};

  const filtradosInd = dadosIndividuos.filter(filterFn);
  const filtradosDom = dadosDomicilios.filter(filterFn);
  
  switch (activeTab) {
    case 'dashboard': gerarDashboard(filtradosInd, filtradosDom); break; 
    case 'individuos': popularTabelaIndividuos(filtradosInd); break;
    case 'domicilios': popularTabelaDomicilios(filtradosDom); break;
    case 'relatorio-unidade-ind': gerarRelatorioPorUnidadeInd(filtradosInd); break;
    case 'relatorio-unidade-dom': gerarRelatorioPorUnidadeDom(filtradosDom); break;
    case 'relatorio-prof-ind': gerarRelatorioPorProfissionalInd(filtradosInd); break;
    case 'relatorio-prof-dom': gerarRelatorioPorProfissionalDom(filtradosDom); break;
  }
}

function populateProfessionalSelectCoord() {
  const select = document.getElementById("selectProfissionalDownloadCoord");
  if (!select) return;

  select.innerHTML = "<option value=\"\">Selecione um Profissional</option>";

  const profissionais = new Set();
  [...dadosIndividuos, ...dadosDomicilios].forEach(item => {
    if (item.acs) profissionais.add(item.acs);
  });

  Array.from(profissionais).sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(p => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    select.appendChild(option);
  });
}

async function loadDataFromLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id'); 

  if (!sessionId) { return; }

  try {
    const response = await fetch(`/api/session/${sessionId}`);
    if (!response.ok) {
        if (response.status === 404) { alert('Link expirado ou não encontrado.'); }
        else { 
            let e = 'Falha no servidor.'; 
            try { const err = await response.json(); e = err.error || e; } catch(_) {} 
            alert('Erro: ' + e); 
        }
        return;
    }

    const payload = await response.json();

    if (!payload || !payload.dados) {
      alert('Dados do link vazios ou corrompidos.');
      return;
    }

    try {
      const historicoPayload = payload.dados.historico || null;
      localStorage.setItem('cadastroHistorico', JSON.stringify(historicoPayload || []));
    } catch (e) { console.error('Falha ao salvar histórico:', e); }

    window.dadosIndividuos = payload.dados.individuos || [];
    window.dadosDomicilios = payload.dados.domicilios || [];
    dadosIndividuos = window.dadosIndividuos;
    dadosDomicilios = window.dadosDomicilios;

    atualizarFiltros([...dadosIndividuos, ...dadosDomicilios]);
    populateProfessionalSelectCoord();
    
    // Define Dashboard como aba ativa inicial
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const dashBtn = document.querySelector('.tab-button[data-tab="dashboard"]');
    const dashContent = document.getElementById('tab-dashboard');
    if(dashBtn) dashBtn.classList.add('active');
    if(dashContent) dashContent.classList.add('active');

    aplicarFiltrosEViews(); 

  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    alert("Erro ao carregar dados: " + err.message);
  }
}

function atualizarFiltros(dados) {
  const unidades = new Set();
  const profissionais = new Set();
  dados.forEach(item => {
    if (item.estabelecimento) unidades.add(item.estabelecimento);
    if (item.acs) profissionais.add(item.acs);
  });
  const selU = document.getElementById('filterUnidade');
  if(selU) {
    selU.innerHTML = `<option value="">Todas</option>` + Array.from(unidades).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(u => `<option value="${u}">${u}</option>`).join('');
  }
  const selP = document.getElementById('filterProfissional');
  if(selP) {
    selP.innerHTML = `<option value="">Todos</option>` + Array.from(profissionais).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(p => `<option value="${p}">${p}</option>`).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      switchTab(tabId);
    });
  });

  const selU = document.getElementById('filterUnidade');
  const selP = document.getElementById('filterProfissional');
  if (selU) selU.addEventListener('change', aplicarFiltrosEViews);
  if (selP) selP.addEventListener('change', aplicarFiltrosEViews);

  const btnP = document.getElementById('btnPrint'); if(btnP) btnP.addEventListener('click', () => window.print());

  const accIndContainer = document.getElementById('accordionIndividuosContainer'); if (accIndContainer) { accIndContainer.addEventListener('click', handleAccordionClick); accIndContainer.addEventListener('click', handleSortClick); }
  const accDomContainer = document.getElementById('accordionDomiciliosContainer'); if (accDomContainer) { accDomContainer.addEventListener('click', handleAccordionClick); accDomContainer.addEventListener('click', handleSortClick); }
  const searchInd = document.getElementById('searchIndividuos'); if(searchInd) searchInd.addEventListener('input', (e) => pesquisarAccordion('accordionIndividuosContainer', e.target.value));
  const searchDom = document.getElementById('searchDomicilios'); if(searchDom) searchDom.addEventListener('input', (e) => pesquisarAccordion('accordionDomiciliosContainer', e.target.value));
  const toggleInd = document.getElementById('toggleIndividuosCriticos'); if(toggleInd) { toggleInd.addEventListener('click', () => { showAllIndividuos = !showAllIndividuos; toggleInd.textContent = showAllIndividuos ? 'Mostrar Críticos' : 'Mostrar Todos'; aplicarFiltrosEViews(); }); }
  const toggleDom = document.getElementById('toggleDomiciliosCriticos'); if(toggleDom) { toggleDom.addEventListener('click', () => { showAllDomicilios = !showAllDomicilios; toggleDom.textContent = showAllDomicilios ? 'Mostrar Críticos' : 'Mostrar Todos'; aplicarFiltrosEViews(); }); }

  const selectProfCoord = document.getElementById('selectProfissionalDownloadCoord');
  const btnGenLinkProf = document.getElementById('btnGenerateLinkProfissional');
  if (selectProfCoord && btnGenLinkProf) {
    const originalBtnHTML = btnGenLinkProf.innerHTML;
    selectProfCoord.addEventListener('change', () => {
      btnGenLinkProf.disabled = !selectProfCoord.value;
    });
    btnGenLinkProf.addEventListener('click', async () => {
      const selectedProfessional = selectProfCoord.value; if (!selectedProfessional) return;
      btnGenLinkProf.disabled = true; btnGenLinkProf.textContent = 'Gerando...';
      const relativeUrl = await generateShareableLinkProf(selectedProfessional);
      if (relativeUrl) { copyToClipboard(relativeUrl); }
      btnGenLinkProf.disabled = !selectProfCoord.value; btnGenLinkProf.innerHTML = originalBtnHTML;
    });
  }

  loadDataFromLink();
});