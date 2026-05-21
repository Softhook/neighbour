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

test('swarm correctly triggers when 3 size-1 pieces are adjacent to enemy size-4', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const BLACK = vm.runInContext('PLAYER_BLACK', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  // WHITE size-4 creature at (0,0), (1,0), (0,1), (-1,1)
  setPlayer(sandbox, 0, 0, WHITE);
  setPlayer(sandbox, 1, 0, WHITE);
  setPlayer(sandbox, 0, 1, WHITE);
  setPlayer(sandbox, -1, 1, WHITE);

  // 2 BLACK size-1 pieces already adjacent to the WHITE size-4
  setPlayer(sandbox, -1, 0, BLACK); // adjacent to (0,0) and (-1,1)
  setPlayer(sandbox, 1, -1, BLACK); // adjacent to (0,0) and (1,0)

  // Placing a 3rd BLACK size-1 at (0,2) adjacent to (0,1) should complete the swarm
  const blackScore = vm.runInContext(`
    const state = { board: game.board, scores: {...game.scores}, piecesInHand: {...game.piecesInHand} };
    const resultBoard = simulateMoveOnBoard(state, 0, 2, PLAYER_BLACK);
    resultBoard.scores[PLAYER_BLACK];
  `, sandbox);

  expect(blackScore).toBe(4); // All 4 WHITE pieces captured by swarm
});

test('evaluateImmediateThreats gives bonus for size-1 placed near enemy size-4 with an ally', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const BLACK = vm.runInContext('PLAYER_BLACK', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  // WHITE size-4 creature at (0,0), (1,0), (0,1), (-1,1)
  setPlayer(sandbox, 0, 0, WHITE);
  setPlayer(sandbox, 1, 0, WHITE);
  setPlayer(sandbox, 0, 1, WHITE);
  setPlayer(sandbox, -1, 1, WHITE);

  // 1 BLACK size-1 already adjacent to WHITE size-4
  setPlayer(sandbox, -1, 0, BLACK); // adjacent to (0,0) and (-1,1)

  // Placing BLACK at (1,-1) is adjacent to (0,0) and (1,0) - swarm setup with 2 total size-1s
  const threatScore = vm.runInContext(`
    const state = { board: game.board, scores: {...game.scores}, piecesInHand: {...game.piecesInHand} };
    evaluateImmediateThreats(1, -1, PLAYER_BLACK, state);
  `, sandbox);

  expect(threatScore).toBeGreaterThan(0); // Should receive a swarm setup bonus
});

test('evaluateBoardPositionOriginal penalizes size-4 under active swarm threat', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const BLACK = vm.runInContext('PLAYER_BLACK', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  // BLACK size-4 creature at (0,0), (1,0), (0,1), (-1,1)
  setPlayer(sandbox, 0, 0, BLACK);
  setPlayer(sandbox, 1, 0, BLACK);
  setPlayer(sandbox, 0, 1, BLACK);
  setPlayer(sandbox, -1, 1, BLACK);

  const { safeScore, threatenedScore } = vm.runInContext(`
    const safeState = { board: game.board, scores: {...game.scores}, piecesInHand: {...game.piecesInHand} };
    const safeScore = evaluateBoardPositionOriginal(safeState, PLAYER_BLACK);

    // Add 2 WHITE size-1s adjacent to the BLACK size-4 (immediate swarm threat)
    game.board.get('1,-1').player = PLAYER_WHITE;  // adjacent to (1,0) and (0,0)
    game.board.get('-1,0').player = PLAYER_WHITE;  // adjacent to (0,0) and (-1,1)

    const threatenedState = { board: game.board, scores: {...game.scores}, piecesInHand: {...game.piecesInHand} };
    const threatenedScore = evaluateBoardPositionOriginal(threatenedState, PLAYER_BLACK);

    ({ safeScore, threatenedScore });
  `, sandbox);

  expect(threatenedScore).toBeLessThan(safeScore); // Size-4 under swarm threat should score lower
});

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
