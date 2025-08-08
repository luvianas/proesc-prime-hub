import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface SchoolCustomization {
  id: string;
  school_id: string | null;
  school_name: string;
  logo_url: string | null;
  consultant_name: string | null;
  consultant_photo_url: string | null;
  consultant_whatsapp: string | null;
  consultant_calendar_url: string | null;
  theme_color: string | null;
  dashboard_links: Record<string, string>;
}

interface Banner {
  id: string;
  school_id: string | null;
  image_url: string;
  title: string | null;
  link_url: string | null;
  order_index: number;
}

const SchoolsPanel = () => {
  const [schools, setSchools] = useState<SchoolCustomization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => schools.find((s) => s.id === selectedId) ?? null,
    [schools, selectedId]
  );
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("school_customizations")
        .select(
          "id,school_id,school_name,logo_url,consultant_name,consultant_photo_url,consultant_whatsapp,consultant_calendar_url,theme_color,dashboard_links"
        )
        .order("created_at", { ascending: true });
      if (error) {
        console.error(error);
        toast.error("Erro ao carregar escolas");
        return;
      }
      setSchools((data as any) ?? []);
      if ((data as any)?.length && !selectedId) setSelectedId((data as any)[0].id);
    })();
  }, [selectedId]);

  useEffect(() => {
    if (!selected || !selected.school_id) return;
    (async () => {
      const { data, error } = await supabase
        .from("school_banners")
        .select("id,school_id,image_url,title,link_url,order_index")
        .eq("school_id", selected.school_id)
        .order("order_index", { ascending: true });
      if (error) {
        console.error(error);
        toast.error("Erro ao carregar banners");
        return;
      }
      setBanners((data as any) ?? []);
    })();
  }, [selected?.school_id, selected?.id]);

  const createSchool = async () => {
    const name = prompt("Nome da escola");
    if (!name) return;
    const school_id = crypto.randomUUID();
    const payload = { school_name: name, school_id };
    const { data, error } = await supabase
      .from("school_customizations")
      .insert(payload)
      .select("id,school_id,school_name")
      .single();
    if (error) return toast.error("Erro ao criar escola");
    setSchools((prev) => [...prev, data as any]);
    setSelectedId((data as any).id);
    toast.success("Escola criada");
  };

  const saveField = async (field: keyof SchoolCustomization, value: any) => {
    if (!selected) return;
    const { error } = await supabase
      .from("school_customizations")
      .update({ [field]: value })
      .eq("id", selected.id);
    if (error) return toast.error("Erro ao salvar");
    setSchools((prev) =>
      prev.map((s) => (s.id === selected.id ? { ...s, [field]: value } : s))
    );
    toast.success("Alterações salvas");
  };

  const saveDashboardLink = async (key: string, value: string) => {
    if (!selected) return;
    const updated = {
      ...(selected.dashboard_links || {}),
      [key]: value,
    } as Record<string, string>;
    await saveField("dashboard_links", updated as any);
  };

  const uploadToBucket = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("school-assets")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("school-assets")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected?.school_id) return toast.error("Crie a escola primeiro");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToBucket(
        file,
        `schools/${selected.school_id}/logo-${Date.now()}.png`
      );
      await saveField("logo_url", url);
    } catch (err) {
      console.error(err);
      toast.error("Falha no upload do logo");
    }
  };

  const onConsultantPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!selected?.school_id) return toast.error("Crie a escola primeiro");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToBucket(
        file,
        `schools/${selected.school_id}/consultant-${Date.now()}.png`
      );
      await saveField("consultant_photo_url", url);
    } catch (err) {
      console.error(err);
      toast.error("Falha no upload da foto do consultor");
    }
  };

  const addBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected?.school_id) return toast.error("Crie a escola primeiro");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToBucket(
        file,
        `schools/${selected.school_id}/banners/${Date.now()}-${file.name}`
      );
      const { data, error } = await supabase
        .from("school_banners")
        .insert({
          school_id: selected.school_id,
          image_url: url,
          order_index: (banners[banners.length - 1]?.order_index ?? -1) + 1,
        })
        .select("id,school_id,image_url,title,link_url,order_index")
        .single();
      if (error) throw error;
      setBanners((prev) => [...prev, data as any]);
      toast.success("Banner adicionado");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao adicionar banner");
    }
  };

  const updateBanner = async (id: string, patch: Partial<Banner>) => {
    const { data, error } = await supabase
      .from("school_banners")
      .update(patch)
      .eq("id", id)
      .select("id,school_id,image_url,title,link_url,order_index")
      .single();
    if (error) return toast.error("Erro ao atualizar banner");
    setBanners((prev) => prev.map((b) => (b.id === id ? (data as any) : b)));
    toast.success("Banner atualizado");
  };

  const removeBanner = async (id: string) => {
    const { error } = await supabase.from("school_banners").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover banner");
    setBanners((prev) => prev.filter((b) => b.id !== id));
    toast.success("Banner removido");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Escolas</h2>
        <Button variant="outline" onClick={createSchool}>
          + Novo
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lista de Escolas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {schools.map((s) => (
              <Button
                key={s.id}
                variant={selectedId === s.id ? "default" : "outline"}
                onClick={() => setSelectedId(s.id)}
              >
                {s.school_name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Customização: {selected.school_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="branding">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="branding">Marca</TabsTrigger>
                <TabsTrigger value="consultant">Consultor</TabsTrigger>
                <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
                <TabsTrigger value="banners">Banners</TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Nome da escola</Label>
                    <Input
                      defaultValue={selected.school_name}
                      onBlur={(e) => saveField("school_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Cor do tema (hex)</Label>
                    <Input
                      defaultValue={selected.theme_color ?? "#c41133"}
                      onBlur={(e) => saveField("theme_color", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      {selected.logo_url && (
                        <img
                          src={selected.logo_url}
                          alt={`Logo da escola ${selected.school_name}`}
                          className="h-12"
                          loading="lazy"
                        />
                      )}
                      <Input type="file" accept="image/*" onChange={onLogoChange} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="consultant" className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do consultor</Label>
                    <Input
                      defaultValue={selected.consultant_name ?? ""}
                      onBlur={(e) => saveField("consultant_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp do consultor (somente números)</Label>
                    <Input
                      defaultValue={selected.consultant_whatsapp ?? ""}
                      onBlur={(e) =>
                        saveField("consultant_whatsapp", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>URL da agenda (Google Appointments)</Label>
                    <Input
                      defaultValue={selected.consultant_calendar_url ?? ""}
                      onBlur={(e) =>
                        saveField("consultant_calendar_url", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Foto do consultor</Label>
                    <div className="flex items-center gap-4">
                      {selected.consultant_photo_url && (
                        <img
                          src={selected.consultant_photo_url}
                          alt={`Foto do consultor de ${selected.school_name}`}
                          className="h-16 w-16 rounded-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <Input type="file" accept="image/*" onChange={onConsultantPhotoChange} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dashboards" className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["financeiro_url", "tickets_url", "pedagogico_url"] as const).map(
                    (key) => (
                      <div key={key}>
                        <Label>{key.replace("_", " ").toUpperCase()}</Label>
                        <Input
                          defaultValue={selected.dashboard_links?.[key] ?? ""}
                          onBlur={(e) => saveDashboardLink(key, e.target.value)}
                          placeholder="Cole o link do Metabase aqui"
                        />
                      </div>
                    )
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">Dica</Badge> Você pode adicionar mais
                  chaves no banco em dashboard_links.
                </div>
              </TabsContent>

              <TabsContent value="banners" className="pt-4">
                <div className="mb-4">
                  <Label>Adicionar banner</Label>
                  <Input type="file" accept="image/*" onChange={addBanner} />
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {banners.map((b) => (
                    <Card key={b.id}>
                      <CardContent className="p-4">
                        <img
                          src={b.image_url}
                          alt={b.title ?? "Banner"}
                          className="w-full h-32 object-cover rounded"
                          loading="lazy"
                        />
                        <div className="mt-3 space-y-2">
                          <div>
                            <Label>Título</Label>
                            <Input
                              defaultValue={b.title ?? ""}
                              onBlur={(e) => updateBanner(b.id, { title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Link</Label>
                            <Input
                              defaultValue={b.link_url ?? ""}
                              onBlur={(e) => updateBanner(b.id, { link_url: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Ordem</Label>
                            <Input
                              type="number"
                              defaultValue={b.order_index}
                              onBlur={(e) =>
                                updateBanner(b.id, { order_index: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button variant="destructive" onClick={() => removeBanner(b.id)}>
                              Remover
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default SchoolsPanel;
