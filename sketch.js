// Eat Your Neighbor - p5.js Implementation

// Game constants
const PLAYER_BLACK = 1;
const PLAYER_WHITE = 2;
const EMPTY = 0;
const BOARD_RADIUS = 3;
const MAX_CREATURE_SIZE = 4;
const WINNING_SCORE = 12;
const INITIAL_PIECES_PER_PLAYER = 30;

// Game screens
const SCREEN_INTRO = 0;
const SCREEN_MODE_SELECT = 1;
const SCREEN_GAME = 2;

// Game modes
const MODE_TWO_PLAYER = 0;
const MODE_VS_AI_HUMAN_BLACK = 1;
const MODE_VS_AI_HUMAN_WHITE = 2;

// AI difficulty levels
const AI_DIFFICULTY_EASY = 1;
const AI_DIFFICULTY_MEDIUM = 2;
const AI_DIFFICULTY_HARD = 3;
const AI_DIFFICULTY_EXPERT = 4;
const AI_DIFFICULTY_MASTER = 5;
const AI_DIFFICULTY_GRANDMASTER = 6;
const AI_DIFFICULTY_ULTIMATE = 7;

// Hex directions (axial)
const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

// Game state
let game = {
  screen: SCREEN_INTRO,
  gameMode: MODE_TWO_PLAYER,
  aiDifficulty: AI_DIFFICULTY_MEDIUM,
  board: new Map(),
  validHexes: [],
  currentPlayer: PLAYER_BLACK,
  scores: { [PLAYER_BLACK]: 0, [PLAYER_WHITE]: 0 },
  piecesInHand: { [PLAYER_BLACK]: INITIAL_PIECES_PER_PLAYER, [PLAYER_WHITE]: INITIAL_PIECES_PER_PLAYER },
  gameOver: false,
  winner: null,
  lastPlayerToMove: null,
  lastPlacedPiece: null,
  statusMessage: "",
  aiThinking: false
};

// AI Optimization Infrastructure
let transpositionTable = new Map();
let evaluationCache = new Map();
let creatureCache = new Map();
let historyHeuristic = {
  [PLAYER_BLACK]: new Map(),
  [PLAYER_WHITE]: new Map()
};
let killerMoves = [];
let symmetryMap = new Map();

// Cache management
const MAX_CACHE_SIZE = 1000000;
const CACHE_CLEANUP_THRESHOLD = 0.8;

// Performance tracking
let performanceStats = {
  cacheHits: 0,
  cacheMisses: 0,
  evaluationCalls: 0,
  transpositionHits: 0,
  killerMoveHits: 0,
  searchDepth: 0,
  moveTime: 0,
  nodesEvaluated: 0
};

// Transposition table entry flags
const TT_EXACT = 0;
const TT_LOWERBOUND = 1;
const TT_UPPERBOUND = 2;

// Display settings
let hexSize = 25;
let boardCenter = { x: 0, y: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  font = loadFont('D-DIN.otf');
  fontBold = loadFont('D-DIN-Bold.otf');
  calculateHexSize();
  // Don't initialize game board yet - start with intro screen
}

function calculateHexSize() {
  const padding = { vertical: 100, horizontal: 50 };
  const available = {
    width: windowWidth - padding.horizontal,
    height: windowHeight - padding.vertical
  };
  
  const boardDiameter = 2 * BOARD_RADIUS + 1;
  const maxSizeByWidth = available.width / (boardDiameter * sqrt(3));
  const maxSizeByHeight = available.height / (boardDiameter * 1.5);
  
  hexSize = min(maxSizeByWidth, maxSizeByHeight, 30);
  boardCenter = { x: width / 2, y: height / 2 + 20 };
}

function initializeGame() {
  // Reset game state
  game.board.clear();
  game.validHexes = [];
  game.currentPlayer = PLAYER_BLACK;
  game.scores = { [PLAYER_BLACK]: 0, [PLAYER_WHITE]: 0 };
  game.piecesInHand = { [PLAYER_BLACK]: INITIAL_PIECES_PER_PLAYER, [PLAYER_WHITE]: INITIAL_PIECES_PER_PLAYER };
  game.gameOver = false;
  game.winner = null;
  game.lastPlayerToMove = null;
  game.lastPlacedPiece = null;
  game.screen = SCREEN_GAME;
  
  // Generate hexagonal board
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
    const r1 = max(-BOARD_RADIUS, -q - BOARD_RADIUS);
    const r2 = min(BOARD_RADIUS, -q + BOARD_RADIUS);
    for (let r = r1; r <= r2; r++) {
      const hex = { q, r, player: EMPTY };
      game.board.set(`${q},${r}`, hex);
      game.validHexes.push({ q, r });
    }
  }
  
  // Initialize AI optimization caches
  initializeOptimizationCaches();
  
  updateStatusMessage();
}

function draw() {
  background(60, 5, 95);
  
  if (game.screen === SCREEN_INTRO) {
    drawIntroScreen();
  } else if (game.screen === SCREEN_MODE_SELECT) {
    drawModeSelectScreen();
  } else if (game.screen === SCREEN_GAME) {
    drawBoard();
    drawUI();
    
    if (game.gameOver) {
      drawGameOverScreen();
    }
    
    // AI processing
    if ((game.gameMode === MODE_VS_AI_HUMAN_BLACK && game.currentPlayer === PLAYER_WHITE) || 
        (game.gameMode === MODE_VS_AI_HUMAN_WHITE && game.currentPlayer === PLAYER_BLACK)) {
      if (!game.gameOver && !game.aiThinking) {
        game.aiThinking = true;
        updateStatusMessage(); // Update status to show AI thinking
        
        // Variable delay based on difficulty level
        const baseDelay = game.aiDifficulty <= AI_DIFFICULTY_HARD ? 500 : 200;
        const thinkingDelay = game.aiDifficulty === AI_DIFFICULTY_MASTER ? 1000 : 
                            game.aiDifficulty === AI_DIFFICULTY_GRANDMASTER ? 1500 :
                            game.aiDifficulty === AI_DIFFICULTY_ULTIMATE ? 2000 :
                            game.aiDifficulty === AI_DIFFICULTY_EXPERT ? 800 : baseDelay;
        
        setTimeout(() => {
          const aiMove = getAIMove();
          if (aiMove) {
            makeMove(aiMove.q, aiMove.r);
          }
          game.aiThinking = false;
          updateStatusMessage(); // Update status after AI move
        }, thinkingDelay);
      }
    }
  }
}

function drawIntroScreen() {
  textAlign(CENTER, CENTER);
  
  // Game title
  textSize(48);
  fill(0, 0, 15);
  textFont(fontBold);
  text("EAT YOUR", width / 2, height / 2 - 150);
  text("NEIGHBOUR", width / 2, height / 2 -100);
  
  textFont(font);
  // Creator credit
  textSize(18);
  fill(0, 0, 40);
  text("game by Nick Bentley", width / 2, height / 2 -50);
  text("javascript Christian Nold", width / 2, height / 2-20);
  
  // Instructions
  textSize(16);
  fill(0, 100, 100);
  text("Click to continue", width / 2, height / 2 + 60);
}

