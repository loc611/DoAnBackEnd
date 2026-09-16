import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_IKecRfm4o6gZ@ep-aged-silence-azt04b35-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('SubjectCombination', 'SubjectGradeDetail', 'SubjectGroupRegistration', 'TransferredGrade')
      ORDER BY table_name, ordinal_position;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    await client.end();
  }
}

run();
