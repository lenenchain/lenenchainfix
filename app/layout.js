export const metadata = {
  title: 'AI 웹사이트 오케스트레이터',
  description: 'Grok과 Gemini를 연계한 웹사이트 자동 개선 플랫폼',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}
