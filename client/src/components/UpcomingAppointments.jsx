const statusConfig = {
  CHECKED_IN: { label: 'Checked-in', color: '#2f855a' },
  SCHEDULED: { label: 'Scheduled', color: '#1f5b8f' },
  COMPLETED: { label: 'Completed', color: '#0b8ca8' },
  CANCELLED: { label: 'Cancelled', color: '#c53030' }
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
              const config = statusConfig[appointment.status] || { label: appointment.status, color: '#1f2736' };
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
