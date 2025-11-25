/* === PATCH: Define bucketCategory (global) e reforço no parseTempoToMonths === */
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);
  if (typeof g.bucketCategory !== 'function') {
    g.bucketCategory = function bucketCategory(rawText, months) {
      const s = String(rawText || '').trim().toLowerCase();
      if (/\bmais\s*de\s*2\s*ano/.test(s) || />\s*2\s*ano/.test(s) || /\b2\+\s*ano/.test(s)) {
        return 'Mais de 2 anos';
      }
      const m = s.match(/(?:mais\s*de|>\s*)\s*(\d+)\s*ano/) || s.match(/(\d+)\+\s*ano/);
      if (m) {
        const anos = Number(m[1]);
        if (Number.isFinite(anos) && anos >= 2) return 'Mais de 2 anos';
      }
      if (typeof g.bucket === 'function') return g.bucket(months);
      if (!Number.isFinite(months)) return 'Mais de 2 anos';
      if (months <= 4) return 'Até 4 meses';
      if (months <= 12) return '5 a 12 meses';
      if (months <= 24) return '13 a 24 meses';
      return 'Mais de 2 anos';
    };
  }
  if (typeof g.parseTempoToMonths === 'function') {
    const _orig = g.parseTempoToMonths;
    g.parseTempoToMonths = function (txt = '') {
      const s = String(txt).trim().toLowerCase();
      if (s) {
        const m = s.match(/(?:mais\s*de|>\s*)\s*(\d+)\s*ano/) || s.match(/(\d+)\+\s*ano/);
        if (m) {
          const anos = Number(m[1]);
          if (Number.isFinite(anos) && anos >= 2) {
            return anos * 12 + 1;
          }
        }
      }
      return _orig(txt);
    };
  }
})();

// ====== CDN fallbacks ======
const CDN = {
  XLSX: [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'
  ],
  Papa: [
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
    'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
    'https://unpkg.com/papaparse@5.4.1/papaparse.min.js'
  ],
  Chart: [
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
    'https://unpkg.com/chart.js@4.4.4/dist/chart.umd.min.js'
  ]
};

function loadScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar: ' + src));
    document.head.appendChild(s);
  });
}

async function ensureGlobal(globalName, srcs){
  if(window[globalName]) return;
  const failures = [];
  for(const src of srcs){
    try{
      await loadScript(src);
      if(!window[globalName]) await new Promise(r => setTimeout(r, 50));
      if(window[globalName]) return;
    }catch(e){ failures.push(src); }
  }
  const help = document.getElementById('xlsxHelp');
  const diag = document.getElementById('xlsxDiag');
  if(help && diag && globalName === 'XLSX'){
    help.classList.remove('hidden');
    diag.textContent = 'Falha ao carregar biblioteca. Verifique sua conexão.';
  }
  throw new Error(globalName + ' não pôde ser carregado.');
}

// ===== Estado =====
let dadosIndividuos = [];
let dadosDomicilios = [];
let dadosDesaparecidosIndividuos = [];
let dadosDesaparecidosDomicilios = [];
let dadosAnteriores = { individuos: [], domicilios: [] }; 

// Versões filtradas
let dadosIndividuosFiltrados = [];
let dadosDomiciliosFiltrados = [];

// Estado Global do Município Atual
let currentMunicipality = null; // Armazena o município detectado dinamicamente

// Gráficos
let historicoChart = null;
let historicoCharts = {};
let profissionalChart = null;
let unidadeChartInd = null;
let unidadeChartDom = null;
let dashboardChart = null;

if (typeof window.unitCharts === 'undefined') window.unitCharts = {};
let activeAccordionCharts = {};

let arquivoIndividuos = null;
let arquivoDomicilios = null;

let showAllIndividuos = false;
let showAllDomicilios = false;
const CRITICAL_MONTHS_THRESHOLD = 4; 

let sortState = {
  individuos: { key: 'mesesSemAtualizar', order: 'desc' },
  domicilios: { key: 'mesesSemAtualizar', order: 'desc' },
  desaparecidosInd: { key: 'mesesSemAtualizar', order: 'desc' },
  desaparecidosDom: { key: 'mesesSemAtualizar', order: 'desc' }
};

const BUCKET_COLORS = {
  'Até 4 meses': 'rgba(212, 237, 218, 0.9)',
  '5 a 12 meses': 'rgba(209, 236, 241, 0.9)',
  '13 a 24 meses': 'rgba(255, 243, 205, 0.9)',
  'Mais de 2 anos': 'rgba(248, 215, 218, 0.9)'
};
const BUCKET_BORDERS = {
  'Até 4 meses': '#b1dfbb',
  '5 a 12 meses': '#aed6f1',
  '13 a 24 meses': '#fdebd0',
  'Mais de 2 anos': '#f5b7b1'
};
const BUCKET_CLASSES = {
  'Até 4 meses': 'cat-0-4',
  '5 a 12 meses': 'cat-5-12',
  '13 a 24 meses': 'cat-13-24',
  'Mais de 2 anos': 'cat-25-plus'
};
const BUCKET_ORDER = ['Até 4 meses', '5 a 12 meses', '13 a 24 meses', 'Mais de 2 anos'];


// ===== Utils =====
const stripAccents = (s='') => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const norm = (s='') => stripAccents(String(s).toLowerCase().trim()).replace(/\s+/g,' ').replace(/[^\w\s-]/g,'');

const buildHeaderMap = (row) => {
  const map = {};
  Object.keys(row || {}).forEach(k => map[norm(k)] = k);
  return map;
};

const HEADERS = {
  estabelecimento: ['estabelecimento','unidade','unidade de saude','unidade de saúde','ubs','equipe','estab'],
  acs: ['acs','agente','agente comunitario de saude','agente comunitário de saúde','profissional','profissional (acs)','profissional cadastrante'],
  ind_nome: ['cidadao','cidadão','nome completo','nome','nome do cidadao','nome do cidadão'],
  ind_doc_pessoal: ['documento pessoal','doc pessoal','documento'],
  ind_cpf: ['cpf'],
  ind_sus: ['sus','cns','cartao sus','cartão sus','cartao nacional de saude','cartão nacional de saúde','numero do cartao sus'],
  ind_data_nasc: ['data de nascimento','dt nascimento','nascimento','dn','data nasc','datanascimento'],
  ind_ultima_atual: ['ultima atualizacao','última atualizacao','ultima atualização','última atualização','data da atualizacao','data da atualização','atualizacao','atualização'],
  dom_endereco: ['identificao bairro logradouro','identificação bairro logradouro','endereco','endereço','logradouro'],
  dom_numero: ['numero do domicilio','número do domicílio','numero','nº','num'],
  dom_bairro: ['bairro'],
  dom_resp: ['identificacao do responsavel familiar','responsavel familiar','responsável familiar','nome do responsavel','nome do responsável'],
  dom_identificacao: ['identificao','identificacao','identificação','id da casa','id do domicilio','codigo domicilio','código domicílio','cod domicilio','identificação da casa','identificacao da casa'],
  dom_micro: ['micro-area','micro área','micro-área','microarea','micro'],
  dom_tempo: ['tempo sem atualizar', 'tempo sem atualizacao', 'tempo sem atualização'],
  ind_meses_sem_atualizar: ['meses sem atualizar'],
  dom_data_cadastro: ['data cadastro', 'data do cadastro'],
  dom_domicilio: ['domicilio','domicílio','domicílio (painel)','domicilio (painel)'],
  col_d: ['d']
};

const findHeader = (map, aliases) => {
  for(const a of aliases){
    const key = map[norm(a)];
    if(key !== undefined) return key;
  }
  return null;
};

const getField = (row, map, aliases) => {
  const h = findHeader(map, aliases);
  return h ? (row[h] ?? '') : '';
};

const toDateBR = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return !isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';
};

const toDateInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateFlexible = (val) => {
    if (!val || typeof val === 'boolean') return null;
    if (val instanceof Date) { return !isNaN(val.getTime()) ? val : null; }
    if (typeof val === 'number') {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const ms = val * 86400000;
        const dt = new Date(epoch.getTime() + ms);
        return isNaN(dt.getTime()) ? null : dt;
    }
    const s = String(val).trim();
    if (!s || s.toLowerCase() === 'n/a') return null;
    
    const dt = new Date(s);
    return !isNaN(dt.getTime()) ? dt : null;
};

const parseTempoToMonths = (txt = '') => {
  const s = String(txt).trim().toLowerCase();
  if (!s) return Infinity;
  {
    const m1 = s.match(/mais\s*de\s*(\d+)\s*ano/);
    const m2 = s.match(/>\s*(\d+)\s*ano/);
    const m3 = s.match(/(\d+)\+\s*ano/);
    const mx = m1 || m2 || m3;
    if (mx) {
      const anos = Number(mx[1]);
      if (Number.isFinite(anos) && anos >= 2) {
        return anos * 12 + 1;
      }
    }
  }
  let totalMonths = 0;
  const anosMatch = s.match(/(\d+)\s*ano/);
  if (anosMatch) {
    totalMonths += Number(anosMatch[1]) * 12;
  }
  const mesesMatch = s.match(/(\d+)\s*mes/);
  if (mesesMatch) {
    totalMonths += Number(mesesMatch[1]);
  }
  if (totalMonths > 0) return totalMonths;
  const numVal = parseFloat(s.replace(',', '.'));
  if (Number.isFinite(numVal)) return numVal;
  return Infinity;
};

