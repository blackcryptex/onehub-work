import Link from "next/link";
import { Card } from "@/components/ui";

export function QuickLinks() {
  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold">Quick Links</h3>
      <ul className="mt-2 space-y-1 text-sm">
        <li>
          <Link className="text-indigo-600 hover:underline" href="/app">
            Dashboard
          </Link>
        </li>
        <li>
          <Link className="text-indigo-600 hover:underline" href="/signin">
            Sign In
          </Link>
        </li>
      </ul>
    </Card>
  );
}
