import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = process.env.PORT || 3000;
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

function send(response, status, body, type = 'application/json') {
  response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` }); response.end(typeof body === 'string' ? body : JSON.stringify(body));
}
async function readBody(request) {
  let body = ''; for await (const part of request) body += part; return JSON.parse(body || '{}');
}
const server = createServer(async (request, response) => {
  const urlPath = (request.url || '/').split('?')[0];

  if (request.method === 'POST' && urlPath === '/api/coach') {
    if (!process.env.OPENAI_API_KEY) return send(response, 503, { error: 'OPENAI_API_KEY is not set.' });
    try {
      const body = await readBody(request);
      const { board, player, mode, request: question } = body || {};
      if (!Array.isArray(board) || board.length !== 9 || !player) {
        return send(response, 400, { error: 'Invalid request: board must be a 9-element array and player is required.' });
      }
      const boardView = board.map((value, index) => value || String(index + 1)).reduce((rows, value, index) => { rows[Math.floor(index / 3)].push(value); return rows; }, [[], [], []]).map(row => row.join(' | ')).join('\n');
      const prompt = `You are a warm, sharp tic-tac-toe coach. Current board (numbers are empty squares):\n${boardView}\nCurrent turn: ${player}. Mode: ${mode}.\nUser request: ${question}\nGive only a short, practical answer (max 35 words). Never claim a move is guaranteed unless it is.`;
      const apiResponse = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: 'gpt-5-mini', input: prompt, max_output_tokens: 100 }) });
      const data = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(data.error?.message || 'OpenAI request failed.');
      const advice = data.output_text?.trim()
        || data.output?.find(o => o.type === 'text')?.content?.trim()
        || data.choices?.[0]?.message?.content?.trim()
        || 'I could not form a response for this position.';
      send(response, 200, { advice });
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : 500;
      send(response, status, { error: error.message });
    }
    return;
  }

  const reqPath = urlPath === '/' ? '/index.html' : urlPath;
  const safePath = resolve(root, '.' + (reqPath.startsWith('/') ? reqPath : '/' + reqPath));
  if (!safePath.startsWith(root)) {
    return send(response, 403, 'Forbidden', 'text/plain');
  }

  try {
    const content = await readFile(safePath);
    send(response, 200, content.toString(), types[extname(safePath)] || 'application/octet-stream');
  } catch {
    send(response, 404, 'Not found', 'text/plain');
  }
});
server.listen(port, () => console.log(`Criss Cross is ready at http://localhost:${port}`));