// --- FUNÇÃO CENTRAL: Extrair data e município dinamicamente ---
const extractInfoFromFilename = (filename) => {
  if (!filename) return { date: null, municipality: null };
  
  // Expressão regular para capturar "NOME DO MUNICIPIO QUALQUER" antes da "DATA"
  // Grupo 1: (.*?) -> Captura tudo antes da data (O nome do município)
  // Grupo 2: (\d{2}...) -> Captura a data no formato DD_MM_AAAA ou similares
  const match = filename.match(/^(.*?)(\d{2}[\_\-\.]\d{2}[\_\-\.]\d{4})/);
  
  let result = { date: null, municipality: null };
  
  if (match) {
    // Processa o município
    let rawMunicipality = match[1];
    // Remove separadores (underline, traço, ponto) que ficaram no final do nome
    rawMunicipality = rawMunicipality.replace(/[\_\-\.]+$/, '').trim();
    
    if (rawMunicipality) {
      result.municipality = rawMunicipality;
    }

    // Processa a data
    const datePart = match[2];
    const dateMatch = datePart.match(/(\d{2})[\_\-\.](\d{2})[\_\-\.](\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; 
      const year = parseInt(dateMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        result.date = d;
      }
    }
  }
  return result;
};


function identificarDesaparecidos(antigos, novos, idKey) {
  if (!antigos || !Array.isArray(antigos) || !novos || !Array.isArray(novos) || !idKey) {
    return [];
  }
  console.log(`Comparando ${antigos.length} registros antigos com ${novos.length} novos, usando a chave: ${idKey}`);
  const novosIds = new Set(
    novos.map(item => item[idKey]).filter(Boolean)
  );
  if (novosIds.size === 0) {
    console.warn(`Nenhum ID novo encontrado para a chave ${idKey}. Todos os antigos serão marcados como desaparecidos.`);
  }
  const desaparecidos = antigos.filter(item => {
    const idAntigo = item[idKey];
    return idAntigo && !novosIds.has(idAntigo);
  });
  console.log(`Encontrados ${desaparecidos.length} cadastros desaparecidos para ${idKey}.`);
  return desaparecidos;
}


// ===== Processamento de Arquivos =====
async function processarArquivo(file, type) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      const data = e.target.result;
      let parsedData = [];

      if (file.name.endsWith('.csv')) {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => norm(header),
          complete: (results) => {
            parsedData = results.data;
            resolve(type === 'individuos' ? parseCSVDataIndividuos(parsedData) : parseCSVDataDomicilios(parsedData));
          },
          error: (err) => reject(err)
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          await ensureGlobal('XLSX', CDN.XLSX);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (json.length === 0) {
            return resolve([]);
          }

          const headerRow = json[0];
          const dataRows = json.slice(1);
          const normalizedHeaderMap = {};
          headerRow.forEach((h, i) => {
            normalizedHeaderMap[i] = norm(h);
          });
          parsedData = dataRows.map(row => {
            const newRow = {};
            headerRow.forEach((originalHeader, i) => {
              const normalizedHeader = normalizedHeaderMap[i];
              newRow[originalHeader] = row[i];
              newRow[normalizedHeader] = row[i];
            });
            return newRow;
          });
          resolve(type === 'individuos' ? parseCSVDataIndividuos(parsedData) : parseCSVDataDomicilios(parsedData));
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Formato de arquivo não suportado.'));
      }
    };
    reader.onerror = (error) => reject(error);
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}


async function processarDados() {
  document.getElementById('btnProcessar').disabled = true;
  document.getElementById('btnProcessar').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10"/><path d="M18.4 8.6l-4.7 4.7"/><path d="M22 12h-10"/><path d="M18.4 15.4l-4.7-4.7"/><path d="M12 22v-10"/><path d="M5.6 15.4l4.7-4.7"/><path d="M2 12h10"/><path d="M5.6 8.6l4.7 4.7"/></svg> Processando...';
  
  document.getElementById('btnSalvarSnapshot').disabled = true;

  try {
    console.log(`Iniciando processamento. Comparando com ${dadosAnteriores.individuos.length} ind e ${dadosAnteriores.domicilios.length} dom anteriores.`);

    const [individuosResult, domiciliosResult] = await Promise.allSettled([
      arquivoIndividuos ? processarArquivo(arquivoIndividuos, 'individuos') : Promise.resolve([]),
      arquivoDomicilios ? processarArquivo(arquivoDomicilios, 'domicilios') : Promise.resolve([])
    ]);

    if (individuosResult.status === 'fulfilled') {
      dadosIndividuos = individuosResult.value;
    } else {
      console.error('Erro ao processar indivíduos:', individuosResult.reason);
      alert('Erro ao processar arquivo de indivíduos: ' + individuosResult.reason.message);
      dadosIndividuos = [];
    }

    if (domiciliosResult.status === 'fulfilled') {
      dadosDomicilios = domiciliosResult.value;
    } else {
      console.error('Erro ao processar domicílios:', domiciliosResult.reason);
      alert('Erro ao processar arquivo de domicílios: ' + domiciliosResult.reason.message);
      dadosDomicilios = [];
    }

    dadosDesaparecidosIndividuos = identificarDesaparecidos(dadosAnteriores.individuos, dadosIndividuos, 'cpf');
    dadosDesaparecidosDomicilios = identificarDesaparecidos(dadosAnteriores.domicilios, dadosDomicilios, 'identificacao');

    
    try {
      const todosOsDados = [...dadosIndividuos, ...dadosDomicilios];
      
      // --- LÓGICA ATUALIZADA: Data e Município ---
      let snapshotDate = new Date(); 
      let snapshotMunicipality = null; 
      
      // Helper para atualizar variáveis se encontrar info válida no nome do arquivo
      const tryUpdateInfo = (filename) => {
        const info = extractInfoFromFilename(filename);
        if (info.municipality) snapshotMunicipality = info.municipality;
        if (info.date) snapshotDate = info.date;
      };

      if (arquivoIndividuos && arquivoIndividuos.name) tryUpdateInfo(arquivoIndividuos.name);
      // Se não achou no indivíduos, tenta no domicílios (ou usa para confirmar)
      if (arquivoDomicilios && arquivoDomicilios.name) tryUpdateInfo(arquivoDomicilios.name);
      
      // Se encontrou um município no arquivo, usa ele. Se não, mantém o que já estava (ou null)
      if (snapshotMunicipality) {
          currentMunicipality = snapshotMunicipality;
      }
      
      console.log(`Processando para Município: ${currentMunicipality || 'Geral'}, Data: ${snapshotDate.toLocaleDateString()}`);
      
      const snapshot = {
        date: snapshotDate.toISOString(),
        counts: {
          'Até 4 meses': 0,
          '5 a 12 meses': 0,
          '13 a 24 meses': 0,
          'Mais de 2 anos': 0
        }
      };

      todosOsDados.forEach(item => {
        const category = bucketCategory(item.tempoSemAtualizar, item._monthsSince);
        if (snapshot.counts[category] !== undefined) {
          snapshot.counts[category]++;
        }
      });

      // Define a chave do localStorage baseada no município (Cria uma chave única para CADA município)
      const storageKey = currentMunicipality 
        ? `cadastroHistorico_${norm(currentMunicipality)}` 
        : 'cadastroHistorico'; // Fallback para 'Geral' se não achar nome no arquivo

      let historico = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Evita duplicatas da mesma data
      const dateStr = snapshotDate.toISOString().split('T')[0];
      const existingIndex = historico.findIndex(h => h.date.startsWith(dateStr));
      
      if (existingIndex >= 0) {
        historico[existingIndex] = snapshot; // Atualiza
      } else {
        historico.push(snapshot); // Adiciona
      }
      
      localStorage.setItem(storageKey, JSON.stringify(historico));
      
      // Atualiza o gráfico usando o município detectado
      gerarHistoricoChart();

    } catch (e) {
      console.error("Falha ao salvar o histórico no localStorage:", e);
    }


    const dadosCombinados = [...dadosIndividuos, ...dadosDomicilios];
    atualizarFiltros(dadosCombinados);
    sortData('individuos');
    sortData('domicilios');
    aplicarFiltros();
    populateDownloadProfissionalSelect();

    document.getElementById('btnProcessar').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> Processar Dados';
    document.getElementById('btnProcessar').disabled = false;
    
    document.getElementById('btnSalvarSnapshot').disabled = false;

  } catch (error) {
    console.error('Erro geral no processamento:', error);
    alert('Ocorreu um erro inesperado: ' + error.message);
    document.getElementById('btnProcessar').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> Processar Dados';
    document.getElementById('btnProcessar').disabled = false;
  }
}

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

    out.push({
      tipo: 'individuo',
      acs: acs,
      estabelecimento: estabelecimento,
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

function parseCSVDataDomicilios(data) {
  const out = [];
  const today = new Date();
  for (const r of data) {
    const headerMap = buildHeaderMap(r);

    const acs = getField(r, headerMap, HEADERS.acs);
    const estabelecimento = getField(r, headerMap, HEADERS.estabelecimento);
    const endereco = getField(r, headerMap, HEADERS.dom_endereco) || getField(r, headerMap, HEADERS.dom_domicilio);
    const numero = getField(r, headerMap, HEADERS.dom_numero);
    const bairro = getField(r, headerMap, HEADERS.dom_bairro);
    const responsavel = getField(r, headerMap, HEADERS.dom_resp);
    const identificacao = getField(r, headerMap, HEADERS.dom_identificacao) || getField(r, headerMap, HEADERS.dom_domicilio);
    const micro = getField(r, headerMap, HEADERS.dom_micro);

    const dataCadastroRaw = getField(r, headerMap, HEADERS.dom_data_cadastro);
    const dataCadastro = parseDateFlexible(dataCadastroRaw);

    const tempoTxt = getField(r, headerMap, HEADERS.dom_tempo);
    const mesesSemAtualizarTxt = getField(r, headerMap, HEADERS.ind_meses_sem_atualizar);
    let mesesSemAtualizarVal = null;
    if (mesesSemAtualizarTxt) {
      mesesSemAtualizarVal = parseFloat(mesesSemAtualizarTxt.replace(',', '.'));
    } else if (dataCadastro) {
      const diffTime = Math.abs(today.getTime() - dataCadastro.getTime());
      mesesSemAtualizarVal = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    }

    const mesesSemAtualizar = mesesSemAtualizarVal !== null && !isNaN(mesesSemAtualizarVal) ? mesesSemAtualizarVal : Infinity;

    const monthsSince = parseTempoToMonths(tempoTxt);

    if (!(endereco || identificacao || responsavel || bairro || numero)) continue;
    out.push({
      tipo: 'domicilio',
      estabelecimento: estabelecimento,
      acs,
      endereco,
      numero,
      bairro,
      responsavel,
      identificacao: identificacao,
      microArea: micro || '00',
      dataCadastro: dataCadastro ? dataCadastro.toISOString() : null,
      dataCadastroFormatada: dataCadastro ? toDateBR(dataCadastro) : '',
      ultimaAtualizacao: dataCadastro ? dataCadastro.toISOString() : null,
      dataAtualizacaoFormatada: dataCadastro ? toDateBR(dataCadastro) : '',
      tempoSemAtualizar: tempoTxt,
      mesesSemAtualizar: mesesSemAtualizar,
      _monthsSince: monthsSince
    });
  }
  return out;
}

// ===== Filtros & tabelas =====
function atualizarFiltros(dados){
  const unidades = new Set();
  const profissionais = new Set();
  dados.forEach(item => {
    if(item.estabelecimento) unidades.add(item.estabelecimento);
    if(item.acs) profissionais.add(item.acs);
  });
  const selU = document.getElementById('filterUnidade');
  selU.innerHTML = `<option value="">Todas</option>` + Array.from(unidades).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(u=>`<option value="${u}">${u}</option>`).join('');
  const selP = document.getElementById('filterProfissional');
  selP.innerHTML = `<option value="">Todos</option>` + Array.from(profissionais).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(p=>`<option value="${p}">${p}</option>`).join('');

  selU.onchange = aplicarFiltros;
  selP.onchange = aplicarFiltros;

  document.getElementById('relatorioContainerInd').addEventListener('click', handleRelatorioClick);
  document.getElementById('relatorioContainerDom').addEventListener('click', handleRelatorioClick);
  document.getElementById('relatorioProfissionalContainerInd').addEventListener('click', handleRelatorioClick);
  document.getElementById('relatorioProfissionalContainerDom').addEventListener('click', handleRelatorioClick);
}

function handleRelatorioClick(e) {
  const target = e.target.closest('a[data-profissional], a[data-unidade]');
  if (!target) return;
  e.preventDefault();

  if (target.dataset.profissional) {
    const profissional = target.dataset.profissional;
    document.getElementById('filterProfissional').value = profissional;
    aplicarFiltros();
    switchTab('detalhesProfissional');
    exibirDetalhesProfissional(profissional);
  } else if (target.dataset.unidade) {
    const unidade = target.dataset.unidade;
    document.getElementById('filterUnidade').value = unidade;
    aplicarFiltros();
    switchTab('detalhesUnidade'); 
    exibirDetalhesUnidade(unidade);
  }
}

function getFilterFunction() {
  const u = document.getElementById('filterUnidade').value;
  const p = document.getElementById('filterProfissional').value;
  return (row) => (!u || row.estabelecimento === u) && (!p || row.acs === p);
}

function aplicarFiltros(){
  const filterFn = getFilterFunction();

  Object.values(activeAccordionCharts).forEach(chart => {
    try { chart.destroy(); } catch(e) {}
  });
  activeAccordionCharts = {};

  const filtradosInd = dadosIndividuos.filter(filterFn);
  const filtradosDom = dadosDomicilios.filter(filterFn);
  const filtradosDesapInd = dadosDesaparecidosIndividuos.filter(filterFn);
  const filtradosDesapDom = dadosDesaparecidosDomicilios.filter(filterFn);

  dadosIndividuosFiltrados = filtradosInd;
  dadosDomiciliosFiltrados = filtradosDom;

  popularTabelaIndividuos(filtradosInd);
  popularTabelaDomicilios(filtradosDom);

  popularTabelaIndividuosDesaparecidos(filtradosDesapInd);
  popularTabelaDomiciliosDesaparecidos(filtradosDesapDom);

  gerarRelatorioPorUnidadeInd(filtradosInd);
  gerarRelatorioPorUnidadeDom(filtradosDom);
  gerarRelatorioPorProfissionalInd(filtradosInd);
  gerarRelatorioPorProfissionalDom(filtradosDom);

  gerarDashboard(filtradosInd, filtradosDom);
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

  const ind = Array.isArray(individuosFiltrados) && individuosFiltrados.length ? individuosFiltrados : dadosIndividuos;
  const dom = Array.isArray(domiciliosFiltrados) && domiciliosFiltrados.length ? domiciliosFiltrados : dadosDomicilios;

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

  const buckets = {
    'Até 4 meses': 0,
    '5 a 12 meses': 0,
    '13 a 24 meses': 0,
    'Mais de 2 anos': 0
  };

  const acumular = (item) => {
    const months = Number.isFinite(item._monthsSince) ? item._monthsSince :
                   (Number.isFinite(item.mesesSemAtualizar) ? item.mesesSemAtualizar : Infinity);
    const cat = (typeof bucketCategory === 'function')
      ? bucketCategory(item.tempoSemAtualizar, months)
      : bucket(months);
    if (!buckets.hasOwnProperty(cat)) return;
    buckets[cat]++;
  };

  ind.forEach(acumular);
  dom.forEach(acumular);

  const labels = Object.keys(buckets);
  const data = labels.map(l => buckets[l]);

  if (dashboardChart) {
    try { dashboardChart.destroy(); } catch (e) {}
  }

  const ctx = canvas.getContext('2d');
  dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Quantidade de cadastros',
        data,
        backgroundColor: labels.map(l => BUCKET_COLORS[l] || 'rgba(99,102,241,0.15)'),
        borderColor: labels.map(l => BUCKET_BORDERS[l] || '#4F46E5'),
        borderWidth: 1.5,
        borderRadius: 6,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y.toLocaleString('pt-BR')} cadastros`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0 }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148,163,184,0.2)' },
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function populateDownloadProfissionalSelect() {
  const select = document.getElementById("selectProfissionalDownload");
  if (!select) return;

  select.innerHTML = "<option value=\"\">Selecione um Profissional</option>";

  const profissionais = new Set();
  [...dadosIndividuos, ...dadosDomicilios].forEach(item => {
    if (item.acs) profissionais.add(item.acs);
  });

  Array.from(profissionais).sort().forEach(p => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    select.appendChild(option);
  });
}

async function gerarLinkCompartilhavel() {
  const profissionalSelecionado = document.getElementById("selectProfissionalDownload").value;
  
  if (!profissionalSelecionado) {
    return;
  }

  const dadosFiltrados = [...dadosIndividuos, ...dadosDomicilios].filter(item => item.acs === profissionalSelecionado);

  if (dadosFiltrados.length === 0) {
    alert("Nenhum dado encontrado para o profissional selecionado.");
    return;
  }

  const compressedData = {
    n: profissionalSelecionado,
    e: dadosFiltrados[0].estabelecimento,
    d: dadosFiltrados.map(item => {
      if (item.tipo === 'individuo') {
        return [
          'individuo',
          item.nome,
          item.cpf,
          item.dataNascimento,
          item.ultimaAtualizacao,
          item.mesesSemAtualizar,
          item.microArea
        ];
      } else if (item.tipo === 'domicilio') {
        return [
          'domicilio',
          item.endereco,
          item.numero,
          item.bairro,
          item.responsavel,
          item.dataCadastro,
          item.ultimaAtualizacao,
          item.mesesSemAtualizar,
          item.microArea
        ];
      }
      return null;
    }).filter(item => item !== null)
  };

  const jsonString = JSON.stringify(compressedData);
  const encodedData = btoa(encodeURIComponent(jsonString));

  let shareableLink = `${window.location.origin}/profissional.html?id=${profissionalSelecionado.replace(/\s+/g, '-')}`;

  try {
    const sessionId = `prof_data_${Date.now()}`;
    localStorage.setItem(sessionId, jsonString);
    shareableLink = `${window.location.origin}/profissional.html?id=${sessionId}`;
  } catch (e) {
    console.warn("LocalStorage cheio ou indisponível, usando hash para link compartilhável.", e);
    shareableLink = `${window.location.origin}/profissional.html#data=${encodedData}`;
  }
  
  return shareableLink;
}

