import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FooterConsultorContactProps {
  children: (whatsappUrl: string | null) => React.ReactNode;
}

const FooterConsultorContact = ({ children }: FooterConsultorContactProps) => {
  const [consultantWhatsapp, setConsultantWhatsapp] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchConsultantWhatsapp = async () => {
      if (!user) return;

      try {
        // Get user's school
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.school_id) {
          // Get consultant WhatsApp for this school
          const { data: school } = await supabase
            .from('school_customizations')
            .select('consultant_whatsapp')
            .eq('school_id', profile.school_id)
            .single();

          if (school?.consultant_whatsapp) {
            const digits = school.consultant_whatsapp.replace(/\D/g, '');
            const phone = digits.startsWith('55') ? digits : `55${digits}`;
            setConsultantWhatsapp(`https://wa.me/${phone}`);
          }
        }
      } catch (error) {
        console.error('Error fetching consultant WhatsApp:', error);
      }
    };

    fetchConsultantWhatsapp();
  }, [user]);

  return <>{children(consultantWhatsapp)}</>;
};

export default FooterConsultorContact;