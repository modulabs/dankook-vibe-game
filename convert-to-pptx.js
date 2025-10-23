const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// HTML 파일에서 텍스트 컨텐츠 추출
function parseHTMLSlide(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const slide = {
        title: '',
        subtitle: '',
        content: []
    };

    // h1 태그 찾기 (메인 타이틀)
    const h1 = doc.querySelector('h1');
    if (h1) {
        slide.title = h1.textContent.trim();
    }

    // h2 태그 찾기 (서브타이틀)
    const h2 = doc.querySelector('h2');
    if (h2) {
        slide.subtitle = h2.textContent.trim();
    }

    // h3 태그들 찾기 (섹션 제목)
    const h3s = doc.querySelectorAll('h3');
    h3s.forEach(h3 => {
        slide.content.push({
            type: 'heading',
            text: h3.textContent.trim()
        });
    });

    // p 태그들 찾기 (단락)
    const ps = doc.querySelectorAll('p');
    ps.forEach(p => {
        const text = p.textContent.trim();
        if (text && !text.includes('script.js')) {
            slide.content.push({
                type: 'text',
                text: text
            });
        }
    });

    // ul 리스트 찾기
    const uls = doc.querySelectorAll('ul');
    uls.forEach(ul => {
        const items = [];
        ul.querySelectorAll('li').forEach(li => {
            items.push(li.textContent.trim());
        });
        if (items.length > 0) {
            slide.content.push({
                type: 'list',
                items: items
            });
        }
    });

    // ol 리스트 찾기
    const ols = doc.querySelectorAll('ol');
    ols.forEach(ol => {
        const items = [];
        ol.querySelectorAll('li').forEach(li => {
            items.push(li.textContent.trim());
        });
        if (items.length > 0) {
            slide.content.push({
                type: 'numberedList',
                items: items
            });
        }
    });

    // pre 태그 찾기 (코드 블록)
    const pres = doc.querySelectorAll('pre');
    pres.forEach(pre => {
        slide.content.push({
            type: 'code',
            text: pre.textContent.trim()
        });
    });

    return slide;
}

// 모든 슬라이드 HTML 파일 찾기
function findAllSlides(slidesDir) {
    const files = fs.readdirSync(slidesDir);
    const slideFiles = files
        .filter(f => f.startsWith('slide_') && f.endsWith('.html'))
        .sort((a, b) => {
            // slide_01.html, slide_11a.html 등 정렬
            const getNum = (name) => {
                const match = name.match(/slide_(\d+)([a-z]?)\.html/);
                if (!match) return [0, ''];
                return [parseInt(match[1]), match[2] || ''];
            };
            const [numA, suffixA] = getNum(a);
            const [numB, suffixB] = getNum(b);
            if (numA !== numB) return numA - numB;
            return suffixA.localeCompare(suffixB);
        });

    return slideFiles.map(f => path.join(slidesDir, f));
}

// PPTX 생성
async function convertToPPTX() {
    console.log('🎬 HTML 슬라이드를 PPTX로 변환 시작...\n');

    const pres = new PptxGenJS();

    // 프레젠테이션 설정
    pres.author = 'Gemini CLI Lecture';
    pres.title = '바이브코딩으로 게임 만들기';
    pres.subject = 'AI 게임 개발 강의';

    // 16:9 레이아웃 (기본값)
    pres.layout = 'LAYOUT_16x9';

    const slidesDir = path.join(__dirname, 'slides');
    const slideFiles = findAllSlides(slidesDir);

    console.log(`📂 총 ${slideFiles.length}개의 슬라이드 파일 발견\n`);

    for (let i = 0; i < slideFiles.length; i++) {
        const filePath = slideFiles[i];
        const fileName = path.basename(filePath);

        console.log(`  ${i + 1}/${slideFiles.length} 처리 중: ${fileName}`);

        try {
            const slideData = parseHTMLSlide(filePath);
            const pptxSlide = pres.addSlide();

            let yPos = 0.5; // 시작 Y 위치 (inches)

            // 타이틀 추가
            if (slideData.title) {
                pptxSlide.addText(slideData.title, {
                    x: 0.5,
                    y: yPos,
                    w: 9,
                    h: 1,
                    fontSize: 32,
                    bold: true,
                    color: '363636',
                    align: 'center'
                });
                yPos += 1.2;
            }

            // 서브타이틀 추가
            if (slideData.subtitle) {
                pptxSlide.addText(slideData.subtitle, {
                    x: 0.5,
                    y: yPos,
                    w: 9,
                    h: 0.7,
                    fontSize: 24,
                    color: '007bff',
                    align: 'center'
                });
                yPos += 1;
            }

            // 컨텐츠 추가
            for (const item of slideData.content) {
                if (yPos > 5) break; // 슬라이드 공간 제한

                if (item.type === 'heading') {
                    pptxSlide.addText(item.text, {
                        x: 0.5,
                        y: yPos,
                        w: 9,
                        h: 0.5,
                        fontSize: 20,
                        bold: true,
                        color: '444444'
                    });
                    yPos += 0.6;

                } else if (item.type === 'text') {
                    pptxSlide.addText(item.text, {
                        x: 0.5,
                        y: yPos,
                        w: 9,
                        h: 'auto',
                        fontSize: 16,
                        color: '555555'
                    });
                    yPos += 0.5;

                } else if (item.type === 'list') {
                    const bulletText = item.items.map(t => ({ text: t, options: { bullet: true } }));
                    pptxSlide.addText(bulletText, {
                        x: 0.8,
                        y: yPos,
                        w: 8.5,
                        h: 'auto',
                        fontSize: 16,
                        color: '555555'
                    });
                    yPos += item.items.length * 0.4;

                } else if (item.type === 'numberedList') {
                    item.items.forEach((text, idx) => {
                        pptxSlide.addText(`${idx + 1}. ${text}`, {
                            x: 0.8,
                            y: yPos,
                            w: 8.5,
                            h: 'auto',
                            fontSize: 16,
                            color: '555555'
                        });
                        yPos += 0.4;
                    });

                } else if (item.type === 'code') {
                    pptxSlide.addText(item.text, {
                        x: 0.5,
                        y: yPos,
                        w: 9,
                        h: 'auto',
                        fontSize: 12,
                        fontFace: 'Courier New',
                        color: '333333',
                        fill: { color: 'f5f5f5' }
                    });
                    yPos += 1;
                }
            }

        } catch (error) {
            console.error(`    ❌ 오류: ${error.message}`);
        }
    }

    // PPTX 파일 저장
    const outputPath = path.join(__dirname, 'lecture_slides.pptx');
    await pres.writeFile({ fileName: outputPath });

    console.log(`\n✅ 변환 완료!`);
    console.log(`📄 출력 파일: ${outputPath}\n`);
}

// 실행
convertToPPTX().catch(console.error);
