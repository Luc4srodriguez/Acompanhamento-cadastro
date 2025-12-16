// ========================================================================
// SCRIPT DEDICADO PARA GESTOR.HTML
// ATUALIZADO: CORREÇÃO DE LEITURA DO PAYLOAD E FILTROS
// ========================================================================

// --- Estado Global ---
window.dadosIndividuos = [];
window.dadosDomicilios = [];
window.currentMunicipality = null;
window.unidadeDoGestor = null; // Armazena a unidade fixa deste link

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
const PUBLIC_BASE_URL = window.location.origin + '/'; 
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

// --- Funções Utilitárias ---
const stripAccents = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
const norm = (s='') => stripAccents(String(s).toLowerCase().trim()).replace(/\s+/g,' ').replace(/[^\w\s-]/g,'');

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

// --- API ---
async function sendPayloadToServer(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/share`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', }, 
        body: JSON.stringify(payload), 
    });
    if (!response.ok) throw new Error('Falha no servidor.');
    const { id } = await response.json(); 
    return id; 
  } catch (err) { 
    console.error('Erro envio servidor:', err); 
    alert('Erro ao gerar link: ' + err.message); 
    return null; 
  }
}

// --- Geração de Link (Profissional) ---
async function generateShareableLinkProf(professionalName) {
  if (!professionalName) { alert('Selecione profissional.'); return null; }
  
  const ind = (window.dadosIndividuos || []).filter(p => p.acs === professionalName);
  const dom = (window.dadosDomicilios || []).filter(d => d.acs === professionalName);
  
  if (ind.length === 0 && dom.length === 0) { alert('Nenhum dado para este profissional.'); return null; }
  
  const normalizedInd = ind.map(d => ({ 
      tipo: 'individuo', acs: d.acs, estabelecimento: d.estabelecimento, nome: d.nome, 
      cpf: d.cpf, sus: d.sus, dataNascimento: d.dataNascimento, ultimaAtualizacao: d.ultimaAtualizacao, 
      mesesSemAtualizar: d.mesesSemAtualizar, microArea: d.microArea ?? null, 
      tempoSemAtualizar: d.tempoSemAtualizar ?? null, _monthsSince: d._monthsSince ?? d.mesesSemAtualizar,
      ine: d.ine 
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
  return sessionId ? `profissional.html?id=${sessionId}` : null;
}

// --- UI Helpers ---
function copyToClipboard(text) {
  if (!text) return; const fullUrl = new URL(text, PUBLIC_BASE_URL).href;
  if (navigator.clipboard?.writeText) { 
      navigator.clipboard.writeText(fullUrl).then(() => showSuccessMessage("✅ Link copiado!"))
      .catch(err => fallbackCopyToClipboard(fullUrl)); 
  } else { fallbackCopyToClipboard(fullUrl); }
}
function fallbackCopyToClipboard(text) {
  const ta = document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.left='-9999px'; 
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { if (document.execCommand('copy')) { showSuccessMessage("✅ Link copiado!"); } else { showLinkInModal(text); } } 
  catch (err) { showLinkInModal(text); } finally { document.body.removeChild(ta); }
}
function showSuccessMessage(message) {
  const toast=document.createElement('div'); toast.style.cssText=`position:fixed; top:20px; right:20px; z-index:10000; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; padding:1rem 1.5rem; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); max-width:350px; animation:slideIn 0.25s ease-out`; toast.innerHTML=`<div style="display:flex;align-items:center;gap:.75rem;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><div style="white-space:pre-line;">${message}</div></div>`; const style=document.createElement('style'); style.textContent=`@keyframes slideIn{from{transform:translateX(320px);opacity:0}to{transform:translateX(0);opacity:1}}`; document.head.appendChild(style); document.body.appendChild(toast); setTimeout(()=>{ toast.style.animation='slideIn 0.2s ease-out reverse'; setTimeout(()=>toast.remove(), 200); }, 2600);
}
function showLinkInModal(text) {
  const overlay=document.createElement('div'); overlay.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10000;`; const card=document.createElement('div'); card.style.cssText=`background:#fff;padding:2rem;border-radius:10px;max-width:640px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,.2);`; card.innerHTML=`<h3 style="margin-top:0;color:#333">Link gerado</h3><p style="color:#666">Copie o link abaixo:</p><textarea readonly style="width:100%;height:110px;padding:.75rem;border:2px solid #e0e0e0;border-radius:6px;font-family:monospace;font-size:.9rem;resize:none;" onclick="this.select()">${text}</textarea><button id="__close_modal__" style="margin-top:1rem;padding:.75rem 1.25rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Fechar</button>`; overlay.appendChild(card); document.body.appendChild(overlay); const btnClose=card.querySelector('#__close_modal__'); btnClose.addEventListener('click',()=>overlay.remove()); overlay.addEventListener('click',(e)=>{if(e.target===overlay)overlay.remove();});
}

