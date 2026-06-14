/**
 * Режим создания: форма для ввода слов, настроек и генерации сетки.
 */

class PhilwordCreator {
    constructor(config) {
        this.config = config;
        this.container = document.getElementById(config.containerId);
        this.words = [];
        this.generatedGrid = null;
        this._render();
    }

    _render() {
        this.container.innerHTML = `
            <div class="creator-layout" style="display: flex; flex-direction: column; gap: 2rem;">
                <div class="glass-panel creator-form">
                    <h2 class="text-center">Создание Филворда</h2>
                    
                    <div class="form-group">
                        <label class="form-label" for="task-title">Название задания</label>
                        <input type="text" id="task-title" class="form-input" placeholder="Например: Угадай животных" value="Филворд">
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="word-input">Добавить слово</label>
                        <div class="flex gap-2">
                            <input type="text" id="word-input" class="form-input" placeholder="Введите слово">
                            <button id="add-word-btn" class="btn btn-primary">+</button>
                        </div>
                        <p id="word-error" style="color: var(--cell-error); font-size: 0.875rem; margin-top: 0.5rem; display: none;"></p>
                    </div>

                    <div id="words-list-container" style="display: flex; gap: 0.5rem; flex-wrap: wrap;" class="mb-4"></div>

                    <hr style="border: none; border-top: 1px solid var(--cell-border); margin: 1.5rem 0;">
                    <h3 style="font-size: 1rem; margin-bottom: 1rem;">Настройки игры</h3>

                    <div class="form-group">
                        <label class="form-label" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                            <input type="checkbox" id="show-words-toggle" style="width: 18px; height: 18px; accent-color: var(--primary-color);">
                            Показывать список слов при прохождении
                        </label>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0 2rem;">
                            Если включить — список слов будет отображаться во время игры. Иначе искать придётся вслепую.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Спрятанная картинка (необязательно)</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                            <label class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem; cursor: pointer;">
                                📎 Выбрать изображение
                                <input type="file" id="bg-file" accept="image/*" style="display: none;">
                            </label>
                            <button id="bg-remove-btn" class="btn" style="display: none; padding: 0.5rem; font-size: 0.875rem; color: var(--color-error); background: transparent; border: 1px solid var(--color-error); cursor: pointer;" title="Удалить картинку">❌ Удалить</button>
                        </div>
                        <p id="bg-preview-name" style="font-size: 0.8rem; color: var(--primary-color); margin-top: 0.25rem; display: none;"></p>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            Слова будут написаны поверх этой картинки. При отгадывании она будет постепенно открываться.
                        </p>
                    </div>

                    <div class="flex justify-center gap-4 mt-4">
                        <button id="generate-btn" class="btn btn-secondary">Сгенерировать сетку</button>
                        <button id="save-btn" class="btn btn-primary" disabled>💾 Сохранить задание</button>
                    </div>
                </div>

                <div class="glass-panel hidden" id="preview-panel">
                    <h3 class="text-center mb-4">Предпросмотр сетки</h3>
                    <div id="preview-container"></div>
                </div>
            </div>
        `;
        this._attachEvents();
    }

