/*
 * Maze, dots and energisers
 */

/*jslint bitwise: false */
/*global COLS, DEBUG, EAST, Entity, NORTH, ROWS, SCREEN_H, SCREEN_W, SOUTH,
  ScreenBuffer, TILE_CENTRE, TILE_SIZE, WEST, debug, enqueueInitialiser,
  events, level, resources, toCol, toRow, toTicks */

/// edibles

function Dot(col, row) {
    this.init(col, row, 3);
}

Dot.prototype = new Entity({
    value: 10,
    delay: 1,
    eatenEvent: 'dotEaten',
    init: function (col, row, size) {
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE + (TILE_SIZE - size) / 2;
        this.y = row * TILE_SIZE + (TILE_SIZE - size) / 2;
        this.w = this.h = size;
    },
    repaint: function (g) {
        g.save();
        // FIXME
        g.fillStyle = 'white';
        g.fillRect(this.x, this.y, this.w, this.h);
        g.restore();
    }
});

function Energiser(col, row) {
    this.init(col, row, TILE_SIZE - 2);
    this.setVisible(true);
    var self = this;
    events.repeat(Energiser.BLINK_DURATION, function () {
        self.setVisible(!self.visible);
    });
}

Energiser.BLINK_DURATION = toTicks(0.25);

Energiser.prototype = new Dot();
Energiser.prototype.value = 50;
Energiser.prototype.delay = 3;
Energiser.prototype.eatenEvent = 'energiserEaten';

function Bonus(symbol, value) {
    // FIXME: do something with symbol
    this.symbol = symbol;
    this.w = this.h = TILE_SIZE;
    this.value = value;
}
Bonus.prototype = new Entity({
    eatenEvent: 'bonusEaten',
    repaint: function (g) {
        // FIXME
        g.save();
        g.fillStyle = 'white';
        g.fillRect(this.x, this.y, this.w, this.h);
        g.restore();
    }
});

Bonus.forLevel = function (level) {
    return level === 1 ? new Bonus('cherry', 100) :
           level === 2 ? new Bonus('strawberry', 300) :
           level <= 4 ? new Bonus('peach', 500) :
           level <= 6 ? new Bonus('apple', 700) :
           level <= 8 ? new Bonus('grape', 700) :
           level <= 10 ? new Bonus('galaxian', 2000) :
           level <= 12 ? new Bonus('bell', 3000) :
           new Bonus('key', 5000);
};

var bonusDisplay = new Entity();
bonusDisplay.MAX_DISPLAY = 6;
bonusDisplay.w = bonusDisplay.MAX_DISPLAY * TILE_SIZE * 2;
bonusDisplay.h = TILE_SIZE * 2;
bonusDisplay.x = SCREEN_W - bonusDisplay.w - 2 * TILE_SIZE;
bonusDisplay.y = SCREEN_H - bonusDisplay.h;
bonusDisplay.reset = function (level) {
    // display bonus for current and previous 5(?) levels
    var x2 = this.x + this.w;
    var y = this.y + TILE_SIZE;
    this.bonuses = [];
    var end = Math.max(1, level - this.MAX_DISPLAY + 1);
    for (var l = level; l >= end; l--) {
        var b = Bonus.forLevel(l);
        this.bonuses.push(b);
        b.centreAt(x2 - TILE_SIZE - (level - l) * 2 * TILE_SIZE, y);
    }
};
bonusDisplay.repaint = function (g) {
    this.bonuses.forEach(function (b) {
        b.repaint(g);
    });
};

/// maze

// FIXME
var Maze = {
    // house entry/exit tile
    HOME_COL: 14,
    HOME_ROW: 14,

    // no NORTH-turn zones
    NNTZ_COL_MIN: 12,
    NNTZ_COL_MAX: 15,
    NNTZ_ROW_1: 14,
    NNTZ_ROW_2: 26,

    TUNNEL_WEST_EXIT_COL: -2,
    TUNNEL_EAST_EXIT_COL: COLS + 1
};
Maze.HOME_TILE = { col: Maze.HOME_COL, row: Maze.HOME_ROW };
Maze.PACMAN_X = Maze.BONUS_X = Maze.HOME_COL * TILE_SIZE;
Maze.PACMAN_Y = Maze.BONUS_Y = 26 * TILE_SIZE + TILE_CENTRE;

