/* =========================================
   PENSAMIENTO AJEDRECÍSTICO
   JUEGO CONTRA IA
========================================= */


/* =========================================
   ELEMENTOS
========================================= */

const gameBoard =
    document.getElementById("game-board");

const gameStatus =
    document.getElementById("game-status");

const thinkingStatus =
    document.getElementById("thinking-status");

const difficulty =
    document.getElementById("difficulty");

const newGameButton =
    document.getElementById("new-game");

const undoButton =
    document.getElementById("undo-move");

const moveList =
    document.getElementById("move-list");


/* =========================================
   COMPROBAR CHESS.JS
========================================= */

if (typeof Chess === "undefined") {

    gameStatus.textContent =
        "No se pudo cargar el juego";

    thinkingStatus.textContent =
        "Comprueba tu conexión a Internet.";

    throw new Error(
        "Chess.js no está disponible."
    );
}


/* =========================================
   PARTIDA
========================================= */

let chess = new Chess();

let selectedSquare = null;

let legalMoves = [];

let thinking = false;


/* =========================================
   PIEZAS
========================================= */

const chessPieces = {

    w: {
        p: "♙",
        n: "♘",
        b: "♗",
        r: "♖",
        q: "♕",
        k: "♔"
    },

    b: {
        p: "♟",
        n: "♞",
        b: "♝",
        r: "♜",
        q: "♛",
        k: "♚"
    }

};


/* =========================================
   STOCKFISH
========================================= */

let engine = null;

let engineReady = false;


function iniciarStockfish() {

    try {

        if (
            typeof STOCKFISH !== "function"
        ) {

            thinkingStatus.textContent =
                "IA no disponible.";

            return;
        }


        engine = STOCKFISH();


        engine.onmessage =
            function (event) {

                const message =
                    typeof event === "string"
                        ? event
                        : event.data;


                if (
                    typeof message !== "string"
                ) {
                    return;
                }


                if (
                    message === "uciok"
                ) {

                    engineReady = true;

                    thinkingStatus.textContent =
                        "IA lista. Selecciona una pieza blanca.";

                    return;
                }


                if (
                    message.startsWith(
                        "bestmove"
                    )
                ) {

                    const parts =
                        message.split(" ");


                    const bestMove =
                        parts[1];


                    if (
                        bestMove &&
                        bestMove !== "(none)"
                    ) {

                        ejecutarMovimientoIA(
                            bestMove
                        );

                    }

                }

            };


        engine.postMessage("uci");

    } catch (error) {

        console.error(
            "Error Stockfish:",
            error
        );

        engine = null;

        engineReady = false;

        thinkingStatus.textContent =
            "La IA no pudo iniciarse.";

    }

}


/* =========================================
   CREAR TABLERO
   BLANCAS ABAJO
   NEGRAS ARRIBA
========================================= */

function renderBoard() {

    gameBoard.innerHTML = "";


    const board =
        chess.board();


    /*
       chess.board() ya devuelve:

       fila 0 = negras
       fila 7 = blancas

       Por eso NO invertimos el tablero.
    */


    for (
        let row = 0;
        row < 8;
        row++
    ) {

        for (
            let col = 0;
            col < 8;
            col++
        ) {

            const square =
                document.createElement("div");


            const file =
                String.fromCharCode(
                    97 + col
                );


            const rank =
                8 - row;


            const squareName =
                file + rank;


            square.dataset.square =
                squareName;


            square.classList.add(
                "game-square"
            );


            /*
               Colores correctos del tablero
            */

            if (
                (row + col) % 2 === 0
            ) {

                square.classList.add(
                    "light"
                );

            } else {

                square.classList.add(
                    "dark"
                );

            }


            /*
               PIEZA
            */

            const piece =
                board[row][col];


            if (piece) {

                square.textContent =
                    chessPieces[
                        piece.color
                    ][
                        piece.type
                    ];


                /*
                   IMPORTANTE:

                   Blancas = blancas
                   Negras = negras

                   Ya no mezclamos colores.
                */

                if (
                    piece.color === "w"
                ) {

                    square.classList.add(
                        "white-piece"
                    );

                } else {

                    square.classList.add(
                        "black-piece"
                    );

                }

            }


            square.addEventListener(
                "click",
                function () {

                    clickSquare(
                        squareName
                    );

                }
            );


            gameBoard.appendChild(
                square
            );

        }

    }


    markSquares();

}


