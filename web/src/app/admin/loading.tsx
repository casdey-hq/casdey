import { Mark } from "@/components/mark";

// First load of /admin: the page's shape, empty, while the numbers are fetched.
export default function Loading() {
  return (
    <div className="admin" aria-busy="true">
      <header className="admin-bar">
        <div className="admin-brand"><Mark /><span>Casdey</span><em>Admin</em></div>
      </header>
      <div className="progress is-on" aria-hidden="true" />
      <main className="admin-main" aria-label="Loading">
        <section className="kpis">
          {[0, 1, 2, 3].map((i) => <div key={i} className="kpi skeleton" style={{ height: 116 }} />)}
        </section>
        <section className="charts">
          {[0, 1].map((i) => <div key={i} className="panel skeleton" style={{ height: 262 }} />)}
        </section>
        <section className="breakdowns">
          {[0, 1, 2].map((i) => <div key={i} className="panel skeleton" style={{ height: 150 }} />)}
        </section>
      </main>
    </div>
  );
}
