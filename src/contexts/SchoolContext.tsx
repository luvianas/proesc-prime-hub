import React, { createContext, useContext, useState } from 'react';

interface SchoolContextType {
  selectedSchoolId: string | null;
  selectSchool: (schoolId: string) => void;
  clearSelection: () => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const selectSchool = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
  };

  const clearSelection = () => {
    setSelectedSchoolId(null);
  };

  return (
    <SchoolContext.Provider value={{ selectedSchoolId, selectSchool, clearSelection }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};