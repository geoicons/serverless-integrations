import * as jsonrest_service from "./jsonrest_service";
import * as cdk from "aws-cdk-lib";

// Get key parameters from the environment
const CLIENTNAME = process.env.CLIENTNAME || "ology";
const INTEGRATIONNAME = process.env.INTEGRATIONNAME || "integration";
const STAGE = process.env.STAGE || "dev";
const REGION = process.env.REGION || "ap-southeast-2";

// Create the stack name
const STACK_NAME = `${CLIENTNAME}-${INTEGRATIONNAME}-stack`;
export class JSONRestStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new jsonrest_service.JSONService(this, STACK_NAME, STAGE, REGION);
    }
}

const app = new cdk.App();
new JSONRestStack(app, STACK_NAME);
app.synth();
