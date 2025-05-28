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

// Display settings
let hexSize = 25;
let boardCenter = { x: 0, y: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
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
  text("EAT YOUR", width / 2, height / 2 - 40);
  text("NEIGHBOUR", width / 2, height / 2 + 10);
  
  // Creator credit
  textSize(18);
  fill(0, 0, 40);
  text("game by Nick Bentley, javascript Christian Nold", width / 2, height / 2 + 60);
  
  // Instructions
  textSize(16);
  fill(0, 0, 30);
  text("Click to continue", width / 2, height / 2 + 120);
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
    buttonColor = color(120, 70, 80); // Green for selected
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
  
  // Score display
  textSize(16);
  text(`Black: ${game.scores[PLAYER_BLACK]} eaten / ${game.piecesInHand[PLAYER_BLACK]} left`, width / 4, 30);
  text(`White: ${game.scores[PLAYER_WHITE]} eaten / ${game.piecesInHand[PLAYER_WHITE]} left`, 3 * width / 4, 30);
  
  // Status message with color indicator
  textSize(18);
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
  
  while (queue.length > 0) {
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
    return getMinimaxMove(aiPlayer, humanPlayer, validMoves);
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

function getMinimaxMove(aiPlayer, humanPlayer, validMoves) {
  // Deeper search and longer thinking time for higher difficulties
  let depth, maxThinkingTime;
  
  switch(game.aiDifficulty) {
    case AI_DIFFICULTY_EXPERT:
      depth = 3;
      maxThinkingTime = 2000;
      break;
    case AI_DIFFICULTY_MASTER:
      depth = 4;
      maxThinkingTime = 3000;
      break;
    case AI_DIFFICULTY_GRANDMASTER:
      depth = 5;
      maxThinkingTime = 5000;
      break;
    case AI_DIFFICULTY_ULTIMATE:
      depth = 6;
      maxThinkingTime = 8000;
      break;
    default:
      depth = 3;
      maxThinkingTime = 2000;
  }
  
  const startTime = Date.now();
  
  let bestMove = null;
  let bestScore = -Infinity;
  
  // Sort moves by initial evaluation to improve alpha-beta efficiency
  const sortedMoves = validMoves.map(move => ({
    move,
    score: evaluateMove(move.q, move.r, aiPlayer)
  })).sort((a, b) => b.score - a.score).map(item => item.move);
  
  for (const move of sortedMoves) {
    // Check time limit
    if (Date.now() - startTime > maxThinkingTime) {
      break;
    }
    
    const tempBoard = simulateMove(move.q, move.r, aiPlayer);
    const score = minimax(tempBoard, depth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer, startTime, maxThinkingTime);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove || validMoves[0]; // Fallback to first move if time ran out
}

function minimax(boardState, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer, startTime, maxThinkingTime) {
  // Check time limit
  if (Date.now() - startTime > maxThinkingTime) {
    return isMaximizing ? alpha : beta;
  }
  
  // Terminal conditions
  if (depth === 0 || boardState.scores[aiPlayer] >= WINNING_SCORE || boardState.scores[humanPlayer] >= WINNING_SCORE) {
    return evaluateBoardState(boardState, aiPlayer, humanPlayer);
  }
  
  const currentPlayer = isMaximizing ? aiPlayer : humanPlayer;
  const moves = getValidMovesForBoard(boardState, currentPlayer);
  
  if (moves.length === 0) {
    return evaluateBoardState(boardState, aiPlayer, humanPlayer);
  }
  
  // Sort moves for better alpha-beta pruning
  const sortedMoves = moves.map(move => ({
    move,
    score: evaluateMoveFast(boardState, move.q, move.r, currentPlayer)
  })).sort((a, b) => isMaximizing ? b.score - a.score : a.score - b.score).map(item => item.move);
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of sortedMoves) {
      if (Date.now() - startTime > maxThinkingTime) break;
      
      const newBoard = simulateMoveOnBoard(boardState, move.q, move.r, currentPlayer);
      const eval = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer, humanPlayer, startTime, maxThinkingTime);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      
      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of sortedMoves) {
      if (Date.now() - startTime > maxThinkingTime) break;
      
      const newBoard = simulateMoveOnBoard(boardState, move.q, move.r, currentPlayer);
      const eval = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer, humanPlayer, startTime, maxThinkingTime);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      
      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }
    return minEval;
  }
}

function evaluateBoardState(boardState, aiPlayer, humanPlayer) {
  // Terminal evaluation for minimax
  let score = 0;
  
  // Primary factor: score difference
  score += (boardState.scores[aiPlayer] - boardState.scores[humanPlayer]) * 100;
  
  // Check for immediate wins
  if (boardState.scores[aiPlayer] >= WINNING_SCORE) {
    return 10000;
  }
  if (boardState.scores[humanPlayer] >= WINNING_SCORE) {
    return -10000;
  }
  
  // Secondary factors (simplified for speed)
  score += evaluateBoardPosition(boardState, aiPlayer) * 10;
  score -= evaluateBoardPosition(boardState, humanPlayer) * 8;
  
  return score;
}