/* =========================================
   CLICK EN TABLERO
========================================= */

function clickSquare(square) {

    if (thinking) {
        return;
    }


    if (
        chess.turn() !== "w"
    ) {
        return;
    }


    if (
        chess.game_over()
    ) {
        return;
    }


    const piece =
        chess.get(square);


    /*
       Seleccionar pieza
    */

    if (!selectedSquare) {

        if (
            piece &&
            piece.color === "w"
        ) {

            selectedSquare =
                square;


            legalMoves =
                chess.moves({
                    square: square,
                    verbose: true
                });


            renderBoard();

        }

        return;
    }


    /*
       Cambiar pieza seleccionada
    */

    if (
        piece &&
        piece.color === "w"
    ) {

        selectedSquare =
            square;


        legalMoves =
            chess.moves({
                square: square,
                verbose: true
            });


        renderBoard();

        return;
    }


    /*
       Realizar movimiento
    */

    const move =
        chess.move({

            from: selectedSquare,

            to: square,

            promotion: "q"

        });


    if (!move) {

        selectedSquare = null;

        legalMoves = [];

        renderBoard();

        return;
    }


    selectedSquare = null;

    legalMoves = [];


    renderBoard();

    updateHistory();

    updateStatus();


    /*
       Turno de la IA
    */

    if (
        !chess.game_over()
    ) {

        askAI();

    }

}


/* =========================================
   MARCAR MOVIMIENTOS
========================================= */

function markSquares() {

    const squares =
        gameBoard.querySelectorAll(
            ".game-square"
        );


    squares.forEach(
        function (squareElement) {

            const square =
                squareElement.dataset.square;


            if (
                square === selectedSquare
            ) {

                squareElement.classList.add(
                    "selected"
                );

            }


            const move =
                legalMoves.find(
                    function (item) {

                        return (
                            item.to === square
                        );

                    }
                );


            if (!move) {
                return;
            }


            if (
                move.captured
            ) {

                squareElement.classList.add(
                    "capture"
                );

            } else {

                squareElement.classList.add(
                    "legal"
                );

            }

        }
    );

}


/* =========================================
   IA
========================================= */

function askAI() {

    thinking = true;


    gameStatus.textContent =
        "La IA está pensando...";


    thinkingStatus.textContent =
        "Calculando movimiento...";


    if (
        !engine ||
        !engineReady
    ) {

        thinking = false;

        gameStatus.textContent =
            "IA no disponible";

        thinkingStatus.textContent =
            "Puedes reiniciar la página.";

        return;
    }


    engine.postMessage(
        "stop"
    );


    engine.postMessage(
        "position fen " +
        chess.fen()
    );


    const depth =
        Number(
            difficulty.value
        );


    engine.postMessage(
        "go depth " +
        depth
    );

}


/* =========================================
   MOVIMIENTO DE LA IA
========================================= */

function ejecutarMovimientoIA(uci) {

    const from =
        uci.substring(0, 2);


    const to =
        uci.substring(2, 4);


    const promotion =
        uci.length >= 5
            ? uci.substring(4, 5)
            : "q";


    const move =
        chess.move({

            from: from,

            to: to,

            promotion: promotion

        });


    if (!move) {

        thinking = false;

        return;
    }


    thinking = false;


    renderBoard();

    updateHistory();

    updateStatus();

}


/* =========================================
   ESTADO DE LA PARTIDA
========================================= */

