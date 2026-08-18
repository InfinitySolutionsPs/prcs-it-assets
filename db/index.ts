import Database from "better-sqlite3";
import {mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {drizzle} from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let database:ReturnType<typeof drizzle<typeof schema>>|undefined;

export async function getDb(){
 if(database)return database;
 const file=process.env.DATABASE_PATH||"./data/prcs-it.db";
 mkdirSync(dirname(file),{recursive:true});
 const sqlite=new Database(file);
 sqlite.pragma("journal_mode = WAL");
 sqlite.pragma("foreign_keys = ON");
 database=drizzle(sqlite,{schema});
 return database;
}