function evaluateBoardPosition(boardState, player) {
  let positionScore = 0;
  const creatureCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
  
  for (const [key, cell] of boardState.board) {
    if (cell.player === player) {
      const [q, r] = key.split(',').map(Number);
      const creature = getCreatureAtForBoard(boardState, q, r);
      
      if (!isNaN(creature.size) && creature.size > 0) {
        creatureCount[creature.size]++;
        
        // Position bonuses
        const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
        positionScore += (6 - distanceFromCenter) * 0.5;
      }
    }
  }
  
  // Creature composition bonuses
  positionScore += creatureCount[2] * 3;
  positionScore += creatureCount[3] * 5;
  positionScore += creatureCount[4] * 3; // Less bonus for vulnerable size-4
  
  return positionScore;
}

function evaluateMoveFast(boardState, q, r, player) {
  // Fast evaluation for move ordering in minimax
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  let score = 0;
  
  // Immediate captures
  score += (tempBoard.scores[player] - boardState.scores[player]) * 100;
  
  // Basic position value
  const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  score += (6 - distanceFromCenter) * 2;
  
  // Creature size bonus
  const creature = getCreatureAtForBoard(tempBoard, q, r);
  if (creature.size === 2) score += 10;
  else if (creature.size === 3) score += 20;
  else if (creature.size === 4) score += 15;
  
  return score;
}

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

function getValidMovesForBoard(board, player) {
  const moves = [];
  for (const hex of game.validHexes) {
    if (board.board.get(`${hex.q},${hex.r}`).player === EMPTY) {
      const creature = getCreatureAtForBoard(board, hex.q, hex.r, { q: hex.q, r: hex.r, player });
      if (creature.size <= MAX_CREATURE_SIZE) {
        moves.push({ q: hex.q, r: hex.r });
      }
    }
  }
  return moves;
}

function evaluateMove(q, r, player) {
  const tempBoard = simulateMove(q, r, player);
  
  // Base score from pieces eaten
  let score = (tempBoard.scores[player] - game.scores[player]) * 100;
  
  // Apply difficulty-based evaluation
  if (game.aiDifficulty === AI_DIFFICULTY_EASY) {
    // Easy AI: Only considers immediate eating, adds more randomness
    score += (Math.random() - 0.5) * 50; // High randomness
    return score;
  }
  
  if (game.aiDifficulty === AI_DIFFICULTY_MEDIUM) {
    // Medium AI: Basic strategy with some randomness
    // Bonus for being closer to winning
    score += tempBoard.scores[player] * 8;
    
    // Penalty for opponent being closer to winning
    const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    score -= tempBoard.scores[opponent] * 6;
    
    // Basic creature size evaluation
    const placedCreature = getCreatureAtForBoard(tempBoard, q, r);
    if (placedCreature.size === 2) score += 15;
    else if (placedCreature.size === 3) score += 25;
    
    // Some randomness
    score += (Math.random() - 0.5) * 25;
    return score;
  }
  
  if (game.aiDifficulty === AI_DIFFICULTY_HARD) {
    // Hard AI: Full strategic evaluation
    score = evaluateHardAI(tempBoard, q, r, player, score);
    return score;
  }
  
  if (game.aiDifficulty >= AI_DIFFICULTY_EXPERT) {
    // Expert/Master/Grandmaster/Ultimate AI: Use advanced evaluation
    score = evaluateAdvancedAI(tempBoard, q, r, player, score);
    return score;
  }
  
  // Fallback to hard AI evaluation
  score = evaluateHardAI(tempBoard, q, r, player, score);
  return score;
}

function evaluateHardAI(tempBoard, q, r, player, baseScore) {
  let score = baseScore;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Bonus for being closer to winning
  score += tempBoard.scores[player] * 10;
  
  // Penalty for opponent being closer to winning
  score -= tempBoard.scores[opponent] * 8;
  
  // Evaluate creature sizes and positions
  const placedCreature = getCreatureAtForBoard(tempBoard, q, r);
  
  // Bonus for creating larger creatures (but not too large)
  if (placedCreature.size === 2) score += 20;
  else if (placedCreature.size === 3) score += 35;
  else if (placedCreature.size === 4) score += 25; // Less bonus for size 4 (vulnerable)
  
  // Bonus for central positions
  const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  score += (6 - distanceFromCenter) * 5;
  
  // Check if this move creates eating opportunities next turn
  const nextTurnEating = countPotentialEating(tempBoard, q, r, player);
  score += nextTurnEating * 30;
  
  // Penalty for creating vulnerable size-4 creatures
  if (placedCreature.size === MAX_CREATURE_SIZE) {
    const swarmThreat = countSwarmThreat(tempBoard, placedCreature, opponent);
    score -= swarmThreat * 40;
  }
  
  // Small random factor to avoid predictable play
  score += (Math.random() - 0.5) * 10;
  
  return score;
}

