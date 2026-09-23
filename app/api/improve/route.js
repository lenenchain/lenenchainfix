import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'edge';

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
      // TEST-08: 빈 입력 예외 처리
      if (!prompt || prompt.trim() === '') {
        await sendEvent(4, '오류: 개선 요청사항을 입력해주세요.');
        await writer.close();
        return;
      }

      // [1단계: Grok 분석 (A 시작)]
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

      // [2단계: Gemini 코드 생성 (A 인계 -> B 시작)]
      await sendEvent(2, 'Grok의 분석 결과를 Gemini로 인계하여 웹 코드를 생성합니다...');

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      
      const geminiPrompt = `
      너는 세계 최고 수준의 프론트엔드 웹 개발자다.
      
      [Grok의 디자인/UX 분석 결과]
      ${grokResult}

      [사용자 개선 요청사항]
      ${prompt}

      [기존 코드]
      ${currentCode || '없음'}

      위 내용들을 완벽히 반영하여 단 하나의 완전한 HTML 파일(HTML 내에 <style> 및 <script> 포함)로 만들어줘.
      마크다운 설명 문구나 \`\`\`html 같은 태그는 완전히 제외하고, <!DOCTYPE html>로 시작하는 순수 HTML 코드만 출력해줘.
      `;

     const response = await model.generateContent(geminiPrompt);
      let generatedCode = response.response.text() || '';
      
      // 마크다운 태그 정제 (TEST-06 만족)
      generatedCode = generatedCode.replace(/```html/g, '').replace(/```/g, '').trim();

      // [3단계: 완료 (B 완료)]
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
