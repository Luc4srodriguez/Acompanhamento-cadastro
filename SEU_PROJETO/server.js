const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const compression = require('compression'); // Otimização 1: Compressão
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipe = promisify(pipeline);
const app = express();
const PORT = 5865;

const SESSIONS_DIR = path.join(__dirname, 'sessoes');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR);
}

// === Otimizações Globais ===
app.use(compression()); // Ativa Gzip (reduz tamanho da resposta em até 90%)
app.use(cors());

// NOTA: Removemos o express.json() global com limite alto para evitar travamentos em uploads gigantes.
// Usaremos streams para lidar com os dados pesados.

// === API Endpoints ===

/**
 * Endpoint OTIMIZADO para CRIAR sessão (Streaming)
 * Recebe o dado como um stream direto da requisição, sem carregar na RAM.
 * Ideal para grandes cargas de dados.
 */
app.post('/api/share', async (req, res) => {
  try {
    // Verifica se tem um ID personalizado nos headers ou query (já que não lemos o body JSON antes)
    const customId = req.query.idPersonalizado || req.headers['x-custom-id'];
    
    let sessionId;
    if (customId) {
        if (!/^[a-zA-Z0-9_-]+$/.test(customId)) {
            return res.status(400).json({ error: 'ID inválido (use apenas letras, números, - e _).' });
        }
        sessionId = customId;
    } else {
        sessionId = crypto.randomUUID();
    }

    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    // Stream de Escrita: Pega o fluxo de dados da internet e joga direto no HD
    const writeStream = fs.createWriteStream(filePath);

    // O 'pipe' conecta a entrada (req) à saída (arquivo) eficientemente
    await pipe(req, writeStream);

    console.log(`Sessão criada (Stream): ${sessionId}`);
    res.status(201).json({ id: sessionId });

  } catch (e) {
    console.error('Erro ao fazer streaming do arquivo:', e);
    res.status(500).json({ error: 'Erro ao salvar dados.' });
  }
});

/**
 * Endpoint OTIMIZADO para LER sessão (Streaming)
 * Lê do disco e envia para a rede em pedaços (chunks).
 */
app.get('/api/session/:id', (req, res) => {
  const sessionId = req.params.id;

  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
     return res.status(400).json({ error: 'ID inválido.' });
  }

  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Sessão não encontrada.' });
  }

  res.setHeader('Content-Type', 'application/json');
  
  // Stream de Leitura: Lê o arquivo em pedacinhos e manda para o usuário
  // Isso permite baixar arquivos de 1GB usando apenas alguns KB de RAM
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
  
  readStream.on('error', (err) => {
    console.error('Erro na leitura:', err);
    res.status(500).end();
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Servidor OTIMIZADO rodando em http://localhost:${PORT}`);
});