function evaluateAdvancedAI(tempBoard, q, r, player, baseScore) {
  let score = baseScore;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const placedCreature = getCreatureAtForBoard(tempBoard, q, r);
  
  // Advanced strategic evaluation
  
  // 1. Territory Control - evaluate area influence
  const territoryScore = evaluateTerritoryControl(tempBoard, player);
  score += territoryScore * 15;
  
  // 2. Connectivity - bonus for keeping pieces connected
  const connectivityScore = evaluateConnectivity(tempBoard, player);
  score += connectivityScore * 10;
  
  // 3. Phase-specific strategy
  const gamePhase = determineGamePhase(tempBoard);
  score += evaluatePhaseStrategy(tempBoard, q, r, player, gamePhase);
  
  // 4. Tactical patterns
  score += evaluateTacticalPatterns(tempBoard, q, r, player);
  
  // 5. Enhanced creature size evaluation with position context
  score += evaluateCreaturePlacement(tempBoard, placedCreature, q, r);
  
  // 6. Defensive considerations
  score += evaluateDefensiveValue(tempBoard, q, r, player);
  
  // 7. Future potential analysis
  score += evaluateFuturePotential(tempBoard, q, r, player);
  
  // 8. Minimize randomness for more consistent play at higher levels
  let randomFactor;
  switch(game.aiDifficulty) {
    case AI_DIFFICULTY_EXPERT:
      randomFactor = 5;
      break;
    case AI_DIFFICULTY_MASTER:
      randomFactor = 2;
      break;
    case AI_DIFFICULTY_GRANDMASTER:
      randomFactor = 1;
      break;
    case AI_DIFFICULTY_ULTIMATE:
      randomFactor = 0.5;
      break;
    default:
      randomFactor = 5;
  }
  score += (Math.random() - 0.5) * randomFactor;
  
  // 9. Enhanced evaluation for Grandmaster and Ultimate levels
  if (game.aiDifficulty >= AI_DIFFICULTY_GRANDMASTER) {
    // Multi-move tactical sequences
    score += evaluateMultiMoveTactics(tempBoard, q, r, player);
    
    // Advanced positional understanding
    score += evaluateAdvancedPositional(tempBoard, q, r, player);
    
    // Endgame precision
    if (determineGamePhase(tempBoard) === 'endgame') {
      score += evaluateEndgamePrecision(tempBoard, q, r, player);
    }
  }
  
  return score;
}

// Enhanced evaluation functions for Grandmaster and Ultimate AI levels
function evaluateMultiMoveTactics(boardState, q, r, player) {
  let tacticalScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Look ahead 2-3 moves to find tactical sequences
  // Check for sacrifice combinations that lead to bigger gains
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const opponentMoves = getValidMovesForBoard(tempBoard, opponent);
  
  let maxCounterScore = -Infinity;
  for (const opMove of opponentMoves.slice(0, 5)) { // Limit to top 5 opponent moves
    const opTempBoard = simulateMoveOnBoard(tempBoard, opMove.q, opMove.r, opponent);
    const ourFollowUps = getValidMovesForBoard(opTempBoard, player);
    
    for (const followUp of ourFollowUps.slice(0, 3)) { // Top 3 follow-ups
      const finalBoard = simulateMoveOnBoard(opTempBoard, followUp.q, followUp.r, player);
      const score = (finalBoard.scores[player] - boardState.scores[player]) * 50;
      maxCounterScore = Math.max(maxCounterScore, score);
    }
  }
  
  if (maxCounterScore > 0) {
    tacticalScore += maxCounterScore * 0.7; // Discount future gains
  }
  
  return tacticalScore;
}

function evaluateAdvancedPositional(boardState, q, r, player) {
  let positionalScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Advanced pawn structure concepts
  // 1. Weak squares (empty spaces surrounded by enemy pieces)
  const weakSquareControl = evaluateWeakSquareControl(boardState, q, r, player);
  positionalScore += weakSquareControl * 12;
  
  // 2. Piece activity (how many squares each piece controls)
  const activityScore = evaluatePieceActivity(boardState, q, r, player);
  positionalScore += activityScore * 8;
  
  // 3. King safety equivalent (protecting your largest creatures)
  const largestCreatureSafety = evaluateLargestCreatureSafety(boardState, player);
  positionalScore += largestCreatureSafety * 20;
  
  // 4. Space advantage (controlling more of the board)
  const spaceAdvantage = evaluateSpaceAdvantage(boardState, player, opponent);
  positionalScore += spaceAdvantage * 6;
  
  return positionalScore;
}

