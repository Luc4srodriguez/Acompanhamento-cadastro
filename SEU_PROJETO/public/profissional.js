(function(){
  const API_BASE_URL = '/api';
  const CRITICAL_MONTHS_THRESHOLD = 3;

  function escapeHTML(s){
    return String(s ?? '').replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
  }
  function toDateBR(d){
    if(!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  function bucket(months){
    if(!Number.isFinite(months)) return 'Mais de 2 anos';
    if(months <= 4) return 'Até 4 meses';
    if(months <= 12) return '5 a 12 meses';
    if(months <= 24) return '13 a 24 meses';
    return 'Mais de 2 anos';
  }
  function bucketCategory(rawText, months){
    const s = String(rawText || '').toLowerCase();
    if (/\bmais\s*de\s*2\s*ano/.test(s) || />\s*2\s*ano/.test(s) || /\b2\+\s*ano/.test(s)) {
      return 'Mais de 2 anos';
    }
    return bucket(months);
  }
  
  // REMOVIDA A FUNÇÃO decodeBase64Url

  function showError(msg){
    const box = document.getElementById('errorBox');
    box.style.display = 'block';
    box.innerHTML = '<h2>Erro</h2><p>'+escapeHTML(msg)+'</p>';
  }

  function getQP(name){
    const p = new URLSearchParams(location.search);
    return p.get(name);
  }

  async function fetchSession(){
    const id = getQP('id'); // ID AGORA É ESPERADO COMO UUID CRU
    if(!id){ showError('ID ausente na URL.'); return null; }
    
    // ID é tratado como o UUID, que o servidor espera.
    const resp = await fetch(`${API_BASE_URL}/session/${encodeURIComponent(id)}`);
    if(!resp.ok){
      const err = await resp.json().catch(()=>({error:'Falha ao carregar sessão.'}));
      showError(err.error || 'Falha ao carregar sessão.');
      return null;
    }
    return await resp.json();
  }

  function normalizeRows(payload){
    // Aceita {dados: [...]} OU {dados:{individuos,domicilios}}
    let arr = [];
    if(Array.isArray(payload?.dados)){
      arr = payload.dados;
    }else if(payload?.dados && (Array.isArray(payload.dados.individuos) || Array.isArray(payload.dados.domicilios))){
      arr = [].concat(payload.dados.individuos || [], payload.dados.domicilios || []);
    }
    // garante campos mínimos e monthsSince
    const out = arr.map(r => {
      const tipo = r.tipo || (r.endereco ? 'domicilio' : 'individuo');
      const months = Number.isFinite(r._monthsSince) ? r._monthsSince :
        (Number.isFinite(r.mesesSemAtualizar) ? r.mesesSemAtualizar : Infinity);
      return {
        tipo,
        acs: r.acs || '',
        estabelecimento: r.estabelecimento || '',
        nome: r.nome || '',
        cpf: r.cpf || '',
        sus: r.sus || '',
        dataNascimento: r.dataNascimento || null,
        ultimaAtualizacao: r.ultimaAtualizacao || null,
        mesesSemAtualizar: Number.isFinite(r.mesesSemAtualizar) ? r.mesesSemAtualizar : months,
        _monthsSince: months,
        microArea: r.microArea ?? '00',
        endereco: r.endereco || '',
        numero: r.numero || '',
        bairro: r.bairro || '',
        responsavel: r.responsavel || '',
        dataCadastro: r.dataCadastro || null,
        tempoSemAtualizar: r.tempoSemAtualizar || ''
      };
    });
    return out;
  }

  function renderTable(containerId, rows, isIndividuos, showAll){
    const wrap = document.getElementById(containerId);
    wrap.innerHTML = '';

    const filtered = rows.filter(item =>
      showAll ||
      String(item.microArea).padStart(2,'0') === '00' ||
      (Number.isFinite(item._monthsSince) && item._monthsSince >= CRITICAL_MONTHS_THRESHOLD)
    );

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);

    if(isIndividuos){
      thead.innerHTML = '<tr><th>Nome</th><th>CPF</th><th>SUS</th><th>Nascimento</th><th>Micro área</th><th>Últ. Atual.</th><th>Tempo</th><th>Meses</th></tr>';
      const frag = document.createDocumentFragment();
      for(const item of filtered){
        const tr = document.createElement('tr');
        if(String(item.microArea).padStart(2,'0') === '00') tr.className = 'micro-area-00';
        tr.innerHTML = '<td>'+escapeHTML(item.nome)+'</td>' +
                       '<td>'+escapeHTML(item.cpf)+'</td>' +
                       '<td>'+escapeHTML(item.sus)+'</td>' +
                       '<td>'+escapeHTML(toDateBR(item.dataNascimento))+'</td>' +
                       '<td>'+escapeHTML(item.microArea)+'</td>' +
                       '<td>'+escapeHTML(toDateBR(item.ultimaAtualizacao))+'</td>' +
                       '<td>'+escapeHTML(item.tempoSemAtualizar)+'</td>' +
                       '<td>'+escapeHTML(item.mesesSemAtualizar)+'</td>';
        frag.appendChild(tr);
      }
      tbody.appendChild(frag);
    }else{
      thead.innerHTML = '<tr><th>Logradouro</th><th>Nº</th><th>Bairro</th><th>Responsável</th><th>Micro área</th><th>Cadastro</th><th>Meses</th></tr>';
      const frag = document.createDocumentFragment();
      for(const item of filtered){
        const tr = document.createElement('tr');
        if(String(item.microArea).padStart(2,'0') === '00') tr.className = 'micro-area-00';
        tr.innerHTML = '<td>'+escapeHTML(item.endereco)+'</td>' +
                       '<td>'+escapeHTML(item.numero)+'</td>' +
                       '<td>'+escapeHTML(item.bairro)+'</td>' +
                       '<td>'+escapeHTML(item.responsavel)+'</td>' +
                       '<td>'+escapeHTML(item.microArea)+'</td>' +
                       '<td>'+escapeHTML(toDateBR(item.dataCadastro))+'</td>' +
                       '<td>'+escapeHTML(item.mesesSemAtualizar)+'</td>';
        frag.appendChild(tr);
      }
      tbody.appendChild(frag);
    }

    table.className = 'table table-striped';
    wrap.appendChild(table);
  }

  function renderDistChart(canvasId, rows){
    const counts = { 'Até 4 meses':0, '5 a 12 meses':0, '13 a 24 meses':0, 'Mais de 2 anos':0 };
    rows.forEach(r => { counts[bucketCategory(r.tempoSemAtualizar, r._monthsSince)]++; });
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const ctx = document.getElementById(canvasId).getContext('2d');
    if(window[canvasId]) window[canvasId].destroy();
    window[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Qtd', data }] },
      options: { responsive: true, animation: false, scales: { y: { beginAtZero: true } } }
    });
  }

  function tabControls(){
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    }));
  }

  (async function init(){
    tabControls();
    const data = await fetchSession();
    if(!data) return;
    const rows = normalizeRows(data);

    // Infer profissional/unidade do primeiro registro
    const nomeProf = rows.find(r => r.acs)?.acs || 'Profissional';
    const unidade = rows.find(r => r.estabelecimento)?.estabelecimento || '';
    document.getElementById('profTitle').textContent = nomeProf + (unidade ? (' · ' + unidade) : '');

    const individuos = rows.filter(r => r.tipo === 'individuo');
    const domicilios = rows.filter(r => r.tipo === 'domicilio');
    const crit = rows.filter(r => (Number.isFinite(r._monthsSince) && r._monthsSince >= CRITICAL_MONTHS_THRESHOLD));
    const micro00 = rows.filter(r => String(r.microArea).padStart(2,'0') === '00');

    document.getElementById('kpiInd').textContent = individuos.length;
    document.getElementById('kpiDom').textContent = domicilios.length;
    document.getElementById('kpiCrit').textContent = crit.length;
    document.getElementById('kpiM00').textContent = micro00.length;

    let showAllInd = false, showAllDom = false;
    const render = () => {
      renderDistChart('chartInd', individuos);
      renderDistChart('chartDom', domicilios);
      renderTable('tableIndWrapper', individuos, true, showAllInd);
      renderTable('tableDomWrapper', domicilios, false, showAllDom);
    };
    render();

    document.getElementById('btnToggleInd').addEventListener('click', () => {
      showAllInd = !showAllInd;
      document.getElementById('btnToggleInd').textContent = showAllInd ? 'Mostrar críticos' : 'Mostrar todos';
      renderTable('tableIndWrapper', individuos, true, showAllInd);
    });
    document.getElementById('btnToggleDom').addEventListener('click', () => {
      showAllDom = !showAllDom;
      document.getElementById('btnToggleDom').textContent = showAllDom ? 'Mostrar críticos' : 'Mostrar todos';
      renderTable('tableDomWrapper', domicilios, false, showAllDom);
    });
  })();
})();