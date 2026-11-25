
const crypto = require('crypto');

const REDIRECT_URI =
  'https://prestige-sistema.onrender.com/api/dropbox/callback';

const APP_KEY = process.env.DROPBOX_APP_KEY;
const APP_SECRET = process.env.DROPBOX_APP_SECRET;

function criarUrlAutorizacao(state) {
  if (!APP_KEY) {
    throw new Error('DROPBOX_APP_KEY não configurada.');
  }

  const params = new URLSearchParams({
    client_id: APP_KEY,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    token_access_type: 'offline',
    state
  });

  return `https://www.dropbox.com/oauth2/authorize?${params}`;
}

async function trocarCodigoPorTokens(code) {
  if (!APP_KEY || !APP_SECRET) {
    throw new Error('Credenciais do Dropbox não configuradas.');
  }

  const auth = Buffer.from(
    `${APP_KEY}:${APP_SECRET}`
  ).toString('base64');

  const resposta = await fetch(
    'https://api.dropboxapi.com/oauth2/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      })
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      `Falha na autorização Dropbox: ${resposta.status}`
    );
  }

  return dados;
}

function gerarState() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  criarUrlAutorizacao,
  trocarCodigoPorTokens,
  gerarState
};