function evaluateEndgamePrecision(boardState, q, r, player) {
  let endgameScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // In endgame, focus on:
  // 1. Converting advantages into wins
  const scoreAdvantage = boardState.scores[player] - boardState.scores[opponent];
  if (scoreAdvantage > 0) {
    // We're ahead, play more conservatively but efficiently
    const conservativeBonus = evaluateConservativePlay(boardState, q, r, player);
    endgameScore += conservativeBonus * 15;
  } else {
    // We're behind, need to take risks and create complications
    const complicationBonus = evaluateComplications(boardState, q, r, player);
    endgameScore += complicationBonus * 25;
  }
  
  // 2. Piece coordination in endgame
  const coordinationScore = evaluateEndgameCoordination(boardState, q, r, player);
  endgameScore += coordinationScore * 10;
  
  // 3. Precise calculation (avoid moves that don't improve position)
  const progressScore = evaluateProgress(boardState, q, r, player);
  endgameScore += progressScore * 8;
  
  return endgameScore;
}

// Helper functions for advanced positional evaluation
function evaluateWeakSquareControl(boardState, q, r, player) {
  let control = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Check if this move controls important weak squares
  for (const neighbor of getNeighbors(q, r)) {
    if (!boardState.board.has(neighbor.key) || 
        boardState.board.get(neighbor.key).player === EMPTY) {
      // This is an empty square we now influence
      let enemyNeighbors = 0;
      for (const subNeighbor of getNeighbors(neighbor.q, neighbor.r)) {
        if (boardState.board.has(subNeighbor.key) && 
            boardState.board.get(subNeighbor.key).player === opponent) {
          enemyNeighbors++;
        }
      }
      if (enemyNeighbors >= 2) {
        control += 3; // Controlling a weak square
      }
    }
  }
  
  return control;
}

function evaluatePieceActivity(boardState, q, r, player) {
  // Count how many squares this piece can influence
  let activity = 0;
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const creature = getCreatureAtForBoard(tempBoard, q, r);
  
  // Larger creatures have more activity
  activity += creature.size * 3;
  
  // Pieces in center are more active
  const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  activity += (6 - distanceFromCenter) * 2;
  
  return activity;
}

function evaluateLargestCreatureSafety(boardState, player) {
  let safety = 0;
  let largestSize = 0;
  let largestCreature = null;
  
  // Find largest creature
  for (const [key, cell] of boardState.board) {
    if (cell.player === player) {
      const [q, r] = key.split(',').map(Number);
      const creature = getCreatureAtForBoard(boardState, q, r);
      if (creature.size > largestSize) {
        largestSize = creature.size;
        largestCreature = creature;
      }
    }
  }
  
  if (largestCreature && largestSize >= 3) {
    // Check how protected this creature is
    const enemyThreats = countSurroundingEnemies(boardState, largestCreature);
    safety = Math.max(0, 10 - enemyThreats * 3);
  }
  
  return safety;
}

function evaluateSpaceAdvantage(boardState, player, opponent) {
  let playerInfluence = 0;
  let opponentInfluence = 0;
  
  // Count influenced squares for both players
  for (const [key, cell] of boardState.board) {
    if (cell.player === EMPTY) {
      const [q, r] = key.split(',').map(Number);
      let playerNeighbors = 0;
      let opponentNeighbors = 0;
      
      for (const neighbor of getNeighbors(q, r)) {
        if (boardState.board.has(neighbor.key)) {
          const neighCell = boardState.board.get(neighbor.key);
          if (neighCell.player === player) playerNeighbors++;
          else if (neighCell.player === opponent) opponentNeighbors++;
        }
      }
      
      if (playerNeighbors > opponentNeighbors) playerInfluence++;
      else if (opponentNeighbors > playerNeighbors) opponentInfluence++;
    }
  }
  
  return playerInfluence - opponentInfluence;
}

function evaluateConservativePlay(boardState, q, r, player) {
  // When ahead, prefer safe moves that maintain advantage
  let conservativeScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Prefer moves that don't expose pieces to counterattack
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const exposureRisk = countExposureRisk(tempBoard, q, r, opponent);
  conservativeScore -= exposureRisk * 5;
  
  // Prefer moves that consolidate position
  const consolidationBonus = evaluateConsolidation(tempBoard, q, r, player);
  conservativeScore += consolidationBonus * 8;
  
  return conservativeScore;
}

function evaluateComplications(boardState, q, r, player) {
  // When behind, prefer moves that create tactical complexity
  let complicationScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Prefer moves that create multiple threats
  const multipleThreats = countMultipleThreats(boardState, q, r, player);
  complicationScore += multipleThreats * 12;
  
  // Prefer sacrificial moves that lead to counterplay
  const sacrificeValue = evaluateSacrificeCounterplay(boardState, q, r, player);
  complicationScore += sacrificeValue * 10;
  
  return complicationScore;
}