function copiarLink() {
  const linkInput = document.getElementById("linkCompartilhavelInput");
  linkInput.select();
  linkInput.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert("Link copiado para a área de transferência!");
}

function sortData(type) {
  const typeMap = {
    'individuos': 'individuos',
    'domicilios': 'domicilios',
    'desaparecidosInd': 'desaparecidosInd',
    'desaparecidosDom': 'desaparecidosDom'
  };
  
  const stateKey = typeMap[type];
  if (!stateKey) {
    console.warn(`Tipo de ordenação desconhecido: ${type}`);
    return;
  }

  const state = sortState[stateKey];
  
  let data;
  switch(type) {
    case 'individuos': data = dadosIndividuos; break;
    case 'domicilios': data = dadosDomicilios; break;
    case 'desaparecidosInd': data = dadosDesaparecidosIndividuos; break;
    case 'desaparecidosDom': data = dadosDesaparecidosDomicilios; break;
    default: return;
  }
  
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
  const accordionContainer = header.closest('.accordion-container');
  if (!accordionContainer) return;

  let tableType;
  switch(accordionContainer.id) {
    case 'accordionIndividuosContainer': tableType = 'individuos'; break;
    case 'accordionDomiciliosContainer': tableType = 'domicilios'; break;
    case 'accordionIndividuosDesaparecidosContainer': tableType = 'desaparecidosInd'; break;
    case 'accordionDomiciliosDesaparecidosContainer': tableType = 'desaparecidosDom'; break;
    default: return;
  }
  
  const state = sortState[tableType];

  if (state.key === sortKey) {
    state.order = state.order === 'asc' ? 'desc' : 'asc';
  } else {
    state.key = sortKey;
    state.dataType = dataType;
    state.order = (dataType === 'numeric' || dataType === 'date') ? 'desc' : 'asc';
  }
  
  sortData(tableType);
  aplicarFiltros();
}

