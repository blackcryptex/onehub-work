# Gate 1 Phase 1B baseline typecheck repair

Baseline source: `reports/production/gate1/phase1b/baseline-isolation/validation-summary.json` and `typecheck.log`.

Baseline:
- typecheck exit: 2
- TypeScript errors: 50
- error files: 25
- build: not run because typecheck failed

Repair summary:
- Corrected typed Next route href/redirect issues by using canonical URLs and narrow `Route` casts where runtime route strings are dynamic.
- Aligned guest-list usage with the current selected payload shape.
- Tightened nullable/boolean handling where TypeScript surfaced unsafe unions.
- Included missing selected fields/relations needed by existing helper types.
- Normalized booking classification inputs before acceptance recording.
- Accepted existing optional component props that callers already pass.
- Removed unreachable dispute REJECT branches where the current action union excludes REJECT.

Validation:
- `pnpm -C apps/web typecheck`: exit 0, log `typecheck.log`
- `pnpm -C apps/web build`: exit 0, log `build.log`
- `pnpm -C apps/web test`: exit 0, script reports "No tests configured", log `test.log`

Final tracked diff at evidence capture:
- 28 files changed, 65 insertions(+), 48 deletions(-)

Residual risk:
- This was narrow TypeScript stabilization only. No schema/migration/payment-setting/auth-harness/product expansion work was performed.
- Runtime user-flow verification is still review/Sentinel scope.
