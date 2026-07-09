// ==UserScript==
// @name         Minaver
// @namespace    https://github.com/onetwohour/Minaver
// @version      1.2
// @description  네이버의 시작 화면을 간소화합니다.
// @author       onetwohour
// @match        *://www.naver.com/
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @license      BSD-2-Clause
// @downloadURL  https://update.greasyfork.org/scripts/547954/Minaver.user.js
// @updateURL    https://update.greasyfork.org/scripts/547954/Minaver.meta.js
// ==/UserScript==

(function() {
    'use strict';

    const defaultDuration = 0.7;
    const topThreshold = 2;

    let animationDuration = GM_getValue('animationDuration', defaultDuration);

    GM_registerMenuCommand('애니메이션 속도 설정', () => {
        const currentSpeed = GM_getValue('animationDuration', defaultDuration);
        const newSpeedInput = prompt('애니메이션 속도를 초 단위로 입력하세요 (예: 0.5):', currentSpeed);

        if (newSpeedInput === null) {
            return;
        }

        const newSpeed = parseFloat(newSpeedInput);

        if (!isNaN(newSpeed) && newSpeed >= 0) {
            GM_setValue('animationDuration', newSpeed);
            alert(`애니메이션 속도가 ${newSpeed}초로 저장되었습니다. 페이지를 새로고침하면 적용됩니다.`);
        } else {
            alert('유효한 숫자를 입력하세요.');
        }
    });

    GM_addStyle(`
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
            transition: opacity ${animationDuration}s ease-in-out;
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
    `);

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
            animationDuration = GM_getValue('animationDuration', defaultDuration);

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
            animationDuration = GM_getValue('animationDuration', defaultDuration);

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
                getScrollTop() <= topThreshold
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

            if (scrollTop > topThreshold) {
                hasScrolledAwayFromTop = true;
            }

            if (hasScrolledAwayFromTop && scrollTop <= topThreshold && scrollTop < lastScrollTop) {
                collapseUI();
            }

            lastScrollTop = scrollTop;
        };

        window.addEventListener('wheel', handleWheel);
        window.addEventListener('scroll', handleScroll, { passive: true });
        setTimeout(focusQuery, 100);
    });
})();
