import { ddb } from "./dynamoClass";

const invocationDb = new ddb(process.env.INVOCATION_TABLE_NAME || "Invocation", false);

export enum InvocationStatus {
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    PARTIAL = "PARTIAL",
}

export const updateInvocationStatus = async (
    invocationId: string,
    status: InvocationStatus,
    error?: string
): Promise<void> => {
    const updateData = {
        status,
        updatedAt: new Date().toISOString(),
        ...(error && { error }),
    };

    await invocationDb.put(updateData, invocationId);
};
