const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'students.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Unable to open database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER,
      class TEXT
    )`
  );

  db.get('SELECT COUNT(*) AS count FROM students', (err, row) => {
    if (!err && row && row.count < 10) {
      const seedStudents = [
        { name: 'Nguyen Van A', email: 'a.nguyen@example.com', age: 20, class: 'K62' },
        { name: 'Tran Thi B', email: 'b.tran@example.com', age: 19, class: 'K62' },
        { name: 'Le Van C', email: 'c.le@example.com', age: 21, class: 'K62' },
        { name: 'Pham Thi D', email: 'd.pham@example.com', age: 20, class: 'K63' },
        { name: 'Hoang Van E', email: 'e.hoang@example.com', age: 22, class: 'K63' },
        { name: 'Vu Thi F', email: 'f.vu@example.com', age: 18, class: 'K61' },
        { name: 'Dang Van G', email: 'g.dang@example.com', age: 23, class: 'K61' },
        { name: 'Bui Thi H', email: 'h.bui@example.com', age: 20, class: 'K62' },
        { name: 'Ngo Van I', email: 'i.ngo@example.com', age: 19, class: 'K63' },
        { name: 'Do Thi K', email: 'k.do@example.com', age: 21, class: 'K62' },
      ];

      const remainingStudents = seedStudents.slice(0, 10 - row.count);
      const stmt = db.prepare('INSERT INTO students (name, email, age, class) VALUES (?, ?, ?, ?)');
      remainingStudents.forEach((student) => {
        stmt.run(student.name, student.email, student.age, student.class);
      });
      stmt.finalize();
      console.log(`Seeded ${remainingStudents.length} sample students into the database.`);
    }
  });
});

module.exports = db;
