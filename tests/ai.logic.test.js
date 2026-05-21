const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadGameSandbox() {
  const code = fs.readFileSync(path.resolve(__dirname, '..', 'sketch.js'), 'utf8');
  const sandbox = {
    console,
    Math,
    max: Math.max,
    min: Math.min,
    sqrt: Math.sqrt,
    cos: Math.cos,
    sin: Math.sin,
    abs: Math.abs,
    TWO_PI: Math.PI * 2,
    windowWidth: 1200,
    windowHeight: 800,
    width: 1200,
    height: 800,
    createCanvas: () => {},
    colorMode: () => {},
    loadFont: () => ({}),
    background: () => {},
    textAlign: () => {},
    textSize: () => {},
    fill: () => {},
    textFont: () => {},
    text: () => {},
    noStroke: () => {},
    stroke: () => {},
    strokeWeight: () => {},
    beginShape: () => {},
    vertex: () => {},
    endShape: () => {},
    resizeCanvas: () => {},
    CENTER: 0,
    HSB: 0,
    CLOSE: 0,
    setTimeout: (fn) => fn()
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

function setPlayer(sandbox, q, r, player) {
  vm.runInContext(`game.board.get('${q},${r}').player = ${player};`, sandbox);
}

test('countSwarmThreat counts unique adjacent size-1 swarmers only once', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const BLACK = vm.runInContext('PLAYER_BLACK', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  setPlayer(sandbox, 0, 0, BLACK);
  setPlayer(sandbox, 1, 0, BLACK);
  setPlayer(sandbox, 0, 1, BLACK);
  setPlayer(sandbox, -1, 1, BLACK);

  setPlayer(sandbox, 1, -1, WHITE);
  setPlayer(sandbox, -1, 0, WHITE);

  const threat = vm.runInContext(`
    const state = { board: game.board, scores: {...game.scores}, piecesInHand: {...game.piecesInHand} };
    const creature = getCreatureAtForBoardCached(state, 0, 0);
    countSwarmThreat(state, creature, PLAYER_WHITE);
  `, sandbox);

  expect(threat).toBe(1);
});

test('evaluateImmediateThreats does not double-penalize same adjacent enemy creature', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  setPlayer(sandbox, 1, 0, WHITE);
  setPlayer(sandbox, 1, -1, WHITE);

  const threatScore = vm.runInContext(`
    const state = { board: game.board, scores: {...game.scores}, piecesInHand: {...game.piecesInHand} };
    evaluateImmediateThreats(0, 0, PLAYER_BLACK, state);
  `, sandbox);

  expect(threatScore).toBe(-25);
});

test('fast move evaluation penalizes immediately threatened placements', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  setPlayer(sandbox, 1, 0, WHITE);
  setPlayer(sandbox, 1, -1, WHITE);

  const { riskyScore, safeScore } = vm.runInContext(`
    const state = { board: game.board, scores: {...game.scores}, piecesInHand: {...game.piecesInHand} };
    ({
      riskyScore: evaluateMoveFast(state, 0, 0, PLAYER_BLACK),
      safeScore: evaluateMoveFast(state, -2, 0, PLAYER_BLACK)
    });
  `, sandbox);

  expect(riskyScore).toBeLessThan(safeScore);
});