    _attachEvents() {
        const wordInput = document.getElementById('word-input');
        const addBtn = document.getElementById('add-word-btn');
        const generateBtn = document.getElementById('generate-btn');
        const saveBtn = document.getElementById('save-btn');
        const titleInput = document.getElementById('task-title');
        const showWordsToggle = document.getElementById('show-words-toggle');
        const bgFileInput = document.getElementById('bg-file');
        const bgRemoveBtn = document.getElementById('bg-remove-btn');

        bgFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                this._bgFileData = reader.result;
                const nameEl = document.getElementById('bg-preview-name');
                nameEl.textContent = `✅ ${file.name}`;
                nameEl.style.display = 'block';
                bgRemoveBtn.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        });

        bgRemoveBtn.addEventListener('click', () => {
            this._bgFileData = null;
            bgFileInput.value = '';
            document.getElementById('bg-preview-name').style.display = 'none';
            bgRemoveBtn.style.display = 'none';
        });

        const addWord = () => {
            this._addWord(wordInput.value);
            wordInput.value = '';
            wordInput.focus();
        };

        addBtn.addEventListener('click', addWord);
        wordInput.addEventListener('keypress', e => { if (e.key === 'Enter') addWord(); });

        generateBtn.addEventListener('click', () => {
            if (this.words.length === 0) return this._showError('Добавьте хотя бы одно слово.');
            this._generatePreview();
        });

        saveBtn.addEventListener('click', () => {
            if (!this.generatedGrid) return;
            const config = {
                title: titleInput.value.trim() || 'Филворд',
                words: [...this.words],
                grid: this.generatedGrid.grid,
                size: this.generatedGrid.size,
                placedWords: this.generatedGrid.placedWords,
                showWords: showWordsToggle.checked,
                backgroundUrl: this._bgFileData || null
            };
            if (typeof this.config.onConfigGenerated === 'function') {
                this.config.onConfigGenerated(config);
            }
        });
    }

    _addWord(raw) {
        document.getElementById('word-error').style.display = 'none';
        if (!PhilwordUtils.isValidWord(raw)) {
            return this._showError('Используйте только буквы (без пробелов, цифр и спецсимволов).');
        }
        const word = PhilwordUtils.cleanWord(raw);
        if (this.words.includes(word)) return this._showError('Это слово уже добавлено.');

        this.words.push(word);
        this._renderWordsList();
        document.getElementById('save-btn').disabled = true;
        document.getElementById('preview-panel').classList.add('hidden');
    }

    _removeWord(word) {
        this.words = this.words.filter(w => w !== word);
        this._renderWordsList();
        document.getElementById('save-btn').disabled = true;
        document.getElementById('preview-panel').classList.add('hidden');
    }

    _showError(msg) {
        const el = document.getElementById('word-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    _renderWordsList() {
        const container = document.getElementById('words-list-container');
        container.innerHTML = '';
        this.words.forEach(word => {
            const badge = document.createElement('div');
            Object.assign(badge.style, {
                backgroundColor: 'var(--primary-color)', color: 'white',
                padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-full)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.875rem', fontWeight: 'bold'
            });
            const text = document.createElement('span');
            text.textContent = word;
            const removeBtn = document.createElement('span');
            removeBtn.textContent = '✕';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.opacity = '0.8';
            removeBtn.addEventListener('click', () => this._removeWord(word));
            badge.appendChild(text);
            badge.appendChild(removeBtn);
            container.appendChild(badge);
        });
    }

    _generatePreview() {
        const result = PhilwordGenerator.generate(this.words);
        if (!result) {
            return this._showError('Не удалось сгенерировать сетку. Попробуйте изменить список слов.');
        }
        this.generatedGrid = result;
        const panel = document.getElementById('preview-panel');
        const container = document.getElementById('preview-container');
        panel.classList.remove('hidden');
        container.innerHTML = '';

        const gridEl = document.createElement('div');
        Object.assign(gridEl.style, {
            display: 'grid', gridTemplateColumns: `repeat(${result.size}, 1fr)`,
            gap: '4px', width: '100%', maxWidth: '400px',
            margin: '0 auto', aspectRatio: '1 / 1'
        });
        for (let r = 0; r < result.size; r++) {
            for (let c = 0; c < result.size; c++) {
                const char = result.grid[r][c];
                const cell = document.createElement('div');
                Object.assign(cell.style, {
                    backgroundColor: 'var(--cell-bg)', border: '2px solid var(--cell-border)',
                    borderRadius: 'var(--border-radius-sm)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: `calc(250px / ${result.size})`, fontWeight: 'bold',
                    color: 'var(--cell-text)'
                });
                if (char) cell.textContent = char;
                else cell.style.opacity = '0.1';
                gridEl.appendChild(cell);
            }
        }
        container.appendChild(gridEl);
        document.getElementById('save-btn').disabled = false;
    }
}

window.PhilwordCreator = PhilwordCreator;
