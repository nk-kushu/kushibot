import type { IAgenticSessionFactory } from "../sessions/IAgenticSessionFactory.js";
import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
export interface IChildSessionFactoryProvider { create(child: AdmittedSubAgent, context: IExecutionContext): Promise<IAgenticSessionFactory<JsonValue>>; }
