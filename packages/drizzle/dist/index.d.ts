import { IVectorPlugin, IStoragePlugin } from '@memory-minus-one/core';
import * as drizzle_orm_pg_core from 'drizzle-orm/pg-core';

/**
 * Creates the schema with a specific prefix.
 * Default prefix is 'm1_' to avoid conflicts in user DBs.
 */
declare function createSchema(prefix?: string): {
    memories: drizzle_orm_pg_core.PgTableWithColumns<{
        name: "memories";
        schema: undefined;
        columns: {
            id: drizzle_orm_pg_core.PgColumn<{
                name: "id";
                tableName: "memories";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            userId: drizzle_orm_pg_core.PgColumn<{
                name: "user_id";
                tableName: "memories";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            content: drizzle_orm_pg_core.PgColumn<{
                name: "content";
                tableName: "memories";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            primarySector: drizzle_orm_pg_core.PgColumn<{
                name: "primary_sector";
                tableName: "memories";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            sectors: drizzle_orm_pg_core.PgColumn<{
                name: "sectors";
                tableName: "memories";
                dataType: "json";
                columnType: "PgJsonb";
                data: string[];
                driverParam: unknown;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            tags: drizzle_orm_pg_core.PgColumn<{
                name: "tags";
                tableName: "memories";
                dataType: "json";
                columnType: "PgJsonb";
                data: string[];
                driverParam: unknown;
                notNull: false;
                hasDefault: true;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            metadata: drizzle_orm_pg_core.PgColumn<{
                name: "metadata";
                tableName: "memories";
                dataType: "json";
                columnType: "PgJsonb";
                data: unknown;
                driverParam: unknown;
                notNull: false;
                hasDefault: true;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            simhash: drizzle_orm_pg_core.PgColumn<{
                name: "simhash";
                tableName: "memories";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            salience: drizzle_orm_pg_core.PgColumn<{
                name: "salience";
                tableName: "memories";
                dataType: "number";
                columnType: "PgReal";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: true;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            decayLambda: drizzle_orm_pg_core.PgColumn<{
                name: "decay_lambda";
                tableName: "memories";
                dataType: "number";
                columnType: "PgReal";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            version: drizzle_orm_pg_core.PgColumn<{
                name: "version";
                tableName: "memories";
                dataType: "number";
                columnType: "PgInteger";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: true;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            createdAt: drizzle_orm_pg_core.PgColumn<{
                name: "created_at";
                tableName: "memories";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            updatedAt: drizzle_orm_pg_core.PgColumn<{
                name: "updated_at";
                tableName: "memories";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            lastSeenAt: drizzle_orm_pg_core.PgColumn<{
                name: "last_seen_at";
                tableName: "memories";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    vectors: drizzle_orm_pg_core.PgTableWithColumns<{
        name: "vectors";
        schema: undefined;
        columns: {
            id: drizzle_orm_pg_core.PgColumn<{
                name: "id";
                tableName: "vectors";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            sector: drizzle_orm_pg_core.PgColumn<{
                name: "sector";
                tableName: "vectors";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            userId: drizzle_orm_pg_core.PgColumn<{
                name: "user_id";
                tableName: "vectors";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            vec: drizzle_orm_pg_core.PgColumn<{
                name: "vec";
                tableName: "vectors";
                dataType: "custom";
                columnType: "PgCustomColumn";
                data: number[];
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            dim: drizzle_orm_pg_core.PgColumn<{
                name: "dim";
                tableName: "vectors";
                dataType: "number";
                columnType: "PgInteger";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    waypoints: drizzle_orm_pg_core.PgTableWithColumns<{
        name: "waypoints";
        schema: undefined;
        columns: {
            srcId: drizzle_orm_pg_core.PgColumn<{
                name: "src_id";
                tableName: "waypoints";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            dstId: drizzle_orm_pg_core.PgColumn<{
                name: "dst_id";
                tableName: "waypoints";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            userId: drizzle_orm_pg_core.PgColumn<{
                name: "user_id";
                tableName: "waypoints";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            weight: drizzle_orm_pg_core.PgColumn<{
                name: "weight";
                tableName: "waypoints";
                dataType: "number";
                columnType: "PgReal";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            createdAt: drizzle_orm_pg_core.PgColumn<{
                name: "created_at";
                tableName: "waypoints";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            updatedAt: drizzle_orm_pg_core.PgColumn<{
                name: "updated_at";
                tableName: "waypoints";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    facts: drizzle_orm_pg_core.PgTableWithColumns<{
        name: "facts";
        schema: undefined;
        columns: {
            id: drizzle_orm_pg_core.PgColumn<{
                name: "id";
                tableName: "facts";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            userId: drizzle_orm_pg_core.PgColumn<{
                name: "user_id";
                tableName: "facts";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            subject: drizzle_orm_pg_core.PgColumn<{
                name: "subject";
                tableName: "facts";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            predicate: drizzle_orm_pg_core.PgColumn<{
                name: "predicate";
                tableName: "facts";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            object: drizzle_orm_pg_core.PgColumn<{
                name: "object";
                tableName: "facts";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            validFrom: drizzle_orm_pg_core.PgColumn<{
                name: "valid_from";
                tableName: "facts";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            validTo: drizzle_orm_pg_core.PgColumn<{
                name: "valid_to";
                tableName: "facts";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: false;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            confidence: drizzle_orm_pg_core.PgColumn<{
                name: "confidence";
                tableName: "facts";
                dataType: "number";
                columnType: "PgReal";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            metadata: drizzle_orm_pg_core.PgColumn<{
                name: "metadata";
                tableName: "facts";
                dataType: "json";
                columnType: "PgJsonb";
                data: unknown;
                driverParam: unknown;
                notNull: false;
                hasDefault: true;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
};
type MemorySchema = ReturnType<typeof createSchema>;
declare const memories: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "memories";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "memories";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userId: drizzle_orm_pg_core.PgColumn<{
            name: "user_id";
            tableName: "memories";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        content: drizzle_orm_pg_core.PgColumn<{
            name: "content";
            tableName: "memories";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        primarySector: drizzle_orm_pg_core.PgColumn<{
            name: "primary_sector";
            tableName: "memories";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        sectors: drizzle_orm_pg_core.PgColumn<{
            name: "sectors";
            tableName: "memories";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tags: drizzle_orm_pg_core.PgColumn<{
            name: "tags";
            tableName: "memories";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: drizzle_orm_pg_core.PgColumn<{
            name: "metadata";
            tableName: "memories";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        simhash: drizzle_orm_pg_core.PgColumn<{
            name: "simhash";
            tableName: "memories";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        salience: drizzle_orm_pg_core.PgColumn<{
            name: "salience";
            tableName: "memories";
            dataType: "number";
            columnType: "PgReal";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        decayLambda: drizzle_orm_pg_core.PgColumn<{
            name: "decay_lambda";
            tableName: "memories";
            dataType: "number";
            columnType: "PgReal";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        version: drizzle_orm_pg_core.PgColumn<{
            name: "version";
            tableName: "memories";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "memories";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: drizzle_orm_pg_core.PgColumn<{
            name: "updated_at";
            tableName: "memories";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastSeenAt: drizzle_orm_pg_core.PgColumn<{
            name: "last_seen_at";
            tableName: "memories";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const vectors: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "vectors";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "vectors";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        sector: drizzle_orm_pg_core.PgColumn<{
            name: "sector";
            tableName: "vectors";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userId: drizzle_orm_pg_core.PgColumn<{
            name: "user_id";
            tableName: "vectors";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        vec: drizzle_orm_pg_core.PgColumn<{
            name: "vec";
            tableName: "vectors";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: number[];
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dim: drizzle_orm_pg_core.PgColumn<{
            name: "dim";
            tableName: "vectors";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const waypoints: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "waypoints";
    schema: undefined;
    columns: {
        srcId: drizzle_orm_pg_core.PgColumn<{
            name: "src_id";
            tableName: "waypoints";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        dstId: drizzle_orm_pg_core.PgColumn<{
            name: "dst_id";
            tableName: "waypoints";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userId: drizzle_orm_pg_core.PgColumn<{
            name: "user_id";
            tableName: "waypoints";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        weight: drizzle_orm_pg_core.PgColumn<{
            name: "weight";
            tableName: "waypoints";
            dataType: "number";
            columnType: "PgReal";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "waypoints";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: drizzle_orm_pg_core.PgColumn<{
            name: "updated_at";
            tableName: "waypoints";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const facts: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "facts";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "facts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userId: drizzle_orm_pg_core.PgColumn<{
            name: "user_id";
            tableName: "facts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        subject: drizzle_orm_pg_core.PgColumn<{
            name: "subject";
            tableName: "facts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        predicate: drizzle_orm_pg_core.PgColumn<{
            name: "predicate";
            tableName: "facts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        object: drizzle_orm_pg_core.PgColumn<{
            name: "object";
            tableName: "facts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        validFrom: drizzle_orm_pg_core.PgColumn<{
            name: "valid_from";
            tableName: "facts";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        validTo: drizzle_orm_pg_core.PgColumn<{
            name: "valid_to";
            tableName: "facts";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        confidence: drizzle_orm_pg_core.PgColumn<{
            name: "confidence";
            tableName: "facts";
            dataType: "number";
            columnType: "PgReal";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: drizzle_orm_pg_core.PgColumn<{
            name: "metadata";
            tableName: "facts";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;

interface PgvectorSearchOptions {
    db: any;
    tablePrefix?: string;
}
declare function pgvectorSearch(options: PgvectorSearchOptions): IVectorPlugin;

interface DrizzleStorageOptions {
    db: any;
    tablePrefix?: string;
}
declare function drizzleStorage(options: DrizzleStorageOptions): IStoragePlugin;

export { type DrizzleStorageOptions, type MemorySchema, type PgvectorSearchOptions, createSchema, drizzleStorage, facts, memories, pgvectorSearch, vectors, waypoints };
