// vinculos.js - visão de vínculos da Gestão APS integrada ao Painel de Acompanhamento
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);

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

  function obterParametrosMunicipioAtual() {
    const norm = getNormFn();
    const raw = g.currentMunicipality || '';
    const target = norm(raw);
    for (const [nome, params] of Object.entries(PARAMETROS_MUNICIPIO)) {
      if (target.includes(norm(nome))) {
        return params;
      }
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

  // Calcula vínculos por equipe (unidade + ACS), mas o gráfico será agregado por unidade.
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
      const key = `${estabelecimento}|||${acs}`;

      const atual = porEquipe.get(key) || {
        unidade: estabelecimento,
        acs,
        total: 0
      };

      atual.total++;
      porEquipe.set(key, atual);
    }

    const vinculos = [];
    for (const [, info] of porEquipe.entries()) {
      const nomeEquipeBase = info.acs ? `${info.acs} - ${info.unidade}` : info.unidade;
      const ine = extrairINE(nomeEquipeBase);
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
        equipeOriginal: nomeEquipeBase,
        ine,
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

    const equipes = unidadeResumo.equipes || [];

    if (!equipes.length) {
      body.innerHTML = '<p style="padding:0.5rem 0;">Nenhuma equipe encontrada para esta unidade.</p>';
      overlay.style.display = 'flex';
      return;
    }

    const linhas = equipes
      .slice()
      .sort((a, b) => b.total - a.total)
      .map((e) => `
        <tr>
          <td>${e.ine || '-'}</td>
          <td>${e.total.toLocaleString('pt-BR')}</td>
          <td>${e.parametroEquipe}</td>
          <td>${e.limiteEquipe}</td>
          <td>${e.status}</td>
        </tr>
      `)
      .join('');

    body.innerHTML = `
      <p style="font-size:0.875rem;color:#4b5563;margin-bottom:0.75rem;">
        Detalhamento das equipes desta unidade. Cada linha representa uma equipe (ACS/INE) e seu total de pessoas vinculadas.
      </p>
      <div style="overflow:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>INE (Equipe)</th>
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
  }

  async function atualizarPainelVinculos(individuosFiltrados) {
    const totalEqEl  = document.getElementById('kpiVinculosTotalEquipes');
    const totalCidEl = document.getElementById('kpiVinculosTotalCidadaos');
    const mediaEl    = document.getElementById('kpiVinculosMediaPorEquipe');
    const critEl     = document.getElementById('kpiVinculosEquipesAcimaLimite');
    const canvas     = document.getElementById('chartVinculos');
    const tabelaBody = document.querySelector('#tabelaVinculos tbody');

    if (!totalEqEl || !canvas || !tabelaBody) {
      return;
    }

    const base = Array.isArray(individuosFiltrados) && individuosFiltrados.length
      ? individuosFiltrados
      : (g.dadosIndividuos || []);

    const { vinculos, parametroOficial, limiteOficial } = calcularVinculos(base);

    // Agrupa por unidade para o gráfico
    const porUnidadeMap = new Map();
    for (const v of vinculos) {
      const atual = porUnidadeMap.get(v.unidade) || {
        unidade: v.unidade,
        total: 0,
        equipes: [],
        statusMax: '✅ Dentro do Parâmetro'
      };

      atual.total += v.total;
      atual.equipes.push(v);

      const hierarquia = ['✅ Dentro do Parâmetro', '⚠️ Acima do Parâmetro', '🚨 ACIMA DO LIMITE MÁXIMO'];
      const idxAtual = hierarquia.indexOf(atual.statusMax);
      const idxNovo = hierarquia.indexOf(v.status);
      if (idxNovo > idxAtual) {
        atual.statusMax = v.status;
      }

      porUnidadeMap.set(v.unidade, atual);
    }

    const unidadesResumo = Array.from(porUnidadeMap.values()).sort((a, b) => b.total - a.total);

    const totalEquipes = vinculos.length;
    const totalCidadaos = vinculos.reduce((s, v) => s + v.total, 0);
    const mediaPorEquipe = totalEquipes ? (totalCidadaos / totalEquipes) : 0;
    const equipesAcimaLimite = vinculos.filter(v => v.status === '🚨 ACIMA DO LIMITE MÁXIMO').length;

    totalEqEl.textContent  = totalEquipes.toLocaleString('pt-BR');
    totalCidEl.textContent = totalCidadaos.toLocaleString('pt-BR');
    mediaEl.textContent    = mediaPorEquipe.toFixed(1).replace('.', ',');
    critEl.textContent     = equipesAcimaLimite.toLocaleString('pt-BR');

    // Preenche tabela detalhada por equipe (sem coluna de profissional)
    tabelaBody.innerHTML = '';
    for (const v of vinculos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${v.unidade}</td>
        <td>${v.ine || '-'}</td>
        <td>${v.total.toLocaleString('pt-BR')}</td>
        <td>${v.parametroEquipe}</td>
        <td>${v.limiteEquipe}</td>
        <td>${v.status}</td>
      `;
      tabelaBody.appendChild(tr);
    }

    if (chartVinculos) {
      chartVinculos.destroy();
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
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0
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

    // Linhas de referência - parâmetro e limite (se plugin de anotação estiver disponível)
    if (!isNaN(parametroOficial) && parametroOficial > 0) {
      try {
        const annotationPlugin = Chart.registry.plugins.get('annotation');
        if (annotationPlugin) {
          chartVinculos.options.plugins.annotation = {
            annotations: {
              parametro: {
                type: 'line',
                xMin: parametroOficial,
                xMax: parametroOficial,
                borderColor: '#f97316',
                borderDash: [6, 4],
                borderWidth: 1,
                label: {
                  enabled: true,
                  position: 'start',
                  content: 'Parâmetro ESF'
                }
              },
              limite: {
                type: 'line',
                xMin: limiteOficial,
                xMax: limiteOficial,
                borderColor: '#b91c1c',
                borderDash: [6, 4],
                borderWidth: 1,
                label: {
                  enabled: true,
                  position: 'start',
                  content: 'Limite Máximo ESF'
                }
              }
            }
          };
          chartVinculos.update();
        }
      } catch (e) {
        console.warn('Plugin de anotação não disponível para o gráfico de vínculos.', e);
      }
    }
  }

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