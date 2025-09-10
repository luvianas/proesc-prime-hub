import { ReactNode } from 'react';
import AdminHeader from '@/components/AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen auth-background">
      <AdminHeader />
      <main>{children}</main>
    </div>
  );
};

export default AdminLayout;