function drawModeSelectScreen() {
  textAlign(CENTER, CENTER);
  noStroke();
  // Title
  textSize(32);
  fill(0, 0, 15);
  text("Choose Game Mode", width / 2, height / 2 - 120);
  
  // Two Player button
  const twoPlayerButton = {
    x: width / 2 - 100,
    y: height / 2 - 80,
    w: 200,
    h: 35
  };
  
  // AI as Black button (human plays white)
  const aiBlackButton = {
    x: width / 2 - 100,
    y: height / 2 - 35,
    w: 200,
    h: 35
  };
  
  // AI as White button (human plays black)
  const aiWhiteButton = {
    x: width / 2 - 100,
    y: height / 2 + 10,
    w: 200,
    h: 35
  };
  
  // AI Difficulty label
  textSize(20);
  fill(0, 0, 15);
  text("AI Difficulty", width / 2, height / 2 + 65);
  
  // AI Difficulty buttons
  const difficultyButtons = [
    { x: width / 2 - 100, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_EASY, label: "1" },
    { x: width / 2 - 55, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_MEDIUM, label: "2" },
    { x: width / 2 - 10, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_HARD, label: "3" },
    { x: width / 2 + 35, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_EXPERT, label: "4" },
    { x: width / 2 + 80, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_MASTER, label: "5" },
    { x: width / 2 - 100, y: height / 2 + 125, w: 35, h: 30, level: AI_DIFFICULTY_GRANDMASTER, label: "6" },
    { x: width / 2 - 55, y: height / 2 + 125, w: 35, h: 30, level: AI_DIFFICULTY_ULTIMATE, label: "7" }
  ];
   
  // Draw buttons
  drawButton(twoPlayerButton, "2 Player Game");
  drawButton(aiBlackButton, "White vs AI");
  drawButton(aiWhiteButton, "Black vs AI");
  
  // Draw difficulty buttons with selection highlight
  for (const diffBtn of difficultyButtons) {
    const isSelected = game.aiDifficulty === diffBtn.level;
    drawDifficultyButton(diffBtn, diffBtn.label, isSelected);
  }
}

function drawButton(button, label) {

  // Check if mouse is over button
  const isHover = mouseX >= button.x && mouseX <= button.x + button.w &&
                  mouseY >= button.y && mouseY <= button.y + button.h;
  
  // Button background
  fill(isHover ? color(0, 0, 80) : color(0, 0, 70));
  stroke(0, 0, 20);
  strokeWeight(2);
  rect(button.x, button.y, button.w, button.h, 8);
  
  // Button text
  noStroke();
  fill(0, 0, 15);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(label, button.x + button.w / 2, button.y + button.h / 2);
}

function drawDifficultyButton(button, label, isSelected) {
  // Check if mouse is over button
  const isHover = mouseX >= button.x && mouseX <= button.x + button.w &&
                  mouseY >= button.y && mouseY <= button.y + button.h;
  
  // Button background - different colors for selected/unselected
  let buttonColor;
  if (isSelected) {
    buttonColor = color(0, 100, 100); // Red for selected
  } else if (isHover) {
    buttonColor = color(0, 0, 80);
  } else {
    buttonColor = color(0, 0, 70);
  }
  
  fill(buttonColor);
  stroke(0, 0, 20);
  strokeWeight(isSelected ? 3 : 2);
  rect(button.x, button.y, button.w, button.h, 6);
  
  // Button text
  noStroke();
  fill(0, 0, 15);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, button.x + button.w / 2, button.y + button.h / 2);
}

function drawBoard() {
  for (const hex of game.validHexes) {
    const pixel = axialToPixel(hex.q, hex.r);
    const cell = game.board.get(`${hex.q},${hex.r}`);
    
    const colors = {
      [PLAYER_BLACK]: color(0, 0, 15),
      [PLAYER_WHITE]: color(0, 0, 95),
      [EMPTY]: color(0, 0, 70, 60)
    };
    
    drawHex(pixel.x, pixel.y, hexSize, colors[cell.player]);
    
    // Draw red dot on last placed piece
    if (game.lastPlacedPiece && 
        game.lastPlacedPiece.q === hex.q && 
        game.lastPlacedPiece.r === hex.r) {
      noStroke();
      fill(0, 100, 100); // Bright red
      circle(pixel.x, pixel.y, hexSize * 0.3);
    }
  }
}

function drawUI() {
  textAlign(CENTER, CENTER);
  fill(0, 0, 10);
  noStroke();
  // Score display
  textSize(22);
  textFont(fontBold);
  text(`Black: ${game.scores[PLAYER_BLACK]} eaten`, width / 4, 30);
  text(`White: ${game.scores[PLAYER_WHITE]} eaten`, 3 * width / 4, 30);
  
  // Status message with color indicator
  textSize(20);
  const playerColor = game.currentPlayer === PLAYER_BLACK ? color(0, 0, 5) : color(0, 0, 98);
  
  // Draw color box next to status message
  const boxSize = 20;
  const messageWidth = textWidth(game.statusMessage);
  const boxX = width / 2 - messageWidth / 2 - boxSize - 10;
  const boxY = height - 40 - boxSize / 2;
  
  // Color box background
  fill(playerColor);
  noStroke();
  rect(boxX, boxY, boxSize, boxSize, 3);
  
  // Color box border
  stroke(0, 0, 0);
  strokeWeight(2);
  noFill();
  rect(boxX, boxY, boxSize, boxSize, 3);
  
  // Status message text
  fill(0);
  noStroke();
  text(game.statusMessage, width / 2, height - 40);
  
  // Show optimization status for Expert+ difficulties in AI vs Human games
  if ((game.gameMode === MODE_VS_AI_HUMAN_BLACK || game.gameMode === MODE_VS_AI_HUMAN_WHITE) && 
      game.aiDifficulty >= AI_DIFFICULTY_EXPERT) {
    textSize(14);
    fill(40, 80, 70); // Green color
    const optimizationText = `Optimized AI (Depth ${game.aiDifficulty === AI_DIFFICULTY_EXPERT ? 5 : 
                                                      game.aiDifficulty === AI_DIFFICULTY_MASTER ? 6 :
                                                      game.aiDifficulty === AI_DIFFICULTY_GRANDMASTER ? 7 : 8})`;
    text(optimizationText, width / 2, height - 15);
    
    // Show cache sizes if performance stats are available
    if (transpositionTable.size > 0 || evaluationCache.size > 0) {
      textSize(12);
      fill(0, 0, 50);
      text(`TT: ${transpositionTable.size} | EC: ${evaluationCache.size} | CC: ${creatureCache.size}`, 
           width / 2, height - 1);
    }
  }
}

function drawGameOverScreen() {
  textSize(32);
  fill(0, 100, 100);
  
  let winMessage = "Game Over! ";
  if (game.winner === PLAYER_BLACK) winMessage += "Black Wins!";
  else if (game.winner === PLAYER_WHITE) winMessage += "White Wins!";
  else winMessage += "It's a Tie!";
  
  text(winMessage, width / 2, boardCenter.y - (BOARD_RADIUS + 2) * hexSize * 1.5 - 20);
  
  textSize(18);
  text("Click to reset", width / 2, height - 15);
}

