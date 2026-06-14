/**
 * Генерация плотной сетки филворда (Backtracking с лимитом итераций).
 */

const PhilwordGenerator = {
    _iterations: 0,
    _MAX_ITERATIONS: 5000,

    // Главный метод: принимает массив слов, возвращает { size, grid, placedWords } или null
    generate(words) {
        const cleaned = words.map(PhilwordUtils.cleanWord).filter(w => w.length > 0);
        if (cleaned.length === 0) return null;

        // Длинные слова размещаем первыми (им сложнее найти путь)
        cleaned.sort((a, b) => b.length - a.length);

        const totalLetters = cleaned.reduce((sum, w) => sum + w.length, 0);
        let size = Math.ceil(Math.sqrt(totalLetters));

        const MAX_ATTEMPTS = 150;

        for (let attempt = 0; attempt < MAX_ATTEMPTS && size <= 20; attempt++) {
            this._iterations = 0;
            const result = this._tryPlaceAll(cleaned, size);
            if (result) return { size, grid: result.grid, placedWords: result.placedWords };

            // Каждые 15 неудач увеличиваем размер поля, иначе перемешиваем порядок слов
            if (attempt % 15 === 14) {
                size++;
            } else {
                const [first, ...rest] = cleaned;
                PhilwordUtils.shuffleArray(rest);
                cleaned.splice(1, rest.length, ...rest);
            }
        }

        return null;
    },

    // Попытка разместить все слова на поле заданного размера
    _tryPlaceAll(words, size) {
        const grid = PhilwordUtils.create2DArray(size, size, null);
        const placedWords = {};
        return this._placeWord(0, words, grid, size, placedWords) ? { grid, placedWords } : null;
    },

    // Рекурсивное размещение слова с откатом (Backtracking)
    _placeWord(idx, words, grid, size, placed) {
        if (++this._iterations > this._MAX_ITERATIONS) return false;
        if (idx >= words.length) return true;

        const word = words[idx];

        // Собираем все свободные стартовые позиции
        const starts = [];
        for (let r = 0; r < size; r++)
            for (let c = 0; c < size; c++)
                if (grid[r][c] === null) starts.push({ r, c });

        PhilwordUtils.shuffleArray(starts);

        for (const start of starts) {
            const path = [start];
            grid[start.r][start.c] = word[0];

            if (this._findPath(word, 1, path, grid, size)) {
                placed[word] = [...path];
                if (this._placeWord(idx + 1, words, grid, size, placed)) return true;
                delete placed[word];
            }

            // Откат: очищаем все ячейки пути
            for (const p of path) grid[p.r][p.c] = null;
        }

        return false;
    },

    // Поиск змейки для оставшихся букв слова
    _findPath(word, charIdx, path, grid, size) {
        if (++this._iterations > this._MAX_ITERATIONS) return false;
        if (charIdx >= word.length) return true;

        const last = path[path.length - 1];
        const dirs = PhilwordUtils.shuffleArray([[-1, 0], [0, 1], [1, 0], [0, -1]]);

        for (const [dr, dc] of dirs) {
            const nr = last.r + dr, nc = last.c + dc;
            if (PhilwordUtils.inBounds(nr, nc, size) && grid[nr][nc] === null) {
                grid[nr][nc] = word[charIdx];
                path.push({ r: nr, c: nc });
                if (this._findPath(word, charIdx + 1, path, grid, size)) return true;
                grid[nr][nc] = null;
                path.pop();
            }
        }

        return false;
    }
};

window.PhilwordGenerator = PhilwordGenerator;
