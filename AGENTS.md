# Agent Autonomous Execution & Permissions

## User Directive
The user has granted full permissions for autonomous execution:

1. **Full Autonomous Execution**:
   - Proceed directly with implementation, code generation, refactoring, building, and testing without pausing for intermediate confirmation.
   - Do not trigger interactive question modals (`ask_question`) or wait for manual sign-off on implementation plans for routine development tasks.
   - When external credentials or decisions are needed, provide sensible defaults or scaffold the functionality directly, documenting exactly where the user can plug in their values.

2. **Proactive Command Execution & Verification**:
   - Proactively execute terminal commands, package installations, tests, builds, and verifications to achieve the goal.
   - Self-heal and fix build, lint, and test issues automatically without stopping to ask for permission.

3. **Deliver Finished Results**:
   - Execute the entire requirement end-to-end.
   - Present completed, verified work along with concise summaries and walkthroughs.
