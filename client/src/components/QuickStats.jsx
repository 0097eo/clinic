import { FiTrendingUp, FiTrendingDown, FiUsers, FiCalendar, FiDollarSign, FiSmile } from 'react-icons/fi';

const ICON_MAP = {
  patients: <FiUsers />,
  appointments: <FiCalendar />,
  revenue: <FiDollarSign />,
  satisfaction: <FiSmile />
};

export function QuickStats({ stats }) {
  return (
    <section className="quick-stats">
      {stats.map((item) => (
        <article key={item.id} className="quick-stats__card">
          <div className="quick-stats__indicator" style={{ backgroundColor: `${item.accent}15`, color: item.accent }}>
            {ICON_MAP[item.id] || <span />}
          </div>
          <div className="quick-stats__body">
            <p className="quick-stats__label">{item.label}</p>
            <p className="quick-stats__value">{item.value}</p>
          </div>
          {item.delta ? (
            <div className={`quick-stats__delta quick-stats__delta--${item.trend || 'neutral'}`}>
              {item.trend === 'down' ? <FiTrendingDown /> : <FiTrendingUp />}
              <span>{item.delta}</span>
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}