function popularTabelaIndividuos(dados) {
  const container = document.getElementById('accordionIndividuosContainer');
  container.innerHTML = '';
  
  const dadosParaExibir = dados.filter(item => 
    showAllIndividuos || 
    String(item.microArea).padStart(2,'0') === '00' || 
    item._monthsSince > CRITICAL_MONTHS_THRESHOLD
  );

  if (!dadosParaExibir.length) {
    container.innerHTML = `<em>${showAllIndividuos ? 'Nenhum indivíduo para exibir.' : 'Nenhum cadastro crítico encontrado.'}</em>`;
    return;
  }
  
  const headers = `
    <th data-sort="nome" data-type="string">Nome</th>
    <th data-sort="cpf" data-type="string">CPF</th>
    <th data-sort="sus" data-type="string">SUS</th>
    <th data-sort="dataNascimento" data-type="date">Data de Nascimento</th>
    <th data-sort="microArea" data-type="string">Micro Área</th>
    <th data-sort="ultimaAtualizacao" data-type="date">Última Atualização</th>
    <th data-sort="tempoSemAtualizar" data-type="string">Tempo Sem Atualizar</th>
    <th data-sort="mesesSemAtualizar" data-type="numeric">Meses Sem Atualizar ⇅</th>
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
      const category = bucketCategory(item.tempoSemAtualizar || item.dataAtualizacaoFormatada, item._monthsSince);
      let rowClass = BUCKET_CLASSES[category] || '';
      if(String(item.microArea).padStart(2, '0') === '00') {
        rowClass = 'micro-area-00';
      }

      return `<tr class="${rowClass}" data-category="${category}">
        <td><a href="#" data-profissional="${item.acs}" class="profissional-link">${item.nome || ''}</a></td>
        <td>${item.cpf || ''}</td><td>${item.sus || ''}</td><td>${item.dataNascimentoFormatada || ''}</td>
        <td>${item.microArea || ''}</td><td>${item.dataAtualizacaoFormatada || ''}</td>
        <td>${item.tempoSemAtualizar || ''}</td>
        <td>${item.mesesSemAtualizar || ''}</td>
        </tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="accordion-item"><div class="accordion-header"><h3>${profissional}</h3><div class="info"><span class="unidade-info">${unidade}</span><span class="count">${individuos.length}</span></div></div>
      <div class="accordion-content"><div id="accordionIndividuosContent" class="accordion-content-grid">
          <div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div>
          <div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
      </div></div></div>`);
  });
  
  container.addEventListener('click', handleAccordionClick);
}

function popularTabelaDomicilios(dados) {
  const container = document.getElementById('accordionDomiciliosContainer');
  container.innerHTML = '';

  const dadosParaExibir = dados.filter(item => 
    showAllDomicilios || 
    String(item.microArea).padStart(2,'0') === '00' || 
    item._monthsSince > CRITICAL_MONTHS_THRESHOLD
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
    <th data-sort="dataCadastro" data-type="date">Data Cadastro</th>
    <th data-sort="ultimaAtualizacao" data-type="date">Última Atualização</th>
    <th data-sort="mesesSemAtualizar" data-type="numeric">Meses Sem Atualizar ⇅</th>
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
       const category = bucketCategory(item.tempoSemAtualizar || item.dataAtualizacaoFormatada, item._monthsSince);
       let rowClass = BUCKET_CLASSES[category] || '';
       if(String(item.microArea).padStart(2, '0') === '00') {
         rowClass = 'micro-area-00';
       }

      return `<tr class="${rowClass}" data-category="${category}">
        <td>${item.endereco||''}</td><td>${item.numero||''}</td><td>${item.bairro||''}</td><td>${item.responsavel||''}</td>
        <td>${item.microArea||''}</td><td>${item.dataCadastroFormatada || ''}</td>
        <td>${item.dataAtualizacaoFormatada || ''}</td>
        <td>${item.mesesSemAtualizar ?? 'N/A'}</td></tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="accordion-item"><div class="accordion-header"><h3>${profissional}</h3><div class="info"><span class="unidade-info">${unidade}</span><span class="count">${domicilios.length}</span></div></div>
      <div class="accordion-content"><div id="accordionDomiciliosContent" class="accordion-content-grid">
          <div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div>
          <div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
      </div></div></div>`);
  });
  
  container.addEventListener('click', handleAccordionClick);
}

function popularTabelaIndividuosDesaparecidos(dados) {
  const container = document.getElementById('accordionIndividuosDesaparecidosContainer');
  container.innerHTML = '';
  
  const dadosParaExibir = dados;

  if (!dadosParaExibir.length) {
    container.innerHTML = `<em>Nenhum indivíduo desaparecido encontrado (ou filtrado).</em>`;
    return;
  }
  
  const headers = `
    <th data-sort="nome" data-type="string">Nome</th>
    <th data-sort="cpf" data-type="string">CPF</th>
    <th data-sort="sus" data-type="string">SUS</th>
    <th data-sort="dataNascimento" data-type="date">Data de Nascimento</th>
    <th data-sort="microArea" data-type="string">Micro Área</th>
    <th data-sort="ultimaAtualizacao" data-type="date">Última Atualização</th>
    <th data-sort="tempoSemAtualizar" data-type="string">Tempo Sem Atualizar</th>
    <th data-sort="mesesSemAtualizar" data-type="numeric">Meses Sem Atualizar ⇅</th>
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
    const chartId = `chart-ind-desaparecido-${norm(profissional)}`;
    
    const rowsHtml = individuos.map(item => {
      const rowClass = 'cat-desaparecido';

      return `<tr class="${rowClass}">
        <td><a href="#" data-profissional="${item.acs}" class="profissional-link">${item.nome || ''}</a></td>
        <td>${item.cpf || ''}</td><td>${item.sus || ''}</td><td>${item.dataNascimentoFormatada || ''}</td>
        <td>${item.microArea || ''}</td><td>${item.dataAtualizacaoFormatada || ''}</td>
        <td>${item.tempoSemAtualizar || ''}</td>
        <td>${item.mesesSemAtualizar || ''}</td>
        </tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="accordion-item"><div class="accordion-header"><h3>${profissional}</h3><div class="info"><span class="unidade-info">${unidade}</span><span class="count">${individuos.length}</span></div></div>
      <div class="accordion-content"><div id="accordionIndividuosContent" class="accordion-content-grid">
          <div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div>
          <div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
      </div></div></div>`);
  });
  
  container.addEventListener('click', handleAccordionClick);
}

function popularTabelaDomiciliosDesaparecidos(dados) {
  const container = document.getElementById('accordionDomiciliosDesaparecidosContainer');
  container.innerHTML = '';

  const dadosParaExibir = dados;

  if (!dadosParaExibir.length) {
    container.innerHTML = `<em>Nenhum domicílio desaparecido encontrado (ou filtrado).</em>`;
    return;
  }

  const headers = `
    <th data-sort="endereco" data-type="string">Logradouro</th>
    <th data-sort="numero" data-type="string">Nº</th>
    <th data-sort="bairro" data-type="string">Bairro</th>
    <th data-sort="responsavel" data-type="string">Responsável</th>
    <th data-sort="microArea" data-type="string">Micro Área</th>
    <th data-sort="dataCadastro" data-type="date">Data Cadastro</th>
    <th data-sort="ultimaAtualizacao" data-type="date">Última Atualização</th>
    <th data-sort="mesesSemAtualizar" data-type="numeric">Meses Sem Atualizar ⇅</th>
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
    const chartId = `chart-dom-desaparecido-${norm(profissional)}`;
    
    const rowsHtml = domicilios.map(item => {
       const rowClass = 'cat-desaparecido';

      return `<tr class="${rowClass}">
        <td>${item.endereco||''}</td><td>${item.numero||''}</td><td>${item.bairro||''}</td><td>${item.responsavel||''}</td>
        <td>${item.microArea||''}</td><td>${item.dataCadastroFormatada || ''}</td>
        <td>${item.dataAtualizacaoFormatada || ''}</td>
        <td>${item.mesesSemAtualizar ?? 'N/A'}</td></tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="accordion-item"><div class="accordion-header"><h3>${profissional}</h3><div class="info"><span class="unidade-info">${unidade}</span><span class="count">${domicilios.length}</span></div></div>
      <div class="accordion-content"><div id="accordionDomiciliosContent" class="accordion-content-grid">
          <div class="accordion-chart-container"><canvas id="${chartId}"></canvas></div>
          <div class="table-container"><table><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
      </div></div></div>`);
  });
  
  container.addEventListener('click', handleAccordionClick);
}

function gerarRelatorioPorUnidadeInd(dados) {
  const container = document.getElementById('relatorioContainerInd');
  container.innerHTML = '';
  if (!dados.length) {
    container.innerHTML = `<div class="rel-card"><em>Nenhum indivíduo para exibir.</em></div>`;
    return;
  }

  const countsByUnit = new Map();
  dados.forEach(item => {
    const unit = item.estabelecimento || '(Sem Unidade)';
    countsByUnit.set(unit, (countsByUnit.get(unit) || 0) + 1);
  });

  const labels = Array.from(countsByUnit.keys()).sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const individuosData = labels.map(unit => countsByUnit.get(unit));

  container.insertAdjacentHTML('beforeend', `
    <section class="rel-card">
      <h2>Total de Indivíduos por Unidade</h2>
      <div class="chart-container" style="height: 400px;">
        <canvas id="relatorio-unidade-ind-chart"></canvas>
      </div>
    </section>
  `);

  const ctx = document.getElementById('relatorio-unidade-ind-chart').getContext('2d');
  if (unidadeChartInd) unidadeChartInd.destroy();
  unidadeChartInd = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Indivíduos', data: individuosData, backgroundColor: 'rgba(255, 99, 132, 0.7)', borderColor: 'rgb(255, 99, 132)', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Total de Cadastros de Indivíduos' } }
    }
  });

  const BUCKET_ORDER = ['Até 4 meses','5 a 12 meses','13 a 24 meses','Mais de 2 anos'];
  const byUnit = new Map();
  dados.forEach(item => {
    const u = item.estabelecimento || '(Sem Unidade)';
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u).push(item);
  });

  const unitsSorted = Array.from(byUnit.keys()).sort((a,b)=>a.localeCompare(b,'pt-BR'));

  unitsSorted.forEach(un => {
    const individuos = byUnit.get(un);
    const bucketsInd = Object.fromEntries(BUCKET_ORDER.map(k => [k, 0]));
    individuos.forEach(it => {
      const cat = bucketCategory(it.tempoSemAtualizar || it.dataAtualizacaoFormatada, it._monthsSince);
      if (bucketsInd[cat] !== undefined) bucketsInd[cat]++;
    });

    container.insertAdjacentHTML('beforeend', `
      <section class="rel-card">
        <h3>Unidade: <a href="#" data-unidade="${un}">${un}</a> (Indivíduos)</h3>
        <div class="rel-card-content">
          <div class="chart-container-half">
            <canvas id="chart-unidade-ind-${norm(un)}"></canvas>
          </div>
        </div>
      </section>
    `);

    (function(){
      const indCanvas = document.getElementById(`chart-unidade-ind-${norm(un)}`);
      if(indCanvas){
        const chartId = `chart-unidade-ind-${norm(un)}`;
        const ex1 = window.unitCharts[chartId];
        if (ex1) { try { ex1.destroy(); } catch(e){} }
        const ctx1 = indCanvas.getContext('2d');
        const labels1 = BUCKET_ORDER;
        const data1 = labels1.map(l => bucketsInd[l] || 0);
        window.unitCharts[chartId] = new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: labels1,
            datasets: [{
              label: 'Indivíduos',
              data: data1,
              backgroundColor: labels1.map(l => BUCKET_COLORS[l]),
              borderColor: labels1.map(l => BUCKET_BORDERS[l]),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: { legend: { display: true }, title: { display: true, text: 'Indivíduos — Período de Atualização' } }
          }
        });
      }
    })();
  });
}

function gerarRelatorioPorUnidadeDom(dados) {
  const container = document.getElementById('relatorioContainerDom');
  container.innerHTML = '';
  if (!dados.length) {
    container.innerHTML = `<div class="rel-card"><em>Nenhum domicílio para exibir.</em></div>`;
    return;
  }

  const countsByUnit = new Map();
  dados.forEach(item => {
    const unit = item.estabelecimento || '(Sem Unidade)';
    countsByUnit.set(unit, (countsByUnit.get(unit) || 0) + 1);
  });

  const labels = Array.from(countsByUnit.keys()).sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const domiciliosData = labels.map(unit => countsByUnit.get(unit));

  container.insertAdjacentHTML('beforeend', `
    <section class="rel-card">
      <h2>Total de Domicílios por Unidade</h2>
      <div class="chart-container" style="height: 400px;">
        <canvas id="relatorio-unidade-dom-chart"></canvas>
      </div>
    </section>
  `);

  const ctx = document.getElementById('relatorio-unidade-dom-chart').getContext('2d');
  if (unidadeChartDom) unidadeChartDom.destroy();
  unidadeChartDom = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Domicílios', data: domiciliosData, backgroundColor: 'rgba(54, 162, 235, 0.7)',  borderColor: 'rgb(54, 162, 235)',  borderWidth: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Total de Cadastros de Domicílios' } }
    }
  });

  const BUCKET_ORDER = ['Até 4 meses','5 a 12 meses','13 a 24 meses','Mais de 2 anos'];
  const byUnit = new Map();
  dados.forEach(item => {
    const u = item.estabelecimento || '(Sem Unidade)';
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u).push(item);
  });

  const unitsSorted = Array.from(byUnit.keys()).sort((a,b)=>a.localeCompare(b,'pt-BR'));

  unitsSorted.forEach(un => {
    const domicilios = byUnit.get(un);
    const bucketsDom = Object.fromEntries(BUCKET_ORDER.map(k => [k, 0]));
    domicilios.forEach(it => {
      const cat = bucketCategory(it.tempoSemAtualizar || it.dataAtualizacaoFormatada, it._monthsSince);
      if (bucketsDom[cat] !== undefined) bucketsDom[cat]++;
    });

    container.insertAdjacentHTML('beforeend', `
      <section class="rel-card">
        <h3>Unidade: <a href="#" data-unidade="${un}">${un}</a> (Domicílios)</h3>
        <div class="rel-card-content">
          <div class="chart-container-half">
            <canvas id="chart-unidade-dom-${norm(un)}"></canvas>
          </div>
        </div>
      </section>
    `);

    (function(){
      const domCanvas = document.getElementById(`chart-unidade-dom-${norm(un)}`);
      if(domCanvas){
        const chartId = `chart-unidade-dom-${norm(un)}`;
        const ex2 = window.unitCharts[chartId];
        if (ex2) { try { ex2.destroy(); } catch(e){} }
        const ctx2 = domCanvas.getContext('2d');
        const labels2 = BUCKET_ORDER;
        const data2 = labels2.map(l => bucketsDom[l] || 0);
        window.unitCharts[chartId] = new Chart(ctx2, {
          type: 'bar',
          data: {
            labels: labels2,
            datasets: [{
              label: 'Domicílios',
              data: data2,
              backgroundColor: labels2.map(l => BUCKET_COLORS[l]),
              borderColor: labels2.map(l => BUCKET_BORDERS[l]),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: { legend: { display: true }, title: { display: true, text: 'Domicílios — Período de Atualização' } }
          }
        });
      }
    })();
  });
}


function handleAccordionClick(e) {
    const header = e.target.closest('.accordion-header');
    if (header) {
      const item = header.parentElement;
      const wasActive = item.classList.contains('active');
      
      if (!wasActive) {
          const canvas = item.querySelector('canvas');
          if (canvas && !activeAccordionCharts[canvas.id]) {
              const container = item.closest('.accordion-container');
              
              let dados;
              if (container.id === 'accordionIndividuosContainer') {
                  dados = dadosIndividuos;
              } else if (container.id === 'accordionDomiciliosContainer') {
                  dados = dadosDomicilios;
              } else if (container.id === 'accordionIndividuosDesaparecidosContainer') {
                  dados = dadosDesaparecidosIndividuos;
              } else if (container.id === 'accordionDomiciliosDesaparecidosContainer') {
                  dados = dadosDesaparecidosDomicilios;
              } else {
                  return;
              }

              const profissional = header.querySelector('h3').textContent;
              const profData = dados.filter(d => (d.profissionalCadastrante || d.acs || '(Sem Profissional)') === profissional);
              
              const bucketCounts = { 'Até 4 meses':0, '5 a 12 meses':0, '13 a 24 meses':0, 'Mais de 2 anos':0 };
              profData.forEach(d => bucketCounts[bucketCategory(d.tempoSemAtualizar || d.dataAtualizacaoFormatada, d._monthsSince)]++);
              
              if (container.id.includes('Desaparecidos')) {
                 const chartContainer = canvas.closest('.accordion-chart-container');
                 if(chartContainer) chartContainer.style.display = 'none';
              } else {
                renderAccordionChart(canvas.id, bucketCounts);
              }
          }
      }
      
      item.parentElement.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
      if (!wasActive) {
        item.classList.add('active');
      }
    }
    const link = e.target.closest('.profissional-link');
    if (link) {
      e.preventDefault();
      const prof = link.dataset.profissional;
      if (prof) {
        document.getElementById('filterProfissional').value = prof;
        aplicarFiltros();
        switchTab('detalhesProfissional');
        exibirDetalhesProfissional(prof);
      }
    }
}

function pesquisarAccordion(containerId, term) {
  const items = document.querySelectorAll(`#${containerId} .accordion-item`);
  const q = (term || '').toLowerCase();
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
}