enqueueInitialiser(function () {
    var img = resources.getImage('bg');
    Maze.bg = new ScreenBuffer(SCREEN_W, SCREEN_H);
    var g = Maze.bg.getContext('2d');
    g.drawImage(img, 0, 0, SCREEN_W, SCREEN_H);

    // FIXME: should this be toggleable?
    if (DEBUG) {
        // gridlines
        g.strokeStyle = 'white';
        g.lineWidth = 0.25;
        for (var row = 0; row < ROWS; row++) {
            g.beginPath();
            g.moveTo(0, row * TILE_SIZE);
            g.lineTo(SCREEN_W, row * TILE_SIZE);
            g.stroke();
        }
        for (var col = 0; col < COLS; col++) {
            g.beginPath();
            g.moveTo(col * TILE_SIZE, 0);
            g.lineTo(col * TILE_SIZE, SCREEN_H);
            g.stroke();
        }

        g.globalAlpha = 0.5;

        // no-NORTH-turn zones
        g.fillStyle = 'grey';
        var nntzX = Maze.NNTZ_COL_MIN * TILE_SIZE;
        var nntzW = (Maze.NNTZ_COL_MAX - Maze.NNTZ_COL_MIN + 1) * TILE_SIZE;
        g.fillRect(nntzX, Maze.NNTZ_ROW_1 * TILE_SIZE,
                   nntzW, TILE_SIZE);
        g.fillRect(nntzX, Maze.NNTZ_ROW_2 * TILE_SIZE,
                   nntzW, TILE_SIZE);

        // ghost home tile
        g.fillStyle = 'green';
        g.fillRect(Maze.HOME_COL * TILE_SIZE, Maze.HOME_ROW * TILE_SIZE,
                   TILE_SIZE, TILE_SIZE);
    }
});

