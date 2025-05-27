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
const MODE_VS_AI = 1;

// Hex directions (axial)
const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

// Game state
let game = {
  screen: SCREEN_INTRO,
  gameMode: MODE_TWO_PLAYER,
  board: new Map(),
  validHexes: [],
  currentPlayer: PLAYER_BLACK,
  scores: { [PLAYER_BLACK]: 0, [PLAYER_WHITE]: 0 },
  piecesInHand: { [PLAYER_BLACK]: INITIAL_PIECES_PER_PLAYER, [PLAYER_WHITE]: INITIAL_PIECES_PER_PLAYER },
  gameOver: false,
  winner: null,
  lastPlayerToMove: null,
  statusMessage: ""
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
  
  // Title
  textSize(32);
  fill(0, 0, 15);
  text("Choose Game Mode", width / 2, height / 2 - 80);
  
  // Two Player button
  const twoPlayerButton = {
    x: width / 2 - 100,
    y: height / 2 - 20,
    w: 200,
    h: 40
  };
  
  // AI button
  const aiButton = {
    x: width / 2 - 100,
    y: height / 2 + 40,
    w: 200,
    h: 40
  };
  
  // Draw buttons
  drawButton(twoPlayerButton, "2 Player Game");
  drawButton(aiButton, "vs AI");
  
  // Instructions
  textSize(14);
  fill(0, 0, 30);
  text("Click on a game mode to start", width / 2, height / 2 + 120);
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
  fill(0, 0, 15);
  textAlign(CENTER, CENTER);
  textSize(16);
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
  }
}

function drawUI() {
  textAlign(CENTER, CENTER);
  fill(0, 0, 10);
  
  // Score display
  textSize(16);
  text(`Black: ${game.scores[PLAYER_BLACK]} eaten / ${game.piecesInHand[PLAYER_BLACK]} left`, width / 4, 30);
  text(`White: ${game.scores[PLAYER_WHITE]} eaten / ${game.piecesInHand[PLAYER_WHITE]} left`, 3 * width / 4, 30);
  
  // Status message
  textSize(18);
  const playerColor = game.currentPlayer === PLAYER_BLACK ? color(0, 0, 5) : color(0, 0, 98);
  fill(playerColor);
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
      y: height / 2 - 20,
      w: 200,
      h: 40
    };
    
    // AI button
    const aiButton = {
      x: width / 2 - 100,
      y: height / 2 + 40,
      w: 200,
      h: 40
    };
    
    // Check button clicks
    if (mouseX >= twoPlayerButton.x && mouseX <= twoPlayerButton.x + twoPlayerButton.w &&
        mouseY >= twoPlayerButton.y && mouseY <= twoPlayerButton.y + twoPlayerButton.h) {
      game.gameMode = MODE_TWO_PLAYER;
      initializeGame();
      return;
    }
    
    if (mouseX >= aiButton.x && mouseX <= aiButton.x + aiButton.w &&
        mouseY >= aiButton.y && mouseY <= aiButton.y + aiButton.h) {
      game.gameMode = MODE_VS_AI;
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
  game.statusMessage = `Player ${getPlayerName(game.currentPlayer)}'s turn. Pieces: ${game.piecesInHand[game.currentPlayer]}`;
}

function getPlayerName(player) {
  return player === PLAYER_BLACK ? "Black" : "White";
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