/**
 * Игровая логика: сетка, выделение, подсказки, таймер, результат.
 */

class PhilwordGame {
    constructor(config) {
        this.config = config;
        this.container = document.getElementById(config.containerId);
        this.gridData = config.data.grid;
        this.wordsToFind = [...config.data.words].map(PhilwordUtils.cleanWord);
        this.size = this.gridData.length;

        // Настройки
        this.showWords = config.data.showWords !== false;
        this.backgroundUrl = config.data.backgroundUrl || null;

        // Состояние
        this.isSelecting = false;
        this.currentSelection = [];
        this.foundWords = [];
        this.foundCells = new Map();
        this.startTime = Date.now();
        this.mistakes = 0;

        // Палитра
        this.colors = [
            '#10b981', '#f97316', '#eab308', '#84cc16',
            '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
            '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
        ];

        // Подсказки
        this.maxHints = config.maxHints ?? 3;
        this.hintsUsed = 0;
        this._hintTimer = null;
        this._timerInterval = null;

        this.onComplete = config.onComplete || function () { };
        this.isStarted = false;

        this._render();
        this._renderStartScreen();
    }

    _renderStartScreen() {
        const overlay = document.createElement('div');
        overlay.className = 'start-overlay';
        overlay.id = 'start-overlay';

        const title = document.createElement('h2');
        title.className = 'result-title';
        title.textContent = this.config.data.title || 'Филворд';
        title.style.marginBottom = '0.5rem';

        const desc = document.createElement('p');
        desc.textContent = 'Найдите все загаданные слова на поле.';
        desc.style.textAlign = 'center';
        desc.style.maxWidth = '300px';
        desc.style.color = 'var(--text-secondary)';
        desc.style.marginBottom = '1.5rem';

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = 'Начать игру';
        btn.style.fontSize = '1.25rem';
        btn.style.padding = '1rem 2rem';

        btn.addEventListener('click', () => {
            overlay.remove();
            this._startGame();
        });

        overlay.appendChild(title);
        overlay.appendChild(desc);
        overlay.appendChild(btn);

        if (this.wrapper) {
            this.wrapper.style.position = 'relative';
            this.wrapper.appendChild(overlay);
        }
    }

    _startGame() {
        this.isStarted = true;
        this.startTime = Date.now();
        this._attachEvents();
        this._startHintTimer();
        this._startTimer();
    }

    // ─── Рендеринг ───

