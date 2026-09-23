'use client';
import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [status, setStatus] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [grokReport, setGrokReport] = useState('');
  const [finalCode, setFinalCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert('개선 요청사항을 입력해 주세요!');

    setIsLoading(true);
    setStatus('작업을 시작합니다...');
    setCurrentStep(0);
    setGrokReport('');
    setFinalCode('');

    try {
      const response = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentCode }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.replace('data: ', ''));
            setCurrentStep(data.step);
            setStatus(data.status);

            if (data.step === 3) {
              setGrokReport(data.grokReport);
              setFinalCode(data.finalCode);
            }
          }
        }
      }
    } catch (err) {
      setStatus('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a' }}>
      <header style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 10px 0' }}>🚀 Grok ✖ Gemini AI 웹사이트 오케스트레이터</h1>
        <p style={{ color: '#666', margin: 0 }}>요청사항을 입력하면 AI A(Grok)가 UX 분석을 수행하고, AI B(Gemini)가 새 웹사이트 코드를 생성합니다.</p>
      </header>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>1. 개선 요청사항 (필수)</label>
          <textarea
            rows={3}
            placeholder="예: 다크모드 스타일의 포트폴리오 사이트를 만들어줘. 자기소개, 카드형 스킬 목록, 연락처 폼을 추가해줘."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>2. 기존 HTML 코드 (선택사항)</label>
          <textarea
            rows={4}
            placeholder="개선하고 싶은 기존 HTML 코드가 있다면 여기에 붙여넣으세요."
            value={currentCode}
            onChange={(e) => setCurrentCode(e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'monospace', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '14px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: isLoading ? '#aaa' : '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '🔄 AI 파이프라인 가동 중...' : '✨ 웹사이트 자동 개선 시작하기'}
        </button>
      </form>

      {/* 진행 현황 대시보드 */}
      {status && (
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>📌 파이프라인 진행 상태</h3>
          <p style={{ fontSize: '15px', color: '#334155', marginBottom: '15px' }}>{status}</p>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '14px' }}>
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: currentStep >= 1 ? '#dcfce7' : '#f1f5f9', color: currentStep >= 1 ? '#166534' : '#94a3b8', fontWeight: currentStep >= 1 ? 'bold' : 'normal' }}>
              1단계: Grok 분석 {currentStep > 1 && '✅'}
            </div>
            <span>➔</span>
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: currentStep >= 2 ? '#dcfce7' : '#f1f5f9', color: currentStep >= 2 ? '#166534' : '#94a3b8', fontWeight: currentStep >= 2 ? 'bold' : 'normal' }}>
              2단계: Gemini 코드 작성 {currentStep > 2 && '✅'}
            </div>
            <span>➔</span>
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: currentStep === 3 ? '#dcfce7' : '#f1f5f9', color: currentStep === 3 ? '#166534' : '#94a3b8', fontWeight: currentStep === 3 ? 'bold' : 'normal' }}>
              3단계: 완료 🎉
            </div>
          </div>
        </div>
      )}

      {/* 결과 출력 대시보드 */}
      {finalCode && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0' }}>💡 Grok UX 분석 요약</h3>
              <div style={{ padding: '12px', backgroundColor: '#fef9c3', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {grokReport}
              </div>
            </div>

            <div style={{ flexGrow: 1 }}>
              <h3 style={{ margin: '0 0 10px 0' }}>💻 생성된 HTML 코드</h3>
              <textarea
                readOnly
                value={finalCode}
                style={{ width: '100%', height: '400px', fontFamily: 'monospace', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 10px 0' }}>🖥️ 실시간 라이브 미리보기</h3>
            <iframe
              srcDoc={finalCode}
              title="Preview"
              style={{ width: '100%', height: '520px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
