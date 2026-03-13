import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { runMigrations } from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '../../atelier.db')

let _db = null

export function getDb() {
  if (!_db) {
    _db = new Database(dbPath)
    runMigrations(_db)
  }
  return _db
}

export default getDb
