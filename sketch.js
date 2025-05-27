
// Eat Your Neighbor - p5.js Implementation

// Game constants
const PLAYER_BLACK = 1;
const PLAYER_WHITE = 2;
const EMPTY = 0;
const BOARD_RADIUS = 3; // Results in a 37-cell hexagonal board (N=3)
const MAX_CREATURE_SIZE = 4;
const WINNING_SCORE = 12;
const INITIAL_PIECES_PER_PLAYER = 30;

// Hex grid visual properties
let HEX_SIZE = 25; 
let boardCenterX, boardCenterY;

// Game state variables
let board; 
let validHexes = []; 
let currentPlayer;
let scores;
let piecesInHand;
let gameOver;
let winner;
let statusMessage;
let lastPlayerToMakeLegalMove;

// Hex directions (axial)
const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100); // Hue, Sat, Brightness, Alpha
  
  // Calculate initial HEX_SIZE to fit the board
  let V_PADDING = 100; // Vertical padding for UI text
  let H_PADDING = 50;  // Horizontal padding
  let availableWidth = windowWidth - H_PADDING;
  let availableHeight = windowHeight - V_PADDING;

  // Hex grid max dimensions (diameter) for a radius N board:
  // Width: (2N+1)*sqrt(3)/2 * size for pointy, (2N+1)*size for flat if N hexes along one side.
  // Height: (2N+1)*size for pointy, (2N+1)*3/4*2 * size for flat.
  // For flat top, overall width is approx (2*N+1)*sqrt(3)*HEX_SIZE, height is (2*N+1)*1.5*HEX_SIZE
  // My axialToPixel uses flat top: width is `sqrt(3) * size * (2N)`, height is `1.5 * size * (2N)` approx.
  // More accurately for flat top radius N: width = HEX_SIZE * sqrt(3) * (2*N+1) for outer points, height = HEX_SIZE * 2 * (N + 0.5)
  // Let's use simpler (2*BOARD_RADIUS+1) factor as rough estimate.
  let testHexSizeForWidth = availableWidth / ((2 * BOARD_RADIUS + 1) * sqrt(3));
  let testHexSizeForHeight = availableHeight / ((2 * BOARD_RADIUS + 1) * 1.5);
  HEX_SIZE = min(testHexSizeForWidth, testHexSizeForHeight, 30); // Cap max size too

  boardCenterX = width / 2;
  boardCenterY = height / 2 + 20; // Shift down a bit for top UI

  initializeGame();
}

function initializeGame() {
  board = new Map();
  validHexes = [];

  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
    let r1 = max(-BOARD_RADIUS, -q - BOARD_RADIUS);
    let r2 = min(BOARD_RADIUS, -q + BOARD_RADIUS);
    for (let r = r1; r <= r2; r++) {
      const hexKey = `${q},${r}`;
      board.set(hexKey, { player: EMPTY, q: q, r: r });
      validHexes.push({ q: q, r: r });
    }
  }

  currentPlayer = PLAYER_BLACK;
  scores = { [PLAYER_BLACK]: 0, [PLAYER_WHITE]: 0 };
  piecesInHand = { [PLAYER_BLACK]: INITIAL_PIECES_PER_PLAYER, [PLAYER_WHITE]: INITIAL_PIECES_PER_PLAYER };
  gameOver = false;
  winner = null;
  lastPlayerToMakeLegalMove = null;
  statusMessage = `Player Black's turn. Pieces: ${piecesInHand[PLAYER_BLACK]}`;
}

function draw() {
  background(60, 5, 95); // Light gray-ish background

  for (const hex of validHexes) {
    const { q, r } = hex;
    const pixel = axialToPixel(q, r);
    const cell = board.get(`${q},${r}`);
    
    let fillCol;
    if (cell.player === PLAYER_BLACK) {
      fillCol = color(0, 0, 15); // Black
    } else if (cell.player === PLAYER_WHITE) {
      fillCol = color(0, 0, 95); // White
    } else {
      fillCol = color(0, 0, 70, 60); // Empty hex color (semi-transparent gray)
    }
    drawHex(pixel.x, pixel.y, HEX_SIZE, fillCol);
  }

  textAlign(CENTER, CENTER);
  textSize(16);
  fill(0, 0, 10); 

  let topTextY = 30;
  text(`Black: ${scores[PLAYER_BLACK]} eaten / ${piecesInHand[PLAYER_BLACK]} left`, width / 4, topTextY);
  text(`White: ${scores[PLAYER_WHITE]} eaten / ${piecesInHand[PLAYER_WHITE]} left`, (3 * width) / 4, topTextY);
  
  textSize(18);
  let playerTurnColor = currentPlayer === PLAYER_BLACK ? color(0,0,5) : color(0,0,98);
  fill(playerTurnColor);
  text(statusMessage, width / 2, height - 40);

  if (gameOver) {
    textSize(32);
    fill(0, 100, 100); // Red for game over message
    let winMsg = "Game Over! ";
    if (winner === PLAYER_BLACK) winMsg += "Black Wins!";
    else if (winner === PLAYER_WHITE) winMsg += "White Wins!";
    else winMsg += "It's a Tie (resolved by last move)!";
    
    text(winMsg, width / 2, boardCenterY - (BOARD_RADIUS + 2) * HEX_SIZE * 1.5 - 20); // Display above board
    textSize(18);
    text("Click to reset", width / 2, height - 15);
  }
}

