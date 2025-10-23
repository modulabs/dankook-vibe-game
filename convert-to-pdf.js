const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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

    return slideFiles;
}

async function convertToPDF() {
    console.log('🎬 HTML 슬라이드를 PDF로 변환 시작...\n');

    const slidesDir = path.join(__dirname, 'slides');
    const slideFiles = findAllSlides(slidesDir);

    console.log(`📂 총 ${slideFiles.length}개의 슬라이드 발견\n`);

    // Puppeteer 브라우저 시작
    console.log('🌐 브라우저 실행 중...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // PDF 페이지 배열
    const pdfPages = [];

    for (let i = 0; i < slideFiles.length; i++) {
        const fileName = slideFiles[i];
        const filePath = path.join(slidesDir, fileName);
        const fileUrl = `file://${filePath}`;

        console.log(`  ${i + 1}/${slideFiles.length} 처리 중: ${fileName}`);

        try {
            // 페이지 크기 설정 (16:9 비율)
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1.5 // 150% 배율
            });

            // 페이지 로드
            await page.goto(fileUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // 렌더링 완료 대기 (iframe 등 포함)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 전체화면 스타일 적용 (CSS 인젝션)
            await page.addStyleTag({
                content: `
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: #f0f0f0 !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                        min-height: 100vh !important;
                        font-size: 3.5vh !important;
                    }
                    .container {
                        width: 100% !important;
                        height: 100vh !important;
                        max-width: 100% !important;
                        max-height: 100% !important;
                        margin: 0 !important;
                        padding: 60px !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        box-sizing: border-box !important;
                        overflow: visible !important;
                    }
                    .container h1 {
                        font-size: 2.5em !important;
                    }
                    .container h2 {
                        font-size: 2em !important;
                    }
                    .container h3 {
                        font-size: 1.5em !important;
                    }
                    .container p {
                        font-size: 1.2em !important;
                        line-height: 1.6 !important;
                    }
                    .container ul,
                    .container ol {
                        font-size: 1.2em !important;
                        line-height: 1.8 !important;
                    }
                    .container pre {
                        font-size: 1em !important;
                        line-height: 1.5 !important;
                    }
                `
            });

            // 스타일 적용 후 충분히 대기
            await new Promise(resolve => setTimeout(resolve, 1000));

            // PDF 생성 (스크린샷 방식으로 변경)
            const pdfBuffer = await page.pdf({
                width: '1920px',
                height: '1080px',
                printBackground: true,
                preferCSSPageSize: false,
                pageRanges: '1',
                margin: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                }
            });

            pdfPages.push(pdfBuffer);

        } catch (error) {
            console.error(`    ❌ 오류: ${error.message}`);
        }
    }

    await browser.close();

    // 모든 PDF를 하나로 합치기 (PDFLib 사용)
    console.log('\n📑 PDF 페이지 병합 중...');

    const { PDFDocument } = require('pdf-lib');
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfPages) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    // 최종 PDF 저장
    const pdfBytes = await mergedPdf.save();
    const outputPath = path.join(__dirname, 'lecture_slides.pdf');
    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`\n✅ 변환 완료!`);
    console.log(`📄 출력 파일: ${outputPath}`);
    console.log(`📊 총 ${pdfPages.length} 페이지\n`);
}

// 실행
convertToPDF().catch(console.error);
