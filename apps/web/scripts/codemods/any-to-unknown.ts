import fg from "fast-glob";
import fs from "fs";

const files = fg.sync(["**/*.{ts,tsx}", "!node_modules/**", "!dist/**", "!.next/**"], {
  cwd: process.cwd(),
});

let fixedCount = 0;

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const originalS = s;

  // Skip type utility files that intentionally export Any-like helpers
  if (/@ts-expect-error-any|ALLOW_ANY/g.test(s)) {
    continue;
  }

  // Replace obvious parameter level any -> unknown (non-generic)
  s = s.replace(/(\b[A-Za-z0-9_]+\s*:\s*)any\b/g, "$1unknown");

  // Common array any -> unknown[]
  s = s.replace(/\bArray<any>\b/g, "Array<unknown>").replace(/\bany\[\]/g, "unknown[]");

  if (s !== originalS) {
    fs.writeFileSync(f, s, "utf8");
    fixedCount++;
    console.log(`Fixed: ${f}`);
  }
}

console.log(`✅ any → unknown pass complete in ${fixedCount} files`);

