const db = require('../db');

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM students', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM students WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const create = (studentData) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO students (name, email, age, class) VALUES (?, ?, ?, ?)',
      [studentData.name, studentData.email, studentData.age, studentData.class],
      function (err) {
        if (err) return reject(err);
        resolve({
          id: this.lastID,
          name: studentData.name,
          email: studentData.email,
          age: studentData.age,
          class: studentData.class,
        });
      }
    );
  });
};

const update = (id, studentData) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE students SET name = ?, email = ?, age = ?, class = ? WHERE id = ?',
      [studentData.name, studentData.email, studentData.age, studentData.class, id],
      function (err) {
        if (err) return reject(err);
        if (this.changes === 0) return resolve(null);
        resolve({ id: Number(id), ...studentData });
      }
    );
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM students WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0);
    });
  });
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
