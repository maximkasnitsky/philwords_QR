/**
 * Точка входа — API для интеграции.
 */

const Philword = {
    init(config) {
        const container = document.getElementById(config.containerId);
        if (!container) {
            console.error(`Контейнер #${config.containerId} не найден.`);
            return;
        }
        container.classList.add('philword-container');

        if (config.mode === 'create') {
            new PhilwordCreator(config);
        } else if (config.mode === 'play') {
            if (!config.data || !config.data.grid || !config.data.words) {
                container.innerHTML = '<p style="text-align:center;color:var(--cell-error)">Ошибка загрузки задания.</p>';
                return;
            }
            new PhilwordGame(config);
        }
    }
};

window.Philword = Philword;
