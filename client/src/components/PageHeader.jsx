export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <p className="panel__eyebrow">{subtitle}</p>
        <h1 className="page-header__title">{title}</h1>
      </div>
      {action}
    </div>
  );
}
