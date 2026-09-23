export const runtime = 'edge';

// 지연(sleep) 함수
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req) {
  const { prompt, currentCode } = await req.json();

  const grokKey = process.env.GROK_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (step, status, data = {}) => {
    const payload = JSON.stringify({ step, status, ...data });
    await writer.write(encoder.encode(`data: ${payload}\n\n`));
  };

  (async () => {
    try {
      if (!prompt || prompt.trim() === '') {
        await sendEvent(4, '오류: 개선 요청사항을 입력해주세요.');
        await writer.close();
        return;
      }

      // [0단계: 입력된 텍스트에서 URL 감지 및 HTML 코드 자동 수집]
      let fetchedCode = currentCode || '';
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const foundUrls = prompt.match(urlRegex);

      if (foundUrls && foundUrls.length > 0) {
        const targetUrl = foundUrls[0];
        await sendEvent(0, `입력된 웹사이트 주소(${targetUrl})에서 HTML 코드를 읽어오는 중입니다...`);
        try {
          const siteRes = await fetch(targetUrl);
          if (siteRes.ok) {
            fetchedCode = await siteRes.text();
            await sendEvent(0, `성공적으로 ${targetUrl} 의 소스코드를 불러왔습니다.`);
          }
        } catch (e) {
          console.log('URL Fetch 실패:', e.message);
        }
      }

      // [1단계: Grok 분석]
      await sendEvent(1, 'Grok이 최신 UI/UX 트렌드 및 사용자 요구사항을 분석 중입니다...');

      let grokResult = '';
      if (grokKey) {
        try {
          const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${grokKey}`
            },
            body: JSON.stringify({
              model: 'grok-beta',
              messages: [
                {
                  role: 'user',
                  content: `다음 요청사항을 바탕으로 웹사이트 개선을 위한 트렌디한 디자인 키워드 및 UX 가이드라인을 3줄로 요약해줘.\n요청: ${prompt}`
                }
              ]
            })
          });
          const grokData = await grokRes.json();
          grokResult = grokData.choices?.[0]?.message?.content || '트렌디한 모던 반응형 웹 UI 적용';
        } catch (e) {
          grokResult = '최신 모바일 퍼스트 Layout 및 디자인 가이드 적용';
        }
      } else {
        grokResult = '기본 모던 웹 UI 디자인 가이드 적용';
      }

      // [2단계: Gemini 코드 생성]
      await sendEvent(2, 'Grok의 분석 결과를 Gemini로 인계하여 웹 코드를 생성합니다...');

      const geminiPrompt = `
      너는 세계 최고 수준의 프론트엔드 웹 개발자다.
      
      [Grok의 디자인/UX 분석 결과]
      ${grokResult}

      [사용자 개선 요청사항]
      ${prompt}

      [기존 대상 웹사이트 HTML 코드]
      ${fetchedCode || '없음'}

      위 기존 소스코드를 기본 바탕으로 삼아서, 사용자의 요청사항과 Grok의 분석 결과를 완벽히 반영해 새로 리뉴얼된 완전한 HTML 파일(HTML 내에 <style> 및 <script> 포함)을 생성해줘.
      마크다운 설명 문구나 \`\`\`html 같은 태그는 완전히 제외하고, <!DOCTYPE html>로 시작하는 순수 HTML 코드만 출력해줘.
      `;

      // 사용량이 몰릴 때 대비한 다중 모델 엔드포인트 목록
      const modelEndpoints = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'
      ];

      let generatedCode = '';
      let lastErrorMessage = '';

      // 백오프 재시도 및 모델 순회 처리 (최대 3회 재시도)
      for (const endpoint of modelEndpoints) {
        if (generatedCode) break;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await fetch(`${endpoint}?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: geminiPrompt }] }]
              })
            });

            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
              generatedCode = data.candidates[0].content.parts[0].text;
              break; // 성공 시 내부 루프 탈출
            } else {
              lastErrorMessage = data?.error?.message || 'Gemini API 응답 에러';
              
              // High demand/traffic 트래픽 에러 시 대기 후 재시도
              if (lastErrorMessage.includes('high demand') || response.status === 429 || response.status === 503) {
                await sendEvent(2, `Gemini API 대기열 지연 중... 재시도 중입니다 (${attempt}/3)`);
                await sleep(1500 * attempt); // 1.5초, 3초 지연
              } else {
                break; // 다른 에러는 다음 모델 엔드포인트로 이동
              }
            }
          } catch (err) {
            lastErrorMessage = err.message;
            await sleep(1000);
          }
        }
      }

      if (!generatedCode) {
        throw new Error(`Gemini API 호출 실패: ${lastErrorMessage}`);
      }

      // 마크다운 태그 정제
      generatedCode = generatedCode.replace(/```html/g, '').replace(/```/g, '').trim();

      // [3단계: 완료]
      await sendEvent(3, '완료! 개선된 웹사이트가 성공적으로 생성되었습니다.', {
        grokReport: grokResult,
        finalCode: generatedCode
      });

    } catch (error) {
      await sendEvent(4, `오류 발생: ${error.message}`);
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