function evaluateEndgameCoordination(boardState, q, r, player) {
  // In endgame, pieces should work together
  let coordination = 0;
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  
  // Count how many friendly pieces this move supports
  let supportedPieces = 0;
  for (const neighbor of getNeighbors(q, r)) {
    if (tempBoard.board.has(neighbor.key) && 
        tempBoard.board.get(neighbor.key).player === player) {
      supportedPieces++;
    }
  }
  
  coordination += supportedPieces * 4;
  
  return coordination;
}

function evaluateProgress(boardState, q, r, player) {
  // Moves should improve position or threaten to improve it
  let progress = 0;
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  
  // Progress = better score position + better positional factors
  const scoreDiff = tempBoard.scores[player] - boardState.scores[player];
  progress += scoreDiff * 20;
  
  // Positional progress (harder to quantify but try)
  const newPieceValue = evaluatePieceActivity(boardState, q, r, player);
  progress += newPieceValue * 0.5;
  
  return progress;
}

// Simplified helper functions for the most complex evaluations
function countExposureRisk(boardState, q, r, opponent) {
  // Count how many opponent pieces can potentially attack this position
  let risk = 0;
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === opponent) {
      risk++;
    }
  }
  return risk;
}

function evaluateConsolidation(boardState, q, r, player) {
  // Measure how well this move connects with existing pieces
  let consolidation = 0;
  let friendlyNeighbors = 0;
  
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === player) {
      friendlyNeighbors++;
    }
  }
  
  consolidation = friendlyNeighbors * 3;
  return consolidation;
}

function countMultipleThreats(boardState, q, r, player) {
  // Count how many different threats this move creates
  let threats = 0;
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Check if we threaten multiple opponent creatures
  const threatenedCreatures = new Set();
  for (const neighbor of getNeighbors(q, r)) {
    if (tempBoard.board.has(neighbor.key) && 
        tempBoard.board.get(neighbor.key).player === opponent) {
      const creature = getCreatureAtForBoard(tempBoard, neighbor.q, neighbor.r);
      threatenedCreatures.add(getCreatureSignature(creature));
    }
  }
  
  threats = threatenedCreatures.size;
  return threats;
}

function evaluateSacrificeCounterplay(boardState, q, r, player) {
  // Evaluate if losing this piece creates counterplay opportunities
  let counterplay = 0;
  const tempBoard = simulateMoveOnBoard(boardState, q, r, player);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // If this piece can be captured, does it expose opponent pieces?
  const captureableBy = [];
  for (const neighbor of getNeighbors(q, r)) {
    if (tempBoard.board.has(neighbor.key) && 
        tempBoard.board.get(neighbor.key).player === opponent) {
      captureableBy.push(neighbor);
    }
  }
  
  if (captureableBy.length > 0) {
    // If we can be captured, check what we threaten in return
    counterplay += countMultipleThreats(boardState, q, r, player) * 2;
  }
  
  return counterplay;
}

function simulateMove(q, r, player) {
  // Create a deep copy of the game state
  const tempBoard = {
    board: new Map(),
    scores: { ...game.scores },
    piecesInHand: { ...game.piecesInHand }
  };
  
  // Copy board state
  for (const [key, value] of game.board) {
    tempBoard.board.set(key, { ...value });
  }
  
  // Simulate the move
  tempBoard.board.get(`${q},${r}`).player = player;
  tempBoard.piecesInHand[player]--;
  
  // Process eating and swarming
  const piecesEaten = processEatingAndSwarmingForBoard(tempBoard, q, r, player);
  tempBoard.scores[player] += piecesEaten;
  
  return tempBoard;
}

function simulateMoveOnBoard(boardState, q, r, player) {
  // Create a deep copy of the board state
  const tempBoard = {
    board: new Map(),
    scores: { ...boardState.scores },
    piecesInHand: { ...boardState.piecesInHand }
  };
  
  // Copy board state
  for (const [key, value] of boardState.board) {
    tempBoard.board.set(key, { ...value });
  }
  
  // Simulate the move
  tempBoard.board.get(`${q},${r}`).player = player;
  tempBoard.piecesInHand[player]--;
  
  // Process eating and swarming
  const piecesEaten = processEatingAndSwarmingForBoard(tempBoard, q, r, player);
  tempBoard.scores[player] += piecesEaten;
  
  return tempBoard;
}

