(function() {
    'use strict';

    const DEFAULT_DURATION = 0.7;
    const TOP_THRESHOLD = 2;
    const STYLE_ID = 'minaver-extension-style';

    let animationDuration = DEFAULT_DURATION;

    const normalizeDuration = (value) => {
        const duration = Number(value);
        return Number.isFinite(duration) && duration >= 0 ? duration : DEFAULT_DURATION;
    };

    const loadDuration = () => {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ animationDuration: DEFAULT_DURATION }, (items) => {
                resolve(normalizeDuration(items.animationDuration));
            });
        });
    };

    const getStyleText = (duration) => `
        #header {
            position: relative;
        }
        #topSearchWrap {
            position: absolute;
        }
        body:not(.ui-expanded) #topSearchWrap,
        body.ui-collapsing #topSearchWrap {
            top: 50%;
            transform: translateY(-50%);
        }
        body:not(.ui-expanded),
        body.ui-collapsing {
            overflow: hidden;
        }
        body:not(.ui-expanded) #header,
        body.ui-collapsing #header {
            height: 100vh;
        }
        #wrap > *:not(#header),
        #header > *:not(#topSearchWrap),
        #topSearchWrap > *:not(#search_area) {
            transition: opacity ${duration}s ease-in-out;
        }
        body:not(.ui-expanded) #wrap > *:not(#header),
        body:not(.ui-expanded) #header > *:not(#topSearchWrap),
        body:not(.ui-expanded) #topSearchWrap > *:not(#search_area) {
            opacity: 0;
            transition: opacity 0s;
            pointer-events: none;
        }
        body.ui-collapsing #wrap > *:not(#header),
        body.ui-collapsing #header > *:not(#topSearchWrap),
        body.ui-collapsing #topSearchWrap > *:not(#search_area) {
            opacity: 0;
            pointer-events: none;
        }
    `;

    const applyStyle = () => {
        let style = document.getElementById(STYLE_ID);

        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(style);
        }

        style.textContent = getStyleText(animationDuration);
    };

    applyStyle();

    loadDuration().then((duration) => {
        animationDuration = duration;
        applyStyle();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync' || !changes.animationDuration) {
            return;
        }

        animationDuration = normalizeDuration(changes.animationDuration.newValue);
        applyStyle();
    });

    document.addEventListener('DOMContentLoaded', () => {
        const header = document.getElementById('header');
        const searchWrap = document.getElementById('topSearchWrap');
        if (!header || !searchWrap) return;

        let isAnimating = false;
        let hasScrolledAwayFromTop = false;
        let lastScrollTop = window.scrollY || document.documentElement.scrollTop || 0;

        const focusQuery = () => {
            const query = document.getElementById('query');
            if (query) {
                query.focus();
            }
        };

        const getScrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;

        const finishAnimation = (callback) => {
            if (animationDuration === 0) {
                callback();
                return;
            }

            window.setTimeout(callback, animationDuration * 1000);
        };

        const expandUI = () => {
            if (isAnimating || document.body.classList.contains('ui-expanded')) {
                return;
            }

            isAnimating = true;
            hasScrolledAwayFromTop = false;

            const initialClientWidth = document.documentElement.clientWidth;

            document.body.classList.add('ui-expanded');
            document.body.classList.remove('ui-collapsing');

            const scrollbarWidth = initialClientWidth - document.documentElement.clientWidth;
            const horizontalShift = scrollbarWidth / 2;

            header.style.transition = 'none';
            searchWrap.style.transition = 'none';
            header.style.height = 'auto';
            searchWrap.style.top = '';
            searchWrap.style.transform = '';

            const finalHeaderHeight = header.offsetHeight;
            const finalSearchWrapTop = searchWrap.offsetTop;

            header.style.height = '100vh';
            searchWrap.style.top = '50%';
            searchWrap.style.transform = `translate(${horizontalShift}px, -50%)`;

            void header.offsetHeight;

            header.style.transition = `height ${animationDuration}s ease-in-out`;
            searchWrap.style.transition = `top ${animationDuration}s ease-in-out, transform ${animationDuration}s ease-in-out`;
            header.style.height = finalHeaderHeight + 'px';
            searchWrap.style.top = finalSearchWrapTop + 'px';
            searchWrap.style.transform = 'none';

            finishAnimation(() => {
                header.style.height = '';
                isAnimating = false;
                lastScrollTop = getScrollTop();
                focusQuery();
            });
        };

        const collapseUI = () => {
            if (isAnimating || !document.body.classList.contains('ui-expanded')) {
                return;
            }

            isAnimating = true;

            header.style.transition = 'none';
            searchWrap.style.transition = 'none';
            header.style.height = header.offsetHeight + 'px';
            searchWrap.style.top = searchWrap.offsetTop + 'px';
            searchWrap.style.transform = 'none';

            document.body.classList.add('ui-collapsing');

            void header.offsetHeight;

            header.style.transition = `height ${animationDuration}s ease-in-out`;
            searchWrap.style.transition = `top ${animationDuration}s ease-in-out, transform ${animationDuration}s ease-in-out`;
            header.style.height = '100vh';
            searchWrap.style.top = '50%';
            searchWrap.style.transform = 'translateY(-50%)';

            finishAnimation(() => {
                document.body.classList.remove('ui-expanded');
                document.body.classList.remove('ui-collapsing');
                window.scrollTo(0, 0);
                header.style.height = '';
                searchWrap.style.top = '';
                searchWrap.style.transform = '';
                isAnimating = false;
                hasScrolledAwayFromTop = false;
                lastScrollTop = getScrollTop();
                focusQuery();
            });
        };

        const handleWheel = (event) => {
            if (event.deltaY > 0 && !document.body.classList.contains('ui-expanded')) {
                expandUI();
                return;
            }

            if (
                event.deltaY < 0 &&
                document.body.classList.contains('ui-expanded') &&
                getScrollTop() <= TOP_THRESHOLD
            ) {
                collapseUI();
            }
        };

        const handleScroll = () => {
            if (isAnimating || !document.body.classList.contains('ui-expanded')) {
                lastScrollTop = getScrollTop();
                return;
            }

            const scrollTop = getScrollTop();

            if (scrollTop > TOP_THRESHOLD) {
                hasScrolledAwayFromTop = true;
            }

            if (hasScrolledAwayFromTop && scrollTop <= TOP_THRESHOLD && scrollTop < lastScrollTop) {
                collapseUI();
            }

            lastScrollTop = scrollTop;
        };

        window.addEventListener('wheel', handleWheel);
        window.addEventListener('scroll', handleScroll, { passive: true });
        setTimeout(focusQuery, 100);
    });
})();
