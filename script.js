const squares = [...document.querySelectorAll('.square')];
const status = document.querySelector('#turn-status');
const xScore = document.querySelector('#x-score');
const oScore = document.querySelector('#o-score');
const roundNumber = document.querySelector('#round-number');
const resetButton = document.querySelector('#reset-round');
const clearButton = document.querySelector('#clear-scores');
const modeButtons = [...document.querySelectorAll('.mode-button')];
const oName = document.querySelector('#o-name');
const coachResponse = document.querySelector('#coach-response');
const coachButtons = [...document.querySelectorAll('.coach-button')];

const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let board, player, active, scores, round, mode = 'friend', aiThinking = false, aiTimer = null;

function startRound() {
  if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
  board = Array(9).fill(''); player = 'X'; active = true; aiThinking = false;
  squares.forEach(square => { square.innerHTML = ''; square.disabled = false; square.classList.remove('win'); square.setAttribute('aria-label', `${position(Number(square.dataset.index))}, empty`); });
  setStatus(mode === 'ai' ? 'Your turn — you are X' : 'X starts the round', 'x');
}
function position(i) { return ['Top left','Top middle','Top right','Middle left','Middle','Middle right','Bottom left','Bottom middle','Bottom right'][i]; }
function setStatus(message, type) { status.innerHTML = `<span class="status-dot ${type}"></span>${message}`; }
function findWin() { return wins.find(line => line.every(i => board[i] === player)); }
function play(event) {
  const square = event.currentTarget, i = Number(square.dataset.index);
  if (!active || board[i] || aiThinking || (mode === 'ai' && player === 'O')) return;
  placeMark(i);
}
function placeMark(i) {
  board[i] = player; const square = squares[i]; square.disabled = true;
  square.innerHTML = `<span class="mark ${player.toLowerCase()}">${player === 'X' ? '×' : '○'}</span>`;
  square.setAttribute('aria-label', `${position(i)}, ${player}`);
  const winningLine = findWin();
  if (winningLine) {
    active = false;
    squares.forEach(sq => { sq.disabled = true; });
    winningLine.forEach(index => squares[index].classList.add('win'));
    scores[player]++;
    renderScores();
    const winner = mode === 'ai' && player === 'O' ? 'The AI wins this round!' : `${mode === 'ai' ? 'You' : `Player ${player}`} win${mode === 'ai' ? '' : 's'} this round!`;
    setStatus(winner, player.toLowerCase());
    return;
  }
  if (board.every(Boolean)) {
    active = false;
    squares.forEach(sq => { sq.disabled = true; });
    setStatus(`It's a draw — beautifully matched.`, 'draw');
    return;
  }
  player = player === 'X' ? 'O' : 'X';
  if (mode === 'ai' && player === 'O') {
    setStatus('The AI is thinking…', 'o');
    aiThinking = true;
    aiTimer = window.setTimeout(aiMove, 420);
  } else {
    setStatus(mode === 'ai' ? 'Your turn' : `Player ${player}'s turn`, player.toLowerCase());
  }
}
function aiMove() {
  aiTimer = null;
  if (!active || mode !== 'ai' || player !== 'O') return;
  aiThinking = false;
  placeMark(bestMove());
}
function bestMove() {
  let bestScore = -Infinity, move = 0;
  board.forEach((value, i) => { if (!value) { board[i] = 'O'; const score = minimax(board, 0, false); board[i] = ''; if (score > bestScore) { bestScore = score; move = i; } } });
  return move;
}
function minimax(state, depth, maximizing) {
  const result = winnerFor(state); if (result) return result === 'O' ? 10 - depth : depth - 10;
  if (state.every(Boolean)) return 0;
  const values = state.map((value, i) => { if (value) return null; state[i] = maximizing ? 'O' : 'X'; const score = minimax(state, depth + 1, !maximizing); state[i] = ''; return score; }).filter(value => value !== null);
  return maximizing ? Math.max(...values) : Math.min(...values);
}
function winnerFor(state) { const line = wins.find(combo => combo.every(i => state[i] && state[i] === state[combo[0]])); return line ? state[line[0]] : ''; }
function renderScores() { xScore.textContent = scores.X; oScore.textContent = scores.O; }
async function askCoach(request) {
  coachButtons.forEach(button => button.disabled = true);
  coachResponse.textContent = 'Reading the position…';
  try {
    const response = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ board, player, mode, request }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The coach is unavailable.');
    coachResponse.textContent = data.advice;
  } catch (error) {
    coachResponse.textContent = error.message || 'Coach is waiting for its API connection. Start the included server with an OPENAI_API_KEY to enable live advice.';
  } finally { coachButtons.forEach(button => button.disabled = false); }
}
squares.forEach(square => square.addEventListener('click', play));
coachButtons.forEach(button => button.addEventListener('click', () => askCoach(button.dataset.coachRequest)));
modeButtons.forEach(button => button.addEventListener('click', () => {
  if (mode === button.dataset.mode) return;
  mode = button.dataset.mode;
  modeButtons.forEach(item => {
    const isSelected = item === button;
    item.classList.toggle('selected', isSelected);
    item.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
  oName.textContent = mode === 'ai' ? 'The AI' : 'Player O';
  document.querySelector('.eyebrow').textContent = mode === 'ai' ? 'A tiny game for you & AI' : 'A tiny game for two';
  startRound();
}));
resetButton.addEventListener('click', () => { round++; roundNumber.textContent = String(round).padStart(2, '0'); startRound(); });
clearButton.addEventListener('click', () => { scores = { X: 0, O: 0 }; round = 1; renderScores(); roundNumber.textContent = '01'; startRound(); });
scores = { X: 0, O: 0 }; round = 1; startRound();
