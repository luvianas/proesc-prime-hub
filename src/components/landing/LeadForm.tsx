import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Send, Sparkles } from "lucide-react";

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const leadFormSchema = z.object({
  school_name: z.string().min(3, "Nome da escola deve ter pelo menos 3 caracteres").max(100),
  contact_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  phone: z.string().min(10, "Telefone inválido").max(20).optional().or(z.literal("")),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").max(100),
  state: z.string().length(2, "Selecione um estado"),
  message: z.string().max(500).optional()
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  sectionRef: React.RefObject<HTMLElement>;
}

const LeadForm = ({ sectionRef }: LeadFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      state: ""
    }
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (formRef.current) {
      observer.observe(formRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("prime_leads")
        .insert({
          school_name: data.school_name,
          contact_name: data.contact_name,
          email: data.email,
          phone: data.phone || null,
          city: data.city,
          state: data.state,
          message: data.message || null
        });

      if (error) throw error;

      setIsSuccess(true);
      reset();
      toast.success("Interesse registrado com sucesso! Entraremos em contato em breve.");
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section 
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Seja Prime
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Quer fazer parte do{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Programa Prime?
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Preencha o formulário abaixo e nossa equipe entrará em contato para apresentar 
            todos os benefícios de se tornar uma escola Prime.
          </p>
        </div>

        {/* Form Card */}
        <div 
          ref={formRef}
          className={`relative p-8 md:p-12 rounded-3xl bg-card/50 backdrop-blur-xl border border-border/50 shadow-2xl transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {isSuccess ? (
            <div className="text-center py-12 animate-scale-in">
              <div className="inline-flex p-4 rounded-full bg-green-500/10 mb-6">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Obrigado pelo interesse!</h3>
              <p className="text-muted-foreground mb-6">
                Recebemos sua solicitação e entraremos em contato em breve.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsSuccess(false)}
              >
                Enviar outro formulário
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* School Name */}
                <div className="space-y-2">
                  <Label htmlFor="school_name">Nome da Escola *</Label>
                  <Input
                    id="school_name"
                    placeholder="Ex: Colégio Exemplo"
                    {...register("school_name")}
                    className={errors.school_name ? "border-destructive" : ""}
                  />
                  {errors.school_name && (
                    <p className="text-sm text-destructive">{errors.school_name.message}</p>
                  )}
                </div>

                {/* Contact Name */}
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Seu Nome *</Label>
                  <Input
                    id="contact_name"
                    placeholder="Ex: João Silva"
                    {...register("contact_name")}
                    className={errors.contact_name ? "border-destructive" : ""}
                  />
                  {errors.contact_name && (
                    <p className="text-sm text-destructive">{errors.contact_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@escola.com.br"
                    {...register("email")}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    {...register("phone")}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    placeholder="Ex: São Paulo"
                    {...register("city")}
                    className={errors.city ? "border-destructive" : ""}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city.message}</p>
                  )}
                </div>

                {/* State */}
                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Select onValueChange={(value) => setValue("state", value)}>
                    <SelectTrigger className={errors.state ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && (
                    <p className="text-sm text-destructive">{errors.state.message}</p>
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Conte-nos um pouco sobre sua escola e suas expectativas..."
                  rows={4}
                  {...register("message")}
                  className={errors.message ? "border-destructive" : ""}
                />
                {errors.message && (
                  <p className="text-sm text-destructive">{errors.message.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg"
                disabled={isSubmitting}
                className="w-full py-6 text-lg rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Quero ser Prime
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* Glow Effect */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default LeadForm;
