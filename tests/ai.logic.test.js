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
    key: '',
    setTimeout: (fn) => fn(),
    clearTimeout: () => {}
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

test('swarming via makeMove actually removes the size-4 creature from the board', () => {
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

  // game.currentPlayer is BLACK after initializeGame(); place 3rd piece via makeMove
  vm.runInContext('makeMove(0, 2);', sandbox);

  const result = vm.runInContext(`
    let whiteCount = 0;
    for (const [key, cell] of game.board) {
      if (cell.player === PLAYER_WHITE) whiteCount++;
    }
    ({ whiteCount, blackScore: game.scores[PLAYER_BLACK] });
  `, sandbox);

  expect(result.whiteCount).toBe(0); // All 4 WHITE pieces removed from board by swarm
  expect(result.blackScore).toBe(4); // Score updated correctly
});

test('eating via makeMove removes multi-piece opponent creature from the board', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const BLACK = vm.runInContext('PLAYER_BLACK', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  // WHITE size-2 creature at (1,0), (0,1)
  setPlayer(sandbox, 1, 0, WHITE);
  setPlayer(sandbox, 0, 1, WHITE);

  // Place BLACK pieces to form a size-3 creature touching the WHITE size-2
  setPlayer(sandbox, -1, 0, BLACK);
  setPlayer(sandbox, 0, 0, BLACK);
  // Placing BLACK at (1,-1) connects to (0,0) and (-1,0) making size-3; (1,-1) is adjacent to WHITE (1,0)
  vm.runInContext('makeMove(1, -1);', sandbox);

  const result = vm.runInContext(`
    let whiteCount = 0;
    for (const [key, cell] of game.board) {
      if (cell.player === PLAYER_WHITE) whiteCount++;
    }
    ({ whiteCount, blackScore: game.scores[PLAYER_BLACK] });
  `, sandbox);

  expect(result.whiteCount).toBe(0); // Both WHITE pieces removed from board
  expect(result.blackScore).toBe(2); // 2 pieces eaten
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

test('undoMove restores board state after a normal move', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);

  const result = vm.runInContext(`
    makeMove(0, 0);
    const moved = {
      cell: game.board.get('0,0').player,
      currentPlayer: game.currentPlayer,
      pieces: game.piecesInHand[PLAYER_BLACK],
      history: game.moveHistory.length
    };
    undoMove();
    ({
      moved,
      restoredCell: game.board.get('0,0').player,
      restoredPlayer: game.currentPlayer,
      restoredPieces: game.piecesInHand[PLAYER_BLACK],
      restoredHistory: game.moveHistory.length,
      restoredLastPlaced: game.lastPlacedPiece
    });
  `, sandbox);

  expect(result.moved.cell).toBe(1);
  expect(result.moved.currentPlayer).toBe(2);
  expect(result.moved.pieces).toBe(29);
  expect(result.moved.history).toBe(1);
  expect(result.restoredCell).toBe(0);
  expect(result.restoredPlayer).toBe(1);
  expect(result.restoredPieces).toBe(30);
  expect(result.restoredHistory).toBe(0);
  expect(result.restoredLastPlaced).toBeNull();
});

test('undoMove restores captured creatures and score', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext('initializeGame();', sandbox);
  const BLACK = vm.runInContext('PLAYER_BLACK', sandbox);
  const WHITE = vm.runInContext('PLAYER_WHITE', sandbox);

  setPlayer(sandbox, 1, 0, WHITE);
  setPlayer(sandbox, 0, 1, WHITE);
  setPlayer(sandbox, -1, 0, BLACK);
  setPlayer(sandbox, 0, 0, BLACK);

  const result = vm.runInContext(`
    makeMove(1, -1); // captures WHITE size-2 creature
    const afterCapture = {
      whiteAt10: game.board.get('1,0').player,
      whiteAt01: game.board.get('0,1').player,
      blackScore: game.scores[PLAYER_BLACK]
    };

    undoMove();
    ({
      afterCapture,
      restoredWhiteAt10: game.board.get('1,0').player,
      restoredWhiteAt01: game.board.get('0,1').player,
      restoredBlackScore: game.scores[PLAYER_BLACK],
      restoredCurrentPlayer: game.currentPlayer
    });
  `, sandbox);

  expect(result.afterCapture.whiteAt10).toBe(0);
  expect(result.afterCapture.whiteAt01).toBe(0);
  expect(result.afterCapture.blackScore).toBe(2);
  expect(result.restoredWhiteAt10).toBe(2);
  expect(result.restoredWhiteAt01).toBe(2);
  expect(result.restoredBlackScore).toBe(0);
  expect(result.restoredCurrentPlayer).toBe(1);
});

test('undoMove in AI mode reverts back to the human turn in one action', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext(`
    initializeGame();
    game.gameMode = MODE_VS_AI_HUMAN_BLACK; // human black, AI white
    makeMove(0, 0); // human move
    makeMove(1, 0); // AI move
  `, sandbox);

  const result = vm.runInContext(`
    const beforeUndo = {
      currentPlayer: game.currentPlayer,
      humanCell: game.board.get('0,0').player,
      aiCell: game.board.get('1,0').player,
      history: game.moveHistory.length
    };
    undoMove();
    ({
      beforeUndo,
      afterCurrentPlayer: game.currentPlayer,
      afterHumanCell: game.board.get('0,0').player,
      afterAiCell: game.board.get('1,0').player,
      afterHistory: game.moveHistory.length
    });
  `, sandbox);

  expect(result.beforeUndo.currentPlayer).toBe(1);
  expect(result.beforeUndo.humanCell).toBe(1);
  expect(result.beforeUndo.aiCell).toBe(2);
  expect(result.beforeUndo.history).toBe(2);
  expect(result.afterCurrentPlayer).toBe(1);
  expect(result.afterHumanCell).toBe(0);
  expect(result.afterAiCell).toBe(0);
  expect(result.afterHistory).toBe(0);
});

test('undo via keyboard works even when gameOver is true', () => {
  const sandbox = loadGameSandbox();

  vm.runInContext(`
    initializeGame();
    makeMove(0, 0);
    game.gameOver = true;
    key = 'u';
    keyPressed();
  `, sandbox);

  const result = vm.runInContext(`
    ({
      cell: game.board.get('0,0').player,
      currentPlayer: game.currentPlayer,
      history: game.moveHistory.length,
      gameOver: game.gameOver
    });
  `, sandbox);

  expect(result.cell).toBe(0);
  expect(result.currentPlayer).toBe(1);
  expect(result.history).toBe(0);
  expect(result.gameOver).toBe(false);
});

test('higher AI difficulties expose updated max thinking labels', () => {
  const sandbox = loadGameSandbox();

  const result = vm.runInContext(`
    ({
      expert: getAIMaxMoveTime(AI_DIFFICULTY_EXPERT),
      ultimate: getAIMaxMoveTime(AI_DIFFICULTY_ULTIMATE),
      omniscient: getAIMaxMoveTime(AI_DIFFICULTY_OMNISCIENT)
    });
  `, sandbox);

  expect(result.expert).toBe("~2s");
  expect(result.ultimate).toBe("~5s");
  expect(result.omniscient).toBe("~8s");
});
