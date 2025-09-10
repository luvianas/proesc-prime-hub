import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SchoolData {
  id: string;
  school_name: string;
  logo_url?: string;
  consultant_name?: string;
  consultant_whatsapp?: string;
  consultant_calendar_url?: string;
  proesc_id?: string;
  organization_id?: number;
  metabase_integration_url?: string;
  dashboard_links?: any;
}

interface SchoolContextType {
  selectedSchool: SchoolData | null;
  selectSchool: (school: SchoolData) => void;
  clearSelection: () => void;
  isAdminMode: boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const selectSchool = (school: SchoolData) => {
    setSelectedSchool(school);
    setIsAdminMode(true);
  };

  const clearSelection = () => {
    setSelectedSchool(null);
    setIsAdminMode(false);
  };

  return (
    <SchoolContext.Provider value={{
      selectedSchool,
      selectSchool,
      clearSelection,
      isAdminMode,
    }}>
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