import * as React from "react";

export function Countdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  React.useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return <div className="text-lg font-semibold">Event has started!</div>;
  }

  return (
    <div className="flex gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.days}</div>
        <div className="text-xs text-slate-600">Days</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.hours}</div>
        <div className="text-xs text-slate-600">Hours</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.minutes}</div>
        <div className="text-xs text-slate-600">Minutes</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.seconds}</div>
        <div className="text-xs text-slate-600">Seconds</div>
      </div>
    </div>
  );
}