function updateStatus() {

    if (
        chess.in_checkmate()
    ) {

        if (
            chess.turn() === "w"
        ) {

            gameStatus.textContent =
                "♚ Jaque mate — ganó la IA";

        } else {

            gameStatus.textContent =
                "♔ ¡Jaque mate — ganaste!";

        }


        thinkingStatus.textContent =
            "La partida ha terminado.";

        return;
    }


    if (
        chess.in_draw()
    ) {

        gameStatus.textContent =
            "Tablas";

        thinkingStatus.textContent =
            "La partida terminó en empate.";

        return;
    }


    if (
        chess.in_check()
    ) {

        gameStatus.textContent =
            chess.turn() === "w"
                ? "⚠️ Estás en jaque"
                : "⚠️ La IA está en jaque";

        return;
    }


    if (
        chess.turn() === "w"
    ) {

        gameStatus.textContent =
            "♙ Tu turno";

        thinkingStatus.textContent =
            "Selecciona una pieza blanca.";

    } else {

        gameStatus.textContent =
            "♟ Turno de la IA";

    }

}


/* =========================================
   HISTORIAL
========================================= */

function updateHistory() {

    moveList.innerHTML = "";


    const history =
        chess.history();


    for (
        let i = 0;
        i < history.length;
        i += 2
    ) {

        const item =
            document.createElement("li");


        const white =
            history[i] || "";


        const black =
            history[i + 1] || "";


        item.textContent =
            white +
            (
                black
                    ? "   " + black
                    : ""
            );


        moveList.appendChild(
            item
        );

    }


    moveList.scrollTop =
        moveList.scrollHeight;

}


/* =========================================
   NUEVA PARTIDA
========================================= */

function newGame() {

    if (engine) {

        engine.postMessage(
            "stop"
        );

        engine.postMessage(
            "ucinewgame"
        );

    }


    chess = new Chess();

    selectedSquare = null;

    legalMoves = [];

    thinking = false;


    renderBoard();

    updateHistory();

    updateStatus();

}


/* =========================================
   DESHACER
========================================= */

function undoMove() {

    if (thinking) {
        return;
    }


    const history =
        chess.history();


    if (
        history.length === 0
    ) {
        return;
    }


    /*
       Deshacer movimiento de la IA
    */

    chess.undo();


    /*
       Deshacer movimiento del jugador
    */

    if (
        chess.history().length > 0
    ) {

        chess.undo();

    }


    selectedSquare = null;

    legalMoves = [];


    renderBoard();

    updateHistory();

    updateStatus();

}


/* =========================================
   BOTONES
========================================= */

newGameButton.addEventListener(
    "click",
    newGame
);


undoButton.addEventListener(
    "click",
    undoMove
);


/* =========================================
   CALIFICACIÓN
========================================= */

const ratingButtons =
    document.querySelectorAll(
        ".rating-buttons button"
    );

const ratingNumber =
    document.getElementById(
        "rating-number"
    );

const ratingMessage =
    document.getElementById(
        "rating-message"
    );


ratingButtons.forEach(
    function(button) {

        button.addEventListener(
            "click",
            function() {

                const rating =
                    Number(
                        button.dataset.rating
                    );


                /*
                   Mostrar número
                */

                ratingNumber.textContent =
                    rating;


                /*
                   Marcar botón
                */

                ratingButtons.forEach(
                    function(otherButton) {

                        otherButton.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                /*
                   MENSAJE DE MIGUEL
                */

                if (rating > 8) {

                    ratingMessage.textContent =
                        "¡Gracias vato por tu opinión! 😂 Pero aun así no quiero lavar trastes.";

                    ratingMessage.className =
                        "rating-message good";

                } else {

                    ratingMessage.textContent =
                        "Uuuuuy, ¿a poco sí piensas esooo vatoooo? 😭 Seguiré mejorandooo.";

                    ratingMessage.className =
                        "rating-message normal";

                }

            }
        );

    }
);


/* =========================================
   INICIAR TODO
========================================= */

renderBoard();

updateHistory();

updateStatus();

iniciarStockfish();