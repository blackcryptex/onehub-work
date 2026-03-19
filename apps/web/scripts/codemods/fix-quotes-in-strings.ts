import fs from "fs";
import { glob } from "glob";

// Fix incorrectly escaped quotes in JavaScript strings
// The codemod escaped quotes in JSX text, but also incorrectly escaped them in JS strings
async function main() {
  const files = await glob("**/*.{ts,tsx}", {
    ignore: ["node_modules/**", "dist/**", ".next/**"],
    cwd: process.cwd(),
  });

  let fixedCount = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const updated = original
      .replace(/'([^']*?)"([^']*?)'/g, "'$1\"$2'")
      .replace(/"([^"]*?)"([^"]*?)"/g, '"$1"$2"')
      .replace(/`([^`]*?)"([^`]*?)`/g, '`$1"$2`')
      .replace(/(:\s*")([^"]*?)"([^"]*?)"/g, '$1$2"$3"')
      .replace(/(:\s*')([^']*?)"([^']*?)'/g, "$1$2\"$3'")
      .replace(/(\[\s*")([^"]*?)"([^"]*?)"/g, '$1$2"$3"')
      .replace(/===\s*""([^"]+?)"/g, '=== "$1"')
      .replace(/===\s*'"([^']+?)'/g, "=== '$1'")
      .replace(/(\(\s*")([^"]*?)"([^"]*?)"/g, '$1$2"$3"')
      .replace(/(orderBy:\s*\{\s*[^:]+:\s*")([^"]*?)"([^"]*?)"/g, '$1$2"$3"')
      .replace(/(\.filter\([^)]*===\s*")([^"]*?)"([^"]*?)"/g, '$1$2"$3"');

    if (updated !== original) {
      fs.writeFileSync(file, updated, "utf8");
      fixedCount++;
      console.log(`Fixed: ${file}`);
    }
  }

  console.log(`✅ Fixed quotes in ${fixedCount} files`);
}

main().catch((error) => {
  console.error("Failed to run fix-quotes-in-strings codemod", error);
  process.exitCode = 1;
});

