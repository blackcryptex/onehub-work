import fs from "node:fs";
import path from "node:path";

type Result = {
  url: string;
  status: number | string;
  file?: string;
  line?: number;
};

const root = process.cwd();
const exts = [".tsx", ".ts", ".jsx", ".js", ".mdx", ".md", ".html"];
const results: Result[] = [];
const internal: string[] = [];
const external: string[] = [];

function* walk(dir: string): Generator<string> {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (
        entry.isDirectory() &&
        ![".next", "node_modules", ".git", "dist", "build", "coverage"].includes(entry.name)
      ) {
        yield* walk(p);
      } else if (exts.includes(path.extname(p))) {
        yield p;
      }
    }
  } catch {
    // Skip directories we can't read
  }
}

// Scan files for href/src attributes
for (const file of walk(root)) {
  try {
    const text = fs.readFileSync(file, "utf8");
    const rx = /(href|src)\s*=\s*["'`](.+?)["'`]/g;
    let m: RegExpExecArray | null;
    let lineNum = 1;

    while ((m = rx.exec(text))) {
      const url = m[2];
      if (!url || url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("tel:")) {
        continue;
      }

      // Calculate line number
      const beforeMatch = text.substring(0, m.index);
      lineNum = beforeMatch.split("\n").length;

      if (/^https?:\/\//i.test(url)) {
        external.push(url);
        results.push({ url, status: "pending", file: path.relative(root, file), line: lineNum });
      } else {
        internal.push(url);
      }
    }
  } catch {
    // Skip files we can't read
  }
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

(async () => {
  console.log("Checking external links...");

  // Check external links with timeout
  for (const url of uniq(external)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeoutId);
      
      const result = results.find((r) => r.url === url);
      if (result) {
        result.status = res.status;
      }

      // If HEAD fails, try GET
      if (res.status >= 400) {
        try {
          const getController = new AbortController();
          const getTimeoutId = setTimeout(() => getController.abort(), 8000);
          
          const getRes = await fetch(url, {
            method: "GET",
            signal: getController.signal,
            redirect: "follow",
          });
          clearTimeout(getTimeoutId);
          
          if (result) {
            result.status = `fallback GET ${getRes.status}`;
          }
        } catch {
          // GET also failed
        }
      }
    } catch (e: unknown) {
      const result = results.find((r) => r.url === url);
      if (result) {
        let descriptor: string | undefined;
        if (typeof e === "object" && e !== null) {
          const anyErr = e as { code?: unknown; name?: unknown; message?: unknown };
          if (typeof anyErr.code === "string" && anyErr.code.length > 0) {
            descriptor = anyErr.code;
          } else if (typeof anyErr.name === "string" && anyErr.name.length > 0) {
            descriptor = anyErr.name;
          } else if (typeof anyErr.message === "string" && anyErr.message.length > 0) {
            descriptor = anyErr.message;
          }
        }
        result.status = descriptor ?? "ERR";
      }
    }
  }

  // Output results
  const output = {
    summary: {
      total: results.length,
      broken: results.filter((r) => typeof r.status === "number" && r.status >= 400).length,
      external: uniq(external).length,
      internal: uniq(internal).length,
    },
    internalRoutes: uniq(internal).sort(),
    results,
  };

  fs.writeFileSync(
    path.join(root, "LINKCHECK.json"),
    JSON.stringify(output, null, 2)
  );

  console.log(`\nLink check complete:`);
  console.log(`- External links checked: ${uniq(external).length}`);
  console.log(`- Internal routes found: ${uniq(internal).length}`);
  console.log(`- Results saved to LINKCHECK.json`);

  const bad = results.filter((r) => typeof r.status === "number" && r.status >= 400);
  if (bad.length > 0) {
    console.error(`\n❌ Found ${bad.length} broken external links:`);
    bad.forEach((r) => {
      console.error(`  ${r.url} (${r.status}) - ${r.file}:${r.line}`);
    });
    process.exit(1);
  } else {
    console.log(`\n✅ All external links are valid!`);
  }
})();