function bucket(months){
  if(!Number.isFinite(months)) return 'Mais de 2 anos';
  if(months <= 4) return 'Até 4 meses';
  if(months <= 12) return '5 a 12 meses';
  if(months <= 24) return '13 a 24 meses';
  return 'Mais de 2 anos';
}
function bucketCategory(rawText, months) {
  const s = String(rawText || '').toLowerCase();
  if (/\bmais\s*de\s*2\s*ano/.test(s) || />\s*2\s*ano/.test(s) || /\b2\+\s*ano/.test(s)) {
    return 'Mais de 2 anos';
  }
  return bucket(months);
}


function renderAccordionChart(canvasId, bucketData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if(activeAccordionCharts[canvasId]) activeAccordionCharts[canvasId].destroy();

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
            const tbody = accordionItem.querySelector('tbody');
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

function gerarRelatorioPorProfissionalInd(dadosInd){
  const cont = document.getElementById('relatorioProfissionalContainerInd'); 
  cont.innerHTML = ''; 
  const byProf = new Map();
  
  dadosInd.forEach(r => { 
    const p = r.acs || '(Sem ACS)';
    const u = r.estabelecimento || '(Sem unidade)'; 
    if(!byProf.has(p)) byProf.set(p, { unidade: u, totalIndividuos: 0 }); 
    byProf.get(p).totalIndividuos++; 
  });
  
  const profissionais = Array.from(byProf.keys()).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if(!profissionais.length){ cont.innerHTML = `<div class="rel-card"><em>Nenhum indivíduo para exibir.</em></div>`; return; }
  
  const rows = profissionais.map(p => { 
    const data = byProf.get(p); 
    return `<tr>
              <td><a href="#" data-profissional="${p}">${p}</a></td>
              <td>${data.unidade}</td>
              <td>${data.totalIndividuos}</td>
            </tr>`; 
  }).join('');
  
  cont.insertAdjacentHTML('beforeend', `
    <section class="rel-card">
      <h2>Relatório de Indivíduos por Profissional</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>ACS</th><th>Unidade</th><th>Total de Indivíduos</th></tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="3"><em>Sem registros.</em></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`);
}

function gerarRelatorioPorProfissionalDom(dadosDom){
  const cont = document.getElementById('relatorioProfissionalContainerDom'); 
  cont.innerHTML = ''; 
  const byProf = new Map();
  
  dadosDom.forEach(r => { 
    const p = r.acs || '(Sem ACS)';
    const u = r.estabelecimento || '(Sem unidade)'; 
    if(!byProf.has(p)) byProf.set(p, { unidade: u, totalDomicilios: 0 }); 
    byProf.get(p).totalDomicilios++; 
  });
  
  const profissionais = Array.from(byProf.keys()).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if(!profissionais.length){ cont.innerHTML = `<div class="rel-card"><em>Nenhum domicílio para exibir.</em></div>`; return; }
  
  const rows = profissionais.map(p => { 
    const data = byProf.get(p); 
    return `<tr>
              <td><a href="#" data-profissional="${p}">${p}</a></td>
              <td>${data.unidade}</td>
              <td>${data.totalDomicilios}</td>
            </tr>`; 
  }).join('');
  
  cont.insertAdjacentHTML('beforeend', `
    <section class="rel-card">
      <h2>Relatório de Domicílios por Profissional</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>ACS</th><th>Unidade</th><th>Total de Domicílios</th></tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="3"><em>Sem registros.</em></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`);
}

function exibirDetalhesProfissional(profissional) {
  const d = document.getElementById('tab-detalhesProfissional'); d.innerHTML = `<h2>Detalhes do Profissional: ${profissional}</h2>`;
  const dadosProfissional = dadosIndividuos.filter(ind => ind.acs === profissional); 
  const dadosDomiciliosProfissional = dadosDomicilios.filter(dom => dom.acs === profissional);
  const u = dadosProfissional[0]?.estabelecimento || dadosDomiciliosProfissional[0]?.estabelecimento || 'N/I'; d.insertAdjacentHTML('beforeend', `<h3>Unidade: ${u}</h3>`);
  
  const histInd = {}; 
  dadosProfissional.forEach(ind => { 
    if (ind.ultimaAtualizacao) { 
      const date = new Date(ind.ultimaAtualizacao);
      const mesAno = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      histInd[mesAno] = (histInd[mesAno] || 0) + 1; 
    }
  });
  const labelsInd = Object.keys(histInd).sort(); 
  const dataInd = labelsInd.map(mesAno => histInd[mesAno]);
  d.insertAdjacentHTML('beforeend', `<div class="chart-container"><h3>Evolução de Cadastros (Indivíduos)</h3><canvas id="profissionalChartCanvasInd"></canvas></div>`);
  const ctxInd = document.getElementById('profissionalChartCanvasInd').getContext('2d'); 
  if (profissionalChart) profissionalChart.destroy();
  profissionalChart = new Chart(ctxInd, { 
    type: 'line', 
    data: { labels: labelsInd, datasets: [{ label: 'Indivíduos Atualizados', data: dataInd, borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] }, 
    options: { responsive: true, maintainAspectRatio: false } 
  });

  const histDom = {}; 
  dadosDomiciliosProfissional.forEach(dom => { 
    if (dom.ultimaAtualizacao) { 
      const date = new Date(dom.ultimaAtualizacao);
      const mesAno = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      histDom[mesAno] = (histDom[mesAno] || 0) + 1; 
    }
  });
  const labelsDom = Object.keys(histDom).sort(); 
  const dataDom = labelsDom.map(mesAno => histDom[mesAno]);
  d.insertAdjacentHTML('beforeend', `<div class="chart-container"><h3>Evolução de Cadastros (Domicílios)</h3><canvas id="profissionalChartCanvasDom"></canvas></div>`);
  const ctxDom = document.getElementById('profissionalChartCanvasDom').getContext('2d'); 
  new Chart(ctxDom, { 
    type: 'line', 
    data: { labels: labelsDom, datasets: [{ label: 'Domicílios Atualizados', data: dataDom, borderColor: 'rgb(255, 159, 64)', tension: 0.1 }] }, 
    options: { responsive: true, maintainAspectRatio: false } 
  });

  d.insertAdjacentHTML('beforeend', `<h3>Indivíduos de ${profissional} (${dadosProfissional.length})</h3><div class="table-container"><table id="tableIndividuosProfissional"><thead><tr><th>Nome</th><th>CPF</th><th>Data de Nascimento</th><th>Micro Área</th><th>Última Atualização</th></tr></thead><tbody></tbody></table></div>`);
  const tbodyInd = d.querySelector('#tableIndividuosProfissional tbody'); tbodyInd.innerHTML = ''; dadosProfissional.forEach(item => { tbodyInd.insertAdjacentHTML('beforeend', `<tr><td>${item.nome || ''}</td><td>${item.cpf || ''}</td><td>${item.dataNascimentoFormatada || ''}</td><td>${item.microArea || ''}</td><td>${item.dataAtualizacaoFormatada || ''}</td></tr>`); });
  d.insertAdjacentHTML('beforeend', `<h3>Domicílios de ${profissional} (${dadosDomiciliosProfissional.length})</h3><div class="table-container"><table id="tableDomiciliosProfissional"><thead><tr><th>Logradouro</th><th>Nº</th><th>Bairro</th><th>Micro Área</th><th>Data Cadastro</th><th>Última Atualização</th></tr></thead><tbody></tbody></table></div>`);
  const tbodyDom = d.querySelector('#tableDomiciliosProfissional tbody'); tbodyDom.innerHTML = ''; dadosDomiciliosProfissional.forEach(item => { tbodyDom.insertAdjacentHTML('beforeend', `<tr><td>${item.endereco || ''}</td><td>${item.numero || ''}</td><td>${item.bairro || ''}</td><td>${item.microArea || ''}</td><td>${item.dataCadastroFormatada || ''}</td><td>${item.dataAtualizacaoFormatada || ''}</td></tr>`); });
}
function exibirDetalhesUnidade(unidade) {
  const d = document.getElementById('tab-detalhesUnidade'); d.innerHTML = `<h2>Detalhes da Unidade: ${unidade}</h2>`;
  const dadosIndividuosUnidade = dadosIndividuos.filter(ind => ind.estabelecimento === unidade);
  const dadosDomiciliosUnidade = dadosDomicilios.filter(dom => dom.estabelecimento === unidade);

  const histIndUnidade = {};
  dadosIndividuosUnidade.forEach(ind => {
    if (ind.ultimaAtualizacao) {
      const date = new Date(ind.ultimaAtualizacao);
      const mesAno = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      histIndUnidade[mesAno] = (histIndUnidade[mesAno] || 0) + 1;
    }
  });
  const labelsIndUnidade = Object.keys(histIndUnidade).sort();
  const dataIndUnidade = labelsIndUnidade.map(mesAno => histIndUnidade[mesAno]);
  d.insertAdjacentHTML('beforeend', `<div class="chart-container"><h3>Evolução de Cadastros (Indivíduos)</h3><canvas id="unidadeChartCanvasInd"></canvas></div>`);
  const ctxIndUnidade = document.getElementById('unidadeChartCanvasInd').getContext('2d');
  new Chart(ctxIndUnidade, {
    type: 'line',
    data: { labels: labelsIndUnidade, datasets: [{ label: 'Indivíduos Atualizados', data: dataIndUnidade, borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] },
    options: { responsive: true, maintainAspectRatio: false } 
  });

  const histDomUnidade = {};
  dadosDomiciliosUnidade.forEach(dom => {
    if (dom.ultimaAtualizacao) {
      const date = new Date(dom.ultimaAtualizacao);
      const mesAno = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      histDomUnidade[mesAno] = (histDomUnidade[mesAno] || 0) + 1;
    }
  });
  const labelsDomUnidade = Object.keys(histDomUnidade).sort();
  const dataDomUnidade = labelsDomUnidade.map(mesAno => histDomUnidade[mesAno]);
  d.insertAdjacentHTML('beforeend', `<div class="chart-container"><h3>Evolução de Cadastros (Domicílios)</h3><canvas id="unidadeChartCanvasDom"></canvas></div>`);
  const ctxDomUnidade = document.getElementById('unidadeChartCanvasDom').getContext('2d');
  new Chart(ctxDomUnidade, {
    type: 'line',
    data: { labels: labelsDomUnidade, datasets: [{ label: 'Domicílios Atualizados', data: dataDomUnidade, borderColor: 'rgb(255, 159, 64)', tension: 0.1 }] },
    options: { responsive: true, maintainAspectRatio: false } 
  });

  const profs = new Set(); 
  dadosIndividuosUnidade.forEach(ind => { if (ind.acs) profs.add(ind.acs); });
  dadosDomiciliosUnidade.forEach(dom => { if (dom.acs) profs.add(dom.acs); });

  d.insertAdjacentHTML('beforeend', `<h3>Profissionais da Unidade (${profs.size})</h3><div class="table-container"><table id="tableProfissionaisUnidade"><thead><tr><th>ACS</th><th>Indivíduos</th><th>Domicílios</th></tr></thead><tbody></tbody></table></div>`);
  const tbodyProf = d.querySelector('#tableProfissionaisUnidade tbody'); tbodyProf.innerHTML = '';
  Array.from(profs).sort().forEach(prof => {
    const indCount = dadosIndividuosUnidade.filter(ind => ind.acs === prof).length;
    const domCount = dadosDomiciliosUnidade.filter(dom => dom.acs === prof).length;
    tbodyProf.insertAdjacentHTML('beforeend', `<tr><td><a href="#" data-profissional="${prof}">${prof}</a></td><td>${indCount}</td><td>${domCount}</td></tr>`);
  });

  d.insertAdjacentHTML('beforeend', `<h3>Indivíduos da Unidade (${dadosIndividuosUnidade.length})</h3><div class="table-container"><table id="tableIndividuosUnidade"><thead><tr><th>Nome</th><th>CPF</th><th>Data de Nascimento</th><th>Micro Área</th><th>Última Atualização</th><th>ACS</th></tr></thead><tbody></tbody></table></div>`);
  const tbodyIndUnidade = d.querySelector('#tableIndividuosUnidade tbody'); tbodyIndUnidade.innerHTML = '';
  dadosIndividuosUnidade.forEach(item => {
    tbodyIndUnidade.insertAdjacentHTML('beforeend', `<tr><td>${item.nome || ''}</td><td>${item.cpf || ''}</td><td>${item.dataNascimentoFormatada || ''}</td><td>${item.microArea || ''}</td><td>${item.dataAtualizacaoFormatada || ''}</td><td>${item.acs || ''}</td></tr>`);
  });

  d.insertAdjacentHTML('beforeend', `<h3>Domicílios da Unidade (${dadosDomiciliosUnidade.length})</h3><div class="table-container"><table id="tableDomiciliosUnidade"><thead><tr><th>Logradouro</th><th>Nº</th><th>Bairro</th><th>Micro Área</th><th>Data Cadastro</th><th>Última Atualização</th><th>ACS</th></tr></thead><tbody></tbody></table></div>`);
  const tbodyDomUnidade = d.querySelector('#tableDomiciliosUnidade tbody'); tbodyDomUnidade.innerHTML = '';
  dadosDomiciliosUnidade.forEach(item => {
    tbodyDomUnidade.insertAdjacentHTML('beforeend', `<tr><td>${item.endereco || ''}</td><td>${item.numero || ''}</td><td>${item.bairro || ''}</td><td>${item.microArea || ''}</td><td>${item.dataCadastroFormatada || ''}</td><td>${item.dataAtualizacaoFormatada || ''}</td><td>${item.acs || ''}</td></tr>`);
  });
}

function gerarHistoricoChart() {
  const messageEl = document.getElementById('historicoChartMessage');
  if (!messageEl) return;

  const c_0_4 = document.getElementById('historicoChart_0_4');
  const c_5_12 = document.getElementById('historicoChart_5_12');
  const c_13_24 = document.getElementById('historicoChart_13_24');
  const c_25_plus = document.getElementById('historicoChart_25_plus');
  
  const canvases = [c_0_4, c_5_12, c_13_24, c_25_plus];
  const allCanvasesExist = canvases.every(c => c !== null);

  let historico = [];
  
  // --- LÓGICA DE CARREGAMENTO DO HISTÓRICO ---
  // Tenta carregar a chave específica do município se disponível
  // Se não, tenta carregar a chave padrão (legado ou geral)
  const storageKey = currentMunicipality 
    ? `cadastroHistorico_${norm(currentMunicipality)}` 
    : 'cadastroHistorico';
  
  try {
    historico = JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch (e) {
    console.error("Falha ao ler histórico do localStorage:", e);
    historico = [];
  }

  Object.values(historicoCharts).forEach(chart => {
      try { chart.destroy(); } catch(e) {}
  });
  historicoCharts = {};

  if (!allCanvasesExist) {
    messageEl.textContent = "Erro: Elementos do gráfico não foram encontrados.";
    return;
  }

  if (historico.length === 0) {
    messageEl.textContent = currentMunicipality 
      ? `Nenhum histórico encontrado para ${currentMunicipality}. Importe e processe os arquivos para gerar.` 
      : "Nenhum histórico geral encontrado. Importe e processe os arquivos.";
    canvases.forEach(c => c.style.display = 'none');
    return;
  }

  messageEl.textContent = "";
  canvases.forEach(c => c.style.display = 'block');

  const labels = historico.map(snapshot => {
    try {
      return new Date(snapshot.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (e) {
      return 'Data Inválida';
    }
  });

  const datasets = {
    'Até 4 meses': {
      label: 'Até 4 meses',
      data: historico.map(s => s.counts['Até 4 meses']),
      borderColor: BUCKET_BORDERS['Até 4 meses'],
      backgroundColor: BUCKET_COLORS['Até 4 meses'],
      fill: false,
      tension: 0.1
    },
    '5 a 12 meses': {
      label: '5 a 12 meses',
      data: historico.map(s => s.counts['5 a 12 meses']),
      borderColor: BUCKET_BORDERS['5 a 12 meses'],
      backgroundColor: BUCKET_COLORS['5 a 12 meses'],
      fill: false,
      tension: 0.1
    },
    '13 a 24 meses': {
      label: '13 a 24 meses',
      data: historico.map(s => s.counts['13 a 24 meses']),
      borderColor: BUCKET_BORDERS['13 a 24 meses'],
      backgroundColor: BUCKET_COLORS['13 a 24 meses'],
      fill: false,
      tension: 0.1
    },
    'Mais de 2 anos': {
      label: 'Mais de 2 anos',
      data: historico.map(s => s.counts['Mais de 2 anos']),
      borderColor: BUCKET_BORDERS['Mais de 2 anos'],
      backgroundColor: BUCKET_COLORS['Mais de 2 anos'],
      fill: false,
      tension: 0.1
    }
  };

  const createChart = (canvas, dataset, title) => {
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      return new Chart(ctx, {
          type: 'line',
          data: {
              labels: labels,
              datasets: [dataset]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                  y: { 
                      beginAtZero: true, 
                      title: { display: true, text: 'Nº de Cadastros' }, 
                      ticks: { precision: 0 } 
                  },
                  x: { 
                      title: { display: false, text: 'Data do Processamento' } 
                  }
              },
              plugins: {
                  legend: { display: false },
                  title: {
                      display: true,
                      text: `${title} (${currentMunicipality || 'Geral'})`
                  }
              }
          }
      });
  };

  historicoCharts['chart_0_4'] = createChart(c_0_4, datasets['Até 4 meses'], 'Até 4 meses');
  historicoCharts['chart_5_12'] = createChart(c_5_12, datasets['5 a 12 meses'], '5 a 12 meses');
  historicoCharts['chart_13_24'] = createChart(c_13_24, datasets['13 a 24 meses'], '13 a 24 meses');
  historicoCharts['chart_25_plus'] = createChart(c_25_plus, datasets['Mais de 2 anos'], 'Mais de 2 anos');
}


// ===== (NOVA ADIÇÃO) Função para Salvar Snapshot Atual =====
/**
 * Pega os dados atuais, comprime com pako e força o download.
 */
function salvarSnapshot() {
  if (typeof pako === 'undefined') {
    alert("Erro: A biblioteca de compressão (Pako.js) não foi encontrada. Não é possível salvar o snapshot.");
    return;
  }
  
  if (dadosIndividuos.length === 0 && dadosDomicilios.length === 0) {
    alert("Não há dados processados para salvar.");
    return;
  }

  const btn = document.getElementById('btnSalvarSnapshot');
  btn.disabled = true;
  btn.textContent = 'Comprimindo...';

  try {
    const snapshotData = {
      individuos: dadosIndividuos,
      domicilios: dadosDomicilios
    };
    
    const jsonString = JSON.stringify(snapshotData);
    // Comprime os dados
    const compressedData = pako.deflate(jsonString); // Retorna um Uint8Array
    
    // Cria um Blob com os dados comprimidos
    const blob = new Blob([compressedData], { type: 'application/gzip' });
    
    // Cria um link de download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snapshot.json.gz'; // O nome do arquivo que o usuário baixará
    document.body.appendChild(a);
    a.click();
    
    // Limpa
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Snapshot salvo com sucesso. Tamanho original: ${jsonString.length}, Comprimido: ${blob.size}`);
    
  } catch (e) {
    console.error("Erro ao salvar o snapshot:", e);
    alert("Ocorreu um erro ao salvar o snapshot: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5-5m0 0L7 8m5-5v12"/></svg> Salvar Snapshot Atual (Download)';
  }
}


// ===== Inicialização =====
document.addEventListener('DOMContentLoaded', () => {

  const btnProc = document.getElementById('btnProcessarDados');
  if (btnProc) {
    btnProc.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        if (typeof processarDados === 'function') processarDados();
        else console.warn('Função processarDados não encontrada.');
      } catch(err){ console.error('Erro ao processar dados manualmente:', err); }
    });
  }

  (function(){
    const btn = document.getElementById('btnImportarPlanilhas');
    const input = document.getElementById('fileInputCombined');
    const out = document.getElementById('fileNameCombined');
    if (!btn || !input) return;
    btn.addEventListener('click', (e) => { e.preventDefault(); input.click(); });
    
    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      let nomes = [];
      
      // Reset variáveis
      arquivoDomicilios = null;
      arquivoIndividuos = null;
      
      files.forEach(f => {
        const name = (f.name||'').toLowerCase();
        const isDom = /domic|dom[ií]cil/.test(name);
        try {
          if (isDom) { arquivoDomicilios = f; window.arquivoDomicilios = f; }
          else { arquivoIndividuos = f; window.arquivoIndividuos = f; }
          
          // Tenta detectar município imediatamente para atualizar o gráfico
          const info = extractInfoFromFilename(f.name);
          if (info.municipality) {
            currentMunicipality = info.municipality;
          }
        } catch(_) {}
        nomes.push(f.name);
      });
      
      if (out) out.textContent = nomes.join(' • ');
      
      // Atualiza gráfico de histórico imediatamente se detectou município
      if (currentMunicipality) {
         gerarHistoricoChart();
      }
      
      try { if (typeof processarDados === 'function') processarDados(); } catch (err) { console.error('Erro ao processar dados após importação:', err); }
    });
  })();

  // Listeners individuais
  const handleFileSelect = (type) => (e) => {
    const file = e.target.files[0];
    if (type === 'individuos') {
      arquivoIndividuos = file;
      document.getElementById('fileNameIndividuos').textContent = file ? file.name : '';
    } else {
      arquivoDomicilios = file;
      document.getElementById('fileNameDomicilios').textContent = file ? file.name : '';
    }
    
    // Atualiza gráfico imediatamente se possível
    if (file) {
      const info = extractInfoFromFilename(file.name);
      if (info.municipality) {
        currentMunicipality = info.municipality;
        gerarHistoricoChart();
      }
    }
  };

  document.getElementById('fileInputIndividuos').addEventListener('change', handleFileSelect('individuos'));
  document.getElementById('fileInputDomicilios').addEventListener('change', handleFileSelect('domicilios'));
  
  // (NOVA ADIÇÃO) Listener para carregar o snapshot
  document.getElementById('fileInputSnapshot').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const span = document.getElementById('fileNameSnapshot');
    if (!file) {
      span.textContent = 'Nenhum snapshot carregado.';
      dadosAnteriores = { individuos: [], domicilios: [] }; // Limpa se o usuário cancelar
      return;
    }
    
    if (typeof pako === 'undefined') {
      alert("Erro: A biblioteca de compressão (Pako.js) não foi encontrada. Não é possível carregar o snapshot.");
      span.textContent = 'Erro ao carregar Pako.js';
      return;
    }
    
    span.textContent = `Carregando ${file.name}...`;
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const compressedData = new Uint8Array(e.target.result);
        // Descomprime os dados
        const jsonString = pako.inflate(compressedData, { to: 'string' });
        const parsedSnapshot = JSON.parse(jsonString);
        
        if (parsedSnapshot && parsedSnapshot.individuos && parsedSnapshot.domicilios) {
          dadosAnteriores = parsedSnapshot;
          span.textContent = `${file.name} carregado (${dadosAnteriores.individuos.length} ind, ${dadosAnteriores.domicilios.length} dom).`;
          console.log("Snapshot anterior carregado e descomprimido com sucesso.");
        } else {
          throw new Error("O arquivo de snapshot não contém os dados esperados.");
        }
      } catch (err) {
        console.error("Erro ao ler ou descomprimir o snapshot:", err);
        alert("O arquivo de snapshot está corrompido ou não é válido. " + err.message);
        span.textContent = 'Arquivo inválido.';
        dadosAnteriores = { individuos: [], domicilios: [] };
      }
    };
    
    reader.onerror = (e) => {
      console.error("Erro ao ler o arquivo:", e);
      alert("Não foi possível ler o arquivo de snapshot.");
      span.textContent = 'Erro na leitura do arquivo.';
    };
    
    // Lê o arquivo como ArrayBuffer, que é o formato que Pako espera
    reader.readAsArrayBuffer(file);
  });
  
  // (NOVA ADIÇÃO) Listener para salvar o snapshot
  document.getElementById('btnSalvarSnapshot').addEventListener('click', salvarSnapshot);

  document.getElementById('btnProcessar').addEventListener('click', processarDados);

  document.getElementById('toggleIndividuosCriticos').addEventListener('click', () => {
    showAllIndividuos = !showAllIndividuos;
    document.getElementById('toggleIndividuosCriticos').textContent = showAllIndividuos ? 'Mostrar Críticos' : 'Mostrar Todos';
    aplicarFiltros();
  });

  document.getElementById('toggleDomiciliosCriticos').addEventListener('click', () => {
    showAllDomicilios = !showAllDomicilios;
    document.getElementById('toggleDomiciliosCriticos').textContent = showAllDomicilios ? 'Mostrar Críticos' : 'Mostrar Todos';
    aplicarFiltros();
  });

  document.getElementById('searchIndividuos').addEventListener('input', (e) => pesquisarAccordion('accordionIndividuosContainer', e.target.value));
  document.getElementById('searchDomicilios').addEventListener('input', (e) => pesquisarAccordion('accordionDomiciliosContainer', e.target.value));

  document.getElementById('searchIndividuosDesaparecidos').addEventListener('input', (e) => pesquisarAccordion('accordionIndividuosDesaparecidosContainer', e.target.value));
  document.getElementById('searchDomiciliosDesaparecidos').addEventListener('input', (e) => pesquisarAccordion('accordionDomiciliosDesaparecidosContainer', e.target.value));

  document.getElementById('accordionIndividuosContainer').addEventListener('click', handleSortClick);
  document.getElementById('accordionDomiciliosContainer').addEventListener('click', handleSortClick);
  document.getElementById('accordionIndividuosDesaparecidosContainer').addEventListener('click', handleSortClick);
  document.getElementById('accordionDomiciliosDesaparecidosContainer').addEventListener('click', handleSortClick);


  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    const tabContent = document.getElementById(`tab-${tabId}`);
    if (tabButton) tabButton.classList.add('active');
    if (tabContent) tabContent.classList.add('active');

    const filterFn = getFilterFunction();

    // Usa sempre as coleções filtradas quando disponíveis (evita refazer filtros desnecessariamente)
    const filtradosInd = (Array.isArray(dadosIndividuosFiltrados) && dadosIndividuosFiltrados.length)
      ? dadosIndividuosFiltrados
      : dadosIndividuos.filter(filterFn);
    const filtradosDom = (Array.isArray(dadosDomiciliosFiltrados) && dadosDomiciliosFiltrados.length)
      ? dadosDomiciliosFiltrados
      : dadosDomicilios.filter(filterFn);

    if (tabId === 'dashboard') {
      gerarDashboard(filtradosInd, filtradosDom);
    } else if (tabId === 'relatorio-unidade-ind') {
      gerarRelatorioPorUnidadeInd(filtradosInd);
    } else if (tabId === 'relatorio-unidade-dom') {
      gerarRelatorioPorUnidadeDom(filtradosDom);
    } else if (tabId === 'relatorio-prof-ind') {
      gerarRelatorioPorProfissionalInd(filtradosInd);
    } else if (tabId === 'relatorio-prof-dom') {
      gerarRelatorioPorProfissionalDom(filtradosDom);
    } else if (tabId === 'historico') {
      gerarHistoricoChart();
    } else if (tabId === 'desaparecidos') {
      // Para os desaparecidos, filtramos diretamente a partir das coleções de desaparecidos
      popularTabelaIndividuosDesaparecidos(dadosDesaparecidosIndividuos.filter(filterFn));
      popularTabelaDomiciliosDesaparecidos(dadosDesaparecidosDomicilios.filter(filterFn));
    }
  }
 
  gerarHistoricoChart();

  window.populateDownloadProfissionalSelect = function() {
    const selectProfissionalDownload = document.getElementById('selectProfissionalDownload');
    const profissionais = new Set();
    dadosIndividuos.forEach(item => { if (item.acs) profissionais.add(item.acs); });
    dadosDomicilios.forEach(item => { if (item.acs) profissionais.add(item.acs); });

    selectProfissionalDownload.innerHTML = `<option value="">Selecione um profissional</option>` + 
      Array.from(profissionais).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(p=>`<option value="${p}">${p}</option>`).join('');
  };
  
});

// ===== Shim: buildPDFContentForProfissional (garantia global) =====
if (typeof window.buildPDFContentForProfissional !== 'function') {
  window.buildPDFContentForProfissional = function buildPDFContentForProfissional(profissional){
    try{
      const pdfContent = document.getElementById('pdfContent');
      if (!pdfContent) return;
      const ind = (Array.isArray(dadosIndividuos) ? dadosIndividuos : []).filter(i => (i.acs || i.profissionalCadastrante) === profissional);
      const dom = (Array.isArray(dadosDomicilios) ? dadosDomicilios : []).filter(d => d.acs === profissional);
      const unidade = (ind[0]?.estabelecimento) || (dom[0]?.estabelecimento) || 'N/I';

      const headInd = '<thead><tr><th>Nome</th><th>CPF</th><th>SUS</th><th>Nasc.</th><th>Micro Área</th><th>Atualização</th><th>Tempo</th><th>Meses</th></tr></thead>';
      const bodyInd = '<tbody>' + ind.map(i => `
        <tr>
          <td>${i.nome || ''}</td>
          <td>${i.cpf || ''}</td>
          <td>${i.sus || ''}</td>
          <td>${i.dataNascimentoFormatada || ''}</td>
          <td>${i.microArea || ''}</td>
          <td>${i.dataAtualizacaoFormatada || ''}</td>
          <td>${i.tempoSemAtualizar || ''}</td>
          <td>${i.mesesSemAtualizar ?? ''}</td>
        </tr>`).join('') + '</tbody>';

      const headDom = '<thead><tr><th>Logradouro</th><th>Nº</th><th>Bairro</th><th>Micro Área</th><th>Responsável</th><th>Cadastro</th><th>Atualização</th><th>Meses</th></tr></thead>';
      const bodyDom = '<tbody>' + dom.map(d => `
        <tr>
          <td>${d.endereco || ''}</td>
          <td>${d.numero || ''}</td>
          <td>${d.bairro || ''}</td>
          <td>${d.microArea || ''}</td>
          <td>${d.responsavel || ''}</td>
          <td>${d.dataCadastroFormatada || ''}</td>
          <td>${d.dataAtualizacaoFormatada || ''}</td>
          <td>${d.mesesSemAtualizar ?? ''}</td>
        </tr>`).join('') + '</tbody>';

      pdfContent.innerHTML = `
        <h1 style="margin:0 0 8px 0;">Relatório Individual — ${profissional}</h1>
        <div style="margin:0 0 16px 0;">Unidade: <strong>${unidade}</strong></div>
        <h2 style="margin:12px 0 6px 0;">Indivíduos</h2>
        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px;">${headInd}${bodyInd}</table>
        <h2 style="margin:16px 0 6px 0;">Domicílios</h2>
        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px;">${headDom}${bodyDom}</table>
      `;
    }catch(e){
      console.error('buildPDFContentForProfissional (shim) falhou:', e);
    }
  };
}

// ====== PDF v3 (jsPDF.html para evitar capturas em branco) ======
async function generatePDFForProfissional_v3(profissional){
  if (!window.jspdf) throw new Error('Bibliotecas de PDF não carregadas.');
  const { jsPDF } = window.jspdf;

  if (typeof window.buildPDFContentForProfissional === 'function') {
    window.buildPDFContentForProfissional(profissional);
  } else {
    throw new Error('buildPDFContentForProfissional indisponível');
  }

  const original = document.getElementById('pdfContent');
  if (!original) throw new Error('pdfContent não encontrado');

  const holder = document.createElement('div');
  holder.style.position='fixed';
  holder.style.left='-9999px';
  holder.style.top='0';
  holder.style.background='#FFFFFF';
  holder.style.padding='24px';
  holder.style.width='794px';
  holder.style.color='#000000';
  holder.style.display='block';
  holder.style.visibility='visible';

  const clone = original.cloneNode(true);
  clone.style.maxWidth='100%';
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try{
    const pdf = new jsPDF('p','pt','a4');
    await pdf.html(clone, {
      x: 0,
      y: 0,
      autoPaging: 'text',
      margin: [20,20,20,20],
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' }
    });
    const safeName = String(profissional).replace(/[^\w\s-]/g,'').replace(/\s+/g,'_') || 'relatorio';
    pdf.save(`Relatorio_${safeName}.pdf`);
  } finally {
    if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
  }
}

(function ensurePDFv3Handler(){
  const btn = document.getElementById('btnDownloadPDF');
  if (!btn) return;
  btn.onclick = async () => {
    const sel = document.getElementById('selectProfissionalDownload');
    const prof = sel && sel.value;
    if (!prof) return;
    const icon = btn.querySelector('svg');
    if (icon) icon.classList.add('loading');
    btn.disabled = true;
    try { await generatePDFForProfissional_v3(prof); }
    catch(err){ console.error(err); alert('Falha ao gerar PDF: ' + (err && err.message ? err.message : err)); }
    finally { if (icon) icon.classList.remove('loading'); btn.disabled = (sel && sel.value === ''); }
  };
})();

// Lógica para lidar com o link compartilhável ao carregar a página
window.addEventListener('load', () => {
  const hash = window.location.hash;
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  if (sessionId) {
    try {
      const storedData = localStorage.getItem(sessionId);
      if (storedData) {
        const professionalData = JSON.parse(storedData);
        if (professionalData.length > 0 && professionalData[0].acs) {
          const professionalName = professionalData[0].acs;
          activateTab('detalhesProfissional');
          displayProfessionalDetailsFromLink(professionalName, professionalData);
        }
      } else {
        console.error('Sessão não encontrada no localStorage:', sessionId);
        // Não alerta erro imediatamente, pois pode ser uso normal da página
      }
    } catch (e) {
      console.error('Erro ao decodificar ou parsear os dados do link:', e);
    }
  } else if (hash.startsWith('#data=')) {
    const encodedData = hash.substring(6);
    try {
      const decodedData = decodeURIComponent(atob(encodedData));
      const professionalData = JSON.parse(decodedData);
      
      if (professionalData.n) {
        activateTab('detalhesProfissional');
        displayProfessionalDetailsFromLink(professionalData.n, professionalData.d, professionalData.e);
      }
    } catch (e) {
      console.error('Erro ao decodificar ou parsear os dados do link:', e);
    }
  }
});

function displayProfessionalDetailsFromLink(professionalName, data, estabelecimento = 'N/I') {
  const d = document.getElementById('tab-detalhesProfissional');
  d.innerHTML = `<h2>Detalhes do Profissional: ${professionalName}</h2><h3>Unidade: ${estabelecimento}</h3>`;

  const simplifiedIndData = data.filter(item => item.tipo === 'individuo');
  const simplifiedDomData = data.filter(item => item.tipo === 'domicilio');

  if (simplifiedIndData.length > 0) {
    d.insertAdjacentHTML('beforeend', `<h3>Indivíduos de ${professionalName} (${simplifiedIndData.length})</h3><div class="table-container"><table id="tableIndividuosProfissionalLink"><thead><tr><th>Nome</th><th>CPF</th><th>Data de Nascimento</th><th>Micro Área</th><th>Última Atualização</th></tr></thead><tbody></tbody></table></div>`);
    const tbodyInd = d.querySelector('#tableIndividuosProfissionalLink tbody');
    tbodyInd.innerHTML = '';
    simplifiedIndData.forEach(item => {
      tbodyInd.insertAdjacentHTML('beforeend', `<tr><td>${item.nome || ''}</td><td>${item.cpf || ''}</td><td>${toDateBR(item.dataNascimento) || ''}</td><td>${item.microArea || ''}</td><td>${toDateBR(item.ultimaAtualizacao) || ''}</td></tr>`);
    });
  }

  if (simplifiedDomData.length > 0) {
    d.insertAdjacentHTML('beforeend', `<h3>Domicílios de ${professionalName} (${simplifiedDomData.length})</h3><div class="table-container"><table id="tableDomiciliosProfissionalLink"><thead><tr><th>Logradouro</th><th>Nº</th><th>Bairro</th><th>Micro Área</th><th>Data Cadastro</th><th>Última Atualização</th></tr></thead><tbody></tbody></table></div>`);
    const tbodyDom = d.querySelector('#tableDomiciliosProfissionalLink tbody');
    tbodyDom.innerHTML = '';
    simplifiedDomData.forEach(item => {
      tbodyDom.insertAdjacentHTML('beforeend', `<tr><td>${item.endereco || ''}</td><td>${item.numero || ''}</td><td>${item.bairro || ''}</td><td>${item.microArea || ''}</td><td>${toDateBR(item.dataCadastro) || ''}</td><td>${toDateBR(item.ultimaAtualizacao) || ''}</td></tr>`);
    });
  }
}

function activateTab(tabId) {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
    button.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const targetButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  const targetContent = document.getElementById(`tab-${tabId}`);

  if (targetButton && targetContent) {
    targetButton.classList.add('active');
    targetButton.setAttribute('aria-selected', 'true');
    targetContent.classList.add('active');
  }
}

async function generateShareableLinkWrapper() {
  const selectedProfessional = document.getElementById('selectProfissionalDownload').value;
  if (!selectedProfessional) {
    alert('Por favor, selecione um profissional primeiro.');
    return;
  }
  
  const link = await generateShareableLinkCompartilhavel(); // Corrigido nome da função chamada
  if (link) {
    copyToClipboard(link);
  }
}

function copyToClipboard(text) {
  if (!text) return;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showSuccessMessage("✅ Link copiado!\n\nCompartilhe este link com o profissional para que ele visualize seu desempenho.");
    }, (err) => {
      console.error('Erro ao copiar o link: ', err);
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showSuccessMessage("✅ Link copiado!\n\nCompartilhe este link com o profissional.");
    } else {
      showLinkInModal(text);
    }
  } catch (err) {
    console.error('Erro ao copiar o link: ', err);
    showLinkInModal(text);
  }
  
  document.body.removeChild(textArea);
}

function showSuccessMessage(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 350px;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <div style="white-space: pre-line;">${message}</div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showLinkInModal(text) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  `;
  
  content.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">Link Gerado</h3>
    <p style="color: #666;">Copie o link abaixo:</p>
    <textarea readonly style="width: 100%; height: 100px; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 6px; font-family: monospace; font-size: 0.875rem; resize: none;" onclick="this.select()">${text}</textarea>
    <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Fechar</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {

  const selectProfissionalDownload = document.getElementById('selectProfissionalDownload');
  const btnGenerateLink = document.getElementById('btnGenerateLink');
  const btnDownloadPDF = document.getElementById('btnDownloadPDF');

  if (selectProfissionalDownload) {
    selectProfissionalDownload.addEventListener('change', () => {
      const hasValue = selectProfissionalDownload.value !== '';
      
      if (btnGenerateLink) {
        btnGenerateLink.disabled = !hasValue;
      }
      
      if (btnDownloadPDF) {
        btnDownloadPDF.disabled = !hasValue;
      }
    });
  }

  if (btnGenerateLink) {
    btnGenerateLink.addEventListener('click', generateShareableLinkWrapper);
  }
});