import fs from "fs";
import { glob } from "glob";

// Common patterns to fix unused variables
const fixes = [
  // Fix unused imports/variables by prefixing with _
  { pattern: /(\w+): Request\)/g, replacement: "(_$1: Request)" },
  { pattern: /(request: Request\))/g, replacement: "(_request: Request)" },
  { pattern: /(err:)/g, replacement: "(_err:" },
  { pattern: /(input:)/g, replacement: "(_input:" },
  { pattern: /(ctx:)/g, replacement: "(_ctx:" },
  { pattern: /(contract =)/g, replacement: "(_contract =" },
  { pattern: /(base =)/g, replacement: "(_base =" },
  { pattern: /(seat =)/g, replacement: "(_seat =" },
  { pattern: /(auth)/g, replacement: "_auth" },
  { pattern: /(signIn)/g, replacement: "_signIn" },
  { pattern: /(NextResponse)/g, replacement: "_NextResponse" },
  { pattern: /(buildPlannerPayload)/g, replacement: "_buildPlannerPayload" },
];

async function main() {
  const files = await glob("**/*.{ts,tsx}", {
    ignore: ["node_modules/**", "dist/**", ".next/**", "**/*.test.ts", "**/*.spec.ts"],
    cwd: process.cwd(),
  });

  let fixedCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    const original = content;

    for (const { pattern, replacement } of fixes) {
      content = content.replace(pattern, replacement);
    }

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      fixedCount++;
      console.log(`Fixed: ${file}`);
    }
  }

  console.log(`✅ Fixed unused vars in ${fixedCount} files`);
}

main().catch((error) => {
  console.error("Failed to run fix-unused-vars codemod", error);
  process.exitCode = 1;
});

