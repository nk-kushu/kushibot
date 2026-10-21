import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
import { SequentialWorkspaceEditor } from "../../src/workspaces/SequentialWorkspaceEditor.js";
export class LoginSequentialEditingExample {
  constructor(private readonly editor: SequentialWorkspaceEditor) {}
  async run(firstContext: IExecutionContext, secondContext: IExecutionContext) {
    const first = await this.editor.edit(firstContext, async session => {
      const file = await session.read("src/login.ts");
      return session.replace("src/login.ts", file.revision, "export const login = 'google';");
    });
    if (first.kind !== "completed" || !first.value.applied) return { first, second: null };
    const second = await this.editor.edit(secondContext, async session => {
      const current = await session.read("src/login.ts");
      return session.replace("src/login.ts", current.revision, `${current.text ?? ""}\nexport const callbackVerified = false;`);
    });
    return { first, second };
  }
}
