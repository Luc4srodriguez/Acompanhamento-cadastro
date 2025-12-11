const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
//const PORT = process.env.PORT || 3000;
const PORT = 5865; // Porta fixa para evitar conflitos

// Diretório para salvar as sessões
const SESSIONS_DIR = path.join(__dirname, 'sessoes');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR);
}

// === Middlewares ===
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// === API Endpoints ===

/**
 * Endpoint para CRIAR uma nova sessão de compartilhamento
 * Retorna o UUID CRU (não codificado).
 */
app.post('/api/share', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.dados) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    // 1. Gera o ID único original (UUID)
    const sessionId = crypto.randomUUID();
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`); // Usa o UUID original para o nome do arquivo

    // 2. Salva os dados no arquivo
    fs.writeFile(filePath, JSON.stringify(payload), (err) => {
      if (err) {
        console.error('Erro ao salvar arquivo de sessão:', err);
        return res.status(500).json({ error: 'Falha ao salvar dados no servidor.' });
      }

      // 3. Retorna o ID CRU (UUID) para o front-end
      console.log(`Sessão criada: ${sessionId} (Retornado UUID cru)`);
      res.status(201).json({ id: sessionId }); // ENVIANDO UUID CRU
    });

  } catch (e) {
    console.error('Erro no endpoint /api/share:', e);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/**
 * Endpoint para LER uma sessão de compartilhamento
 * Recebe o UUID CRU.
 */
app.get('/api/session/:id', (req, res) => {
  try {
    // IMPORTANTE: O ':id' aqui é o UUID CRU (não codificado)
    const sessionId = req.params.id;

    // Validação de segurança: Garante que o ID recebido tenha formato de UUID
    // Isso evita o erro 400 que você estava recebendo, garantindo que apenas UUIDs válidos sejam processados.
    if (!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/i.test(sessionId)) {
       console.warn(`Tentativa de acesso com ID inválido (não UUID): ${sessionId}`);
       return res.status(400).json({ error: 'ID de sessão inválido. Formato esperado é UUID.' });
    }

    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    // Verifica se o arquivo existe
    if (fs.existsSync(filePath)) {
      // Lê o arquivo e envia como JSON
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Erro ao ler arquivo de sessão:', err);
          return res.status(500).json({ error: 'Falha ao ler dados no servidor.' });
        }

        console.log(`Sessão lida: ${sessionId}`);
        res.setHeader('Content-Type', 'application/json');
        res.send(data); // Envia os dados brutos (já são JSON)
      });
    } else {
      // Arquivo não encontrado
      console.warn(`Sessão não encontrada: ${sessionId}`);
      return res.status(404).json({ error: 'Sessão não encontrada ou expirada.' });
    }
  } catch (e) {
    console.error('Erro no endpoint /api/session/:id:', e);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});


// === Servidor de Arquivos Estáticos ===
app.use(express.static(path.join(__dirname, 'public')));

// === Inicia o Servidor ===
app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});