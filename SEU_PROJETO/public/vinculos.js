
// vinculos.js - visão de vínculos da Gestão APS integrada ao Painel de Acompanhamento
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);

  // --- PATCH: garantir que o INE seja lido a partir da planilha -----------------
  (function patchINEParsing() {
    try {
      if (!g.HEADERS) return;

      // Garante aliases para encontrar a coluna "INE" da planilha
      if (!g.HEADERS.ine) {
        g.HEADERS.ine = [
          'ine',
          'ine (equipe)',
          'cód ine',
          'codigo ine',
          'código ine',
          'ine equipe'
        ];
      }

      if (typeof g.buildHeaderMap !== 'function' ||
          typeof g.getField !== 'function') {
        return;
      }

      // Sobrescreve totalmente o parseCSVDataIndividuos para incluir o INE
      g.parseCSVDataIndividuos = function parseCSVDataIndividuosComIne(data) {
        const out = [];
        const today = new Date();

        for (const r of data || []) {
          const headerMap = g.buildHeaderMap(r);

          const acs = g.getField(r, headerMap, g.HEADERS.acs);
          const estabelecimento = g.getField(r, headerMap, g.HEADERS.estabelecimento);
          const nome = g.getField(r, headerMap, g.HEADERS.ind_nome);
          const cpf = g.getField(r, headerMap, g.HEADERS.ind_cpf);
          const sus = g.getField(r, headerMap, g.HEADERS.ind_sus);
          const docPessoal =
            g.getField(r, headerMap, g.HEADERS.ind_doc_pessoal) || cpf || sus;
          const microArea = g.getField(r, headerMap, g.HEADERS.dom_micro);

          // Novo: leitura direta da coluna INE
          const ineRaw = g.HEADERS.ine
            ? g.getField(r, headerMap, g.HEADERS.ine)
            : (r.INE ?? r.ine ?? '');
          const ine = (ineRaw || '').toString().trim();

          const dataNascimentoRaw = g.getField(r, headerMap, g.HEADERS.ind_data_nasc);
          const dataNascimento = g.parseDateFlexible
            ? g.parseDateFlexible(dataNascimentoRaw)
            : null;

          const ultimaAtualizacaoRaw = g.getField(
            r,
            headerMap,
            g.HEADERS.ind_ultima_atual
          );
          const ultimaAtualizacao = g.parseDateFlexible
            ? g.parseDateFlexible(ultimaAtualizacaoRaw)
            : null;

          const tempoTxt = g.getField(r, headerMap, g.HEADERS.dom_tempo);

          let mesesSemAtualizar = Infinity;
          if (ultimaAtualizacao) {
            const diffTime = Math.abs(today.getTime() - ultimaAtualizacao.getTime());
            mesesSemAtualizar = Math.ceil(
              diffTime / (1000 * 60 * 60 * 24 * 30.44)
            );
          }

          const monthsSince = g.parseTempoToMonths
            ? g.parseTempoToMonths(tempoTxt)
            : Infinity;

          if (!(nome || docPessoal)) continue;

          out.push({
            tipo: 'individuo',
            acs,
            estabelecimento,
            nome,
            cpf: docPessoal,
            sus,
            dataNascimento: dataNascimento ? dataNascimento.toISOString() : null,
            dataNascimentoFormatada:
              dataNascimento && g.toDateBR ? g.toDateBR(dataNascimento) : '',
            ultimaAtualizacao: ultimaAtualizacao
              ? ultimaAtualizacao.toISOString()
              : null,
            dataAtualizacaoFormatada:
              ultimaAtualizacao && g.toDateBR ? g.toDateBR(ultimaAtualizacao) : '',
            tempoSemAtualizar: tempoTxt,
            mesesSemAtualizar,
            _monthsSince: monthsSince,
            microArea: microArea || '00',
            ine
          });
        }

        return out;
      };
    } catch (e) {
      console.error('Falha ao aplicar patch de INE:', e);
    }
  })();

  // --- Parâmetros oficiais por município (ajuste conforme portarias locais) ---
  const PARAMETROS_MUNICIPIO = {
    'AGUA PRETA':          { parametro_esf: 2500, limite_esf: 3750 },
    'AGUAS BELAS':         { parametro_esf: 2500, limite_esf: 3750 },
    'ALHANDRA':            { parametro_esf: 2500, limite_esf: 3750 },
    'ALTO DO RODRIGUES':   { parametro_esf: 2000, limite_esf: 3000 },
    'APODI':               { parametro_esf: 2500, limite_esf: 3750 },
    'ARAPONGA':            { parametro_esf: 2000, limite_esf: 3000 },
    'AREIA':               { parametro_esf: 2500, limite_esf: 3750 },
    'ACU':                 { parametro_esf: 2750, limite_esf: 4125 },
    'ASSU':                { parametro_esf: 2750, limite_esf: 4125 },
    'BRUMADO':             { parametro_esf: 2750, limite_esf: 4125 },
    'CAAPORA':             { parametro_esf: 2500, limite_esf: 3750 },
    'CALDAS BRANDAO':      { parametro_esf: 2000, limite_esf: 3000 },
    'CANAA':               { parametro_esf: 2000, limite_esf: 3000 },
    'CONDE':               { parametro_esf: 2500, limite_esf: 3750 },
    'CORDEIRO':            { parametro_esf: 2500, limite_esf: 3750 },
    'GUARABIRA':           { parametro_esf: 2750, limite_esf: 4125 },
    'ITABAIANA':           { parametro_esf: 2500, limite_esf: 3750 },
    'ITAPOROROCA':         { parametro_esf: 2000, limite_esf: 3000 },
    'ITATUBA':             { parametro_esf: 2000, limite_esf: 3000 },
    'MOGEIRO':             { parametro_esf: 2000, limite_esf: 3000 },
    'MACAIBA':             { parametro_esf: 2750, limite_esf: 4125 },
    'PENDENCIAS':          { parametro_esf: 2000, limite_esf: 3000 },
    'POCO BRANCO':         { parametro_esf: 2000, limite_esf: 3000 },
    'SANTA RITA':          { parametro_esf: 3000, limite_esf: 4500 },
    'SAO JOSE DE UBA':     { parametro_esf: 2000, limite_esf: 3000 },
    'SAO MIGUEL DO ANTA':  { parametro_esf: 2000, limite_esf: 3000 },
    'TIBAU':               { parametro_esf: 2000, limite_esf: 3000 },
    'VALENCA':             { parametro_esf: 2750, limite_esf: 4125 },
    'VICOSA':              { parametro_esf: 2750, limite_esf: 4125 }
  };

  const DEFAULT_PARAMS = { parametro_esf: 2500, limite_esf: 3750 };

  function getNormFn() {
    if (typeof g.norm === 'function') return g.norm;
    return (s) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^\w\s-]/g, '');
  }

  