function mousePressed() {
  if (gameOver) {
    initializeGame();
    return;
  }

  const clickedHexCoords = pixelToAxial(mouseX, mouseY);
  if (!clickedHexCoords) return; 

  const { q, r } = clickedHexCoords;
  handlePlayerMove(q, r);
}

function handlePlayerMove(q, r) {
  const hexKey = `${q},${r}`;
  const cell = board.get(hexKey);

  if (cell.player !== EMPTY) {
    statusMessage = "Cell is already occupied. Try again.";
    return;
  }

  if (piecesInHand[currentPlayer] <= 0) {
      statusMessage = `Player ${currentPlayer === PLAYER_BLACK ? "Black" : "White"} has no pieces left.`;
      return;
  }

  const { creature: tempCreature } = getCreatureAt(q, r, currentPlayer, board, { q, r, player: currentPlayer });
  if (tempCreature.size > MAX_CREATURE_SIZE) {
    statusMessage = `Cannot create creature larger than ${MAX_CREATURE_SIZE}.`;
    return;
  }
  
  board.set(hexKey, { player: currentPlayer, q, r });
  piecesInHand[currentPlayer]--;

  const { creature: placedCreature } = getCreatureAt(q, r, currentPlayer, board);
  const placedCreatureSize = placedCreature.size;
  const opponent = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
  
  let eatenCreatureSignatures = new Set(); 

  // 1. Eating (Rule 1.1)
  if (placedCreatureSize - 1 > 0) { 
    for (const piece of placedCreature.pieces) {
      for (const dir of AXIAL_DIRECTIONS) {
        const nq = piece.q + dir.q;
        const nr = piece.r + dir.r;
        const nKey = `${nq},${nr}`;
        if (board.has(nKey) && board.get(nKey).player === opponent) {
          const { creature: adjOpponentCreature } = getCreatureAt(nq, nr, opponent, board);
          if (adjOpponentCreature.size === placedCreatureSize - 1) {
             eatenCreatureSignatures.add(adjOpponentCreature.pieces[0].q + "," + adjOpponentCreature.pieces[0].r + "_" + opponent);
          }
        }
      }
    }
  }

  // 2. Swarming (Rule 1.2)
  if (placedCreatureSize === 1) {
    const placedPieceCoord = placedCreature.pieces[0]; 
    for (const dir of AXIAL_DIRECTIONS) {
      const nq = placedPieceCoord.q + dir.q;
      const nr = placedPieceCoord.r + dir.r;
      const nKey = `${nq},${nr}`;

      if (board.has(nKey) && board.get(nKey).player === opponent) {
        const { creature: potentialSwarmTarget } = getCreatureAt(nq, nr, opponent, board);
        if (potentialSwarmTarget.size === MAX_CREATURE_SIZE) { 
          let otherFriendlySwarmersCount = 0;
          let countedFriendlyHelpers = new Set(); 

          for (const targetPiece of potentialSwarmTarget.pieces) {
            for (const sDir of AXIAL_DIRECTIONS) { 
              const hnq = targetPiece.q + sDir.q; 
              const hnr = targetPiece.r + sDir.r; 
              const hnKey = `${hnq},${hnr}`;

              if (board.has(hnKey) && board.get(hnKey).player === currentPlayer) {
                if (hnq === placedPieceCoord.q && hnr === placedPieceCoord.r) continue; 

                const { creature: helperCreature } = getCreatureAt(hnq, hnr, currentPlayer, board);
                if (helperCreature.size === 1) {
                    const helperKey = `${hnq},${hnr}`; 
                    if (!countedFriendlyHelpers.has(helperKey)) {
                        otherFriendlySwarmersCount++;
                        countedFriendlyHelpers.add(helperKey);
                    }
                }
              }
            }
          }
          if (otherFriendlySwarmersCount >= 2) {
            eatenCreatureSignatures.add(potentialSwarmTarget.pieces[0].q + "," + potentialSwarmTarget.pieces[0].r + "_" + opponent);
          }
        }
      }
    }
  }

    let totalPiecesEatenThisTurn = 0;
    for (const creatureSig of eatenCreatureSignatures) {
        const [qr, playerStr] = creatureSig.split("_");
        const [q_str, r_str] = qr.split(",");
        const cr_q = parseInt(q_str);
        const cr_r = parseInt(r_str);
        const cr_player = parseInt(playerStr); // This is the player of the creature being eaten

        // Re-fetch the creature to ensure its current state on the board, important if pieces could be shared (they shouldn't be for distinct creatures)
        const { creature: creatureToEat } = getCreatureAt(cr_q, cr_r, cr_player, board);
        
        // Make sure the creature (or at least its representative piece) still belongs to the opponent and is on board
        if (creatureToEat.size > 0 && board.get(`${creatureToEat.pieces[0].q},${creatureToEat.pieces[0].r}`).player === cr_player) {
            for (const piece of creatureToEat.pieces) {
                 // Final check before removing a piece
                if (board.has(`${piece.q},${piece.r}`) && board.get(`${piece.q},${piece.r}`).player === cr_player) {
                    board.set(`${piece.q},${piece.r}`, { player: EMPTY, q: piece.q, r: piece.r });
                    totalPiecesEatenThisTurn++;
                }
            }
        }
    }
    scores[currentPlayer] += totalPiecesEatenThisTurn;
    if (totalPiecesEatenThisTurn > 0 || placedCreature.size > 0) { // A move was made
         lastPlayerToMakeLegalMove = currentPlayer;
    }


    if (scores[PLAYER_BLACK] >= WINNING_SCORE || scores[PLAYER_WHITE] >= WINNING_SCORE) {
        endGame();
        return;
    }
    
    currentPlayer = opponent; 

    if (!canPlayerMakeLegalMove(currentPlayer)) {
        // Before declaring game over, check if the other player ALSO cannot move (e.g. full board, no valid spots for anyone)
        // This is implicitly handled if this call to endGame correctly assigns winner.
        // The current player (who is about to move) cannot make a legal move.
        statusMessage = `Player ${currentPlayer === PLAYER_BLACK ? "Black" : "White"} cannot move!`;
        endGame(); 
        return;
    }

    statusMessage = `Player ${currentPlayer === PLAYER_BLACK ? "Black" : "White"}'s turn. Pieces: ${piecesInHand[currentPlayer]}`;
}

