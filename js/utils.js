/**
 * Вспомогательные утилиты.
 */

const PhilwordUtils = {
    // Перемешивание массива (Фишер — Йетс)
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // Случайное целое число в диапазоне [min, max]
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
    },

    // Валидация: только буквы
    isValidWord(str) {
        return /^\p{L}+$/u.test(str.trim());
    },

    // Очистка: перевести в верхний регистр
    cleanWord(str) {
        return str.trim().toUpperCase();
    },

    // Координаты внутри сетки
    inBounds(r, c, size) {
        return r >= 0 && r < size && c >= 0 && c < size;
    },

    // Соседние ячейки (без диагоналей)
    isAdjacent(a, b) {
        const dr = Math.abs(a.r - b.r);
        const dc = Math.abs(a.c - b.c);
        return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    },

    // Создание пустого двумерного массива
    create2DArray(rows, cols, val) {
        return Array.from({ length: rows }, () => new Array(cols).fill(val));
    }
};

window.PhilwordUtils = PhilwordUtils;
