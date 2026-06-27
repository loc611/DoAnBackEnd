const studentModel = require('../models/studentModel');

const getAllStudents = () => {
  return studentModel.findAll();
};

const getStudentById = (id) => {
  return studentModel.findById(id);
};

const createStudent = (studentData) => {
  return studentModel.create(studentData);
};

const updateStudent = (id, studentData) => {
  return studentModel.update(id, studentData);
};

const deleteStudent = (id) => {
  return studentModel.remove(id);
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};