// =======================================================
// RENDERIZAÇÃO
// =======================================================

window.gerarDashboard = function(individuosFiltrados, domiciliosFiltrados) {
    const totalIndEl = document.getElementById('kpiTotalIndividuos');
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
  
    document.getElementById('kpiTotalCadastros').textContent = totalCad.toLocaleString('pt-BR');
    totalIndEl.textContent = totalInd.toLocaleString('pt-BR');
    document.getElementById('kpiTotalDomicilios').textContent = totalDom.toLocaleString('pt-BR');
    document.getElementById('kpiCriticosTotal').textContent = (countCritInd + countCritDom).toLocaleString('pt-BR');
    document.getElementById('kpiCriticosIndividuos').textContent = countCritInd.toLocaleString('pt-BR');
    document.getElementById('kpiCriticosDomicilios').textContent = countCritDom.toLocaleString('pt-BR');
    document.getElementById('kpiAtualizados12m').textContent = countAtual12.toLocaleString('pt-BR');
    document.getElementById('kpiMicroArea00').textContent = countMicro00.toLocaleString('pt-BR');
  
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
    
    if (dashboardChart) { try { dashboardChart.destroy(); } catch (e) {} }
    const ctx = canvas.getContext('2d');
    dashboardChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Quantidade de cadastros',
          data,
          backgroundColor: labels.map(l => ({
            'Até 4 meses': 'rgba(102, 187, 106, 0.7)', 
            '5 a 12 meses': 'rgba(66, 165, 245, 0.7)',
            '13 a 24 meses': 'rgba(255, 159, 64, 0.7)',
            'Mais de 2 anos': 'rgba(255, 99, 132, 0.7)'
          })[l]),
          borderColor: '#4F46E5',
          borderWidth: 1.5, borderRadius: 6, maxBarThickness: 48
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y.toLocaleString('pt-BR')} cadastros` } } },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0 } }, y: { beginAtZero: true } }
      }
    });
}

function atualizarFiltros(dados) {
  const profissionais = new Set();
  dados.forEach(item => { 
      // Filtra apenas profissionais desta unidade
      if (item.acs && (!window.unidadeDoGestor || item.estabelecimento === window.unidadeDoGestor)) { 
          profissionais.add(item.acs); 
      } 
  });
  
  const selP = document.getElementById('filterProfissional');
  const selPLink = document.getElementById('selectProfissionalDownloadGestor');
  
  const optionsHTML = `<option value="">Todos</option>` + Array.from(profissionais).sort().map(p => `<option value="${p}">${p}</option>`).join('');
  const optionsLinkHTML = `<option value="">Selecione</option>` + Array.from(profissionais).sort().map(p => `<option value="${p}">${p}</option>`).join('');

  if(selP) selP.innerHTML = optionsHTML;
  if(selPLink) selPLink.innerHTML = optionsLinkHTML;
}

function getFilterFunction() {
  const u = window.unidadeDoGestor; // Unidade fixa
  const p = document.getElementById('filterProfissional')?.value || '';
  return (row) => (!u || row.estabelecimento === u) && (!p || row.acs === p);
}

// ... (Funções de tabela e acordeão mantidas iguais, omitidas por brevidade mas essenciais) ...
// Copiar as mesmas funções popularTabelaIndividuos, popularTabelaDomicilios, handleAccordionClick, 
// renderAccordionChart, pesquisarAccordion, sortData, handleSortClick do coordenador.js 
// mas adaptando para usar window.dadosIndividuos filtrados se necessário.

function popularTabelaIndividuos(dados) {
  const container = document.getElementById('accordionIndividuosContainer'); if(!container) return; container.innerHTML = '';
  const dadosParaExibir = dados.filter(item => showAllIndividuos || String(item.microArea).padStart(2,'0') === '00' || item._monthsSince >= CRITICAL_MONTHS_THRESHOLD);
  if (!dadosParaExibir.length) { container.innerHTML = `<em>${showAllIndividuos ? 'Nenhum indivíduo.' : 'Nenhum crítico.'}</em>`; return; }
  
  const headers = `<th data-sort="nome" data-type="string">Nome</th> <th data-sort="cpf" data-type="string">CPF</th> <th data-sort="sus" data-type="string">SUS</th> <th data-sort="dataNascimento" data-type="date">Nasc.</th> <th data-sort="microArea" data-type="string">Micro</th> <th data-sort="ultimaAtualizacao" data-type="date">Últ. Atual.</th> <th data-sort="tempoSemAtualizar" data-type="string">Tempo</th>`;
  
  const grouped = new Map(); dadosParaExibir.forEach(item => { const p=item.acs||'(Sem ACS)'; if(!grouped.has(p)) grouped.set(p,[]); grouped.get(p).push(item); });
  const sorted = Array.from(grouped.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  
  sorted.forEach(([prof, inds]) => {
      const chartId = `chart-ind-${norm(prof)}`;
      const rows = inds.map(item => {
          const cat = bucketCategory(item.tempoSemAtualizar, item._monthsSince);
          let cls = BUCKET_CLASSES[cat]||''; if(String(item.microArea).padStart(2,'0')==='00') cls='micro-area-00';
          let cpf = String(item.cpf||'').replace(/\D/g,''); cpf = cpf.length<=11 ? cpf : '';
          let sus = String(item.sus||'').replace(/\D/g,''); sus = sus.length>11 ? sus : '';
          return `<tr class="${cls}" data-category="${cat}"><td>${item.nome||''}</td><td>${maskDocumento(cpf)}</td><td>${maskDocumento(sus)}</td><td>${maskDataNascimento(item.dataNascimento)}</td><td>${item.microArea||''}</td><td>${toDateBR(item.ultimaAtualizacao)}</td><td>${item.tempoSemAtualizar||''}</td></tr>`;
      }).join('');
      container.insertAdjacentHTML('beforeend', `<div class="accordion-item"><div class="accordion-header"><h3>${prof}</h3><div class="info"><span class="count">${inds.length}</span></div></div><div class="accordion-content"><div class="accordion-content-grid"><div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div><div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div></div></div>`);
  });
}

function popularTabelaDomicilios(dados) {
  const container = document.getElementById('accordionDomiciliosContainer'); if(!container) return; container.innerHTML = '';
  const dadosParaExibir = dados.filter(item => showAllDomicilios || String(item.microArea).padStart(2,'0') === '00' || item._monthsSince >= CRITICAL_MONTHS_THRESHOLD);
  if (!dadosParaExibir.length) { container.innerHTML = `<em>${showAllDomicilios ? 'Nenhum domicílio.' : 'Nenhum crítico.'}</em>`; return; }
  const headers = `<th data-sort="endereco" data-type="string">Endereço</th> <th data-sort="numero" data-type="string">Nº</th> <th data-sort="bairro" data-type="string">Bairro</th> <th data-sort="responsavel" data-type="string">Resp.</th> <th data-sort="microArea" data-type="string">Micro</th> <th data-sort="dataCadastro" data-type="date">Cadastro</th>`;
  
  const grouped = new Map(); dadosParaExibir.forEach(item => { const p=item.acs||'(Sem ACS)'; if(!grouped.has(p)) grouped.set(p,[]); grouped.get(p).push(item); });
  const sorted = Array.from(grouped.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  
  sorted.forEach(([prof, doms]) => {
      const chartId = `chart-dom-${norm(prof)}`;
      const rows = doms.map(item => {
          const cat = bucketCategory(item.tempoSemAtualizar, item._monthsSince);
          let cls = BUCKET_CLASSES[cat]||''; if(String(item.microArea).padStart(2,'0')==='00') cls='micro-area-00';
          return `<tr class="${cls}" data-category="${cat}"><td>${item.endereco||''}</td><td>${item.numero||''}</td><td>${item.bairro||''}</td><td>${maskResponsavel(item.responsavel)}</td><td>${item.microArea||''}</td><td>${toDateBR(item.dataCadastro)}</td></tr>`;
      }).join('');
      container.insertAdjacentHTML('beforeend', `<div class="accordion-item"><div class="accordion-header"><h3>${prof}</h3><div class="info"><span class="count">${doms.length}</span></div></div><div class="accordion-content"><div class="accordion-content-grid"><div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div><div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div></div></div>`);
  });
}

function handleAccordionClick(e) {
  const header = e.target.closest('.accordion-header');
  if (header) {
      const item = header.parentElement; if(!item) return;
      const wasActive = item.classList.contains('active');
      if (!wasActive) {
          const canvas = item.querySelector('canvas');
          if (canvas && !activeAccordionCharts[canvas.id]) {
              const container = item.closest('.accordion-container');
              const dados = container.id === 'accordionIndividuosContainer' ? window.dadosIndividuos : window.dadosDomicilios;
              const prof = header.querySelector('h3').textContent;
              const profData = dados.filter(d => (d.acs || '(Sem Profissional)') === prof && d.estabelecimento === window.unidadeDoGestor);
              const bucketCounts = { 'Até 4 meses':0, '5 a 12 meses':0, '13 a 24 meses':0, 'Mais de 2 anos':0 };
              profData.forEach(d => bucketCounts[bucketCategory(d.tempoSemAtualizar, d._monthsSince)]++);
              renderAccordionChart(canvas.id, bucketCounts);
          }
      }
      const parent = item.parentElement;
      if (parent) parent.querySelectorAll('.accordion-item.active').forEach(i => { if (i !== item || wasActive) i.classList.remove('active'); });
      if (!wasActive) item.classList.add('active');
  }
}

function renderAccordionChart(canvasId, bucketData) {
  const canvas = document.getElementById(canvasId); if(!canvas) return;
  if(activeAccordionCharts[canvasId]) { try{activeAccordionCharts[canvasId].destroy();}catch(e){} }
  const ctx = canvas.getContext('2d');
  const labels = Object.keys(bucketData); const data = Object.values(bucketData);
  const chart = new Chart(ctx, { type:'bar', data:{labels, datasets:[{label:'Cadastros', data, backgroundColor: labels.map(l=>BUCKET_COLORS[l]), borderColor: labels.map(l=>BUCKET_BORDERS[l]), borderWidth:1}]}, options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}, plugins:{legend:{display:false}}, onClick:(evt)=>{
      const pts = chart.getElementsAtEventForMode(evt, 'nearest', {intersect:true}, true);
      if(pts.length){
          const lbl = chart.data.labels[pts[0].index];
          const tbody = canvas.closest('.accordion-item').querySelector('tbody');
          if(tbody.dataset.activeFilter === lbl) { tbody.removeAttribute('data-active-filter'); tbody.querySelectorAll('tr').forEach(tr=>tr.style.display=''); }
          else { tbody.dataset.activeFilter = lbl; tbody.querySelectorAll('tr').forEach(tr=>{ tr.style.display = tr.dataset.category===lbl?'':'none'; }); }
      }
  }}});
  activeAccordionCharts[canvasId] = chart;
}

function pesquisarAccordion(containerId, term) {
  const container = document.getElementById(containerId); if(!container) return;
  const items = container.querySelectorAll('.accordion-item');
  const q = (term||'').toLowerCase();
  items.forEach(item => { item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}
function handleSortClick(e) { /* Simplificado: Reutilizar lógica de sort do coordenador se necessário */ }

// --- Reports (Simplificados para Unidade) ---
function gerarRelatorioPorProfissionalInd(dados) {
  const cont = document.getElementById('relatorioProfissionalContainerInd'); if(!cont) return; cont.innerHTML = '';
  const byProf = new Map(); dados.forEach(r => { const p = r.acs||'(Sem ACS)'; if(!byProf.has(p)) byProf.set(p,0); byProf.set(p, byProf.get(p)+1); });
  const rows = Array.from(byProf.entries()).sort().map(([p,t]) => `<tr><td>${p}</td><td>${t}</td></tr>`).join('');
  cont.innerHTML = `<div class="table-container"><table><thead><tr><th>ACS</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function gerarRelatorioPorProfissionalDom(dados) {
  const cont = document.getElementById('relatorioProfissionalContainerDom'); if(!cont) return; cont.innerHTML = '';
  const byProf = new Map(); dados.forEach(r => { const p = r.acs||'(Sem ACS)'; if(!byProf.has(p)) byProf.set(p,0); byProf.set(p, byProf.get(p)+1); });
  const rows = Array.from(byProf.entries()).sort().map(([p,t]) => `<tr><td>${p}</td><td>${t}</td></tr>`).join('');
  cont.innerHTML = `<div class="table-container"><table><thead><tr><th>ACS</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// --- Navegação ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  const content = document.getElementById(`tab-${tabId}`);
  if(btn) btn.classList.add('active'); if(content) content.classList.add('active');
  aplicarFiltrosEViews();
}

function aplicarFiltrosEViews() {
  const filterFn = getFilterFunction();
  const activeTab = document.querySelector('.tab-button.active')?.dataset.tab || 'dashboard';
  Object.values(activeAccordionCharts).forEach(c => {try{c.destroy()}catch(e){}}); activeAccordionCharts={};
  
  const fInd = window.dadosIndividuos.filter(filterFn);
  const fDom = window.dadosDomicilios.filter(filterFn);
  
  if (activeTab==='dashboard') window.gerarDashboard(fInd, fDom);
  else if (activeTab==='individuos') popularTabelaIndividuos(fInd);
  else if (activeTab==='domicilios') popularTabelaDomicilios(fDom);
  else if (activeTab==='relatorio-prof-ind') gerarRelatorioPorProfissionalInd(fInd);
  else if (activeTab==='relatorio-prof-dom') gerarRelatorioPorProfissionalDom(fDom);
}

// --- Carregamento ---
async function loadDataFromLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');
    if (!sessionId) return;

    try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (!response.ok) throw new Error(response.status === 404 ? 'Link expirado.' : 'Erro no servidor.');
        
        const payload = await response.json();
        if (!payload || !payload.dados) throw new Error('Dados inválidos.');
        
        // CORREÇÃO CRÍTICA: Ler 'payload.unidade' em vez de 'payload.scope'
        window.unidadeDoGestor = payload.unidade || null;
        
        if (!window.unidadeDoGestor && payload.tipo === 'gestor') {
            console.warn('Aviso: Unidade não especificada no payload de gestor.');
        }

        // Configurar título/filtro fixo
        const selU = document.getElementById('filterUnidade');
        if(selU && window.unidadeDoGestor) {
            selU.innerHTML = `<option value="${window.unidadeDoGestor}">${window.unidadeDoGestor}</option>`;
            selU.value = window.unidadeDoGestor;
        }

        window.dadosIndividuos = payload.dados.filter(d => d.tipo === 'individuo');
        window.dadosDomicilios = payload.dados.filter(d => d.tipo === 'domicilio');
        window.currentMunicipality = payload.municipio || null;

        atualizarFiltros([...window.dadosIndividuos, ...window.dadosDomicilios]);
        aplicarFiltrosEViews();

    } catch (err) {
        alert("Erro ao carregar dados: " + err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    
    const selP = document.getElementById('filterProfissional');
    if(selP) selP.addEventListener('change', aplicarFiltrosEViews);
    
    const btnP = document.getElementById('btnPrint');
    if(btnP) btnP.addEventListener('click', () => window.print());

    // Listeners Acordeão e Pesquisa
    const accInd = document.getElementById('accordionIndividuosContainer'); if(accInd) accInd.addEventListener('click', handleAccordionClick);
    const accDom = document.getElementById('accordionDomiciliosContainer'); if(accDom) accDom.addEventListener('click', handleAccordionClick);
    const searchInd = document.getElementById('searchIndividuos'); if(searchInd) searchInd.addEventListener('input', (e) => pesquisarAccordion('accordionIndividuosContainer', e.target.value));
    const searchDom = document.getElementById('searchDomicilios'); if(searchDom) searchDom.addEventListener('input', (e) => pesquisarAccordion('accordionDomiciliosContainer', e.target.value));
    const toggleInd = document.getElementById('toggleIndividuosCriticos'); if(toggleInd) toggleInd.addEventListener('click', () => { showAllIndividuos = !showAllIndividuos; toggleInd.textContent = showAllIndividuos ? 'Mostrar Críticos' : 'Mostrar Todos'; aplicarFiltrosEViews(); });
    const toggleDom = document.getElementById('toggleDomiciliosCriticos'); if(toggleDom) toggleDom.addEventListener('click', () => { showAllDomicilios = !showAllDomicilios; toggleDom.textContent = showAllDomicilios ? 'Mostrar Críticos' : 'Mostrar Todos'; aplicarFiltrosEViews(); });

    // Link Profissional dentro do Gestor
    const btnGenLink = document.getElementById('btnGenerateLinkProfissionalGestor');
    const selGenLink = document.getElementById('selectProfissionalDownloadGestor');
    if(btnGenLink && selGenLink) {
        const origText = btnGenLink.innerHTML;
        selGenLink.addEventListener('change', () => { btnGenLink.disabled = !selGenLink.value; });
        btnGenLink.addEventListener('click', async () => {
            const prof = selGenLink.value; if(!prof) return;
            btnGenLink.disabled = true; btnGenLink.textContent = 'Gerando...';
            const url = await generateShareableLinkProf(prof);
            if(url) copyToClipboard(url);
            btnGenLink.disabled = !selGenLink.value; btnGenLink.innerHTML = origText;
        });
    }

    loadDataFromLink();
});