function processEatingAndSwarmingForBoard(boardState, placedQ, placedR, currentPlayer) {
  const placedCreature = getCreatureAtForBoard(boardState, placedQ, placedR);
  const opponent = currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const creaturesEaten = new Set();
  
  // Rule 1: Eating
  if (placedCreature.size > 1) {
    for (const piece of placedCreature.pieces) {
      for (const neighbor of getNeighbors(piece.q, piece.r)) {
        if (boardState.board.has(neighbor.key) && boardState.board.get(neighbor.key).player === opponent) {
          const opponentCreature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
          if (opponentCreature.size === placedCreature.size - 1) {
            creaturesEaten.add(getCreatureSignature(opponentCreature));
          }
        }
      }
    }
  }
  
  // Rule 2: Swarming
  if (placedCreature.size === 1) {
    for (const neighbor of getNeighbors(placedQ, placedR)) {
      if (boardState.board.has(neighbor.key) && boardState.board.get(neighbor.key).player === opponent) {
        const targetCreature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
        if (targetCreature.size === MAX_CREATURE_SIZE) {
          const swarmCount = countSwarmingCreaturesForBoard(boardState, targetCreature, currentPlayer, placedQ, placedR);
          if (swarmCount >= 2) {
            creaturesEaten.add(getCreatureSignature(targetCreature));
          }
        }
      }
    }
  }
  
  // Remove eaten creatures
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

function getCreatureAtForBoard(boardState, startQ, startR, hypotheticalPiece = null) {
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
  
  while (queue.length > 0) {
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
  }
  
  return { pieces, size: pieces.length, player: targetPlayer };
}

function countSwarmingCreaturesForBoard(boardState, targetCreature, friendlyPlayer, excludeQ, excludeR) {
  const swarmers = new Set();
  
  for (const piece of targetCreature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (neighbor.q === excludeQ && neighbor.r === excludeR) continue;
      
      if (boardState.board.has(neighbor.key) && boardState.board.get(neighbor.key).player === friendlyPlayer) {
        const creature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
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
    return getCreatureAtForBoard(boardState, q, r);
  }
  return null;
}

function countPotentialEating(boardState, q, r, player) {
  const creature = getCreatureAtForBoard(boardState, q, r);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  let eatingOpportunities = 0;
  
  for (const piece of creature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (boardState.board.has(neighbor.key) && boardState.board.get(neighbor.key).player === opponent) {
        const opponentCreature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
        if (opponentCreature.size === creature.size - 1) {
          eatingOpportunities++;
        }
      }
    }
  }
  
  return eatingOpportunities;
}

function countSwarmThreat(boardState, targetCreature, opponent) {
  const swarmers = new Set();
  
  for (const piece of targetCreature.pieces) {
    for (const neighbor of getNeighbors(piece.q, piece.r)) {
      if (boardState.board.has(neighbor.key)) {
        const cell = boardState.board.get(neighbor.key);
        if (cell.player === EMPTY) {
          // Count empty spaces that could become swarmers
          swarmers.add(neighbor.key);
        } else if (cell.player === opponent) {
          const creature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
          if (creature.size === 1) {
            swarmers.add(neighbor.key);
          }
        }
      }
    }
  }
  
  return Math.max(0, swarmers.size - 2); // Threat level based on how many swarmers are possible
}

// Advanced AI Evaluation Functions for Expert and Master levels

function evaluateTerritoryControl(boardState, player) {
  let territoryScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Count influenced hexes (hexes adjacent to player's pieces)
  const influencedHexes = new Set();
  
  for (const [key, cell] of boardState.board) {
    if (cell.player === player) {
      const [q, r] = key.split(',').map(Number);
      for (const neighbor of getNeighbors(q, r)) {
        if (boardState.board.has(neighbor.key)) {
          const neighborCell = boardState.board.get(neighbor.key);
          if (neighborCell.player === EMPTY || neighborCell.player === opponent) {
            influencedHexes.add(neighbor.key);
          }
        }
      }
    }
  }
  
  return influencedHexes.size;
}

function evaluateConnectivity(boardState, player) {
  // Evaluate how well connected the player's pieces are
  let connectivityScore = 0;
  const visited = new Set();
  
  for (const [key, cell] of boardState.board) {
    if (cell.player === player && !visited.has(key)) {
      const [q, r] = key.split(',').map(Number);
      const creature = getCreatureAtForBoard(boardState, q, r);
      
      // Mark all pieces of this creature as visited
      for (const piece of creature.pieces) {
        visited.add(`${piece.q},${piece.r}`);
      }
      
      // Bonus for creature size (connected pieces)
      connectivityScore += creature.size * creature.size;
      
      // Bonus for having neighbors of other creatures
      let neighboringCreatures = 0;
      for (const piece of creature.pieces) {
        for (const neighbor of getNeighbors(piece.q, piece.r)) {
          if (boardState.board.has(neighbor.key) && 
              boardState.board.get(neighbor.key).player === player &&
              !visited.has(neighbor.key)) {
            neighboringCreatures++;
          }
        }
      }
      connectivityScore += neighboringCreatures * 2;
    }
  }
  
  return connectivityScore;
}

function determineGamePhase(boardState) {
  const totalPieces = boardState.piecesInHand[PLAYER_BLACK] + boardState.piecesInHand[PLAYER_WHITE];
  const totalPlaced = 24 - totalPieces; // Each player starts with 12 pieces
  
  if (totalPlaced < 8) return 'opening';
  if (totalPlaced < 16) return 'midgame';
  return 'endgame';
}

function evaluatePhaseStrategy(boardState, q, r, player, phase) {
  let phaseScore = 0;
  const distanceFromCenter = Math.abs(q) + Math.abs(r) + Math.abs(-q - r);
  
  if (phase === 'opening') {
    // Opening: Focus on central control and spread
    phaseScore += (6 - distanceFromCenter) * 8;
    
    // Bonus for not clustering too much early
    const nearbyAllies = countNearbyAllies(boardState, q, r, player);
    if (nearbyAllies < 2) phaseScore += 10;
    
  } else if (phase === 'midgame') {
    // Midgame: Balance between offense and defense
    phaseScore += (6 - distanceFromCenter) * 4;
    
    // Bonus for supporting existing creatures
    const nearbyAllies = countNearbyAllies(boardState, q, r, player);
    phaseScore += nearbyAllies * 8;
    
  } else { // endgame
    // Endgame: Focus on consolidation and attack
    const nearbyAllies = countNearbyAllies(boardState, q, r, player);
    phaseScore += nearbyAllies * 12;
    
    // Prefer moves that create immediate threats
    const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    const threateningMoves = countThreateningMoves(boardState, q, r, player, opponent);
    phaseScore += threateningMoves * 20;
  }
  
  return phaseScore;
}

function evaluateTacticalPatterns(boardState, q, r, player) {
  let tacticalScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Pattern 1: Fork attacks (threatening multiple enemy creatures)
  const forkedTargets = countForkedTargets(boardState, q, r, player);
  tacticalScore += forkedTargets * 25;
  
  // Pattern 2: Defensive formations (protecting vulnerable allies)
  const protectedAllies = countProtectedAllies(boardState, q, r, player);
  tacticalScore += protectedAllies * 15;
  
  // Pattern 3: Chain attacks (setting up multi-turn combinations)
  const chainPotential = evaluateChainPotential(boardState, q, r, player);
  tacticalScore += chainPotential * 20;
  
  // Pattern 4: Breakthrough opportunities
  const breakthroughValue = evaluateBreakthrough(boardState, q, r, player);
  tacticalScore += breakthroughValue * 30;
  
  return tacticalScore;
}

function evaluateCreaturePlacement(boardState, creature, q, r) {
  let placementScore = 0;
  
  // Enhanced creature size evaluation
  switch(creature.size) {
    case 1:
      placementScore += 5; // Base value for single pieces
      break;
    case 2:
      placementScore += 25; // Good balance
      break;
    case 3:
      placementScore += 45; // Strong offensive piece
      break;
    case 4:
      // Context-dependent: strong but vulnerable
      const surroundingEnemies = countSurroundingEnemies(boardState, creature);
      placementScore += 35 - (surroundingEnemies * 10);
      break;
  }
  
  // Bonus for edge control (harder to surround)
  const edgeBonus = isNearEdge(q, r) ? 5 : 0;
  placementScore += edgeBonus;
  
  return placementScore;
}

function evaluateDefensiveValue(boardState, q, r, player) {
  let defensiveScore = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Check if this move blocks opponent's threats
  const blockedThreats = countBlockedThreats(boardState, q, r, player, opponent);
  defensiveScore += blockedThreats * 35;
  
  // Check if this move prevents opponent from winning
  const preventedWins = countPreventedWins(boardState, q, r, player, opponent);
  defensiveScore += preventedWins * 100;
  
  return defensiveScore;
}

function evaluateFuturePotential(boardState, q, r, player) {
  let futureScore = 0;
  
  // Count empty spaces around this position for future expansion
  const expansionPotential = countExpansionPotential(boardState, q, r);
  futureScore += expansionPotential * 3;
  
  // Evaluate potential for future combinations
  const combinationPotential = evaluateCombinationPotential(boardState, q, r, player);
  futureScore += combinationPotential * 8;
  
  return futureScore;
}

// Helper functions for advanced evaluation

function countNearbyAllies(boardState, q, r, player) {
  let count = 0;
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === player) {
      count++;
    }
  }
  return count;
}

