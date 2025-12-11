// ineParser.js - Responsável por garantir a leitura correta do INE a partir da planilha
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);

  function ensureArray(target, values) {
    if (!Array.isArray(target)) {
      target = [];
    }
    const set = new Set(target.map((v) => (v || '').toString().toLowerCase()));
    for (const v of values) {
      const key = (v || '').toString().toLowerCase();
      if (!set.has(key)) {
        target.push(v);
        set.add(key);
      }
    }
    return target;
  }

  function installInePatch() {
    try {
      if (!g.HEADERS || typeof g.buildHeaderMap !== 'function' || typeof g.getField !== 'function') {
        // ambiente ainda não pronto
        return false;
      }

      // Garante aliases para encontrar a coluna "INE" da planilha.
      // Os cabeçalhos são normalizados para minúsculo por buildHeaderMap,
      // então incluir "ine" aqui já cobre uma coluna escrita como "INE" na planilha.
      const ineAliases = [
        'ine',
        'ine (equipe)',
        'cod ine',
        'cód ine',
        'codigo ine',
        'código ine',
        'ine equipe',
        'codigo da equipe',
        'código da equipe',
        'código equipe',
        'codigo equipe'
      ];
      g.HEADERS.ine = ensureArray(g.HEADERS.ine, ineAliases);

      // Implementação única para leitura de indivíduos (CSV/XLSX) com suporte a INE
      function parseIndividuosComIne(data) {
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

          // Leitura robusta do INE:
          // 1) tenta pelos cabeçalhos configurados em g.HEADERS.ine (via buildHeaderMap/getField)
          // 2) se não encontrar, tenta campos crus da linha, inclusive a coluna "R"
          // 3) por fim, varre todas as chaves do objeto procurando algo cujo cabeçalho normalize para "ine"
          let ineRaw = '';

          if (g.HEADERS.ine) {
            ineRaw = g.getField(r, headerMap, g.HEADERS.ine);
          }

          if (!ineRaw) {
            ineRaw =
              r.INE ??
              r.ine ??
              r.Ine ??
              r.iNE ??
              r.R ??
              r.r ??
              '';
          }

          if (!ineRaw) {
            try {
              for (const key of Object.keys(r)) {
                if (!key) continue;
                const normKey = key
                  .toString()
                  .trim()
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '');
                if (normKey === 'ine') {
                  ineRaw = r[key];
                  break;
                }
              }
            } catch (e) {
              console.warn('Falha ao varrer chaves para INE:', e);
            }
          }

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

          out.push({
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
      }

      // Aplica parser tanto para CSV quanto para XLSX
      g.parseCSVDataIndividuos = parseIndividuosComIne;
      if (typeof g.parseXLSXDataIndividuos === 'function') {
        g.parseXLSXDataIndividuos = parseIndividuosComIne;
      }

      console.info('Patch de INE instalado com sucesso.');
      return true;
    } catch (e) {
      console.error('Falha ao aplicar patch de INE:', e);
      return true; // evita loop infinito de tentativas
    }
  }

  // Tenta instalar imediatamente; se ainda não houver HEADERS, tenta algumas vezes depois.
  if (!installInePatch()) {
    let tentativas = 0;
    const maxTentativas = 20;
    const timer = setInterval(() => {
      tentativas++;
      if (installInePatch() || tentativas >= maxTentativas) {
        clearInterval(timer);
      }
    }, 300);
  }
})();
