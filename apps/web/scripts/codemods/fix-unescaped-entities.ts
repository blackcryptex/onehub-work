import fg from "fast-glob";
import fs from "fs";

const files = fg.sync(["**/*.{tsx,jsx}", "!node_modules/**", "!dist/**", "!.next/**"], {
  cwd: process.cwd(),
});

let fixedCount = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const originalSrc = src;

  // Only transform inside JSX text nodes — naive but effective:
  // Replace bare ' and " when inside text (not in attributes). Use common entities.
  src = src
    // apostrophes in JSX text like: Welcome to John's
    .replace(/>([^<]*?)'([^<]*?)</g, (_m, a, b) => `>${a}&apos;${b}<`)
    // double quotes in JSX text like: He said "Hi"
    .replace(/>([^<]*?)"([^<]*?)</g, (_m, a, b) => `>${a}"${b}<`);

  // Also escape & that isn't an existing entity (optional, conservative):
  src = src.replace(/>([^<]*?)&([^#a-zA-Z<][^<]*?)</g, (_m, a, b) => `>${a}&amp;${b}<`);

  if (src !== originalSrc) {
    fs.writeFileSync(file, src, "utf8");
    fixedCount++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`✅ Unescaped JSX entities fixed in ${fixedCount} files`);

