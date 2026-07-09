(function() {
    'use strict';

    const DEFAULT_DURATION = 0.7;
    const statusClearDelay = 1800;

    const form = document.getElementById('settings-form');
    const durationInput = document.getElementById('animation-duration');
    const resetButton = document.getElementById('reset');
    const status = document.getElementById('status');

    let statusTimer = null;

    const normalizeDuration = (value) => {
        const duration = Number(value);
        return Number.isFinite(duration) && duration >= 0 ? duration : null;
    };

    const showStatus = (message, state = 'ok') => {
        window.clearTimeout(statusTimer);
        status.textContent = message;
        status.dataset.state = state;

        if (state === 'ok') {
            statusTimer = window.setTimeout(() => {
                status.textContent = '';
                delete status.dataset.state;
            }, statusClearDelay);
        }
    };

    const setDuration = (duration) => {
        durationInput.value = String(duration);
    };

    chrome.storage.sync.get({ animationDuration: DEFAULT_DURATION }, (items) => {
        setDuration(items.animationDuration);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const duration = normalizeDuration(durationInput.value);

        if (duration === null) {
            showStatus('0 이상의 숫자를 입력하세요.', 'error');
            durationInput.focus();
            return;
        }

        chrome.storage.sync.set({ animationDuration: duration }, () => {
            setDuration(duration);
            showStatus('저장되었습니다.');
        });
    });

    resetButton.addEventListener('click', () => {
        chrome.storage.sync.set({ animationDuration: DEFAULT_DURATION }, () => {
            setDuration(DEFAULT_DURATION);
            showStatus('기본값으로 되돌렸습니다.');
        });
    });
})();