function detectarParametrosPorStringsCandidatas() {
    const norm = getNormFn();
    const candidatos = [];

    const pushCandidato = (v) => {
      if (typeof v === 'string' && v.trim() !== '') {
        candidatos.push(v);
      }
    };

    // Alguns nomes comuns de variáveis que podem guardar o nome do município ou arquivo
    pushCandidato(g.currentMunicipality);
    pushCandidato(g.municipioAtual);
    pushCandidato(g.nomeMunicipio);
    pushCandidato(g.nomeArquivo);
    pushCandidato(g.nomeArquivoBase);
    pushCandidato(g.nomeArquivoIndividuos);
    pushCandidato(g.nomeArquivoMunicipio);
    pushCandidato(g.nomeArquivoUpload);

    // Captura nomes de arquivos carregados em inputs type="file"
    try {
      if (typeof document !== 'undefined') {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach((inp) => {
          const val = inp.value || inp.getAttribute('data-filename') || '';
          if (typeof val === 'string' && val.trim() !== '') {
            candidatos.push(val);
          }
        });
      }
    } catch (_) {
      // se der erro aqui, apenas ignoramos e seguimos
    }

    // Varredura heurística em outras strings globais (limitando por segurança)
    let count = 0;
    for (const chave in g) {
      if (count > 300) break;
      try {
        const val = g[chave];
        if (typeof val === 'string') {
          candidatos.push(val);
          count++;
        }
      } catch (_) {
        // ignore propriedades problemáticas
      }
    }

    for (const texto of candidatos) {
      const alvo = norm(texto);
      for (const [nome, params] of Object.entries(PARAMETROS_MUNICIPIO)) {
        if (alvo.includes(norm(nome))) {
          return params;
        }
      }
    }

    return null;
  }

  function obterParametrosMunicipioAtual() {
    const norm = getNormFn();
    const raw = g.currentMunicipality || '';
    if (raw) {
      const target = norm(raw);
      for (const [nome, params] of Object.entries(PARAMETROS_MUNICIPIO)) {
        if (target.includes(norm(nome))) {
          return params;
        }
      }
    }

    // fallback: tenta descobrir pelo nome do arquivo ou outras strings globais
    const heuristico = detectarParametrosPorStringsCandidatas();
    if (heuristico) {
      return heuristico;
    }

    return DEFAULT_PARAMS;
  }

  function extrairINE(text) {
    const s = String(text || '');
    const ineMatch = s.match(/\b(\d{7,8})\b/);
    if (ineMatch) return ineMatch[1];
    const ineWordMatch = s.match(/INE\s*[:\-]?\s*(\d+)/i);
    if (ineWordMatch) return ineWordMatch[1];
    return '';
  }

  // Calcula vínculos por equipe (unidade + INE), mas o gráfico será agregado por unidade.
  function calcularVinculos(individuos) {
    if (!Array.isArray(individuos) || !individuos.length) {
      return { vinculos: [], parametroOficial: 0, limiteOficial: 0 };
    }

    const params = obterParametrosMunicipioAtual();
    const parametroOficial = params.parametro_esf || DEFAULT_PARAMS.parametro_esf;
    const limiteOficial = params.limite_esf || DEFAULT_PARAMS.limite_esf;

    const porEquipe = new Map();

    for (const row of individuos) {
      const estabelecimento = row.estabelecimento || 'Sem estabelecimento';
      const acs = row.acs || '';
      const ineFromData = (row.ine || '').toString().trim();
      const ineFromText = extrairINE(acs || estabelecimento);
      const ine = ineFromData || ineFromText || '';

      const equipeId = ine || acs || 'SEM_EQUIPES';
      const key = `${estabelecimento}|||${equipeId}`;

      const atual = porEquipe.get(key) || {
        unidade: estabelecimento,
        acs,
        ine,
        total: 0
      };

      atual.total += 1;
      if (!atual.acs && acs) atual.acs = acs;
      if (!atual.ine && ine) atual.ine = ine;

      porEquipe.set(key, atual);
    }

    const vinculos = [];
    for (const [, info] of porEquipe.entries()) {
      const total = info.total;

      const parametroEquipe = parametroOficial;
      const limiteEquipe = limiteOficial;

      let status = '✅ Dentro do Parâmetro';
      if (total > limiteEquipe) {
        status = '🚨 ACIMA DO LIMITE MÁXIMO';
      } else if (total > parametroEquipe) {
        status = '⚠️ Acima do Parâmetro';
      }

      vinculos.push({
        unidade: info.unidade,
        acs: info.acs,
        equipeOriginal: info.acs ? `${info.acs} - ${info.unidade}` : info.unidade,
        ine: info.ine || '',
        total,
        parametroEquipe,
        limiteEquipe,
        status
      });
    }

    // ordena equipes da maior para a menor quantidade de pessoas vinculadas
    vinculos.sort((a, b) => b.total - a.total);
    return { vinculos, parametroOficial, limiteOficial };
  }

  let chartVinculos = null;
  let chartVinculosEquipes = null;

  function criarModalEquipes() {
    let overlay = document.getElementById('modalVinculosOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'modalVinculosOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(15, 23, 42, 0.55)';
    overlay.style.display = 'none';
    overlay.style.zIndex = '9999';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const dialog = document.createElement('div');
    dialog.style.background = '#ffffff';
    dialog.style.borderRadius = '0.75rem';
    dialog.style.boxShadow = '0 20px 45px rgba(15,23,42,0.35)';
    dialog.style.maxWidth = '720px';
    dialog.style.width = '95%';
    dialog.style.maxHeight = '80vh';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.padding = '1.5rem';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '0.75rem';

    const title = document.createElement('h3');
    title.id = 'modalVinculosTitle';
    title.textContent = 'Equipes da unidade';
    title.style.fontSize = '1rem';
    title.style.fontWeight = '600';
    title.style.color = '#111827';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.style.fontSize = '1.25rem';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
      overlay.style.display = 'none';
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.id = 'modalVinculosBody';
    body.style.overflow = 'auto';
    body.style.borderTop = '1px solid #e5e7eb';
    body.style.marginTop = '0.75rem';
    body.style.paddingTop = '0.75rem';

    dialog.appendChild(header);
    dialog.appendChild(body);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function mostrarEquipesDaUnidade(unidadeResumo) {
    const overlay = criarModalEquipes();
    const body = document.getElementById('modalVinculosBody');
    const title = document.getElementById('modalVinculosTitle');

    if (!body || !title) return;

    title.textContent = `Equipes da unidade: ${unidadeResumo.unidade}`;

    const equipes = (unidadeResumo.equipes || [])
      .slice()
      .sort((a, b) => b.total - a.total);

    if (!equipes.length) {
      body.innerHTML = '<p style="padding:0.5rem 0;">Nenhuma equipe encontrada para esta unidade.</p>';
      overlay.style.display = 'flex';
      return;
    }

    const linhas = equipes
      .map((e) => `
        <tr>
          <td>${e.total.toLocaleString('pt-BR')}</td>
          <td>${e.parametroEquipe}</td>
          <td>${e.limiteEquipe}</td>
          <td>${e.status}</td>
        </tr>
      `)
      .join('');

    body.innerHTML = `
      <p style="font-size:0.875rem;color:#4b5563;margin-bottom:0.75rem;">
        Detalhamento das equipes desta unidade. Cada barra do gráfico e cada linha representam uma equipe (INE)
        e o total de pessoas com cadastro vinculado.
      </p>
      <div style="height:220px;margin-bottom:1rem;">
        <canvas id="modalVinculosChart"></canvas>
      </div>
      <div style="overflow:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nº Pessoas Vinculadas</th>
              <th>Parâmetro</th>
              <th>Limite Máximo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${linhas}
          </tbody>
        </table>
      </div>
    `;

    overlay.style.display = 'flex';

    // Garante que o Chart.js está disponível (já foi usado no gráfico principal)
    if (typeof Chart === 'undefined') {
      console.error('Chart.js não está carregado para o gráfico de equipes.');
      return;
    }

    const canvas = document.getElementById('modalVinculosChart');
    if (!canvas) return;

    if (chartVinculosEquipes) {
      try {
        chartVinculosEquipes.destroy();
      } catch (e) { /* ignore */ }
      chartVinculosEquipes = null;
    }

    const labels = equipes.map((e) => e.ine || e.acs || 'Equipe');
    const data = equipes.map((e) => e.total);

    chartVinculosEquipes = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Pessoas vinculadas (por equipe)',
          data,
          borderWidth: 1,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const idx = ctx.dataIndex;
                const e = equipes[idx];
                return [
                  `INE: ${e.ine || '-'}`,
                  `Total vinculados: ${e.total.toLocaleString('pt-BR')}`,
                  `Status: ${e.status}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value.toLocaleString('pt-BR')
            }
          }
        }
      }
    });
  }

  async function atualizarPainelVinculos(individuosFiltrados) {
    const totalEqEl  = document.getElementById('kpiVinculosTotalEquipes');
    const totalCidEl = document.getElementById('kpiVinculosTotalCidadaos');
    const mediaEl    = document.getElementById('kpiVinculosMediaPorEquipe');
    const critEl     = document.getElementById('kpiVinculosEquipesAcimaLimite');
    const canvas     = document.getElementById('chartVinculos');
    const tabelaBody = document.querySelector('#tabelaVinculos tbody');
    const tabelaHeadRow = document.querySelector('#tabelaVinculos thead tr');

    if (!totalEqEl || !canvas || !tabelaBody) {
      return;
    }

    // Ajusta o cabeçalho para exibir apenas unidades (sem coluna de equipe/INE)
    if (tabelaHeadRow && !tabelaHeadRow.dataset.vinculosUnidade) {
      tabelaHeadRow.dataset.vinculosUnidade = '1';
      tabelaHeadRow.innerHTML = `
        <th>Unidade de Saúde</th>
        <th>Nº Pessoas Vinculadas</th>
        <th>Parâmetro</th>
        <th>Limite Máximo</th>
        <th>Status</th>
      `;
    }

    const base = Array.isArray(individuosFiltrados) && individuosFiltrados.length
      ? individuosFiltrados
      : (g.dadosIndividuos || []);

    const { vinculos, parametroOficial, limiteOficial } = calcularVinculos(base);

    // Agrupa por unidade para o gráfico e para a tabela
    const porUnidadeMap = new Map();
    for (const v of vinculos) {
      const atual = porUnidadeMap.get(v.unidade) || {
        unidade: v.unidade,
        total: 0,
        equipes: []
      };

      atual.total += v.total;
      atual.equipes.push(v);

      porUnidadeMap.set(v.unidade, atual);
    }

    // Calcula o status da UNIDADE com base no total agregado x parâmetro/limite
    const unidadesResumo = Array.from(porUnidadeMap.values())
      .map((u) => {
        let statusUnidade = '✅ Dentro do Parâmetro';
        if (u.total > limiteOficial) {
          statusUnidade = '🚨 ACIMA DO LIMITE MÁXIMO';
        } else if (u.total > parametroOficial) {
          statusUnidade = '⚠️ Acima do Parâmetro';
        }
        return { ...u, statusMax: statusUnidade };
      })
      .sort((a, b) => b.total - a.total);

    const totalEquipes = vinculos.length;
    const totalCidadaos = vinculos.reduce((s, v) => s + v.total, 0);
    const mediaPorEquipe = totalEquipes ? (totalCidadaos / totalEquipes) : 0;

    // Agora conta UNIDADES acima do limite (e não equipes isoladas)
    const unidadesAcimaLimite = unidadesResumo.filter(
      (u) => u.statusMax === '🚨 ACIMA DO LIMITE MÁXIMO'
    ).length;

    totalEqEl.textContent  = totalEquipes.toLocaleString('pt-BR');
    totalCidEl.textContent = totalCidadaos.toLocaleString('pt-BR');
    mediaEl.textContent    = mediaPorEquipe.toFixed(1).replace('.', ',');
    critEl.textContent     = unidadesAcimaLimite.toLocaleString('pt-BR');


    // --- Tabela: detalhamento por unidade (apenas unidades) -------------------
    tabelaBody.innerHTML = '';
    for (const u of unidadesResumo) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.unidade}</td>
        <td>${u.total.toLocaleString('pt-BR')}</td>
        <td>${parametroOficial}</td>
        <td>${limiteOficial}</td>
        <td>${u.statusMax}</td>
      `;
      tabelaBody.appendChild(tr);
    }

    // Destroi gráfico anterior (se existir)
    if (chartVinculos) {
      try {
        chartVinculos.destroy();
      } catch (e) { /* ignore */ }
      chartVinculos = null;
    }

    if (!unidadesResumo.length) {
      return;
    }

    try {
      if (typeof ensureGlobal === 'function' && typeof CDN !== 'undefined') {
        await ensureGlobal('Chart', CDN.Chart);
      }
    } catch (e) {
      console.error('Chart.js não disponível para o gráfico de vínculos.', e);
      return;
    }

    if (typeof Chart === 'undefined') {
      console.error('Chart.js não está carregado.');
      return;
    }

    const labels = unidadesResumo.map(u => u.unidade);
    const data   = unidadesResumo.map(u => u.total);
    const coresStatus = {
      '✅ Dentro do Parâmetro': '#22c55e',
      '⚠️ Acima do Parâmetro': '#eab308',
      '🚨 ACIMA DO LIMITE MÁXIMO': '#ef4444'
    };
    const backgroundColors = unidadesResumo.map(u => coresStatus[u.statusMax] || '#4b5563');

    // Ajusta altura dinamicamente para não "bugar" com muitas unidades
    const baseAltura = 24;
    const alturaMin = 260;
    const alturaDesejada = Math.max(alturaMin, labels.length * baseAltura);
    canvas.style.height = alturaDesejada + 'px';
    canvas.height = alturaDesejada;

    const ctx = canvas.getContext('2d');
    chartVinculos = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total de pessoas vinculadas por unidade',
          data,
          backgroundColor: backgroundColors,
          borderColor: '#111827',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 32
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 10, right: 24, bottom: 10, left: 10 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const idx = context.dataIndex;
                const u = unidadesResumo[idx];
                const totalEquipes = u.equipes.length;
                const total = u.total.toLocaleString('pt-BR');
                return [
                  `Total vinculados: ${total}`,
                  `Nº de equipes: ${totalEquipes}`,
                  `Status crítico na unidade: ${u.statusMax}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value.toLocaleString('pt-BR')
            }
          },
          y: {
            ticks: {
              autoSkip: labels.length > 20,
              maxTicksLimit: 20,
              maxRotation: 0,
              minRotation: 0,
              callback: function(value, index, ticks) {
                // Em escalas de categoria, "value" é o valor da escala, não o índice,
                // então usamos getLabelForValue para recuperar o rótulo correto.
                const label = this.getLabelForValue
                  ? this.getLabelForValue(value)
                  : (labels[index] || labels[value] || '');
                if (!label) return '';
                return label.length > 40 ? label.substring(0, 37) + '...' : label;
              }
            }
          }
        },
        onClick: (evt, elements) => {
          if (!elements || !elements.length) return;
          const idx = elements[0].index;
          const unidadeResumo = unidadesResumo[idx];
          if (unidadeResumo) {
            mostrarEquipesDaUnidade(unidadeResumo);
          }
        }
      }
    });
  }

  // Integra com o dashboard principal já existente
  const originalGerarDashboard = g.gerarDashboard;
  g.gerarDashboard = function (individuosFiltrados, domiciliosFiltrados) {
    if (typeof originalGerarDashboard === 'function') {
      originalGerarDashboard.call(this, individuosFiltrados, domiciliosFiltrados);
    }
    try {
      atualizarPainelVinculos(individuosFiltrados);
    } catch (e) {
      console.error('Erro ao atualizar painel de vínculos:', e);
    }
  };
})();