function mousePressed() {
  if (game.screen === SCREEN_INTRO) {
    game.screen = SCREEN_MODE_SELECT;
    return;
  }
  
  if (game.screen === SCREEN_MODE_SELECT) {
    // Two Player button
    const twoPlayerButton = {
      x: width / 2 - 100,
      y: height / 2 - 80,
      w: 200,
      h: 35
    };
    
    // AI as Black button (human plays white)
    const aiBlackButton = {
      x: width / 2 - 100,
      y: height / 2 - 35,
      w: 200,
      h: 35
    };
    
    // AI as White button (human plays black)
    const aiWhiteButton = {
      x: width / 2 - 100,
      y: height / 2 + 10,
      w: 200,
      h: 35
    };
    
    // AI Difficulty buttons
    const difficultyButtons = [
      { x: width / 2 - 100, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_EASY },
      { x: width / 2 - 55, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_MEDIUM },
      { x: width / 2 - 10, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_HARD },
      { x: width / 2 + 35, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_EXPERT },
      { x: width / 2 + 80, y: height / 2 + 85, w: 35, h: 30, level: AI_DIFFICULTY_MASTER },
      { x: width / 2 - 100, y: height / 2 + 125, w: 35, h: 30, level: AI_DIFFICULTY_GRANDMASTER },
      { x: width / 2 - 55, y: height / 2 + 125, w: 35, h: 30, level: AI_DIFFICULTY_ULTIMATE }
    ];
    
    // Check difficulty button clicks
    for (const diffBtn of difficultyButtons) {
      if (mouseX >= diffBtn.x && mouseX <= diffBtn.x + diffBtn.w &&
          mouseY >= diffBtn.y && mouseY <= diffBtn.y + diffBtn.h) {
        game.aiDifficulty = diffBtn.level;
        return;
      }
    }
    
    // Check button clicks
    if (mouseX >= twoPlayerButton.x && mouseX <= twoPlayerButton.x + twoPlayerButton.w &&
        mouseY >= twoPlayerButton.y && mouseY <= twoPlayerButton.y + twoPlayerButton.h) {
      game.gameMode = MODE_TWO_PLAYER;
      initializeGame();
      return;
    }
    
    if (mouseX >= aiBlackButton.x && mouseX <= aiBlackButton.x + aiBlackButton.w &&
        mouseY >= aiBlackButton.y && mouseY <= aiBlackButton.y + aiBlackButton.h) {
      game.gameMode = MODE_VS_AI_HUMAN_WHITE;
      initializeGame();
      return;
    }
    
    if (mouseX >= aiWhiteButton.x && mouseX <= aiWhiteButton.x + aiWhiteButton.w &&
        mouseY >= aiWhiteButton.y && mouseY <= aiWhiteButton.y + aiWhiteButton.h) {
      game.gameMode = MODE_VS_AI_HUMAN_BLACK;
      initializeGame();
      return;
    }
    return;
  }
  
  if (game.screen === SCREEN_GAME) {
    if (game.gameOver) {
      game.screen = SCREEN_MODE_SELECT;
      return;
    }
    
    // Only allow human moves when it's not AI's turn
    if ((game.gameMode === MODE_VS_AI_HUMAN_BLACK && game.currentPlayer === PLAYER_WHITE) ||
        (game.gameMode === MODE_VS_AI_HUMAN_WHITE && game.currentPlayer === PLAYER_BLACK)) {
      return; // AI will make its move automatically
    }
    
    const hexCoords = pixelToAxial(mouseX, mouseY);
    if (hexCoords) {
      makeMove(hexCoords.q, hexCoords.r);
    }
  }
}

function makeMove(q, r) {
  const hexKey = `${q},${r}`;
  const cell = game.board.get(hexKey);
  
  // Validate move
  if (cell.player !== EMPTY) {
    game.statusMessage = "Cell is already occupied. Try again.";
    return;
  }
  
  if (game.piecesInHand[game.currentPlayer] <= 0) {
    game.statusMessage = `Player ${getPlayerName(game.currentPlayer)} has no pieces left.`;
    return;
  }
  
  // Check if move would create oversized creature
  const hypotheticalCreature = getCreatureAt(q, r, { q, r, player: game.currentPlayer });
  if (hypotheticalCreature.size > MAX_CREATURE_SIZE) {
    game.statusMessage = `Cannot create creature larger than ${MAX_CREATURE_SIZE}.`;
    return;
  }
  
  // Execute move
  cell.player = game.currentPlayer;
  game.piecesInHand[game.currentPlayer]--;
  game.lastPlayerToMove = game.currentPlayer;
  game.lastPlacedPiece = { q, r };
  
  // Process eating and swarming
  const piecesEaten = processEatingAndSwarming(q, r);
  game.scores[game.currentPlayer] += piecesEaten;
  
  // Check win condition
  if (game.scores[game.currentPlayer] >= WINNING_SCORE) {
    endGame();
    return;
  }
  
  // Switch players
  game.currentPlayer = game.currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Check if new player can move
  if (!canPlayerMove(game.currentPlayer)) {
    endGame();
    return;
  }
  
  updateStatusMessage();
}

function processEatingAndSwarming(placedQ, placedR) {
  const placedCreature = getCreatureAt(placedQ, placedR);
  const opponent = game.currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const creaturesEaten = new Set();
  
  // Rule 1: Eating (creature of size N eats adjacent creatures of size N-1)
  if (placedCreature.size > 1) {
    for (const piece of placedCreature.pieces) {
      for (const neighbor of getNeighbors(piece.q, piece.r)) {
        if (game.board.has(neighbor.key) && game.board.get(neighbor.key).player === opponent) {
          const opponentCreature = getCreatureAt(neighbor.q, neighbor.r);
          if (opponentCreature.size === placedCreature.size - 1) {
            creaturesEaten.add(getCreatureSignature(opponentCreature));
          }
        }
      }
    }
  }
  
  // Rule 2: Swarming (3+ size-1 creatures swarm a size-4 creature)
  if (placedCreature.size === 1) {
    for (const neighbor of getNeighbors(placedQ, placedR)) {
      if (game.board.has(neighbor.key) && game.board.get(neighbor.key).player === opponent) {
        const targetCreature = getCreatureAt(neighbor.q, neighbor.r);
        if (targetCreature.size === MAX_CREATURE_SIZE) {
          const swarmCount = countSwarmingCreatures(targetCreature, game.currentPlayer, placedQ, placedR);
          if (swarmCount >= 2) { // Including the placed piece = 3 total
            creaturesEaten.add(getCreatureSignature(targetCreature));
          }
        }
      }
    }
  }
  
  // Remove eaten creatures
  let totalEaten = 0;
  for (const signature of creaturesEaten) {
    const creature = getCreatureFromSignature(signature);
    if (creature) {
      for (const piece of creature.pieces) {
        game.board.get(`${piece.q},${piece.r}`).player = EMPTY;
        totalEaten++;
      }
    }
  }
  
  return totalEaten;
}

