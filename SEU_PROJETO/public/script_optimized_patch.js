
/**
 * Patch de performance para importação de planilhas grandes
 * - Otimiza processarArquivo (XLSX com cabeçalhos já normalizados)
 * - Otimiza parseCSVDataIndividuos (reutiliza headerMap)
 * - Otimiza parseCSVDataDomicilios (reutiliza headerMap)
 *
 * Instruções:
 * 1. Mantenha o seu script.js original como está.
 * 2. Inclua este arquivo DEPOIS do script.js no index.html:
 *    <script src="script_optimized_patch.js"></script>
 *
 * Esse patch sobrescreve apenas as funções globais:
 *   - processarArquivo
 *   - parseCSVDataIndividuos
 *   - parseCSVDataDomicilios
 */
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);

  if (!g.norm || !g.parseTempoToMonths || !g.parseDateFlexible || !g.HEADERS || !g.getField) {
    console.warn('[script_optimized_patch] Dependências não encontradas. Certifique-se de carregar script.js antes deste arquivo.');
    return;
  }

  /**
   * Versão otimizada de processarArquivo
   * - CSV: igual à original (já eficiente)
   * - XLSX: monta objetos com chaves já normalizadas (sem duplicar cabeçalhos)
   */
  g.processarArquivo = async function processarArquivo(file, type) {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        const data = e.target.result;

        // CSV
        if (file.name.endsWith('.csv')) {
          Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => g.norm(header),
            complete: (results) => {
              const parsedData = results.data;
              resolve(
                type === 'individuos'
                  ? g.parseCSVDataIndividuos(parsedData)
                  : g.parseCSVDataDomicilios(parsedData)
              );
            },
            error: (err) => reject(err)
          });
          return;
        }

        // XLSX
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          try {
            await g.ensureGlobal('XLSX', g.CDN.XLSX);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!json.length) {
              resolve([]);
              return;
            }

            const headerRow = json[0];
            const dataRows = json.slice(1);

            // Converte cada linha em um objeto cujas chaves já são normalizadas
            const parsedData = dataRows.map(row => {
              const obj = {};
              headerRow.forEach((header, i) => {
                const normHeader = g.norm(header);
                if (!normHeader) return;
                obj[normHeader] = row[i];
              });
              return obj;
            });

            resolve(
              type === 'individuos'
                ? g.parseCSVDataIndividuos(parsedData)
                : g.parseCSVDataDomicilios(parsedData)
            );
          } catch (error) {
            reject(error);
          }
          return;
        }

        // Formato não suportado
        reject(new Error('Formato de arquivo não suportado.'));
      };

      reader.onerror = (error) => reject(error);

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  /**
   * Versão otimizada de parseCSVDataIndividuos
   * - Monta o headerMap UMA vez, usando a primeira linha
   */
  g.parseCSVDataIndividuos = function parseCSVDataIndividuos(data) {
    const out = [];
    const today = new Date();

    if (!Array.isArray(data) || data.length === 0) {
      return out;
    }

    const headerMap = g.buildHeaderMap ? g.buildHeaderMap(data[0]) : (function (row) {
      const map = {};
      Object.keys(row || {}).forEach(k => { map[g.norm(k)] = k; });
      return map;
    })(data[0]);

    for (const r of data) {
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

      if (!(nome || docPessoal)) continue;

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

    return out;
  };

  /**
   * Versão otimizada de parseCSVDataDomicilios
   * - Monta o headerMap UMA vez, usando a primeira linha
   */
  g.parseCSVDataDomicilios = function parseCSVDataDomicilios(data) {
    const out = [];
    const today = new Date();

    if (!Array.isArray(data) || data.length === 0) {
      return out;
    }

    const headerMap = g.buildHeaderMap ? g.buildHeaderMap(data[0]) : (function (row) {
      const map = {};
      Object.keys(row || {}).forEach(k => { map[g.norm(k)] = k; });
      return map;
    })(data[0]);

    for (const r of data) {
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
        dataCadastroFormatada: dataCadastro ? g.toDateBR(dataCadastro) : '',
        ultimaAtualizacao: dataCadastro ? dataCadastro.toISOString() : null,
        dataAtualizacaoFormatada: dataCadastro ? g.toDateBR(dataCadastro) : '',
        tempoSemAtualizar: tempoTxt,
        mesesSemAtualizar: mesesSemAtualizar,
        _monthsSince: monthsSince
      });
    }

    return out;
  };

  console.log('[script_optimized_patch] Funções de importação otimizadas carregadas com sucesso.');
})();
