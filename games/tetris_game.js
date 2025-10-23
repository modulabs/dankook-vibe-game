const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const gameOverContainer = document.getElementById('game-over-container');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const NEXT_BLOCK_SIZE = 20;

const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // O
    '#0DFF72', // T
    '#F538FF', // S
    '#FF8E0D', // Z
    '#FFE138', // J
    '#3877FF', // L
];

let board = createBoard();
let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
};
let nextPiece = null;
let gameState = 'initial'; // 'initial', 'playing', 'gameOver'

const clearSound = new Audio('https://cdn.jsdelivr.net/gh/wesbos/JavaScript30/01%20-%20JavaScript%20Drum%20Kit/sounds/clap.wav'); // Placeholder sound

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(board, { x: 0, y: 0 }, context, BLOCK_SIZE);
    drawMatrix(player.matrix, player.pos, context, BLOCK_SIZE);
}

function drawNextPiece() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const offsetX = (nextCanvas.width / NEXT_BLOCK_SIZE - nextPiece[0].length) / 2;
        const offsetY = (nextCanvas.height / NEXT_BLOCK_SIZE - nextPiece.length) / 2;
        drawMatrix(nextPiece, {x: offsetX, y: offsetY}, nextContext, NEXT_BLOCK_SIZE);
    }
}

function drawMatrix(matrix, offset, ctx, blockSize) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect((x + offset.x) * blockSize,
                                 (y + offset.y) * blockSize,
                                 blockSize, blockSize);
            }
        });
    });
}

function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    if (gameState !== 'playing') return;
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        playerReset();
        boardSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    if (gameState !== 'playing') return;
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    playerReset();
    boardSweep();
    updateScore();
    dropCounter = 0;
}

function playerMove(dir) {
    if (gameState !== 'playing') return;
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    }
}

function generatePiece() {
    const pieces = 'TJLOSZI';
    return createPiece(pieces[pieces.length * Math.random() | 0]);
}

function playerReset() {
    player.matrix = nextPiece;
    nextPiece = generatePiece();
    drawNextPiece();

    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(board, player)) {
        gameState = 'gameOver';
        gameOverContainer.style.display = 'block';
    }
}

function playerRotate(dir) {
    if (gameState !== 'playing') return;
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function collide(board, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                 board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 7, 0],
            [0, 7, 0],
            [0, 7, 7],
        ];
    } else if (type === 'J') {
        return [
            [0, 6, 0],
            [0, 6, 0],
            [6, 6, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 4, 4],
            [4, 4, 0],
            [0, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 3, 0],
            [3, 3, 3],
            [0, 0, 0],
        ];
    }
}

function boardSweep() {
    let rowCount = 1;
    let cleared = false;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;
        cleared = true;
    }
    if (cleared) {
        clearSound.play();
    }
}

function updateScore() {
    scoreElement.innerText = player.score;
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    if (gameState === 'playing') {
        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }

        draw();
    }
    requestAnimationFrame(update);
}

function startGame() {
    gameState = 'playing';
    board = createBoard();
    player.score = 0;
    updateScore();
    nextPiece = generatePiece();
    playerReset();
    startButton.style.display = 'none';
    gameOverContainer.style.display = 'none';
    update();
}

document.addEventListener('keydown', event => {
    if (gameState !== 'playing') return;

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate(1);
    } else if (event.code === 'Space') {
        event.preventDefault(); // Prevent page scrolling
        playerHardDrop();
    }
});

startButton.addEventListener('click', () => {
    startGame();
});

restartButton.addEventListener('click', () => {
    startGame();
});

// Initial draw
draw();
drawNextPiece();