import type { WorkflowDefinition } from "../../src/index.js";
export function createLoginCorrectionDefinition(base:WorkflowDefinition):WorkflowDefinition{return {...base,version:"2",transitions:[{id:"fix-login",fromStepId:"verify",toStepId:"edit",policy:{id:"failed-login-checks",version:"1"},maxTraversals:2}]};}