function getCreatureAt(startQ, startR, playerForHypothetical, currentBoard, hypotheticalPiece = null) {
  let effectiveBoard = currentBoard; // Use current board by default
  let actualPlayerToFind = playerForHypothetical; // Player whose creature we are finding

  // If checking a hypothetical placement
  if (hypotheticalPiece) {
    // Create a temporary map that includes the hypothetical piece
    // This avoids modifying the main 'board' Map during validation
    effectiveBoard = new Map(currentBoard);
    effectiveBoard.set(`${hypotheticalPiece.q},${hypotheticalPiece.r}`, { 
        player: hypotheticalPiece.player, 
        q: hypotheticalPiece.q, 
        r: hypotheticalPiece.r 
    });
    actualPlayerToFind = hypotheticalPiece.player; // The creature will be of this player's color
  } else {
    // If not hypothetical, the 'playerForHypothetical' is who we expect at startQ, startR
    // But it's safer to get actual player from the board at startQ, startR
    const startCellKey = `${startQ},${startR}`;
    if (!effectiveBoard.has(startCellKey) || effectiveBoard.get(startCellKey).player === EMPTY) {
        return { creature: { pieces: [], size: 0, player: EMPTY } };
    }
    actualPlayerToFind = effectiveBoard.get(startCellKey).player;
  }

  let creaturePieces = [];
  let queue = [{ q: startQ, r: startR }];
  let visited = new Set([`${startQ},${startR}`]);
  
  // Check if the starting point itself is valid for the creature
  const startKeyForEffectiveBoard = `${startQ},${startR}`;
  if (!effectiveBoard.has(startKeyForEffectiveBoard) || effectiveBoard.get(startKeyForEffectiveBoard).player !== actualPlayerToFind) {
      // This can happen if startQ, startR is empty on the 'effectiveBoard' (e.g. after a piece was removed)
      // or if called on an empty cell without a hypothetical piece.
      return { creature: { pieces: [], size: 0, player: actualPlayerToFind } };
  }
  creaturePieces.push({ q: startQ, r: startR });


  while (queue.length > 0) {
    const current = queue.shift();
    for (const dir of AXIAL_DIRECTIONS) {
      const nq = current.q + dir.q;
      const nr = current.r + dir.r;
      const nKey = `${nq},${nr}`;

      if (effectiveBoard.has(nKey) && effectiveBoard.get(nKey).player === actualPlayerToFind && !visited.has(nKey)) {
        visited.add(nKey);
        queue.push({ q: nq, r: nr });
        creaturePieces.push({ q: nq, r: nr });
      }
    }
  }
  return { creature: { pieces: creaturePieces, size: creaturePieces.length, player: actualPlayerToFind } };
}