function getCreatureAt(startQ, startR, hypotheticalPiece = null) {
  const board = hypotheticalPiece ? 
    new Map([...game.board, [`${hypotheticalPiece.q},${hypotheticalPiece.r}`, hypotheticalPiece]]) :
    game.board;
  
  const startKey = `${startQ},${startR}`;
  if (!board.has(startKey) || board.get(startKey).player === EMPTY) {
    return { pieces: [], size: 0, player: EMPTY };
  }
  
  const targetPlayer = board.get(startKey).player;
  const visited = new Set();
  const queue = [{ q: startQ, r: startR }];
  const pieces = [];
  let iterations = 0;
  const maxIterations = 1000; // Safety limit
  
  while (queue.length > 0 && iterations < maxIterations) {
    const current = queue.shift();
    const key = `${current.q},${current.r}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    pieces.push(current);
    
    for (const neighbor of getNeighbors(current.q, current.r)) {
      if (!visited.has(neighbor.key) && 
          board.has(neighbor.key) && 
          board.get(neighbor.key).player === targetPlayer) {
        queue.push({ q: neighbor.q, r: neighbor.r });
      }
    }
    iterations++;
  }
  
  return { pieces, size: pieces.length, player: targetPlayer };
}

function getNeighbors(q, r) {
  return HEX_DIRECTIONS.map(dir => ({
    q: q + dir.q,
    r: r + dir.r,
    key: `${q + dir.q},${r + dir.r}`
  }));
}

function countSwarmingCreatures(targetCreature, friendlyPlayer, excludeQ, excludeR) {
  const swarmers = new Set();
  
  for (const piece of targetCreature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (neighbor.q === excludeQ && neighbor.r === excludeR) continue;
      
      if (game.board.has(neighbor.key) && game.board.get(neighbor.key).player === friendlyPlayer) {
        const creature = getCreatureAt(neighbor.q, neighbor.r);
        if (creature.size === 1) {
          swarmers.add(neighbor.key);
        }
      }
    }
  }
  
  return swarmers.size;
}

function getCreatureSignature(creature) {
  return `${creature.pieces[0].q},${creature.pieces[0].r}_${creature.player}`;
}

// Core AI Support Functions (from try.js optimization)

function getValidMoves(player) {
  const moves = [];
  for (const hex of game.validHexes) {
    if (game.board.get(`${hex.q},${hex.r}`).player === EMPTY) {
      const creature = getCreatureAt(hex.q, hex.r, { q: hex.q, r: hex.r, player });
      if (creature.size <= MAX_CREATURE_SIZE) {
        moves.push({ q: hex.q, r: hex.r });
      }
    }
  }
  return moves;
}

function getValidMovesForBoard(boardState, player) {
  const moves = [];
  for (const hex of game.validHexes) {
    if (boardState.board.get(`${hex.q},${hex.r}`).player === EMPTY) {
      const creature = getCreatureAtForBoardOriginal(boardState, hex.q, hex.r, { q: hex.q, r: hex.r, player });
      if (creature.size <= MAX_CREATURE_SIZE) {
        moves.push({ q: hex.q, r: hex.r });
      }
    }
  }
  return moves;
}

function simulateMove(q, r, player) {
  const tempBoard = {
    board: new Map(),
    scores: { ...game.scores },
    piecesInHand: { ...game.piecesInHand }
  };
  
  for (const [key, value] of game.board) {
    tempBoard.board.set(key, { ...value });
  }
  
  tempBoard.board.get(`${q},${r}`).player = player;
  tempBoard.piecesInHand[player]--;
  
  const piecesEaten = processEatingAndSwarmingForBoard(tempBoard, q, r, player);
  tempBoard.scores[player] += piecesEaten;
  
  return tempBoard;
}

function simulateMoveOnBoard(boardState, q, r, player) {
  const tempBoard = {
    board: new Map(),
    scores: { ...boardState.scores },
    piecesInHand: { ...boardState.piecesInHand }
  };
  
  for (const [key, value] of boardState.board) {
    tempBoard.board.set(key, { ...value });
  }
  
  tempBoard.board.get(`${q},${r}`).player = player;
  tempBoard.piecesInHand[player]--;
  
  const piecesEaten = processEatingAndSwarmingForBoard(tempBoard, q, r, player);
  tempBoard.scores[player] += piecesEaten;
  
  return tempBoard;
}

function evaluateMove(q, r, player) {
  const tempBoard = simulateMove(q, r, player);
  let score = (tempBoard.scores[player] - game.scores[player]) * 100;
  
  if (game.aiDifficulty === AI_DIFFICULTY_EASY) {
    score += (Math.random() - 0.5) * 50;
    return score;
  }
  
  if (game.aiDifficulty === AI_DIFFICULTY_MEDIUM) {
    const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    score += tempBoard.scores[player] * 8;
    score -= tempBoard.scores[opponent] * 6;
    
    const placedCreature = getCreatureAtForBoardOriginal(tempBoard, q, r);
    if (placedCreature.size === 2) score += 15;
    else if (placedCreature.size === 3) score += 25;
    
    score += (Math.random() - 0.5) * 25;
    return score;
  }
  
  if (game.aiDifficulty === AI_DIFFICULTY_HARD) {
    return evaluateHardAI(tempBoard, q, r, player, score);
  }
  
  if (game.aiDifficulty >= AI_DIFFICULTY_EXPERT) {
    return evaluateAdvancedAIOriginal(tempBoard, q, r, player, score);
  }
  
  return evaluateHardAI(tempBoard, q, r, player, score);
}

function evaluateMoveFast(boardState, q, r, player) {
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  let score = 0;
  const captureValue = (tempBoard.scores[player] - boardState.scores[player]);
  score += captureValue * 200;
  
  if (tempBoard.scores[player] >= WINNING_SCORE) {
    return 5000;
  }
  
  if (boardState.scores[opponent] >= 10) {
    score += 300;
  }
  
  const creature = getCreatureAtForBoardOriginal(tempBoard, q, r);
  switch(creature.size) {
    case 1: score += 2; break;
    case 2: score += 15; break;
    case 3: score += 30; break;
    case 4: 
      const threats = countAdjacentOpponentPieces(tempBoard, q, r, opponent);
      score += Math.max(5, 25 - threats * 8);
      break;
  }
  
  const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  score += (6 - distanceFromCenter) * 3;
  
  score += evaluateImmediateThreats(q, r, player, tempBoard) * 10;
  
  const connections = countAdjacentFriendlyPieces(tempBoard, q, r, player);
  score += connections * 8;
  
  return score;
}

function evaluateImmediateThreats(q, r, player, boardState = game) {
  let threatScore = 0;
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const creature = getCreatureAtForBoardOriginal(tempBoard, q, r);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;

  for (const dir of HEX_DIRECTIONS) {
    const nq = q + dir.q;
    const nr = r + dir.r;
    const nKey = `${nq},${nr}`;
    
    if (tempBoard.board.has(nKey) && tempBoard.board.get(nKey).player === opponent) {
      const sizeDiff = Math.abs(creature.size - 1);
      if (sizeDiff === 1) threatScore += 15;
    }
  }

  return threatScore;
}

// Support functions for board simulation
function processEatingAndSwarmingForBoard(boardState, placedQ, placedR, currentPlayer) {
  const placedCreature = getCreatureAtForBoardOriginal(boardState, placedQ, placedR);
  const opponent = currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const creaturesEaten = new Set();
  
  if (placedCreature.size > 1) {
    for (const piece of placedCreature.pieces) {
      for (const neighbor of getNeighbors(piece.q, piece.r)) {
        if (boardState.board.has(neighbor.key) && boardState.board.get(neighbor.key).player === opponent) {
          const opponentCreature = getCreatureAtForBoardOriginal(boardState, neighbor.q, neighbor.r);
          if (opponentCreature.size === placedCreature.size - 1) {
            creaturesEaten.add(getCreatureSignature(opponentCreature));
          }
        }
      }
    }
  }
  
  if (placedCreature.size === 1) {
    for (const neighbor of getNeighbors(placedQ, placedR)) {
      if (boardState.board.has(neighbor.key) && boardState.board.get(neighbor.key).player === opponent) {
        const targetCreature = getCreatureAtForBoardOriginal(boardState, neighbor.q, neighbor.r);
        if (targetCreature.size === MAX_CREATURE_SIZE) {
          const swarmCount = countSwarmingCreaturesForBoard(boardState, targetCreature, currentPlayer, placedQ, placedR);
          if (swarmCount >= 2) {
            creaturesEaten.add(getCreatureSignature(targetCreature));
          }
        }
      }
    }
  }
  
  let totalEaten = 0;
  for (const signature of creaturesEaten) {
    const creature = getCreatureFromSignatureForBoard(boardState, signature);
    if (creature) {
      for (const piece of creature.pieces) {
        boardState.board.get(`${piece.q},${piece.r}`).player = EMPTY;
        totalEaten++;
      }
    }
  }
  
  return totalEaten;
}

function countSwarmingCreaturesForBoard(boardState, targetCreature, friendlyPlayer, excludeQ, excludeR) {
  const swarmers = new Set();
  
  for (const piece of targetCreature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (neighbor.q === excludeQ && neighbor.r === excludeR) continue;
      
      if (boardState.board.has(neighbor.key) && boardState.board.get(neighbor.key).player === friendlyPlayer) {
        const creature = getCreatureAtForBoardOriginal(boardState, neighbor.q, neighbor.r);
        if (creature.size === 1) {
          swarmers.add(neighbor.key);
        }
      }
    }
  }
  
  return swarmers.size;
}

function getCreatureFromSignatureForBoard(boardState, signature) {
  const [coords, playerStr] = signature.split('_');
  const [q, r] = coords.split(',').map(Number);
  const player = parseInt(playerStr);
  
  if (boardState.board.has(`${q},${r}`) && boardState.board.get(`${q},${r}`).player === player) {
    return getCreatureAtForBoardOriginal(boardState, q, r);
  }
  return null;
}

function countAdjacentOpponentPieces(boardState, q, r, opponent) {
  let count = 0;
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === opponent) {
      count++;
    }
  }
  return count;
}

function countAdjacentFriendlyPieces(boardState, q, r, player) {
  let count = 0;
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === player) {
      count++;
    }
  }
  return count;
}

// AI Evaluation Functions
function evaluateHardAI(tempBoard, q, r, player, baseScore) {
  let score = baseScore;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  score += tempBoard.scores[player] * 10;
  score -= tempBoard.scores[opponent] * 8;
  
  const placedCreature = getCreatureAtForBoardOriginal(tempBoard, q, r);
  
  if (placedCreature.size === 2) score += 20;
  else if (placedCreature.size === 3) score += 35;
  else if (placedCreature.size === 4) score += 25;
  
  const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  score += (6 - distanceFromCenter) * 5;
  
  const nextTurnEating = countPotentialEating(tempBoard, q, r, player);
  score += nextTurnEating * 30;
  
  if (placedCreature.size === MAX_CREATURE_SIZE) {
    const swarmThreat = countSwarmThreat(tempBoard, placedCreature, opponent);
    score -= swarmThreat * 40;
  }
  
  score += (Math.random() - 0.5) * 10;
  
  return score;
}

function countPotentialEating(boardState, q, r, player) {
  const creature = getCreatureAtForBoardOriginal(boardState, q, r);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  let eatingOpportunities = 0;
  
  for (const piece of creature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (boardState.board.has(neighbor.key) && 
          boardState.board.get(neighbor.key).player === opponent) {
        const opponentCreature = getCreatureAtForBoardOriginal(boardState, neighbor.q, neighbor.r);
        if (opponentCreature.size === creature.size - 1) {
          eatingOpportunities++;
        }
      }
    }
  }
  
  return eatingOpportunities;
}

function countSwarmThreat(boardState, creature, opponent) {
  let swarmers = 0;
  
  for (const piece of creature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (boardState.board.has(neighbor.key) && 
          boardState.board.get(neighbor.key).player === opponent) {
        const enemyCreature = getCreatureAtForBoardOriginal(boardState, neighbor.q, neighbor.r);
        if (enemyCreature.size === 1) {
          swarmers++;
        }
      }
    }
  }
  
  return Math.max(0, swarmers - 2); // Need 3 to swarm, so threat starts at 3
}

// AI Optimization Functions
function getBoardHash(boardState) {
  let hash = '';
  const sortedHexes = [...boardState.board.keys()].sort();
  for (const key of sortedHexes) {
    const cell = boardState.board.get(key);
    hash += `${key}:${cell.player};`;
  }
  hash += `scores:${boardState.scores[PLAYER_BLACK]},${boardState.scores[PLAYER_WHITE]}`;
  return hash;
}

function initializeOptimizationCaches() {
  // Initialize killer moves array for each depth
  killerMoves = [];
  for (let i = 0; i <= 8; i++) {
    killerMoves[i] = { move1: null, move2: null };
  }
  
  // Clear all caches
  transpositionTable.clear();
  evaluationCache.clear();
  creatureCache.clear();
  historyHeuristic[PLAYER_BLACK].clear();
  historyHeuristic[PLAYER_WHITE].clear();
  
  // Reset performance tracking
  performanceStats = {
    cacheHits: 0,
    cacheMisses: 0,
    evaluationCalls: 0,
    transpositionHits: 0,
    killerMoveHits: 0,
    searchDepth: 0,
    moveTime: 0,
    nodesEvaluated: 0
  };
}

function cleanupCaches() {
  // Clean up caches when they get too large
  if (transpositionTable.size > MAX_CACHE_SIZE) {
    const keysToDelete = [...transpositionTable.keys()].slice(0, Math.floor(transpositionTable.size * 0.3));
    keysToDelete.forEach(key => transpositionTable.delete(key));
  }
  
  if (evaluationCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = [...evaluationCache.keys()].slice(0, Math.floor(evaluationCache.size * 0.3));
    keysToDelete.forEach(key => evaluationCache.delete(key));
  }
  
  if (creatureCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = [...creatureCache.keys()].slice(0, Math.floor(creatureCache.size * 0.3));
    keysToDelete.forEach(key => creatureCache.delete(key));
  }
}

function updateHistoryHeuristic(player, move, depth) {
  const key = `${move.q},${move.r}`;
  const current = historyHeuristic[player].get(key) || 0;
  historyHeuristic[player].set(key, current + depth * depth);
}

function updateKillerMoves(move, depth) {
  if (!killerMoves[depth].move1 || 
      (killerMoves[depth].move1.q !== move.q || killerMoves[depth].move1.r !== move.r)) {
    killerMoves[depth].move2 = killerMoves[depth].move1;
    killerMoves[depth].move1 = move;
  }
}

function logPerformanceStats() {
  if (performanceStats.nodesEvaluated > 0) {
    const cacheHitRate = (performanceStats.cacheHits / (performanceStats.cacheHits + performanceStats.cacheMisses) * 100).toFixed(1);
    console.log('=== AI Performance Stats ===');
    console.log(`Search depth: ${performanceStats.searchDepth}`);
    console.log(`Move time: ${performanceStats.moveTime}ms`);
    console.log(`Nodes evaluated: ${performanceStats.nodesEvaluated}`);
    console.log(`Cache hit rate: ${cacheHitRate}%`);
    console.log(`Transposition hits: ${performanceStats.transpositionHits}`);
    console.log(`Killer move hits: ${performanceStats.killerMoveHits}`);
    console.log(`Transposition table size: ${transpositionTable.size}`);
    console.log(`Evaluation cache size: ${evaluationCache.size}`);
    console.log(`Creature cache size: ${creatureCache.size}`);
    console.log('=============================');
  }
}

function getMoveScore(move, player, depth) {
  const key = `${move.q},${move.r}`;
  let score = 0;
  
  // History heuristic score
  score += historyHeuristic[player].get(key) || 0;
  
  // Killer move bonus
  if (killerMoves[depth].move1 && 
      killerMoves[depth].move1.q === move.q && killerMoves[depth].move1.r === move.r) {
    performanceStats.killerMoveHits++;
    score += 1000;
  } else if (killerMoves[depth].move2 && 
             killerMoves[depth].move2.q === move.q && killerMoves[depth].move2.r === move.r) {
    performanceStats.killerMoveHits++;
    score += 500;
  }
  
  return score;
}

function getCreatureFromSignature(signature) {
  const [coords, playerStr] = signature.split('_');
  const [q, r] = coords.split(',').map(Number);
  const player = parseInt(playerStr);
  
  if (game.board.has(`${q},${r}`) && game.board.get(`${q},${r}`).player === player) {
    return getCreatureAt(q, r);
  }
  return null;
}

function canPlayerMove(player) {
  if (game.piecesInHand[player] <= 0) return false;
  
  for (const hex of game.validHexes) {
    if (game.board.get(`${hex.q},${hex.r}`).player === EMPTY) {
      const creature = getCreatureAt(hex.q, hex.r, { q: hex.q, r: hex.r, player });
      if (creature.size <= MAX_CREATURE_SIZE) {
        return true;
      }
    }
  }
  return false;
}

function endGame() {
  game.gameOver = true;
  
  if (game.scores[PLAYER_BLACK] > game.scores[PLAYER_WHITE]) {
    game.winner = PLAYER_BLACK;
  } else if (game.scores[PLAYER_WHITE] > game.scores[PLAYER_BLACK]) {
    game.winner = PLAYER_WHITE;
  } else {
    game.winner = game.lastPlayerToMove; // Tie goes to last player to move
  }
}

function updateStatusMessage() {
  if (game.gameOver) return;
  
  // Check if AI is thinking
  if (game.aiThinking) {
    const aiPlayerName = (game.gameMode === MODE_VS_AI_HUMAN_BLACK) ? "White" : "Black";
    const difficultyName = getDifficultyName(game.aiDifficulty);
    game.statusMessage = `AI (${difficultyName}) is thinking...`;
    return;
  }
  
  game.statusMessage = `Player ${getPlayerName(game.currentPlayer)}'s turn. Pieces: ${game.piecesInHand[game.currentPlayer]}`;
}

function getDifficultyName(difficulty) {
  switch(difficulty) {
    case AI_DIFFICULTY_EASY: return "Easy";
    case AI_DIFFICULTY_MEDIUM: return "Medium"; 
    case AI_DIFFICULTY_HARD: return "Hard";
    case AI_DIFFICULTY_EXPERT: return "Expert";
    case AI_DIFFICULTY_MASTER: return "Master";
    case AI_DIFFICULTY_GRANDMASTER: return "Grandmaster";
    case AI_DIFFICULTY_ULTIMATE: return "Ultimate";
    default: return "Unknown";
  }
}

function getPlayerName(player) {
  return player === PLAYER_BLACK ? "Black" : "White";
}

// AI Implementation
function getAIMove() {
  // Determine which player the AI is controlling
  const aiPlayer = game.gameMode === MODE_VS_AI_HUMAN_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const humanPlayer = aiPlayer === PLAYER_WHITE ? PLAYER_BLACK : PLAYER_WHITE;

  // Get all valid moves
  const validMoves = getValidMoves(aiPlayer);
  if (validMoves.length === 0) return null;

  // Easy AI: Just pick a random valid move occasionally, otherwise use basic evaluation
  if (game.aiDifficulty === AI_DIFFICULTY_EASY) {
    if (Math.random() < 0.3) { // 30% chance of random move
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    // Otherwise fall through to basic evaluation
  }

  // Check for immediate win (all difficulties)
  for (const move of validMoves) {
    const tempBoard = simulateMove(move.q, move.r, aiPlayer);
    if (tempBoard.scores[aiPlayer] >= WINNING_SCORE) {
      return move;
    }
  }

  // Expert, Master, Grandmaster and Ultimate AI: Use minimax with alpha-beta pruning
  if (game.aiDifficulty >= AI_DIFFICULTY_EXPERT) {
    return getMinimaxMoveOptimized(aiPlayer, humanPlayer, validMoves);
  }

  // Medium and Hard AI: Check for defensive moves
  const defensiveMoves = [];
  if (game.aiDifficulty >= AI_DIFFICULTY_MEDIUM) {
    for (const move of validMoves) {
      const tempBoard = simulateMove(move.q, move.r, aiPlayer);
      const humanValidMoves = getValidMovesForBoard(tempBoard, humanPlayer);
      
      let humanCanWin = false;
      for (const humanMove of humanValidMoves) {
        const humanTempBoard = simulateMoveOnBoard(tempBoard, humanMove.q, humanMove.r, humanPlayer);
        if (humanTempBoard.scores[humanPlayer] >= WINNING_SCORE) {
          humanCanWin = true;
          break;
        }
      }
      
      if (!humanCanWin) {
        defensiveMoves.push(move);
      }
    }
  }
  
  const movesToEvaluate = (game.aiDifficulty >= AI_DIFFICULTY_MEDIUM && defensiveMoves.length > 0) ? 
                          defensiveMoves : validMoves;

  // Evaluate all moves and pick the best one
  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of movesToEvaluate) {
    const score = evaluateMove(move.q, move.r, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function getMinimaxMoveOptimized(aiPlayer, humanPlayer, validMoves) {
  const moveStartTime = Date.now();
  
  // Deeper search and longer thinking time for higher difficulties
  let depth, maxThinkingTime;
  
  switch(game.aiDifficulty) {
    case AI_DIFFICULTY_EXPERT:
      depth = 5; // Increased from 4
      maxThinkingTime = 3000;
      break;
    case AI_DIFFICULTY_MASTER:
      depth = 6; // Increased from 5
      maxThinkingTime = 4000;
      break;
    case AI_DIFFICULTY_GRANDMASTER:
      depth = 7; // Increased from 6
      maxThinkingTime = 6000;
      break;
    case AI_DIFFICULTY_ULTIMATE:
      depth = 8; // Increased from 7
      maxThinkingTime = 10000;
      break;
    default:
      depth = 5;
      maxThinkingTime = 3000;
  }
  
  const startTime = Date.now();
  
  let bestMove = null;
  let bestScore = -Infinity;
  
  // Enhanced move ordering with multiple evaluation criteria
  const sortedMoves = validMoves.map(move => {
    const tempBoard = simulateMove(move.q, move.r, aiPlayer);
    const moveScore = evaluateMoveFast(tempBoard, move.q, move.r, aiPlayer);
    const captureScore = (tempBoard.scores[aiPlayer] - game.scores[aiPlayer]) * 1000;
    const threatScore = evaluateImmediateThreats(move.q, move.r, aiPlayer) * 100;
    const historyScore = getMoveScore(move, aiPlayer, 0);
    
    return {
      move,
      score: captureScore + threatScore + moveScore + historyScore
    };
  }).sort((a, b) => b.score - a.score).map(item => item.move);
  
  // Iterative deepening for better move ordering and time management
  let currentDepth = 1;
  const moveScores = new Map();
  
  while (currentDepth <= depth && Date.now() - startTime < maxThinkingTime * 0.8) {
    let currentBestMove = null;
    let currentBestScore = -Infinity;
    
    // Sort moves based on previous iteration scores
    const orderedMoves = currentDepth === 1 ? sortedMoves : 
      [...sortedMoves].sort((a, b) => (moveScores.get(`${b.q},${b.r}`) || -Infinity) - (moveScores.get(`${a.q},${a.r}`) || -Infinity));
    
    for (const move of orderedMoves) {
      if (Date.now() - startTime > maxThinkingTime * 0.9) break;
      
      const tempBoard = simulateMove(move.q, move.r, aiPlayer);
      const score = minimaxOptimized(tempBoard, currentDepth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer, startTime, maxThinkingTime);
      
      moveScores.set(`${move.q},${move.r}`, score);
      
      if (score > currentBestScore) {
        currentBestScore = score;
        currentBestMove = move;
      }
    }
    
    if (currentBestMove) {
      bestMove = currentBestMove;
      bestScore = currentBestScore;
    }
    
    currentDepth++;
  }
  
  // Log performance stats
  performanceStats.searchDepth = depth;
  performanceStats.moveTime = Date.now() - moveStartTime;
  logPerformanceStats();
  
  return bestMove || validMoves[0];
}

// Enhanced minimax with transposition table and move ordering
function minimaxOptimized(boardState, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer, startTime, maxThinkingTime) {
  performanceStats.nodesEvaluated++;
  
  // Check time limit
  if (Date.now() - startTime > maxThinkingTime) {
    return isMaximizing ? -1000 : 1000; // Return neutral bound instead of potentially incorrect alpha/beta
  }
  
  // Generate board hash for transposition table lookup
  const boardHash = getBoardHash(boardState);
  
  // Transposition table lookup
  const ttEntry = transpositionTable.get(boardHash);
  if (ttEntry && ttEntry.depth >= depth) {
    performanceStats.transpositionHits++;
    if (ttEntry.flag === TT_EXACT) {
      return ttEntry.score;
    } else if (ttEntry.flag === TT_LOWERBOUND) {
      alpha = Math.max(alpha, ttEntry.score);
    } else if (ttEntry.flag === TT_UPPERBOUND) {
      beta = Math.min(beta, ttEntry.score);
    }
    
    if (alpha >= beta) {
      return ttEntry.score;
    }
  }
  
  // Terminal conditions
  if (depth === 0 || boardState.scores[aiPlayer] >= WINNING_SCORE || boardState.scores[humanPlayer] >= WINNING_SCORE) {
    const score = evaluateBoardStateCached(boardState, aiPlayer, humanPlayer);
    
    // Store in transposition table
    transpositionTable.set(boardHash, {
      score: score,
      depth: depth,
      flag: TT_EXACT
    });
    
    return score;
  }
  
  const currentPlayer = isMaximizing ? aiPlayer : humanPlayer;
  const moves = getValidMovesForBoard(boardState, currentPlayer);
  
  if (moves.length === 0) {
    const score = evaluateBoardStateCached(boardState, aiPlayer, humanPlayer);
    
    // Store in transposition table
    transpositionTable.set(boardHash, {
      score: score,
      depth: depth,
      flag: TT_EXACT
    });
    
    return score;
  }
  
  // Enhanced move ordering with history heuristic and killer moves
  const sortedMoves = moves.map(move => ({
    move,
    score: evaluateMoveFast(boardState, move.q, move.r, currentPlayer) + getMoveScore(move, currentPlayer, depth)
  })).sort((a, b) => isMaximizing ? b.score - a.score : a.score - b.score).map(item => item.move);
  
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestMove = null;
  let flag = TT_UPPERBOUND; // Default: all moves failed high
  
  for (let i = 0; i < sortedMoves.length; i++) {
    const move = sortedMoves[i];
    
    if (Date.now() - startTime > maxThinkingTime) break;
    
    const newBoard = simulateMoveOnBoard(boardState, move.q, move.r, currentPlayer);
    const eval = minimaxOptimized(newBoard, depth - 1, alpha, beta, !isMaximizing, aiPlayer, humanPlayer, startTime, maxThinkingTime);
    
    if (isMaximizing) {
      if (eval > bestScore) {
        bestScore = eval;
        bestMove = move;
      }
      alpha = Math.max(alpha, eval);
      
      if (beta <= alpha) {
        // Beta cutoff - update history heuristic and killer moves
        updateHistoryHeuristic(currentPlayer, move, depth);
        updateKillerMoves(move, depth);
        flag = TT_LOWERBOUND; // Move failed high
        break;
      }
    } else {
      if (eval < bestScore) {
        bestScore = eval;
        bestMove = move;
      }
      beta = Math.min(beta, eval);
      
      if (beta <= alpha) {
        // Alpha cutoff - update history heuristic and killer moves
        updateHistoryHeuristic(currentPlayer, move, depth);
        updateKillerMoves(move, depth);
        flag = TT_LOWERBOUND; // Move failed high
        break;
      }
    }
    
    // If this is the first move or we found a new best move
    if (i === 0 || (isMaximizing && eval > alpha) || (!isMaximizing && eval < beta)) {
      flag = TT_EXACT; // We have an exact score
    }
  }
  
  // Store result in transposition table
  transpositionTable.set(boardHash, {
    score: bestScore,
    depth: depth,
    flag: flag,
    bestMove: bestMove
  });
  
  // Clean up cache if needed
  if (transpositionTable.size > MAX_CACHE_SIZE) {
    cleanupCaches();
  }
  
  return bestScore;
}

// AI Evaluation Caching Functions
function getCachedEvaluation(boardHash, funcName, ...params) {
  const cacheKey = `${funcName}|${boardHash}|${params.join('|')}`;
  return evaluationCache.get(cacheKey);
}

function setCachedEvaluation(boardHash, funcName, result, ...params) {
  const cacheKey = `${funcName}|${boardHash}|${params.join('|')}`;
  evaluationCache.set(cacheKey, result);
  
  // Clean up cache if it gets too large
  if (evaluationCache.size > MAX_CACHE_SIZE) {
    cleanupCaches();
  }
}

function evaluateBoardStateCached(boardState, aiPlayer, humanPlayer) {
  const boardHash = getBoardHash(boardState);
  const cached = getCachedEvaluation(boardHash, 'evaluateBoardState', aiPlayer, humanPlayer);
  if (cached !== undefined) {
    performanceStats.cacheHits++;
    return cached;
  }
  
  performanceStats.cacheMisses++;
  const result = evaluateBoardStateOriginal(boardState, aiPlayer, humanPlayer);
  setCachedEvaluation(boardHash, 'evaluateBoardState', result, aiPlayer, humanPlayer);
  return result;
}

function evaluateAdvancedAICached(tempBoard, q, r, player, baseScore) {
  const boardHash = getBoardHash(tempBoard);
  const cached = getCachedEvaluation(boardHash, 'evaluateAdvancedAI', q, r, player, baseScore);
  if (cached !== undefined) {
    return cached;
  }
  
  const result = evaluateAdvancedAIOriginal(tempBoard, q, r, player, baseScore);
  setCachedEvaluation(boardHash, 'evaluateAdvancedAI', result, q, r, player, baseScore);
  return result;
}

function getCreatureAtForBoardCached(boardState, q, r, overrideHex = null) {
  const boardHash = getBoardHash(boardState);
  const cacheKey = `${boardHash}|${q}|${r}${overrideHex ? `|${overrideHex.q}|${overrideHex.r}|${overrideHex.player}` : ''}`;
  
  const cached = creatureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  const result = getCreatureAtForBoardOriginal(boardState, q, r, overrideHex);
  creatureCache.set(cacheKey, result);
  
  // Clean up cache if it gets too large
  if (creatureCache.size > MAX_CACHE_SIZE) {
    cleanupCaches();
  }
  
  return result;
}

function evaluateBoardPositionCached(boardState, player) {
  const boardHash = getBoardHash(boardState);
  let cached = getCachedEvaluation(boardHash, 'evaluateBoardPosition', player);
  if (cached !== undefined) {
    return cached;
  }
  
  const result = evaluateBoardPositionOriginal(boardState, player);
  setCachedEvaluation(boardHash, 'evaluateBoardPosition', result, player);
  return result;
}

// Original versions of functions for caching system
function evaluateBoardStateOriginal(boardState, aiPlayer, humanPlayer) {
  const aiScore = boardState.scores[aiPlayer];
  const humanScore = boardState.scores[humanPlayer];
  
  // Basic win/loss evaluation
  if (aiScore >= WINNING_SCORE) return 1000;
  if (humanScore >= WINNING_SCORE) return -1000;
  
  // Score difference
  let evaluation = (aiScore - humanScore) * 50;
  
  // Position evaluation
  evaluation += evaluateBoardPositionOriginal(boardState, aiPlayer);
  evaluation -= evaluateBoardPositionOriginal(boardState, humanPlayer);
  
  return evaluation;
}

function evaluateAdvancedAIOriginal(tempBoard, q, r, player, baseScore) {
  let score = baseScore;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const placedCreature = getCreatureAtForBoardOriginal(tempBoard, q, r);
  
  // Territory control
  const territoryScore = evaluateTerritoryControl(tempBoard, player);
  const opponentTerritory = evaluateTerritoryControl(tempBoard, opponent);
  score += (territoryScore - opponentTerritory) * 20;
  
  // Connectivity
  const connectivityScore = evaluateConnectivity(tempBoard, player);
  score += connectivityScore * 12;
  
  // Creature placement value
  score += evaluateCreaturePlacement(tempBoard, placedCreature, q, r);
  
  // Distance from center
  const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  score += (6 - distanceFromCenter) * 5;
  
  // Threat evaluation
  const threats = countAdjacentOpponentPieces(tempBoard, q, r, opponent);
  if (placedCreature.size === MAX_CREATURE_SIZE) {
    score -= threats * 15; // Large creatures are vulnerable
  }
  
  // Random factor based on difficulty
  let randomFactor;
  switch(game.aiDifficulty) {
    case AI_DIFFICULTY_EXPERT: randomFactor = 3; break;
    case AI_DIFFICULTY_MASTER: randomFactor = 1.5; break;
    case AI_DIFFICULTY_GRANDMASTER: randomFactor = 0.8; break;
    case AI_DIFFICULTY_ULTIMATE: randomFactor = 0.3; break;
    default: randomFactor = 3;
  }
  score += (Math.random() - 0.5) * randomFactor;
  
  return score;
}

function getCreatureAtForBoardOriginal(boardState, startQ, startR, hypotheticalPiece = null) {
  const board = hypotheticalPiece ? 
    new Map([...boardState.board, [`${hypotheticalPiece.q},${hypotheticalPiece.r}`, hypotheticalPiece]]) :
    boardState.board;
  
  const startKey = `${startQ},${startR}`;
  if (!board.has(startKey) || board.get(startKey).player === EMPTY) {
    return { pieces: [], size: 0, player: EMPTY };
  }
  
  const targetPlayer = board.get(startKey).player;
  const visited = new Set();
  const queue = [{ q: startQ, r: startR }];
  const pieces = [];
  let iterations = 0;
  const maxIterations = 1000; // Safety limit
  
  while (queue.length > 0 && iterations < maxIterations) {
    const current = queue.shift();
    const key = `${current.q},${current.r}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    pieces.push(current);
    
    for (const neighbor of getNeighbors(current.q, current.r)) {
      if (!visited.has(neighbor.key) && 
          board.has(neighbor.key) && 
          board.get(neighbor.key).player === targetPlayer) {
        queue.push({ q: neighbor.q, r: neighbor.r });
      }
    }
    iterations++;
  }
  
  return { pieces, size: pieces.length, player: targetPlayer };
}

function evaluateBoardPositionOriginal(boardState, player) {
  let positionScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Evaluate each piece/creature
  const visitedHexes = new Set();
  for (const [key, cell] of boardState.board) {
    if (cell.player === player && !visitedHexes.has(key)) {
      const [q, r] = key.split(',').map(Number);
      const creature = getCreatureAtForBoardOriginal(boardState, q, r);
      
      // Mark all pieces of this creature as visited
      for (const piece of creature.pieces) {
        visitedHexes.add(`${piece.q},${piece.r}`);
      }
      
      // Score based on creature size
      switch(creature.size) {
        case 1: positionScore += 5; break;
        case 2: positionScore += 20; break;
        case 3: positionScore += 35; break;
        case 4: positionScore += 25; break; // Less valuable due to swarm risk
      }
      
      // Central position bonus
      const avgQ = creature.pieces.reduce((sum, p) => sum + p.q, 0) / creature.pieces.length;
      const avgR = creature.pieces.reduce((sum, p) => sum + p.r, 0) / creature.pieces.length;
      const distanceFromCenter = Math.abs(avgQ) + Math.abs(avgR) + Math.abs(-avgQ - avgR);
      positionScore += (6 - distanceFromCenter) * 2;
      
      // Connectivity bonus
      let connectivityBonus = 0;
      for (const piece of creature.pieces) {
        for (const neighbor of getNeighbors(piece.q, piece.r)) {
          if (boardState.board.has(neighbor.key) && 
              boardState.board.get(neighbor.key).player === player) {
            connectivityBonus += 1;
          }
        }
      }
      positionScore += connectivityBonus * 2;
    }
  }
  
  return positionScore;
}

// Support functions for advanced AI evaluation
function evaluateTerritoryControl(boardState, player) {
  let territoryScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  for (const [key, cell] of boardState.board) {
    if (cell.player === player) {
      const [q, r] = key.split(',').map(Number);
      for (const neighbor of getNeighbors(q, r)) {
        if (boardState.board.has(neighbor.key)) {
          const neighborCell = boardState.board.get(neighbor.key);
          if (neighborCell.player === EMPTY || neighborCell.player === opponent) {
            territoryScore++;
          }
        }
      }
    }
  }
  
  return territoryScore;
}

function evaluateConnectivity(boardState, player) {
  let connectivityScore = 0;
  const visited = new Set();
  
  for (const [key, cell] of boardState.board) {
    if (cell.player === player && !visited.has(key)) {
      const [q, r] = key.split(',').map(Number);
      const creature = getCreatureAtForBoardOriginal(boardState, q, r);
      
      for (const piece of creature.pieces) {
        visited.add(`${piece.q},${piece.r}`);
      }
      
      connectivityScore += creature.size * creature.size;
    }
  }
  
  return connectivityScore;
}

function evaluateCreaturePlacement(boardState, creature, q, r) {
  let placementScore = 0;
  
  switch(creature.size) {
    case 1: placementScore += 5; break;
    case 2: placementScore += 25; break;
    case 3: placementScore += 45; break;
    case 4:
      const surroundingEnemies = countSurroundingEnemies(boardState, creature);
      placementScore += 35 - (surroundingEnemies * 10);
      break;
  }
  
  const edgeBonus = isNearEdge(q, r) ? 5 : 0;
  placementScore += edgeBonus;
  
  return placementScore;
}

function countSurroundingEnemies(boardState, creature) {
  let enemyCount = 0;
  const opponent = creature.player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  for (const piece of creature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (boardState.board.has(neighbor.key) &&
          boardState.board.get(neighbor.key).player === opponent) {
        enemyCount++;
      }
    }
  }
  
  return enemyCount;
}

function isNearEdge(q, r) {
  const distance = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  return distance >= BOARD_RADIUS * 2 - 1;
}

// Coordinate conversion functions
function axialToPixel(q, r) {
  const x = hexSize * (sqrt(3) * q + sqrt(3) / 2 * r);
  const y = hexSize * (3 / 2 * r);
  return { x: x + boardCenter.x, y: y + boardCenter.y };
}

function pixelToAxial(x, y) {
  const relativeX = x - boardCenter.x;
  const relativeY = y - boardCenter.y;
  
  const q_frac = (sqrt(3) / 3 * relativeX - 1 / 3 * relativeY) / hexSize;
  const r_frac = (2 / 3 * relativeY) / hexSize;
  const s_frac = -q_frac - r_frac;
  
  let q_round = Math.round(q_frac);
  let r_round = Math.round(r_frac);
  let s_round = Math.round(s_frac);
  
  const q_diff = Math.abs(q_round - q_frac);
  const r_diff = Math.abs(r_round - r_frac);
  const s_diff = Math.abs(s_round - s_frac);
  
  if (q_diff > r_diff && q_diff > s_diff) {
    q_round = -r_round - s_round;
  } else if (r_diff > s_diff) {
    r_round = -q_round - s_round;
  }
  
  return game.board.has(`${q_round},${r_round}`) ? { q: q_round, r: r_round } : null;
}

function drawHex(x, y, size, fillColor) {
  stroke(0, 0, 20);
  strokeWeight(1);
  fill(fillColor);
  
  beginShape();
  for (let i = 0; i < 6; i++) {
    const angle = TWO_PI / 6 * (i + 0.5);
    const vx = x + size * cos(angle);
    const vy = y + size * sin(angle);
    vertex(vx, vy);
  }
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateHexSize();
}