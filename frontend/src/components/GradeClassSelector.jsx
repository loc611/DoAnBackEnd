import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, MinusSquare } from 'lucide-react';

const GradeClassSelector = ({ classesList = [], selectedGrades = [], selectedClassIds = [], onChange }) => {
  const gradesList = [10, 11, 12];
  const [expandedGrades, setExpandedGrades] = useState({ 10: true, 11: true, 12: true });

  // Toggle accordion expand/collapse for a grade
  const toggleExpand = (grade) => {
    setExpandedGrades(prev => ({
      ...prev,
      [grade]: !prev[grade]
    }));
  };

  // Helper to get classes for a grade
  const getClassesForGrade = (grade) => {
    return classesList.filter(c => Number(c.grade) === Number(grade));
  };

  // Check state of a grade: 'all' | 'partial' | 'none'
  const getGradeState = (grade) => {
    const classes = getClassesForGrade(grade);
    if (classes.length === 0) return 'none';
    
    const classIdsInGrade = classes.map(c => c.id);
    const selectedInGrade = selectedClassIds.filter(id => classIdsInGrade.includes(id));
    
    if (selectedInGrade.length === 0) return 'none';
    if (selectedInGrade.length === classIdsInGrade.length) return 'all';
    return 'partial';
  };

  // Handle clicking on the main Grade checkbox/button
  const handleGradeToggle = (grade) => {
    const classes = getClassesForGrade(grade);
    const classIdsInGrade = classes.map(c => c.id);
    const state = getGradeState(grade);

    let nextClassIds;
    let nextGrades;

    if (state === 'all' || state === 'partial') {
      // Uncheck all classes in this grade
      nextClassIds = selectedClassIds.filter(id => !classIdsInGrade.includes(id));
      nextGrades = selectedGrades.filter(g => Number(g) !== Number(grade));
    } else {
      // Check all classes in this grade
      const newIds = new Set([...selectedClassIds, ...classIdsInGrade]);
      nextClassIds = Array.from(newIds);
      if (!selectedGrades.includes(grade)) {
        nextGrades = [...selectedGrades, grade];
      } else {
        nextGrades = selectedGrades;
      }
      setExpandedGrades(prev => ({ ...prev, [grade]: true }));
    }

    onChange({
      targetGrades: nextGrades,
      targetClassIds: nextClassIds
    });
  };

  // Handle clicking on an individual Class checkbox/pill
  const handleClassToggle = (grade, classId) => {
    const classes = getClassesForGrade(grade);
    const classIdsInGrade = classes.map(c => c.id);

    let nextClassIds;
    if (selectedClassIds.includes(classId)) {
      nextClassIds = selectedClassIds.filter(id => id !== classId);
    } else {
      nextClassIds = [...selectedClassIds, classId];
    }

    // Check how many in this grade are now selected
    const selectedInThisGrade = nextClassIds.filter(id => classIdsInGrade.includes(id));
    let nextGrades = [...selectedGrades];

    if (selectedInThisGrade.length > 0) {
      if (!nextGrades.includes(grade)) nextGrades.push(grade);
    } else {
      nextGrades = nextGrades.filter(g => Number(g) !== Number(grade));
    }

    onChange({
      targetGrades: nextGrades,
      targetClassIds: nextClassIds
    });
  };

  // Select all classes in a specific grade
  const handleSelectAllInGrade = (grade, e) => {
    e?.stopPropagation();
    const classes = getClassesForGrade(grade);
    const classIdsInGrade = classes.map(c => c.id);
    const newIds = new Set([...selectedClassIds, ...classIdsInGrade]);
    const nextGrades = selectedGrades.includes(grade) ? selectedGrades : [...selectedGrades, grade];

    onChange({
      targetGrades: nextGrades,
      targetClassIds: Array.from(newIds)
    });
  };

  // Deselect all classes in a specific grade
  const handleDeselectAllInGrade = (grade, e) => {
    e?.stopPropagation();
    const classes = getClassesForGrade(grade);
    const classIdsInGrade = classes.map(c => c.id);
    const nextClassIds = selectedClassIds.filter(id => !classIdsInGrade.includes(id));
    const nextGrades = selectedGrades.filter(g => Number(g) !== Number(grade));

    onChange({
      targetGrades: nextGrades,
      targetClassIds: nextClassIds
    });
  };

  const totalClassesCount = classesList.length;
  const selectedClassesCount = selectedClassIds.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
        <span className="font-semibold text-gray-700">Phạm vi áp dụng (Khối / Lớp) *</span>
        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
          Đã chọn: {selectedClassesCount}/{totalClassesCount} lớp
        </span>
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 border border-gray-100 rounded-xl p-2 bg-gray-50/30">
        {gradesList.map(grade => {
          const classes = getClassesForGrade(grade);
          const state = getGradeState(grade);
          const isExpanded = expandedGrades[grade];
          const classIdsInGrade = classes.map(c => c.id);
          const selectedInGrade = selectedClassIds.filter(id => classIdsInGrade.includes(id));

          return (
            <div 
              key={grade} 
              className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                state !== 'none' 
                  ? 'border-blue-200 bg-white shadow-xs' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Grade Header */}
              <div 
                className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors ${
                  state !== 'none' ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'bg-gray-50/50 hover:bg-gray-100/60'
                }`}
                onClick={() => toggleExpand(grade)}
              >
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGradeToggle(grade);
                    }}
                    className="text-blue-600 hover:text-blue-700 focus:outline-none transition-transform active:scale-95 flex items-center justify-center"
                  >
                    {state === 'all' && <CheckSquare className="w-5 h-5 text-blue-600 fill-blue-50" />}
                    {state === 'partial' && <MinusSquare className="w-5 h-5 text-blue-600 fill-blue-50" />}
                    {state === 'none' && <Square className="w-5 h-5 text-gray-400" />}
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-800 text-sm">Khối {grade}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      state === 'all' ? 'bg-blue-100 text-blue-800' :
                      state === 'partial' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedInGrade.length}/{classes.length} lớp
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {classes.length > 0 && (
                    <div className="flex items-center space-x-1.5 text-xs">
                      <button
                        type="button"
                        onClick={(e) => handleSelectAllInGrade(grade, e)}
                        className="text-blue-600 hover:underline hover:text-blue-700 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50"
                      >
                        Tất cả
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeselectAllInGrade(grade, e)}
                        className="text-gray-500 hover:underline hover:text-gray-700 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}

                  <div className="text-gray-400 hover:text-gray-600 p-1">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </div>
              </div>

              {/* Classes List inside Grade (Collapsible) */}
              {isExpanded && (
                <div className="p-3 pt-2 border-t border-gray-100 bg-white">
                  {classes.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-1">Chưa có lớp nào thuộc Khối {grade}</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {classes.map(c => {
                        const isSelected = selectedClassIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center space-x-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none ${
                              isSelected
                                ? 'bg-blue-50/90 border-blue-400 text-blue-800 shadow-xs'
                                : 'bg-gray-50/70 border-gray-200 text-gray-700 hover:bg-gray-100/80 hover:border-gray-300'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleClassToggle(grade, c.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 pointer-events-none"
                            />
                            <span className="truncate font-semibold">{c.className}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GradeClassSelector;
