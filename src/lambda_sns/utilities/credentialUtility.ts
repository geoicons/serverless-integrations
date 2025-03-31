import { ddb } from "./dynamoClass";
import { Credential } from "./interfaces";

const credentialTableName = process.env.CREDENTIAL_TABLE_NAME || "Credential";
const credentialDb = new ddb(credentialTableName, false);

export const listCredentials = async (): Promise<Credential[]> => {
    try {
        // Using query to get all credentials
        const statement = `SELECT * FROM "${credentialTableName}"`;
        const credentials = await credentialDb.query(statement);
        return credentials as Credential[];
    } catch (error) {
        console.error("Error listing credentials:", error);
        throw error;
    }
};
