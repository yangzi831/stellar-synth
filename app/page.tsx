export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#050505]">
      <iframe
        title="星图演奏 — A Playable Atlas of Sky Cultures"
        src="/atlas/index.html"
        className="h-full w-full border-0"
        allow="fullscreen; autoplay"
      />
    </main>
  );
}
