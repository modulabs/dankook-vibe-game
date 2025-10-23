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
    console.log('🎬 HTML 슬라이드를 PDF로 변환 시작 (일반 화면 모드)...\n');

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
            // 페이지 크기 설정 (16:9 비율, 일반 화면 크기)
            await page.setViewport({
                width: 1280,
                height: 720,
                deviceScaleFactor: 2 // 고해상도
            });

            // 페이지 로드
            await page.goto(fileUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // 렌더링 완료 대기 (iframe 등 포함)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 일반 화면 스타일 (CSS 파일에서 이미 적용됨)
            await page.addStyleTag({
                content: `
                    /* 기본 CSS 사용 */
                    body {
                        background-color: #f0f0f0 !important;
                    }
                `
            });

            // 스타일 적용 후 충분히 대기
            await new Promise(resolve => setTimeout(resolve, 1000));

            // PDF 생성
            const pdfBuffer = await page.pdf({
                width: '1280px',
                height: '720px',
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
    const outputPath = path.join(__dirname, 'lecture_slides_normal.pdf');
    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`\n✅ 변환 완료!`);
    console.log(`📄 출력 파일: ${outputPath}`);
    console.log(`📊 총 ${pdfPages.length} 페이지\n`);
}

// 실행
convertToPDF().catch(console.error);