    _render() {
        this.container.innerHTML = '';

        // Обёртка
        const wrapper = document.createElement('div');
        wrapper.className = 'glass-panel';
        const isMobile = window.innerWidth <= 640;
        Object.assign(wrapper.style, {
            background: 'var(--surface-color)',
            padding: isMobile ? '1.25rem' : '2rem',
            position: 'relative'
        });

        // Шапка
        const header = document.createElement('div');
        header.className = 'text-center mb-4';

        const title = document.createElement('h2');
        title.textContent = this.config.data.title || 'Филворд';

        // Таймер
        const timerEl = document.createElement('p');
        timerEl.id = 'game-timer';
        timerEl.textContent = '⏱ 00:00';
        Object.assign(timerEl.style, {
            fontSize: '1.25rem', fontWeight: 'bold',
            color: 'var(--primary-color)', margin: '0.25rem 0'
        });

        header.appendChild(title);
        header.appendChild(timerEl);
        wrapper.appendChild(header);

        // Панель: список слов + подсказка
        const toolbar = document.createElement('div');
        toolbar.className = 'flex justify-center items-center gap-4 mb-4 flex-wrap';

        if (this.showWords) {
            const wordList = document.createElement('div');
            wordList.className = 'flex justify-center gap-2 flex-wrap';
            wordList.id = 'word-list';
            this.wordsToFind.forEach(word => {
                const badge = document.createElement('span');
                badge.className = 'word-badge';
                badge.textContent = word;
                badge.setAttribute('data-word', word);
                wordList.appendChild(badge);
            });
            toolbar.appendChild(wordList);
        }

        const hintBtn = document.createElement('button');
        hintBtn.className = 'hint-btn';
        hintBtn.id = 'hint-btn';
        hintBtn.innerHTML = `💡 Подсказка <span id="hints-left">(${this.maxHints})</span>`;
        hintBtn.addEventListener('click', () => this._useHint());
        toolbar.appendChild(hintBtn);

        wrapper.appendChild(toolbar);

        // Игровое поле
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'flex justify-center';

        const gridEl = document.createElement('div');
        gridEl.className = 'philword-grid';
        Object.assign(gridEl.style, {
            display: 'grid', gridTemplateColumns: `repeat(${this.size}, 1fr)`,
            width: '100%',
            maxWidth: '500px',
            margin: '0 auto',
            userSelect: 'none',
            border: '2px solid var(--cell-border)',
            borderRadius: 'var(--border-radius-md)',
            overflow: 'hidden',
            gap: '0'
        });

        if (this.backgroundUrl) {
            Object.assign(gridEl.style, {
                backgroundImage: `url(${this.backgroundUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            });
        }

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const char = this.gridData[r][c];
                const cell = document.createElement('div');
                cell.className = 'grid-cell flex items-center justify-center';
                cell.dataset.r = r;
                cell.dataset.c = c;
                Object.assign(cell.style, {
                    aspectRatio: '1 / 1',
                    overflow: 'hidden',
                    backgroundColor: 'var(--surface-color)',
                    borderRight: c < this.size - 1 ? '2px solid var(--cell-border)' : 'none',
                    borderBottom: r < this.size - 1 ? '2px solid var(--cell-border)' : 'none',
                    fontSize: `min(calc(300px / ${this.size}), calc(${Math.round(65 / this.size)}vw))`,
                    fontWeight: 'bold', color: 'var(--cell-text)',
                    cursor: 'pointer', userSelect: 'none',
                    transition: 'all 0.3s ease'
                });
                if (char) {
                    cell.textContent = char;
                    cell.dataset.char = char;
                } else {
                    cell.style.opacity = '0';
                    cell.style.pointerEvents = 'none';
                }
                gridEl.appendChild(cell);
            }
        }

        gridWrapper.appendChild(gridEl);
        wrapper.appendChild(gridWrapper);
        this.container.appendChild(wrapper);
        this.gridEl = gridEl;
        this.wrapper = wrapper;
    }

    // ─── Таймер ───

    _startTimer() {
        this._timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const secs = String(elapsed % 60).padStart(2, '0');
            const el = document.getElementById('game-timer');
            if (el) el.textContent = `⏱ ${mins}:${secs}`;
        }, 1000);
    }

    // ─── События ───

    _attachEvents() {
        this.gridEl.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
        this.gridEl.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

        this.gridEl.addEventListener('mousedown', this._onStart.bind(this));
        document.addEventListener('mousemove', this._onMove.bind(this));
        document.addEventListener('mouseup', this._onEnd.bind(this));

        this.gridEl.addEventListener('touchstart', this._onStart.bind(this));
        document.addEventListener('touchmove', this._onMove.bind(this));
        document.addEventListener('touchend', this._onEnd.bind(this));
    }

    _getCellFromEvent(e) {
        let target = e.target;
        if (e.type.startsWith('touch') && e.touches.length > 0) {
            target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        }
        if (target && target.classList.contains('grid-cell') && target.dataset.char) {
            return { r: parseInt(target.dataset.r), c: parseInt(target.dataset.c), el: target, char: target.dataset.char };
        }
        return null;
    }

    _onStart(e) {
        if (e.button !== 0 && !e.type.startsWith('touch')) return;
        const cell = this._getCellFromEvent(e);
        if (!cell || this.foundCells.has(`${cell.r},${cell.c}`)) return;
        this.isSelecting = true;
        this.currentSelection = [cell];
        this._highlightCell(cell.el, 'selecting');
    }

    _onMove(e) {
        if (!this.isSelecting) return;
        const cell = this._getCellFromEvent(e);
        if (!cell || this.foundCells.has(`${cell.r},${cell.c}`)) return;

        const last = this.currentSelection[this.currentSelection.length - 1];

        // Откат при возврате на предыдущую клетку
        if (this.currentSelection.length > 1) {
            const prev = this.currentSelection[this.currentSelection.length - 2];
            if (prev.r === cell.r && prev.c === cell.c) {
                this._unhighlightCell(last.el, last.r, last.c);
                this.currentSelection.pop();
                return;
            }
        }

        if (this.currentSelection.some(c => c.r === cell.r && c.c === cell.c)) return;

        // Только смежные (без диагоналей)
        if (PhilwordUtils.isAdjacent(last, cell)) {
            this.currentSelection.push(cell);
            this._highlightCell(cell.el, 'selecting');
        }
    }

    _onEnd() {
        if (!this.isSelecting) return;
        this.isSelecting = false;

        const word = this.currentSelection.map(c => c.char).join('');
        const match = this.wordsToFind.includes(word) ? word : null;

        if (match) {
            // Проверка точных координат
            if (this.config.data.placedWords && this.config.data.placedWords[match]) {
                const intended = this.config.data.placedWords[match];
                if (!this._checkPath(this.currentSelection, intended)) {
                    this._showToast(`Слово «${match}» загадано в другом месте!`);
                    this.mistakes++;
                    this._flashError();
                    this.currentSelection = [];
                    return;
                }
            }

            // Успех
            const color = this.colors[this.foundWords.length % this.colors.length];
            this.foundWords.push(match);
            this.wordsToFind.splice(this.wordsToFind.indexOf(match), 1);

            this.currentSelection.forEach(c => {
                this.foundCells.set(`${c.r},${c.c}`, color);
                this._highlightCell(c.el, 'found', color);
            });

            this._markWordFound(match, color);
            this._resetHintTimer();

            if (this.wordsToFind.length === 0) this._handleWin();
        } else {
            this.mistakes++;
            this._flashError();
        }

        this.currentSelection = [];
    }

    // ─── Подсказки ───

    _startHintTimer() {
        clearTimeout(this._hintTimer);
        this._hintTimer = setTimeout(() => this._autoHint(), 30000);
    }

    _resetHintTimer() { this._startHintTimer(); }

    _autoHint() {
        if (this.wordsToFind.length === 0) return;
        this._blinkFirstLetter();
        this._hintTimer = setTimeout(() => this._autoHint(), 30000);
    }

    _useHint() {
        if (this.hintsUsed >= this.maxHints || this.wordsToFind.length === 0) return;
        this.hintsUsed++;
        const left = this.maxHints - this.hintsUsed;
        const counter = document.getElementById('hints-left');
        if (counter) counter.textContent = `(${left})`;
        if (left <= 0) {
            const btn = document.getElementById('hint-btn');
            if (btn) btn.disabled = true;
        }
        this._blinkFirstLetter();
        this._resetHintTimer();
    }

    _blinkFirstLetter() {
        if (this.wordsToFind.length === 0) return;
        const placed = this.config.data.placedWords;
        if (!placed) return;
        const word = this.wordsToFind[PhilwordUtils.getRandomInt(0, this.wordsToFind.length - 1)];
        const path = placed[word];
        if (!path || path.length === 0) return;
        const first = path[0];
        const cell = this.gridEl.querySelector(`.grid-cell[data-r="${first.r}"][data-c="${first.c}"]`);
        if (cell && !this.foundCells.has(`${first.r},${first.c}`)) {
            cell.classList.add('cell-hint-blink');
            setTimeout(() => cell.classList.remove('cell-hint-blink'), 2500);
        }
    }

    // ─── Отображение ───

    _highlightCell(el, type, color) {
        if (type === 'selecting') {
            el.style.backgroundColor = 'var(--cell-selected)';
            el.style.color = 'white';
            el.style.transform = 'scale(0.95)';
        } else if (type === 'found') {
            if (this.backgroundUrl) {
                el.style.backgroundColor = 'transparent';
                el.style.color = 'transparent';
                el.style.borderColor = 'transparent';
                el.style.transform = 'scale(1)';
            } else {
                el.style.backgroundColor = color || 'var(--cell-found)';
                el.style.color = 'white';
                el.style.borderColor = color || 'var(--cell-found)';
                el.style.transform = 'scale(1)';
            }
        }
    }

    _unhighlightCell(el, r, c) {
        if (this.foundCells.has(`${r},${c}`)) {
            this._highlightCell(el, 'found', this.foundCells.get(`${r},${c}`));
        } else {
            Object.assign(el.style, {
                backgroundColor: 'var(--surface-color)', color: 'var(--cell-text)',
                borderColor: 'var(--cell-border)', transform: 'scale(1)'
            });
            el.style.borderRight = c < this.size - 1 ? '2px solid var(--cell-border)' : 'none';
            el.style.borderBottom = r < this.size - 1 ? '2px solid var(--cell-border)' : 'none';
        }
    }

    _flashError() {
        this.currentSelection.forEach(c => {
            this._unhighlightCell(c.el, c.r, c.c);
            c.el.style.backgroundColor = 'var(--cell-error)';
            c.el.style.color = 'white';
            setTimeout(() => this._unhighlightCell(c.el, c.r, c.c), 300);
        });
    }

    _markWordFound(word, color) {
        if (this.showWords) {
            const badge = document.querySelector(`.word-badge[data-word="${word}"]`);
            if (badge) {
                badge.style.textDecoration = 'line-through';
                badge.style.opacity = '0.8';
                badge.style.backgroundColor = color;
                badge.style.color = 'white';
                badge.style.borderColor = color;
            }
        }
    }

    _checkPath(sel, intended) {
        if (!intended || sel.length !== intended.length) return false;
        return sel.every((c, i) => c.r === intended[i].r && c.c === intended[i].c);
    }

    _showToast(msg) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        Object.assign(toast.style, {
            position: 'absolute', top: '10px', left: '50%',
            transform: 'translateX(-50%)', backgroundColor: 'var(--cell-error)',
            color: 'white', padding: '0.75rem 1.5rem',
            borderRadius: 'var(--border-radius-full)', fontWeight: 'bold',
            zIndex: '100', boxShadow: 'var(--shadow-lg)',
            opacity: '0', transition: 'opacity 0.3s ease', pointerEvents: 'none'
        });
        this.container.style.position = 'relative';
        this.container.appendChild(toast);
        setTimeout(() => toast.style.opacity = '1', 10);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // ─── Экран победы ───

    _handleWin() {
        clearTimeout(this._hintTimer);
        clearInterval(this._timerInterval);
        const time = Math.floor((Date.now() - this.startTime) / 1000);

        if (this.backgroundUrl) {
            Array.from(this.gridEl.children).forEach(cell => {
                cell.style.backgroundColor = 'transparent';
                cell.style.color = 'transparent';
                cell.style.borderColor = 'transparent';
            });
            this.gridEl.style.border = 'none';
        }

        this._showWinOverlay(time);
    }

    _showWinOverlay(timeSpent) {
        const overlay = document.createElement('div');
        overlay.className = 'result-overlay';

        const content = document.createElement('div');
        Object.assign(content.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        });

        const emoji = document.createElement('div');
        emoji.className = 'result-emoji';
        emoji.textContent = '🎉';
        emoji.style.fontSize = '4rem';
        emoji.style.lineHeight = '1';
        emoji.style.marginBottom = '1rem';

        const titleEl = document.createElement('div');
        titleEl.className = 'result-title';
        titleEl.textContent = 'Все слова найдены!';
        titleEl.style.color = 'var(--color-success)';
        titleEl.style.marginBottom = '1.5rem';

        const m = String(Math.floor(timeSpent / 60)).padStart(2, '0');
        const s = String(timeSpent % 60).padStart(2, '0');

        const stats = document.createElement('div');
        stats.className = 'result-score';
        stats.innerHTML = `Время: <b style="color:var(--text-primary)">${m}:${s}</b><br>Ошибок: <b style="color:var(--text-primary)">${this.mistakes}</b><br>Подсказок: <b style="color:var(--text-primary)">${this.hintsUsed}</b>`;
        stats.style.lineHeight = '1.8';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-primary';
        closeBtn.style.marginTop = '1.5rem';
        closeBtn.textContent = this.backgroundUrl ? 'Посмотреть картинку' : 'Посмотреть поле';
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        content.appendChild(emoji);
        content.appendChild(titleEl);
        content.appendChild(stats);
        content.appendChild(closeBtn);
        overlay.appendChild(content);

        this.wrapper.appendChild(overlay);

        if (typeof this.onComplete === 'function') {
            this.onComplete({ time: timeSpent, mistakes: this.mistakes, hints: this.hintsUsed, completed: true });
        }
    }
}

window.PhilwordGame = PhilwordGame;
