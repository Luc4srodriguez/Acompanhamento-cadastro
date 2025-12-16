
/**
 * script_import_fast.js
 *
 * Patch agressivo de performance para importação de planilhas grandes.
 *
 * - CSV:
 *   • Usa PapaParse em modo streaming (step + worker:true)
 *   • Não mantém o array completo em memória
 *   • Monta o headerMap apenas UMA vez
 *
 * - XLSX:
 *   • Não duplica cabeçalhos (original + normalizado)
 *   • Constrói objetos enxutos com chaves normalizadas
 *   • Reaproveita headerMap único para todas as linhas
 *
 * Como usar:
 *  1. Mantenha seu script.js ORIGINAL.
 *  2. Coloque este arquivo no mesmo diretório (public/) como script_import_fast.js.
 *  3. No index.html, depois de <script src="script.js"></script>, adicione:
 *
 *     <script src="script_import_fast.js"></script>
 *
 *  4. Recarregue a página e importe as planilhas.
 */
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);

  if (!g.norm || !g.parseTempoToMonths || !g.parseDateFlexible || !g.HEADERS || !g.getField) {
    console.warn('[script_import_fast] Dependências não encontradas. Carregue script.js antes deste arquivo.');
    return;
  }

  // Garante Papa e XLSX se possível
  async function ensurePapa() {
    if (g.Papa) return;
    if (typeof g.ensureGlobal === 'function' && g.CDN && g.CDN.Papa) {
      await g.ensureGlobal('Papa', g.CDN.Papa);
    }
    if (!g.Papa) throw new Error('PapaParse não disponível.');
  }

  async function ensureXLSX() {
    if (g.XLSX) return;
    if (typeof g.ensureGlobal === 'function' && g.CDN && g.CDN.XLSX) {
      await g.ensureGlobal('XLSX', g.CDN.XLSX);
    }
    if (!g.XLSX) throw new Error('XLSX não disponível.');
  }

  function buildHeaderMapLocal(row) {
    if (typeof g.buildHeaderMap === 'function') return g.buildHeaderMap(row);
    const map = {};
    Object.keys(row || {}).forEach(k => { map[g.norm(k)] = k; });
    return map;
  }

  // ===== Helpers: mesma lógica do parseCSVData*, mas linha a linha =====

  function processRowIndividuo(r, headerMap, today, out) {
    const acs = g.getField(r, headerMap, g.HEADERS.acs);
    const estabelecimento = g.getField(r, headerMap, g.HEADERS.estabelecimento);
    const nome = g.getField(r, headerMap, g.HEADERS.ind_nome);
    const cpf = g.getField(r, headerMap, g.HEADERS.ind_cpf);
    const sus = g.getField(r, headerMap, g.HEADERS.ind_sus);
    const docPessoal = g.getField(r, headerMap, g.HEADERS.ind_doc_pessoal) || cpf || sus;
    const microArea = g.getField(r, headerMap, g.HEADERS.dom_micro);

    const dataNascimentoRaw = g.getField(r, headerMap, g.HEADERS.ind_data_nasc);
    const dataNascimento = g.parseDateFlexible(dataNascimentoRaw);

    const ultimaAtualizacaoRaw = g.getField(r, headerMap, g.HEADERS.ind_ultima_atual);
    const ultimaAtualizacao = g.parseDateFlexible(ultimaAtualizacaoRaw);

    const tempoTxt = g.getField(r, headerMap, g.HEADERS.dom_tempo);

    let mesesSemAtualizar = Infinity;
    if (ultimaAtualizacao) {
      const diffTime = Math.abs(today.getTime() - ultimaAtualizacao.getTime());
      mesesSemAtualizar = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    }

    const monthsSince = g.parseTempoToMonths(tempoTxt);

    if (!(nome || docPessoal)) return;

    out.push({
      tipo: 'individuo',
      acs: acs,
      estabelecimento: estabelecimento,
      nome: nome,
      cpf: docPessoal,
      sus: sus,
      dataNascimento: dataNascimento ? dataNascimento.toISOString() : null,
      dataNascimentoFormatada: dataNascimento ? g.toDateBR(dataNascimento) : '',
      ultimaAtualizacao: ultimaAtualizacao ? ultimaAtualizacao.toISOString() : null,
      dataAtualizacaoFormatada: ultimaAtualizacao ? g.toDateBR(ultimaAtualizacao) : '',
      tempoSemAtualizar: tempoTxt,
      mesesSemAtualizar: mesesSemAtualizar,
      _monthsSince: monthsSince,
      microArea: microArea || '00'
    });
  }

  function processRowDomicilio(r, headerMap, today, out) {
    const acs = g.getField(r, headerMap, g.HEADERS.acs);
    const estabelecimento = g.getField(r, headerMap, g.HEADERS.estabelecimento);
    const endereco = g.getField(r, headerMap, g.HEADERS.dom_endereco) || g.getField(r, headerMap, g.HEADERS.dom_domicilio);
    const numero = g.getField(r, headerMap, g.HEADERS.dom_numero);
    const bairro = g.getField(r, headerMap, g.HEADERS.dom_bairro);
    const responsavel = g.getField(r, headerMap, g.HEADERS.dom_resp);
    const identificacao = g.getField(r, headerMap, g.HEADERS.dom_identificacao) || g.getField(r, headerMap, g.HEADERS.dom_domicilio);
    const micro = g.getField(r, headerMap, g.HEADERS.dom_micro);

    const dataCadastroRaw = g.getField(r, headerMap, g.HEADERS.dom_data_cadastro);
    const dataCadastro = g.parseDateFlexible(dataCadastroRaw);

    const tempoTxt = g.getField(r, headerMap, g.HEADERS.dom_tempo);
    const mesesSemAtualizarTxt = g.getField(r, headerMap, g.HEADERS.ind_meses_sem_atualizar);

    let mesesSemAtualizarVal = null;
    if (mesesSemAtualizarTxt) {
      mesesSemAtualizarVal = parseFloat(String(mesesSemAtualizarTxt).replace(',', '.'));
    } else if (dataCadastro) {
      const diffTime = Math.abs(today.getTime() - dataCadastro.getTime());
      mesesSemAtualizarVal = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    }

    const mesesSemAtualizar = mesesSemAtualizarVal !== null && !isNaN(mesesSemAtualizarVal)
      ? mesesSemAtualizarVal
      : Infinity;

    const monthsSince = g.parseTempoToMonths(tempoTxt);

    if (!(endereco || identificacao || responsavel || bairro || numero)) return;

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
      dataCadastroFormatada: dataCadastro ? g.toDateBR(dataCadastro) : '',
      ultimaAtualizacao: dataCadastro ? dataCadastro.toISOString() : null,
      dataAtualizacaoFormatada: dataCadastro ? g.toDateBR(dataCadastro) : '',
      tempoSemAtualizar: tempoTxt,
      mesesSemAtualizar: mesesSemAtualizar,
      _monthsSince: monthsSince
    });
  }

  // ===== Versões otimizadas dos parsers baseadas em array (fallback / compat) =====

  g.parseCSVDataIndividuos = function parseCSVDataIndividuos_fast(data) {
    const out = [];
    const today = new Date();
    if (!Array.isArray(data) || data.length === 0) return out;

    const headerMap = buildHeaderMapLocal(data[0]);
    for (const r of data) {
      processRowIndividuo(r, headerMap, today, out);
    }
    return out;
  };

  g.parseCSVDataDomicilios = function parseCSVDataDomicilios_fast(data) {
    const out = [];
    const today = new Date();
    if (!Array.isArray(data) || data.length === 0) return out;

    const headerMap = buildHeaderMapLocal(data[0]);
    for (const r of data) {
      processRowDomicilio(r, headerMap, today, out);
    }
    return out;
  };

  // ===== NOVA VERSÃO CENTRAL: processarArquivo =====

  g.processarArquivo = async function processarArquivo_fast(file, type) {
    // CSV em streaming
    if (file.name.endsWith('.csv')) {
      await ensurePapa();
      const isIndividuos = (type === 'individuos');
      const today = new Date();
      const out = [];
      let headerMap = null;

      return new Promise((resolve, reject) => {
        g.Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          worker: true,
          transformHeader: (header) => g.norm(header),
          step: (results, parser) => {
            const row = results.data;
            if (!row || (results.errors && results.errors.length && Object.keys(row).length === 1)) {
              return;
            }
            if (!headerMap) {
              headerMap = buildHeaderMapLocal(row);
            }
            if (isIndividuos) {
              processRowIndividuo(row, headerMap, today, out);
            } else {
              processRowDomicilio(row, headerMap, today, out);
            }
          },
          complete: () => {
            resolve(out);
          },
          error: (err) => {
            reject(err);
          }
        });
      });
    }

    // XLSX otimizado (sem duplicar cabeçalhos)
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      await ensureXLSX();
      const today = new Date();
      const isIndividuos = (type === 'individuos');

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target.result;
            const workbook = g.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = g.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!json.length) {
              resolve([]);
              return;
            }

            const headerRow = json[0];
            const dataRows = json.slice(1);
            const normalizedHeaders = headerRow.map(h => g.norm(h));

            const out = [];
            let headerMap = null;

            for (const rowArr of dataRows) {
              const rowObj = {};
              for (let i = 0; i < normalizedHeaders.length; i++) {
                const key = normalizedHeaders[i];
                if (!key) continue;
                rowObj[key] = rowArr[i];
              }
              if (!headerMap) {
                headerMap = buildHeaderMapLocal(rowObj);
              }
              if (isIndividuos) {
                processRowIndividuo(rowObj, headerMap, today, out);
              } else {
                processRowDomicilio(rowObj, headerMap, today, out);
              }
            }

            resolve(out);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
    }

    // Formato não suportado
    throw new Error('Formato de arquivo não suportado.');
  };

  console.log('[script_import_fast] Importação de arquivos otimizada (streaming CSV + XLSX enxuto) carregada.');
})();
