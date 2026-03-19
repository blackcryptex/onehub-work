import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 text-center">
        <h1 className="text-2xl font-bold">404</h1>
        <p className="mt-2 text-slate-600">This page could not be found.</p>
        <Button className="mt-4" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </Card>
    </main>
  );
}