function countThreateningMoves(boardState, q, r, player, opponent) {
  let threats = 0;
  const creature = getCreatureAtForBoard(boardState, q, r);
  
  if (creature.size > 1) {
    for (const piece of creature.pieces) {
      for (const neighbor of getNeighbors(piece.q, piece.r)) {
        if (boardState.board.has(neighbor.key) && 
            boardState.board.get(neighbor.key).player === opponent) {
          const enemyCreature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
          if (enemyCreature.size === creature.size - 1) {
            threats++;
          }
        }
      }
    }
  }
  
  return threats;
}

function countForkedTargets(boardState, q, r, player) {
  const creature = getCreatureAtForBoard(boardState, q, r);
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const threatenedCreatures = new Set();
  
  if (creature.size > 1) {
    for (const piece of creature.pieces) {
      for (const neighbor of getNeighbors(piece.q, piece.r)) {
        if (boardState.board.has(neighbor.key) && 
            boardState.board.get(neighbor.key).player === opponent) {
          const enemyCreature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
          if (enemyCreature.size === creature.size - 1) {
            threatenedCreatures.add(getCreatureSignature(enemyCreature));
          }
        }
      }
    }
  }
  
  return Math.max(0, threatenedCreatures.size - 1); // Fork = threatening 2+ targets
}

