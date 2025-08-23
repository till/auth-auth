import Database from 'better-sqlite3';

const db = new Database('./auth.db');

export { db };