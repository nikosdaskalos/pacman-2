/*
 * The red ghost.
 */

/*global COLS, Ghost, Maze, lookup */

function Blinky() {
    this.name = 'blinky';
    this.startCol = Maze.HOME_COL;
    this.startRow = Maze.HOME_ROW;
    this.scatterTile = { col: COLS - 3, row: 0 };
}

Blinky.prototype = new Ghost({

    calcTarget: function () {
        // target pacman directly
        var pacman = lookup('pacman');
        return { col: pacman.col, row: pacman.row };
    }
});
