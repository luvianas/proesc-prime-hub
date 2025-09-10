import { createContext, useContext, useState, ReactNode } from 'react';

interface SchoolContextData {
  id: string;
  school_name: string;
  logo_url?: string;
  consultant_name?: string;
  consultant_whatsapp?: string;
  consultant_calendar_url?: string;
  proesc_id?: string;
  dashboard_links?: {
    financeiro?: string;
    agenda?: string;
    secretaria?: string;
    pedagogico?: string;
  };
}

interface AdminSchoolContextType {
  selectedSchool: SchoolContextData | null;
  setSelectedSchool: (school: SchoolContextData | null) => void;
  isViewingAsAdmin: boolean;
  setIsViewingAsAdmin: (viewing: boolean) => void;
}

const AdminSchoolContext = createContext<AdminSchoolContextType | undefined>(undefined);

interface AdminSchoolProviderProps {
  children: ReactNode;
}

export const AdminSchoolProvider = ({ children }: AdminSchoolProviderProps) => {
  const [selectedSchool, setSelectedSchool] = useState<SchoolContextData | null>(null);
  const [isViewingAsAdmin, setIsViewingAsAdmin] = useState(false);

  const value = {
    selectedSchool,
    setSelectedSchool,
    isViewingAsAdmin,
    setIsViewingAsAdmin,
  };

  return (
    <AdminSchoolContext.Provider value={value}>
      {children}
    </AdminSchoolContext.Provider>
  );
};

export const useAdminSchoolContext = (): AdminSchoolContextType => {
  const context = useContext(AdminSchoolContext);
  if (context === undefined) {
    throw new Error('useAdminSchoolContext must be used within an AdminSchoolProvider');
  }
  return context;
};