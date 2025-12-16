/**
 * vinculos.js
 * Painel de Vínculos por Equipe (APS)
 * - Nível 1: Dashboard Geral
 * - Nível 2: Modal por Unidade (Lista Equipes) - Gráfico + Tabela
 * - Nível 3: Modal por Equipe (Lista Profissionais) - Gráfico + Tabela
 */
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);

  // Variáveis de controle de estado e gráficos
  let listaEquipesModalAtual = [];
  let chartModalEquipesInstance = null;       // Gráfico do Modal 1 (Equipes)
  let chartModalProfissionaisInstance = null; // Gráfico do Modal 2 (Profissionais)

  // =========================
  // 1) LÓGICA DO SEGUNDO POP-UP (PROFISSIONAIS)
  // =========================
  function criarModalProfissionaisSeNaoExistir() {
    if (document.getElementById('modalProfissionaisOverlay')) return;

    const div = document.createElement('div');
    div.id = 'modalProfissionaisOverlay';
    div.className = 'modal-overlay hidden';
    div.style.zIndex = '1100'; // Acima do primeiro modal
    div.style.position = 'fixed';
    div.style.inset = '0';
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.classList.add('hidden'); // Começa oculto (CSS deve tratar .hidden { display: none !important; })
    
    div.innerHTML = `
      <div class="modal-content" style="background: #fff; max-width: 800px; width: 95%; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column;">
        <div class="modal-header" style="background: #fff; border-bottom: 1px solid #F3F4F6; padding: 1.5rem; display: flex; justify-content: space-between; align-items: start; border-radius: 12px 12px 0 0;">
          <div>
            <h2 id="modalProfissionaisTitle" style="color: #111827; font-size: 1.25rem; font-weight: 700; margin:0;">Profissionais</h2>
            <p id="modalProfissionaisSubtitle" style="color: #6B7280; font-size: 0.9rem; margin: 4px 0 0 0;">Detalhes da equipe</p>
          </div>
          <button id="modalProfissionaisClose" style="cursor:pointer; border:none; background: #F3F4F6; color: #374151; width: 32px; height: 32px; font-size: 1.2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">&times;</button>
        </div>
        <div id="modalProfissionaisBody" style="padding: 1.5rem; max-height: 70vh; overflow-y: auto; background: #fff; border-radius: 0 0 12px 12px;">
        </div>
      </div>
    `;
    document.body.appendChild(div);

    const closeBtn = document.getElementById('modalProfissionaisClose');
    const overlay = document.getElementById('modalProfissionaisOverlay');
    
    const fechar = () => {
       overlay.classList.add('hidden');
       if (chartModalProfissionaisInstance) {
           chartModalProfissionaisInstance.destroy();
           chartModalProfissionaisInstance = null;
       }
    };
    
    closeBtn.onclick = fechar;
    closeBtn.onmouseover = () => closeBtn.style.background = '#E5E7EB';
    closeBtn.onmouseout = () => closeBtn.style.background = '#F3F4F6';
    overlay.onclick = (e) => { if (e.target === overlay) fechar(); };
  }

  // =========================
  // 1.1) LÓGICA DO PRIMEIRO POP-UP (UNIDADE/EQUIPES) - Dinâmico
  // =========================
  function criarModalUnidadeSeNaoExistir() {
    if (document.getElementById('vinculosModalOverlay')) return;

    const div = document.createElement('div');
    div.id = 'vinculosModalOverlay';
    div.className = 'modal-overlay hidden';
    div.style.zIndex = '1050';
    div.style.position = 'fixed';
    div.style.inset = '0';
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.classList.add('hidden');

    div.innerHTML = `
      <div id="vinculosModalContent" class="modal-content" style="background: #fff; max-width: 900px; width: 95%; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; max-height: 90vh;">
        <div class="modal-header" style="background: #fff; border-bottom: 1px solid #F3F4F6; padding: 1.5rem; display: flex; justify-content: space-between; align-items: start; border-radius: 12px 12px 0 0;">
          <div>
            <h2 id="vinculosModalTitle" style="color: #111827; font-size: 1.25rem; font-weight: 700; margin:0;">Detalhes da Unidade</h2>
            <p id="vinculosModalSubtitle" style="color: #6B7280; font-size: 0.9rem; margin: 4px 0 0 0;"></p>
          </div>
          <div style="display:flex; gap: 10px;">
            <button id="btnExpandirVinculos" style="display:none; cursor:pointer; border:1px solid #E5E7EB; background: #fff; color: #374151; padding: 4px 8px; font-size: 0.8rem; border-radius: 6px;">Expandir</button>
            <button id="vinculosModalClose" class="modal-close" style="cursor:pointer; border:none; background: #F3F4F6; color: #374151; width: 32px; height: 32px; font-size: 1.2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">&times;</button>
          </div>
        </div>
        <div id="vinculosModalBody" style="padding: 1.5rem; overflow-y: auto; background: #fff; border-radius: 0 0 12px 12px;">
        </div>
      </div>
    `;
    document.body.appendChild(div);

    // Eventos serão anexados na função 'mostrarEquipesDaUnidade' ou 'configurarModal'
  }

  // Função Global chamada ao clicar na linha da Equipe
  g.abrirModalProfissionais = function(index) {
    criarModalProfissionaisSeNaoExistir();
    
    const equipe = listaEquipesModalAtual[index];
    if (!equipe) return;

    const overlay = document.getElementById('modalProfissionaisOverlay');
    const title = document.getElementById('modalProfissionaisTitle');
    const subtitle = document.getElementById('modalProfissionaisSubtitle');
    const body = document.getElementById('modalProfissionaisBody');
    
    title.textContent = `Equipe INE: ${equipe.ine || 'Não informado'}`;
    subtitle.textContent = `Total de ${equipe.total.toLocaleString('pt-BR')} pessoas vinculadas nesta equipe.`;

    // Prepara dados para Gráfico e Tabela
    const listaProfissionais = Object.entries(equipe.acsCounts || {})
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd);

    if (listaProfissionais.length === 0) {
       body.innerHTML = `<div style="text-align:center; padding:2rem; color:#6B7280;">Nenhum profissional identificado nominalmente.</div>`;
       overlay.classList.remove('hidden');
       overlay.style.display = 'flex'; // Forçar display flex
       return;
    }

    // HTML do Modal 2: Gráfico + Tabela
    body.innerHTML = `
      <p style="color: #6B7280; font-size: 0.9rem; margin-bottom: 1.5rem;">
        Distribuição de vínculos por Agente Comunitário de Saúde (ACS).
      </p>

      <div style="height: 250px; width: 100%; margin-bottom: 2rem; position: relative;">
         <canvas id="modalChartProfissionais"></canvas>
      </div>

      <div style="overflow-x: auto; border: 1px solid #E5E7EB; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif;">
          <thead>
            <tr style="background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
              <th style="text-align: left; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">Profissional (ACS)</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">Pessoas Vinculadas</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">% da Equipe</th>
            </tr>
          </thead>
          <tbody style="background-color: #fff;">
            ${listaProfissionais.map(prof => {
                const percent = ((prof.qtd / equipe.total) * 100).toFixed(1);
                return `
                  <tr style="border-bottom: 1px solid #F3F4F6;">
                    <td style="padding: 12px 16px; color: #111827; font-size: 0.875rem; font-weight: 500;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:24px; height:24px; background:#EEF2FF; color:#4F46E5; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">
                                ${prof.nome.charAt(0).toUpperCase()}
                            </div>
                            ${prof.nome}
                        </div>
                    </td>
                    <td style="padding: 12px 16px; text-align: right; color: #111827; font-weight: 600;">${prof.qtd.toLocaleString('pt-BR')}</td>
                    <td style="padding: 12px 16px; text-align: right; color: #6B7280;">${percent}%</td>
                  </tr>
                `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex'; // Forçar display flex

    // Renderiza o Gráfico de Profissionais
    setTimeout(() => {
        const canvas = document.getElementById('modalChartProfissionais');
        if (canvas) {
            if (chartModalProfissionaisInstance) chartModalProfissionaisInstance.destroy();
            
            const labels = listaProfissionais.map(p => p.nome);
            const dataValues = listaProfissionais.map(p => p.qtd);

            chartModalProfissionaisInstance = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Pessoas Vinculadas',
                        data: dataValues,
                        backgroundColor: '#93C5FD',
                        borderColor: '#60A5FA',
                        borderWidth: 1,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, grid: { color: '#F3F4F6' } },
                        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
                    }
                }
            });
        }
    }, 50);
  };

  // =========================
  // 2) PATCH E LEITURA
  // =========================
  try {
    if (typeof HEADERS === 'object' && HEADERS && !HEADERS.ine) {
      HEADERS.ine = ['ine', 'codigo ine', 'código ine', 'ine (equipe)', 'ine equipe', 'ine da equipe'];
    }
  } catch (e) { console.warn('HEADERS não disponível:', e); }

  try {
    if (typeof buildHeaderMap === 'function' && typeof getField === 'function') {
      function parseCSVDataIndividuos(data) {
        const out = [];
        const today = new Date();
        for (const r of data) {
          const headerMap = buildHeaderMap(r);
          const acs = getField(r, headerMap, HEADERS.acs);
          const estabelecimento = getField(r, headerMap, HEADERS.estabelecimento);
          const nome = getField(r, headerMap, HEADERS.ind_nome);
          const cpf = getField(r, headerMap, HEADERS.ind_cpf);
          const sus = getField(r, headerMap, HEADERS.ind_sus);
          const docPessoal = getField(r, headerMap, HEADERS.ind_doc_pessoal) || cpf || sus;
          const microArea = getField(r, headerMap, HEADERS.dom_micro);
          const ineCol = HEADERS.ine ? getField(r, headerMap, HEADERS.ine) : '';
          const dataNascimentoRaw = getField(r, headerMap, HEADERS.ind_data_nasc);
          const dataNascimento = parseDateFlexible(dataNascimentoRaw);
          const ultimaAtualizacaoRaw = getField(r, headerMap, HEADERS.ind_ultima_atual);
          const ultimaAtualizacao = parseDateFlexible(ultimaAtualizacaoRaw);
          const tempoTxt = getField(r, headerMap, HEADERS.dom_tempo);
          
          let mesesSemAtualizar = Infinity;
          if (ultimaAtualizacao) {
            const diffTime = Math.abs(today.getTime() - ultimaAtualizacao.getTime());
            mesesSemAtualizar = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
          }
          const monthsSince = parseTempoToMonths(tempoTxt);

          if (!(nome || docPessoal)) continue;

          let ine = '';
          if (ineCol != null) {
            const s = String(ineCol).trim();
            if (s) { const digits = s.replace(/\D/g, ''); ine = digits || s; }
          }

          out.push({
            tipo: 'individuo',
            acs: acs,
            estabelecimento: estabelecimento,
            ine: ine,
            nome: nome,
            cpf: docPessoal,
            sus: sus,
            dataNascimento: dataNascimento ? dataNascimento.toISOString() : null,
            dataNascimentoFormatada: dataNascimento ? toDateBR(dataNascimento) : '',
            ultimaAtualizacao: ultimaAtualizacao ? ultimaAtualizacao.toISOString() : null,
            dataAtualizacaoFormatada: ultimaAtualizacao ? toDateBR(ultimaAtualizacao) : '',
            tempoSemAtualizar: tempoTxt,
            mesesSemAtualizar: mesesSemAtualizar,
            _monthsSince: monthsSince,
            microArea: microArea || '00'
          });
        }
        return out;
      }
      g.parseCSVDataIndividuos = parseCSVDataIndividuos;
    }
  } catch (e) { console.error('Erro no patch:', e); }

  // =========================
  // 3) PARÂMETROS E DETECÇÃO
  // =========================
  let municipioDetectado = null;
  function extrairMunicipioDoNomeArquivo(nomeArquivo) {
    if (!nomeArquivo) return null;
    const nomeSemExtensao = nomeArquivo.replace(/\.[^/.]+$/, "");
    const partes = nomeSemExtensao.split('_');
    if (partes.length > 0) return partes[0].trim().replace(/["']/g, '');
    return null;
  }
  function normalizarMunicipioNome(nome) {
    if (!nome) return null;
    return String(nome).normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim(); 
  }
  function detectarMunicipio() {
    try {
      const i1 = document.getElementById('fileInputIndividuos');
      if (i1?.files?.length) { const m = extrairMunicipioDoNomeArquivo(i1.files[0].name); if (m) { municipioDetectado = m; return m; } }
      const i2 = document.getElementById('fileInputDomicilios');
      if (i2?.files?.length) { const m = extrairMunicipioDoNomeArquivo(i2.files[0].name); if (m) { municipioDetectado = m; return m; } }
      if (g.currentMunicipality || g.currentMunicipio) return g.currentMunicipality || g.currentMunicipio;
      return null;
    } catch (e) { return null; }
  }

  const VINCULOS_PARAMS = {
    'PADRAO':             { parametro_esf: 3000, limite_esf: 4000, nome: 'Padrão' },
    'AGUA PRETA':         { parametro_esf: 2500, limite_esf: 3750, nome: 'ÁGUA PRETA-PE' },
    'AGUAS BELAS':        { parametro_esf: 2500, limite_esf: 3750, nome: 'ÁGUAS BELAS-PE' },
    'ALTO DO RODRIGUES':  { parametro_esf: 2000, limite_esf: 3000, nome: 'ALTO DO RODRIGUES-RN' },
    'APODI':              { parametro_esf: 2500, limite_esf: 3750, nome: 'APODI-RN' },
    'ARAPONGA':           { parametro_esf: 2000, limite_esf: 3000, nome: 'ARAPONGA-MG' },
    'AREIA':              { parametro_esf: 2500, limite_esf: 3750, nome: 'AREIA-PB' },
    'ASSU':               { parametro_esf: 2750, limite_esf: 4125, nome: 'ASSU-RN' },
    'BRUMADO':            { parametro_esf: 2750, limite_esf: 4125, nome: 'BRUMADO-BA' },
    'CAAPORA':            { parametro_esf: 2500, limite_esf: 3750, nome: 'CAAPORÃ-PB' },
    'CALDAS BRANDAO':     { parametro_esf: 2000, limite_esf: 3000, nome: 'CALDAS BRANDÃO-PB' },
    'CANAA':              { parametro_esf: 2000, limite_esf: 3000, nome: 'CANAÃ-MG' },
    'CARNAUBAIS':         { parametro_esf: 2000, limite_esf: 3000, nome: 'CARNAUBAIS-RN' },
    'CONDE':              { parametro_esf: 2500, limite_esf: 3750, nome: 'CONDE-PB' },
    'CORDEIRO':           { parametro_esf: 2500, limite_esf: 3750, nome: 'CORDEIRO-RJ' },
    'FERNANDO PEDROZA':   { parametro_esf: 2000, limite_esf: 3000, nome: 'FERNANDO PEDROZA-RN' },
    'GROSSOS':            { parametro_esf: 2000, limite_esf: 3000, nome: 'GROSSOS-RN' },
    'GUARABIRA':          { parametro_esf: 2750, limite_esf: 4125, nome: 'GUARABIRA-PB' },
    'ITABAIANA':          { parametro_esf: 2500, limite_esf: 3750, nome: 'ITABAIANA-PB' },
    'ITAPOROROCA':        { parametro_esf: 2000, limite_esf: 3000, nome: 'ITAPOROROCA-PB' },
    'ITATUBA':            { parametro_esf: 2000, limite_esf: 3000, nome: 'ITATUBA-PB' },
    'MACAIBA':            { parametro_esf: 2500, limite_esf: 3750, nome: 'MACAIBA-RN' },   
    'MOGEIRO':            { parametro_esf: 2000, limite_esf: 3000, nome: 'MOGEIRO-PB' },
    'PATU':               { parametro_esf: 2000, limite_esf: 3000, nome: 'PATU-RN' },
    'PITIMBU':            { parametro_esf: 2000, limite_esf: 3000, nome: 'PITIMBU-PB' },
    'PAULA CANDIDO':      { parametro_esf: 2000, limite_esf: 3000, nome: 'PAULA CÂNDIDO-MG' },
    'PEDRO VELHO':        { parametro_esf: 2000, limite_esf: 3000, nome: 'PEDRO VELHO-RN' },
    'PENDENCIAS':         { parametro_esf: 2000, limite_esf: 3000, nome: 'PENDÊNCIAS-RN' },
    'POCO BRANCO':        { parametro_esf: 2000, limite_esf: 3000, nome: 'POÇO BRANCO-RN' },
    'SANTA RITA':         { parametro_esf: 3000, limite_esf: 4500, nome: 'SANTA RITA-PB' },
    'SAO JOSE DE UBA':    { parametro_esf: 2000, limite_esf: 3000, nome: 'SÃO JOSÉ DE UBÁ-RJ' },
    'SAO MIGUEL DO ANTA': { parametro_esf: 2000, limite_esf: 3000, nome: 'SÃO MIGUEL DO ANTA-MG' },
    'TIBAU':              { parametro_esf: 2000, limite_esf: 3000, nome: 'TIBAU-RN' },
    'VICOSA':             { parametro_esf: 2750, limite_esf: 4125, nome: 'VIÇOSA-MG' },
    'VICOSA DO CEARA':    { parametro_esf: 2750, limite_esf: 4125, nome: 'VIÇOSA DO CEARÁ-CE' }
  };

  function obterParametrosMunicipioAtual() {
    const municipioRaw = detectarMunicipio();
    const chave = normalizarMunicipioNome(municipioRaw);
    if (chave && VINCULOS_PARAMS[chave]) return VINCULOS_PARAMS[chave];
    if (chave) {
      const chaveComEspaco = chave.replace(/_/g, ' ');
      if (VINCULOS_PARAMS[chaveComEspaco]) return VINCULOS_PARAMS[chaveComEspaco];
    }
    return VINCULOS_PARAMS.PADRAO;
  }

  function extrairINE(texto) {
    if (!texto) return '';
    const s = String(texto);
    const m = s.match(/\b\d{6,8}\b/);
    return m ? m[0] : '';
  }

  function normalizarIneValor(val) {
    if (val == null) return '';
    const s = String(val).trim();
    if (!s) return '';
    const digits = s.replace(/\D/g, '');
    return digits || s;
  }

  // =========================
  // 4) CÁLCULO
  // =========================
  function calcularVinculos(individuos) {
    if (!Array.isArray(individuos) || individuos.length === 0) {
      return { vinculos: [], parametroOficial: 0, limiteOficial: 0, municipioNome: 'Não identificado' };
    }

    const params = obterParametrosMunicipioAtual();
    const parametroOficial = params.parametro_esf || 3000;
    const limiteOficial = params.limite_esf || 4000;
    const municipioNome = params.nome || 'Município';

    const porEquipe = new Map();

    for (const row of individuos) {
      if (!row || row.tipo !== 'individuo') continue;
      const unidade = row.estabelecimento || 'Sem estabelecimento';
      const ineCol = normalizarIneValor(row.ine);
      const ineGuess = extrairINE(row.acs || row.estabelecimento || '');
      const ine = ineCol || ineGuess;
      const equipeId = ine || (row.acs ? String(row.acs) : '(Equipe não informada)');
      const key = `${unidade}|||${equipeId}`;

      let atual = porEquipe.get(key);
      if (!atual) {
        atual = { unidade, ine, equipeId, total: 0, acsSet: new Set(), acsCounts: {} };
        porEquipe.set(key, atual);
      }
      atual.total += 1;
      
      const acsName = row.acs || 'Não Informado';
      atual.acsSet.add(acsName);
      
      // Contagem individual por ACS para o gráfico
      atual.acsCounts[acsName] = (atual.acsCounts[acsName] || 0) + 1;
    }

    const vinculos = [];
    porEquipe.forEach((info) => {
      const total = info.total;
      let status = 'Dentro do Parâmetro';
      let statusClasse = 'status-dentro';
      if (total > limiteOficial) {
        status = 'Acima do Limite';
        statusClasse = 'status-acima-limite';
      } else if (total > parametroOficial) {
        status = 'Acima do Parâmetro';
        statusClasse = 'status-acima-parametro';
      }
      vinculos.push({
        unidade: info.unidade, ine: info.ine || '', acs: Array.from(info.acsSet || []),
        acsCounts: info.acsCounts, // Passa a contagem adiante
        equipeOriginal: info.equipeId, total, parametroEquipe: parametroOficial,
        limiteEquipe: limiteOficial, status, statusClasse
      });
    });

    vinculos.sort((a, b) => b.total - a.total);
    return { vinculos, parametroOficial, limiteOficial, municipioNome };
  }

  // =========================
  // 5) DASHBOARD GERAL
  // =========================
  let chartVinculos = null;
  let chartVinculosFull = null;
  let vinculosChartCache = { unidades: [], labels: [], dataTotal: [], cores: [] };

  function atualizarPainelVinculos(individuosFiltrados) {
    try {
      const totalEqEl = document.getElementById('kpiVinculosTotalEquipes');
      const totalCidEl = document.getElementById('kpiVinculosTotalCidadaos');
      const mediaEqEl = document.getElementById('kpiVinculosMediaPorEquipe');
      const eqAcimaEl = document.getElementById('kpiVinculosEquipesAcimaLimite');
      const canvas = document.getElementById('chartVinculos');
      const tabelaBody = document.querySelector('#tabelaVinculos tbody');
      const chartHeader = document.querySelector('#tab-vinculos .dashboard-chart-header h3');
      const chartDescription = document.querySelector('#tab-vinculos .dashboard-chart-header p');

      if (!totalEqEl || !canvas || !tabelaBody) return;

      const base = Array.isArray(individuosFiltrados) && individuosFiltrados.length ? individuosFiltrados : (g.dadosIndividuos || []);
      const { vinculos, parametroOficial, limiteOficial, municipioNome } = calcularVinculos(base);

      if (chartHeader) chartHeader.textContent = `Vínculos por Equipe - ${municipioNome}`;
      if (chartDescription) chartDescription.textContent = `Parâmetro: ${parametroOficial.toLocaleString('pt-BR')} | Limite: ${limiteOficial.toLocaleString('pt-BR')}`;

      const totalEquipes = vinculos.length;
      const totalCidadaos = vinculos.reduce((sum, v) => sum + v.total, 0);
      const mediaPorEquipe = totalEquipes > 0 ? (totalCidadaos / totalEquipes) : 0;
      const equipesAcimaLimite = vinculos.filter(v => v.total > v.limiteEquipe).length;

      totalEqEl.textContent = totalEquipes.toLocaleString('pt-BR');
      totalCidEl.textContent = totalCidadaos.toLocaleString('pt-BR');
      mediaEqEl.textContent = mediaPorEquipe.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      eqAcimaEl.textContent = equipesAcimaLimite.toLocaleString('pt-BR');

      tabelaBody.innerHTML = '';
      if (vinculos.length === 0) tabelaBody.innerHTML = '<tr><td colspan="6">Nenhuma equipe encontrada.</td></tr>';
      
      const resumoPorUnidade = new Map();
      for (const v of vinculos) {
        const key = v.unidade || 'Sem unidade';
        let info = resumoPorUnidade.get(key);
        if (!info) { info = { unidade: key, totalCidadaos: 0, equipes: [], acimaLimite: 0, acimaParametro: 0, dentroParametro: 0 }; resumoPorUnidade.set(key, info); }
        info.totalCidadaos += v.total;
        info.equipes.push(v);
        if (v.total > v.limiteEquipe) info.acimaLimite += 1;
        else if (v.total > v.parametroEquipe) info.acimaParametro += 1;
        else info.dentroParametro += 1;
      }

      vinculos.slice(0, 200).forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${v.unidade}</td><td>${v.ine || '-'}</td><td>${v.total.toLocaleString('pt-BR')}</td><td>${v.parametroEquipe.toLocaleString('pt-BR')}</td><td>${v.limiteEquipe.toLocaleString('pt-BR')}</td><td><span class="${v.statusClasse}">${v.status}</span></td>`;
        tabelaBody.appendChild(tr);
      });

      if (chartVinculos) { chartVinculos.destroy(); chartVinculos = null; }
      const ctx = canvas.getContext('2d');
      const unidades = Array.from(resumoPorUnidade.values()).sort((a, b) => b.totalCidadaos - a.totalCidadaos);
      const labels = unidades.map(u => u.unidade);
      const dataTotal = unidades.map(u => u.totalCidadaos);
      const cores = unidades.map(u => {
        if (u.acimaLimite > 0) return 'rgba(220, 38, 38, 0.85)';
        else if (u.acimaParametro > 0) return 'rgba(245, 158, 11, 0.85)';
        else return '#059669';
      });

      vinculosChartCache = { unidades, labels, dataTotal, cores };

      // CORREÇÃO: Altura dinâmica para garantir que todas as unidades caibam
      const baseAltura = 24;
      const alturaMin = 260;
      const alturaDesejada = Math.max(alturaMin, labels.length * baseAltura);
      canvas.style.height = alturaDesejada + 'px';
      canvas.parentNode.style.height = alturaDesejada + 'px'; // Ajusta container pai também se necessário

      chartVinculos = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Vinculados', data: dataTotal, backgroundColor: cores, borderRadius: 4 }] },
        options: {
          indexAxis: 'y', 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } },
          scales: {
             x: { 
                 beginAtZero: true,
                 ticks: { callback: (val) => val.toLocaleString('pt-BR') }
             },
             y: {
                 // CORREÇÃO: Impede que o Chart.js esconda nomes de unidades
                 afterFit: function(axis) { axis.width = 230; }, // Espaço reservado para nomes longos
                 ticks: {
                     autoSkip: false, // OBRIGATÓRIO: Mostra todos os rótulos
                     font: { size: 11 },
                     callback: function(value) {
                         const label = this.getLabelForValue(value);
                         return label.length > 45 ? label.substr(0, 42) + '...' : label;
                     }
                 }
             }
          },
          onClick: (_, elements) => {
            if (!elements || !elements.length) return;
            const idx = elements[0].index;
            const unidadeSelecionada = labels[idx];
            const info = resumoPorUnidade.get(unidadeSelecionada);
            if (info) mostrarEquipesDaUnidade(unidadeSelecionada, info.equipes);
          }
        }
      });
    } catch (e) { console.error(e); }
  }

  // =========================
  // 6) POP-UP 1: DETALHE DA UNIDADE
  // =========================
  function mostrarEquipesDaUnidade(unidade, equipes) {
    criarModalUnidadeSeNaoExistir(); // Garante que o HTML existe

    const overlay = document.getElementById('vinculosModalOverlay');
    const body = document.getElementById('vinculosModalBody');
    const title = document.getElementById('vinculosModalTitle');
    const subtitle = document.getElementById('vinculosModalSubtitle');

    if (!overlay || !body) return;

    listaEquipesModalAtual = equipes.sort((a, b) => b.total - a.total);

    title.textContent = `Equipes da unidade: ${unidade}`;
    title.style.fontSize = '1.25rem';
    title.style.color = '#111827';
    if(subtitle) subtitle.innerHTML = ''; 
    
    // Ajuste de estilo para garantir visualização correta
    const headerEl = document.querySelector('#vinculosModalContent .modal-header');
    if(headerEl) {
       headerEl.style.background = '#fff'; headerEl.style.borderBottom = 'none'; headerEl.style.paddingBottom = '0';
       const closeBtn = headerEl.querySelector('.modal-close');
       if(closeBtn) closeBtn.style.color = '#374151'; 
    }

    body.innerHTML = `
      <p style="color: #6B7280; font-size: 0.9rem; margin-bottom: 2rem;">
        Detalhamento das equipes desta unidade. Clique sobre o INE ou na barra do gráfico para ver os profissionais.
      </p>
      
      <div style="height: 250px; width: 100%; margin-bottom: 2rem; position: relative;">
         <canvas id="modalChartEquipes"></canvas>
      </div>

      <div style="overflow-x: auto; border: 1px solid #E5E7EB; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif;">
          <thead>
            <tr style="background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
              <th style="text-align: left; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">INE</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">PESSOAS</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">PARÂMETRO</th>
              <th style="text-align: right; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">LIMITE</th>
              <th style="text-align: left; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase;">STATUS</th>
            </tr>
          </thead>
          <tbody style="background-color: #fff;">
            ${equipes.map((eq, index) => {
                let statusHtml = '';
                if (eq.total > eq.limiteEquipe) {
                  statusHtml = `<span style="color: #DC2626; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">⚠️ Acima do Limite</span>`;
                } else if (eq.total > eq.parametroEquipe) {
                  statusHtml = `<span style="color: #D97706; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">⚠️ Acima do Parâmetro</span>`;
                } else {
                  statusHtml = `<span style="color: #059669; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">✅ Dentro do Parâmetro</span>`;
                }

                return `
                  <tr onclick="abrirModalProfissionais(${index})" style="border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                    <td style="padding: 16px; color: #111827; font-size: 0.875rem; font-weight: 500;">
                       <span style="display:flex; align-items:center; gap:8px;">
                          ${eq.ine || 'SEM_INE'}
                          <svg style="width:14px; height:14px; color:#9CA3AF;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                       </span>
                    </td>
                    <td style="padding: 16px; text-align: right;">${eq.total.toLocaleString('pt-BR')}</td>
                    <td style="padding: 16px; text-align: right; color: #374151;">${eq.parametroEquipe.toLocaleString('pt-BR')}</td>
                    <td style="padding: 16px; text-align: right; color: #374151;">${eq.limiteEquipe.toLocaleString('pt-BR')}</td>
                    <td style="padding: 16px;">${statusHtml}</td>
                  </tr>
                `;
              }).join('')}
          </tbody>
        </table>
      </div>
    `;

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex'; // Forçar display flex
    
    setTimeout(() => {
        const modalCanvas = document.getElementById('modalChartEquipes');
        if (modalCanvas) {
            if (chartModalEquipesInstance) chartModalEquipesInstance.destroy();
            const labels = equipes.map(e => e.ine || 'SEM_INE');
            const dataValues = equipes.map(e => e.total);
            
            chartModalEquipesInstance = new Chart(modalCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{ label: 'Vinculados', data: dataValues, backgroundColor: '#93C5FD', borderColor: '#60A5FA', borderWidth: 1, barPercentage: 0.6 }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, grid: { color: '#F3F4F6' } }, y: { grid: { display: false } } },
                    onClick: (_, elements) => {
                        if (!elements || !elements.length) return;
                        g.abrirModalProfissionais(elements[0].index);
                    }
                }
            });
        }
    }, 50);

    const closeBtn = document.getElementById('vinculosModalClose');
    if (closeBtn) closeBtn.onclick = fecharModalVinculos;
    overlay.onclick = (e) => { if (e.target === overlay) fecharModalVinculos(); };
    const escHandler = (e) => { if (e.key === 'Escape') fecharModalVinculos(); };
    document.addEventListener('keydown', escHandler);
    window.currentEscHandler = escHandler;
  }

  function fecharModalVinculos() {
    const overlay = document.getElementById('vinculosModalOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (chartModalEquipesInstance) { chartModalEquipesInstance.destroy(); chartModalEquipesInstance = null; }
    if (window.currentEscHandler) { document.removeEventListener('keydown', window.currentEscHandler); window.currentEscHandler = null; }
  }

  function mostrarGraficoVinculosCompleto() {
    const overlay = document.getElementById('vinculosModalOverlay');
    const title = document.getElementById('vinculosModalTitle');
    const body = document.getElementById('vinculosModalBody');
    if (!overlay || !body || !vinculosChartCache.labels.length) return;

    const headerEl = document.querySelector('#vinculosModalContent .modal-header');
    if(headerEl) { headerEl.style.background = ''; headerEl.style.borderBottom = ''; headerEl.style.paddingBottom = ''; 
    const closeBtn = headerEl.querySelector('.modal-close'); if(closeBtn) closeBtn.style.color = ''; }

    title.textContent = 'Vínculos por Equipe - Visão Completa';
    title.style.color = ''; title.style.fontSize = '';
    body.innerHTML = `<div class="full-chart-container" style="height: 500px;"><canvas id="chartVinculosFull"></canvas></div>`;

    setTimeout(() => {
      const fullCanvas = document.getElementById('chartVinculosFull');
      if (fullCanvas) {
        if (chartVinculosFull) chartVinculosFull.destroy();
        const ctxFull = fullCanvas.getContext('2d');
        chartVinculosFull = new Chart(ctxFull, {
          type: 'bar',
          data: { labels: vinculosChartCache.labels, datasets: [{ label: 'Vinculados', data: vinculosChartCache.dataTotal, backgroundColor: vinculosChartCache.cores, borderRadius: 4 }] },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }
    }, 50);

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    const closeBtn = document.getElementById('vinculosModalClose');
    if (closeBtn) closeBtn.onclick = fecharModalVinculos;
  }

  function configurarModal() {
    criarModalUnidadeSeNaoExistir(); // Inicializa modal no carregamento
    
    const closeBtn = document.getElementById('vinculosModalClose');
    const overlay = document.getElementById('vinculosModalOverlay');
    const expandBtn = document.getElementById('btnExpandirVinculos');
    
    if (closeBtn) closeBtn.addEventListener('click', fecharModalVinculos);
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModalVinculos(); });
    if (expandBtn) expandBtn.addEventListener('click', mostrarGraficoVinculosCompleto);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', configurarModal);
  else configurarModal();

  (function integrarComDashboard() {
    if (!g || typeof g.gerarDashboard !== 'function') return;
    const originalGerarDashboard = g.gerarDashboard;
    g.gerarDashboard = function (individuosFiltrados, domiciliosFiltrados) {
      try { originalGerarDashboard.call(this, individuosFiltrados, domiciliosFiltrados); } catch(e) { console.error(e); }
      try { detectarMunicipio(); atualizarPainelVinculos(individuosFiltrados); } catch (e) { console.error('Erro ao atualizar painel de vínculos:', e); }
    };
  })();
})();