function canPlayerMakeLegalMove(playerToCheck) {
  if (piecesInHand[playerToCheck] <= 0) return false;

  for (const hex of validHexes) {
    const { q, r } = hex;
    const hexKey = `${q},${r}`;
    if (board.get(hexKey).player === EMPTY) {
      const { creature } = getCreatureAt(q, r, playerToCheck, board, { q, r, player: playerToCheck });
      if (creature.size <= MAX_CREATURE_SIZE) {
        return true; 
      }
    }
  }
  return false; 
}

function endGame() {
  gameOver = true;
  // Determine winner based on scores first
  if (scores[PLAYER_BLACK] > scores[PLAYER_WHITE]) {
    winner = PLAYER_BLACK;
  } else if (scores[PLAYER_WHITE] > scores[PLAYER_BLACK]) {
    winner = PLAYER_WHITE;
  } else { // Tie in scores, or game ended by no moves
    winner = lastPlayerToMakeLegalMove; // Tie goes to last player to make a legal move
    // If lastPlayerToMakeLegalMove is null (e.g. no moves made), this might need adjustment, but game must have started.
  }
  
  // Update status message for game over
  let finalMessage = `Game Over! `;
  if (winner === PLAYER_BLACK) finalMessage += "Black Wins!";
  else if (winner === PLAYER_WHITE) finalMessage += "White Wins!";
  else if (winner === null) { // Should not happen if lastPlayerToMakeLegalMove is always set
      finalMessage += "It's a draw (no last legal move recorded)!";
  } else { // Tie resolved by lastPlayerToMakeLegalMove
      finalMessage += `Player ${lastPlayerToMakeLegalMove === PLAYER_BLACK ? "Black" : "White"} wins by tie-breaker (last move).`;
  }
  // Prepend reason if game ended due to no moves
  if (!canPlayerMakeLegalMove(currentPlayer) && !(scores[PLAYER_BLACK] >= WINNING_SCORE || scores[PLAYER_WHITE] >= WINNING_SCORE)) {
    finalMessage = `Player ${currentPlayer === PLAYER_BLACK ? "Black" : "White"} has no legal moves. ` + finalMessage;
  }

  statusMessage = finalMessage;
}

function axialToPixel(q, r) {
  const x = HEX_SIZE * (sqrt(3) * q + sqrt(3) / 2 * r);
  const y = HEX_SIZE * (3 / 2 * r);
  return { x: x + boardCenterX, y: y + boardCenterY };
}

function pixelToAxial(x, y) {
  const relativeX = x - boardCenterX;
  const relativeY = y - boardCenterY;

  const q_frac = (sqrt(3) / 3 * relativeX - 1 / 3 * relativeY) / HEX_SIZE;
  const r_frac = (2 / 3 * relativeY) / HEX_SIZE;
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
  } else {
      // s_round = -q_round - r_round; // This is implicit
  }
  
  if (board.has(`${q_round},${r_round}`)) {
      return { q: q_round, r: r_round };
  }
  return null; 
}

function drawHex(x, y, size, fillColor) {
  stroke(0, 0, 20); 
  strokeWeight(1);
  fill(fillColor);
  
  beginShape();
  for (let i = 0; i < 6; i++) {
    const angle = TWO_PI / 6 * (i + 0.5); // +0.5 for flat top
    const vx = x + size * cos(angle);
    const vy = y + size * sin(angle);
    vertex(vx, vy);
  }
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  let V_PADDING = 100;
  let H_PADDING = 50;
  let availableWidth = windowWidth - H_PADDING;
  let availableHeight = windowHeight - V_PADDING;
  let testHexSizeForWidth = availableWidth / ((2 * BOARD_RADIUS + 1) * sqrt(3));
  let testHexSizeForHeight = availableHeight / ((2 * BOARD_RADIUS + 1) * 1.5);
  HEX_SIZE = min(testHexSizeForWidth, testHexSizeForHeight, 30);

  boardCenterX = width / 2;
  boardCenterY = height / 2 + 20; 
}

