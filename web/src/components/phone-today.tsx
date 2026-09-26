// A still mockup of the app's daily screen, for the waitlist page. Example data.
const tasks = [
  { title: "Upper body, 45 min", note: "07:12 at the gym", done: true, verified: true },
  { title: "Skin, morning", note: "Cleanser, SPF 50", done: true },
  { title: "Posture reset", note: "5 min, before 18:00", done: false },
  { title: "Lights out by 23:30", note: "Sleep, 8 h target", done: false },
];

function Check() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneToday() {
  return (
    <div className="phone" role="img" aria-label="The Casdey app's Today screen: a 12 day streak and four daily tasks, two of them done">
      <div className="screen" aria-hidden="true">
        <div className="status"><span>9:41</span><span>100%</span></div>
        <div className="today"><small>Saturday · Week 2 of 13</small><b>Today</b></div>
        <div className="card streak">
          <svg viewBox="0 0 58 58">
            <circle cx={29} cy={29} r={23} fill="none" stroke="#e8e8ed" strokeWidth={7} />
            <circle cx={29} cy={29} r={23} fill="none" stroke="#1d1d1f" strokeWidth={7} strokeLinecap="round" strokeDasharray="144.5" strokeDashoffset={43} transform="rotate(-90 29 29)" />
          </svg>
          <div><div className="n">12 days</div><div className="l">Streak · 2 of 4 done today</div></div>
        </div>
        <div className="card tasks">
          {tasks.map((task) => (
            <div key={task.title} className={task.done ? "task is-done" : "task"}>
              <span className="tick">{task.done ? <Check /> : null}</span>
              <div className="t"><div>{task.title}</div><span>{task.note}</span></div>
              {task.verified ? <span className="pill">Photo verified</span> : null}
            </div>
          ))}
        </div>
        <div className="checkin">Check in</div>
      </div>
    </div>
  );
}
