// 슬라이드 목록을 동적으로 가져오기
let slideList = [];
let currentSlideIndex = -1;

// 슬라이드 목록 초기화
async function initSlideList() {
    slideList = [];

    // 기본 슬라이드 탐지 (slide_01.html ~ slide_50.html)
    for (let i = 1; i <= 50; i++) {
        const slideNum = String(i).padStart(2, '0');
        const slidePath = `slide_${slideNum}.html`;

        try {
            const response = await fetch(slidePath, { method: 'HEAD' });
            if (response.ok) {
                slideList.push(slidePath);
            }
        } catch (error) {
            // 파일이 없으면 중단
            break;
        }
    }

    // 서브 슬라이드 탐지 (slide_11a.html, slide_11b.html 등)
    for (let i = 1; i <= 30; i++) {
        const slideNum = String(i).padStart(2, '0');
        for (let sub of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            const slidePath = `slide_${slideNum}${sub}.html`;

            try {
                const response = await fetch(slidePath, { method: 'HEAD' });
                if (response.ok) {
                    // 적절한 위치에 삽입
                    const baseIndex = slideList.findIndex(s => s === `slide_${slideNum}.html`);
                    if (baseIndex !== -1) {
                        // 기본 슬라이드 바로 다음에 삽입
                        let insertIndex = baseIndex + 1;
                        while (insertIndex < slideList.length &&
                               slideList[insertIndex].match(new RegExp(`slide_${slideNum}[a-z]\\.html`))) {
                            insertIndex++;
                        }
                        slideList.splice(insertIndex, 0, slidePath);
                    }
                }
            } catch (error) {
                continue;
            }
        }
    }

    // 현재 슬라이드 인덱스 찾기
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    currentSlideIndex = slideList.indexOf(filename);

    console.log(`Total slides: ${slideList.length}, Current: ${currentSlideIndex + 1}`);
}

// 슬라이드 로드
async function loadSlide(slideIndex) {
    if (slideIndex < 0 || slideIndex >= slideList.length) {
        console.log('Slide index out of range:', slideIndex);
        return;
    }

    const slideUrl = slideList[slideIndex];

    try {
        const response = await fetch(slideUrl);
        if (!response.ok) {
            console.error("Could not load slide:", response.statusText);
            return;
        }
        const htmlText = await response.text();
        const parser = new DOMParser();
        const nextDoc = parser.parseFromString(htmlText, 'text/html');

        const newContent = nextDoc.querySelector('.container').innerHTML;
        const newTitle = nextDoc.querySelector('title').textContent;

        document.querySelector('.container').innerHTML = newContent;
        document.title = newTitle;
        history.pushState({slide: slideIndex}, newTitle, slideUrl);

        currentSlideIndex = slideIndex;
        console.log(`Loaded slide ${currentSlideIndex + 1}/${slideList.length}: ${slideUrl}`);
    } catch (err) {
        console.error("Error fetching or parsing slide:", err);
    }
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', async function(event) {
    // 슬라이드 목록이 아직 초기화되지 않았으면 초기화
    if (slideList.length === 0) {
        await initSlideList();
    }

    // Toggle fullscreen with 'f' key
    if (event.key === 'f') {
        toggleFullScreen();
        return;
    }

    // Escape key to go to index
    if (event.key === 'Escape') {
        window.location.href = '../index.html';
        return;
    }

    // 네비게이션 키
    if (event.key === 'ArrowRight' || event.key === 'l' || event.key === 'j') {
        event.preventDefault();
        await loadSlide(currentSlideIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'h' || event.key === 'k') {
        event.preventDefault();
        await loadSlide(currentSlideIndex - 1);
    } else if (event.key === 'Home') {
        event.preventDefault();
        await loadSlide(0);
    } else if (event.key === 'End') {
        event.preventDefault();
        await loadSlide(slideList.length - 1);
    }
});

// 페이지 로드 시 슬라이드 목록 초기화
initSlideList();

function toggleFullScreen() {
    const container = document.querySelector('.container');
    if (!container) return;

    if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// 다음 슬라이드로 이동하는 함수
async function nextSlide() {
    // 슬라이드 목록이 초기화되지 않았으면 초기화
    if (slideList.length === 0) {
        await initSlideList();
    }

    // 다음 슬라이드로 이동
    await loadSlide(currentSlideIndex + 1);
}
