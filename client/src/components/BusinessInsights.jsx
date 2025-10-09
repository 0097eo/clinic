export function BusinessInsights({ insights }) {
  if (!Array.isArray(insights) || insights.length === 0) {
    return null;
  }

  return (
    <section className="panel insights">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Business Highlights</p>
          <h2 className="panel__title">Actionable Insights</h2>
        </div>
      </div>

      <div className="insights__grid">
        {insights.map((insight) => (
          <article key={insight.id} className="insights__item">
            <p className="insights__title">{insight.title}</p>
            <p className="insights__highlight">{insight.highlight}</p>
            {insight.detail ? <p className="insights__detail">{insight.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