var maze = {

    // collision map including dots and energisers
    layout: ['############################',
             '############################',
             '############################',
             '############################',
             '#............##............#',
             '#.####.#####.##.#####.####.#',
             '#o####.#####.##.#####.####o#',
             '#.####.#####.##.#####.####.#',
             '#..........................#',
             '#.####.##.########.##.####.#',
             '#.####.##.########.##.####.#',
             '#......##....##....##......#',
             '######.##### ## #####.######',
             '######.##### ## #####.######',
             '######.##          ##.######',
             '######.## ######## ##.######',
             '######.## ######## ##.######',
             '      .   ########   .      ',
             '######.## ######## ##.######',
             '######.## ######## ##.######',
             '######.##          ##.######',
             '######.## ######## ##.######',
             '######.## ######## ##.######',
             '#............##............#',
             '#.####.#####.##.#####.####.#',
             '#.####.#####.##.#####.####.#',
             '#o..##.......  .......##..o#',
             '###.##.##.########.##.##.###',
             '###.##.##.########.##.##.###',
             '#......##....##....##......#',
             '#.##########.##.##########.#',
             '#.##########.##.##########.#',
             '#..........................#',
             '############################',
             '############################',
             '############################'],

    reset: function () {
        this.dots = [];
        this.nDots = 0;
        this.energisers = [];
        for (var row = 0; row < this.layout.length; row++) {
            this.dots[row] = [];
            for (var col = 0; col < this.layout[row].length; col++) {
                var c = this.layout[row][col];
                if (c !== '.' && c !== 'o') {
                    continue;
                }
                var dot;
                if (c === '.') {
                    dot = new Dot(col, row);
                } else if (c === 'o') {
                    dot = new Energiser(col, row);
                    this.energisers.push(dot);
                }
                this.dots[row][col] = dot;
                ++this.nDots;
            }
        }
        if (this.bonus) {
            this.removeBonus();
            events.cancel(this.bonusTimeout);
        }
        this.invalidate();
    },

    enterable: function (col, row) {
        return this.layout[row][col] !== '#';
    },

    // Return a number that is the bitwise-OR of directions in which an actor
    // may exit a given tile.
    exitsFrom: function (col, row) {
        if (this.inTunnel(col, row)) {
            return EAST | WEST;
        } else {
            return (this.enterable(col, row - 1) ? NORTH : 0) |
                   (this.enterable(col, row + 1) ? SOUTH : 0) |
                   (this.enterable(col - 1, row) ? WEST : 0) |
                   (this.enterable(col + 1, row) ? EAST : 0);
        }
    },

    // check if tile falls within one of two zones in which ghosts are
    // prohibited from turning north
    northDisallowed: function (col, row) {
        return (Maze.NNTZ_COL_MIN <= col && col <= Maze.NNTZ_COL_MAX) &&
               (row === Maze.NNTZ_ROW_1 || row === Maze.NNTZ_ROW_2);
    },

    inTunnel: function (col, row) {
        return row === 17 && (col <= 4 || 23 <= col);
    },

    itemAt: function (col, row) {
        var b = this.bonus;
        return (b && row === toRow(b.y) && col === toCol(b.x)) ? b :
            this.dotAt(col, row);
    },

    dotAt: function (col, row) {
        var dots = this.dots[row];
        return dots ? dots[col] : null;
    },

    energiserEaten: function (e) {
        this.energisers.remove(e);
        this.dotEaten(e);
    },

    dotEaten: function (d) {
        this.dots[d.row][d.col] = null;
        --this.nDots;
        if (this.nDots === 74 || this.nDots === 174) {
            this.bonus = Bonus.forLevel(level);
            this.bonus.centreAt(Maze.BONUS_X, Maze.BONUS_Y);
            var secs = 9 + Math.random();
            debug('displaying bonus for %.3ns', secs);
            var self = this;
            this.bonusTimeout = events.delay(toTicks(secs), function () {
                debug('bonus timeout');
                self.removeBonus();
            });
        }
    },

    removeBonus: function () {
        this.bonus.invalidate();
        delete this.bonus;
    },

    bonusEaten: function () {
        debug('bonus eaten');
        events.cancel(this.bonusTimeout);
        this.removeBonus();
    },

    invalidate: function () {
        // redraw everything
        this.invalidateRegion(0, 0, SCREEN_W, SCREEN_H);
    },

    invalidatedRegions: [],
    invalidatedDots: [],

    invalidateRegion: function (x, y, w, h) {
        this.invalidatedRegions.push({ x: x, y: y, w: w, h: h });
        // Track distinct invalidated dots using a sparse array. This is faster
        // than doing an overlap check on all the dots, particularly near the
        // start of a level. (An average of 9 invalidated regions and ~200 dots
        // equates to nearly 2000 calls to intersecting() per frame. This
        // solution computes the tiles in each invalidated region, which is a
        // maximum of about 50 per frame, then does a constant-time lookup on
        // the 2D array of dots for each tile.)
        // TODO: profile sparse/dense array
        var c1 = toCol(x),
            r1 = toRow(y),
            c2 = toCol(x + w),
            r2 = toRow(y + h);
        for (var r = r1; r <= r2; r++) {
            for (var c = c1; c <= c2; c++) {
                var d = this.dotAt(c, r);
                if (d && d.visible) {
                    this.invalidatedDots[r * COLS + c] = d;
                }
            }
        }

        if (this.bonus) {
            this.bonus.invalidateRegion(x, y, w, h);
        }
    },

    draw: function (g) {
        this.invalidatedRegions.forEach(function (r) {
            var x = r.x, y = r.y, w = r.w, h = r.h;
            g.drawImage(Maze.bg, x, y, w, h, x, y, w, h);
        }, this);
        this.invalidatedRegions = [];

        this.invalidatedDots.forEach(function (d) {
            d.repaint(g);
        });
        this.invalidatedDots = [];

        if (this.bonus) {
            this.bonus.draw(g);
        }
    }
};

