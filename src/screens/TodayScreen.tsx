const plannedMinutes = 180;
const bufferRatio = 0.2;
const availableMinutes = plannedMinutes * (1 - bufferRatio);

export function TodayScreen() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">今天</p>
          <h1>先開始，再慢慢整理。</h1>
        </div>
        <button className="icon-button" aria-label="開啟設定">
          <span aria-hidden="true">•••</span>
        </button>
      </header>

      <section className="capture-card" aria-labelledby="capture-title">
        <div>
          <p className="eyebrow">快速收件匣</p>
          <h2 id="capture-title">腦中有什麼，就先放下來</h2>
        </div>
        <button className="primary-button" type="button">
          ＋ 記下任務
        </button>
      </section>

      <section className="focus-card" aria-labelledby="focus-title">
        <p className="eyebrow">下一步建議</p>
        <h2 id="focus-title">挑一件最值得開始的事</h2>
        <p className="muted">任務加入後，這裡會提供清楚理由與替代選項。</p>
        <div className="action-row">
          <button className="primary-button" type="button">開始 5 分鐘</button>
          <button className="secondary-button" type="button">選擇其他任務</button>
        </div>
      </section>

      <section className="capacity-card" aria-label="今日工作容量">
        <div>
          <p className="eyebrow">今日可用容量</p>
          <strong>{availableMinutes} 分鐘</strong>
        </div>
        <p>已保留 {plannedMinutes * bufferRatio} 分鐘處理臨時狀況</p>
      </section>

      <nav className="bottom-nav" aria-label="主要導覽">
        <a className="active" href="#today">今天</a>
        <a href="#inbox">收件匣</a>
        <a href="#review">回顧</a>
      </nav>
    </main>
  );
}
