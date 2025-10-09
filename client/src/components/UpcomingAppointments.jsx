const statusConfig = {
  CHECKED_IN: { label: 'Checked-in', color: '#22c55e' },
  SCHEDULED: { label: 'Scheduled', color: '#6366f1' },
  COMPLETED: { label: 'Completed', color: '#0ea5e9' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444' }
};

export function UpcomingAppointments({ items }) {
  return (
    <section className="panel appointments">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Today&apos;s Schedule</p>
          <h2 className="panel__title">Upcoming Appointments</h2>
        </div>
      </div>

      <div className="appointments__list">
        {items.map((appointment) => (
          <article key={appointment.id} className="appointments__item">
            <div className="appointments__time">{appointment.time}</div>
            <div className="appointments__details">
              <p className="appointments__name">{appointment.name}</p>
              <p className="appointments__meta">
                {appointment.type} • {appointment.doctor}
              </p>
            </div>
            {(() => {
              const config = statusConfig[appointment.status] || { label: appointment.status, color: '#0f172a' };
              return (
                <span
                  className="appointments__status"
                  style={{ color: config.color, backgroundColor: `${config.color}15` }}
                >
                  {config.label}
                </span>
              );
            })()}
          </article>
        ))}
      </div>
    </section>
  );
}