function countProtectedAllies(boardState, q, r, player) {
  let protected = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === player) {
      const allyCreature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
      if (allyCreature.size === MAX_CREATURE_SIZE) {
        // Check if placing here reduces swarm threat
        const currentThreat = countSwarmThreat(boardState, allyCreature, opponent);
        // Simulate placing the piece and check new threat level
        if (currentThreat > 0) protected++;
      }
    }
  }
  
  return protected;
}

function evaluateChainPotential(boardState, q, r, player) {
  // Look for opportunities to set up multi-move combinations
  let chainValue = 0;
  const creature = getCreatureAtForBoard(boardState, q, r);
  
  // Check if this creates a setup for next turn
  if (creature.size >= 2) {
    const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    
    // Look for positions where we could place next turn to create threats
    for (const [key, cell] of boardState.board) {
      if (cell.player === EMPTY) {
        const [nq, nr] = key.split(',').map(Number);
        const distance = Math.abs(q - nq) + Math.abs(r - nr) + Math.abs(-q - r + nq + nr);
        
        if (distance <= 2) { // Within reasonable range
          // Check if placing there next turn would create value
          const futureCreature = getCreatureAtForBoard(boardState, nq, nr, {q: nq, r: nr, player: player});
          if (futureCreature.size >= 2) {
            chainValue += 5;
          }
        }
      }
    }
  }
  
  return Math.min(chainValue, 20); // Cap the chain value
}

function evaluateBreakthrough(boardState, q, r, player) {
  // Evaluate if this move creates breakthrough opportunities
  let breakthroughValue = 0;
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  
  // Check if this move penetrates enemy territory
  const enemyDensity = countEnemyDensity(boardState, q, r, opponent);
  if (enemyDensity >= 3) {
    breakthroughValue += 15; // Bonus for penetrating enemy clusters
  }
  
  return breakthroughValue;
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
  return distance >= 4; // Near the edge of a size-6 hex grid
}

function countBlockedThreats(boardState, q, r, player, opponent) {
  let blockedThreats = 0;
  
  // Check if placing here blocks opponent's eating opportunities
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === opponent) {
      const enemyCreature = getCreatureAtForBoard(boardState, neighbor.q, neighbor.r);
      
      // Check if this enemy creature was threatening our pieces
      for (const enemyPiece of enemyCreature.pieces) {
        for (const enemyNeighbor of getNeighbors(enemyPiece.q, enemyPiece.r)) {
          if (boardState.board.has(enemyNeighbor.key) && 
              boardState.board.get(enemyNeighbor.key).player === player) {
            const ourCreature = getCreatureAtForBoard(boardState, enemyNeighbor.q, enemyNeighbor.r);
            if (ourCreature.size === enemyCreature.size - 1) {
              blockedThreats++;
            }
          }
        }
      }
    }
  }
  
  return blockedThreats;
}

function countPreventedWins(boardState, q, r, player, opponent) {
  let preventedWins = 0;
  
  // Check if opponent was about to win and this move prevents it
  const opponentMoves = getValidMovesForBoard(boardState, opponent);
  for (const move of opponentMoves) {
    const testBoard = simulateMoveOnBoard(boardState, move.q, move.r, opponent);
    if (testBoard.scores[opponent] >= WINNING_SCORE) {
      // Check if our move interferes with this winning move
      if (move.q === q && move.r === r) {
        preventedWins++;
      }
    }
  }
  
  return preventedWins;
}

function countExpansionPotential(boardState, q, r) {
  let emptyNeighbors = 0;
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key) && 
        boardState.board.get(neighbor.key).player === EMPTY) {
      emptyNeighbors++;
    }
  }
  return emptyNeighbors;
}

function evaluateCombinationPotential(boardState, q, r, player) {
  let potential = 0;
  
  // Look for potential future creature formations
  for (const neighbor of getNeighbors(q, r)) {
    if (boardState.board.has(neighbor.key)) {
      const cell = boardState.board.get(neighbor.key);
      if (cell.player === EMPTY) {
        // Potential for future expansion
        potential += 2;
      } else if (cell.player === player) {
        // Potential for strengthening existing creatures
        potential += 3;
      }
    }
  }
  
  return potential;
}

function countEnemyDensity(boardState, q, r, opponent) {
  let density = 0;
  const radius = 2; // Check within 2-hex radius
  
  for (const [key, cell] of boardState.board) {
    if (cell.player === opponent) {
      const [eq, er] = key.split(',').map(Number);
      const distance = Math.abs(q - eq) + Math.abs(r - er) + Math.abs(-q - r + eq + er);
      if (distance <= radius) {
        density++;
      }
    }
  }
  
  return density;
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