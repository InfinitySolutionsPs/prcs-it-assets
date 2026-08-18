import Database from "better-sqlite3";
import {mkdirSync,readdirSync,readFileSync} from "node:fs";
import {dirname,join} from "node:path";

const file=process.env.DATABASE_PATH||"./data/prcs-it.db";
mkdirSync(dirname(file),{recursive:true});
const db=new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
const applied=new Set(db.prepare("SELECT name FROM _migrations").all().map(row=>row.name));
for(const name of readdirSync("./drizzle").filter(x=>x.endsWith(".sql")).sort()){
 if(applied.has(name))continue;
 const sql=readFileSync(join("./drizzle",name),"utf8").replaceAll("--> statement-breakpoint","");
 const migrate=db.transaction(()=>{db.exec(sql);db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(name)});
 migrate();
 console.log(`Applied ${name}`);
}
db.close();
