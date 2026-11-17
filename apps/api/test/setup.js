// Imported FIRST by every test file. ES modules evaluate imports in order, so
// these env vars are set before config.js reads process.env.
// dotenv never overrides variables that are already set, so .env can't
// point the tests at the development database by accident.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL ??= 'postgres://hombre:hombre@localhost:5433/hombre_test'
