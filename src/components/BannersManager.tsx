import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowDown, ArrowUp, Trash2, Pencil, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface BannerRow {
  id: string;
  image_url: string;
  title?: string | null;
  link_url?: string | null;
  order_index?: number | null;
  duration_seconds?: number | null;
  created_at?: string;
  is_global: boolean;
  school_id?: string | null;
}

interface SchoolItem { id: string; school_name: string }

const BannersManager = () => {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'all' | 'global' | 'school'>('all');
  const { toast } = useToast();

  // Dialog/edit state
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [current, setCurrent] = useState<BannerRow | null>(null);
  const [form, setForm] = useState<{ title?: string; link_url?: string | null; image_url?: string; is_global?: boolean; school_id?: string | null; duration_seconds?: number | null; useDefault?: boolean }>({ useDefault: true });

  useEffect(() => {
    const load = async () => {
      console.log('🔧 BannersManager: Iniciando carregamento de banners');
      try {
        const [{ data: list, error }, { data: sch, error: schErr }] = await Promise.all([
          supabase.from('school_banners').select('*'),
          supabase.from('school_customizations').select('id, school_name')
        ]);
        
        console.log('📊 Dados recebidos - banners:', list, 'escolas:', sch);
        console.log('⚠️ Erros - banners:', error, 'escolas:', schErr);
        
        if (error) throw error;
        if (schErr) throw schErr;
        setBanners((list || []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))); 
        setSchools(sch || []);
        
        console.log('✅ Estado final - banners:', list?.length || 0, 'escolas:', sch?.length || 0);
      } catch (e: any) {
        console.error('❌ Erro no BannersManager:', e);
        toast({ title: 'Erro', description: e.message || 'Falha ao carregar banners', variant: 'destructive' });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (scope === 'global') return banners.filter(b => b.is_global);
    if (scope === 'school') return banners.filter(b => !b.is_global);
    return banners;
  }, [banners, scope]);

  const schoolName = (id?: string | null) => schools.find(s => s.id === id)?.school_name || '—';

  const refreshOrder = async (items: BannerRow[]) => {
    setBanners(items);
    // Persist minimal order changes (only the two swapped)
    try {
      const updates = items.slice(0, items.length); // shallow copy
      await Promise.all(updates.map((b, idx) => supabase.from('school_banners').update({ order_index: idx }).eq('id', b.id)));
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Falha ao salvar ordenação', variant: 'destructive' });
    }
  };

  const move = (id: string, dir: -1 | 1) => {
    setBanners(prev => {
      const list = [...prev].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const idx = list.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= list.length) return prev;
      const tmp = list[idx];
      list[idx] = list[swapIdx];
      list[swapIdx] = tmp;
      // reindex local then persist
      const reindexed = list.map((b, i) => ({ ...b, order_index: i }));
      refreshOrder(reindexed);
      return reindexed;
    });
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este banner?')) return;
    try {
      const { error } = await supabase.from('school_banners').delete().eq('id', id);
      if (error) throw error;
      setBanners(prev => prev.filter(b => b.id !== id));
      toast({ title: 'Removido' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao remover banner', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Banners</CardTitle>
          <CardDescription>Carregando…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciar Banners</CardTitle>
            <CardDescription>Veja, reordene, edite e exclua banners. Também é possível adicionar novos.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant={scope==='all' ? 'default' : 'outline'} onClick={() => setScope('all')}>Todos</Button>
            <Button variant={scope==='global' ? 'default' : 'outline'} onClick={() => setScope('global')}>Globais</Button>
            <Button variant={scope==='school' ? 'default' : 'outline'} onClick={() => setScope('school')}>Por escola</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum banner encontrado para este filtro.</p>
          )}
          {filtered.map((b) => (
            <div key={b.id} className="flex items-center gap-4 p-3 border rounded-md">
              <img src={b.image_url} alt={b.title || 'Banner'} className="w-40 h-12 object-cover rounded" loading="lazy" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={b.is_global ? 'default' : 'secondary'}>{b.is_global ? 'Global' : 'Escola'}</Badge>
                  {!b.is_global && <span className="text-sm text-muted-foreground truncate">{schoolName(b.school_id)}</span>}
                </div>
                {b.title && <div className="text-sm truncate">{b.title}</div>}
                {b.link_url && <a href={b.link_url} target="_blank" rel="noreferrer" className="text-xs underline truncate">{b.link_url}</a>}
              </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => move(b.id, -1)} aria-label="Subir">
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => move(b.id, 1)} aria-label="Descer">
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="outline" size="icon" aria-label="Editar" onClick={() => { setCurrent(b); setForm({ title: b.title || '', link_url: b.link_url || '', image_url: b.image_url, is_global: b.is_global, school_id: b.school_id || null, duration_seconds: b.duration_seconds ?? null, useDefault: (b.duration_seconds == null) }); setEditOpen(true); }}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={() => remove(b.id)} aria-label="Excluir">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title || ''} onChange={(e)=>setForm(prev=>({...prev, title: e.target.value}))} />
            </div>
            <div>
              <Label>Link de redirecionamento</Label>
              <Input placeholder="https://..." value={form.link_url || ''} onChange={(e)=>setForm(prev=>({...prev, link_url: e.target.value}))} />
            </div>
            <div>
              <Label>Imagem (URL)</Label>
              <Input placeholder="https://..." value={form.image_url || ''} onChange={(e)=>setForm(prev=>({...prev, image_url: e.target.value}))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={!!form.useDefault} onCheckedChange={(v)=>setForm(prev=>({...prev, useDefault: v, duration_seconds: v ? null : (prev.duration_seconds ?? 6)}))} />
              <span className="text-sm">Usar duração padrão do sistema (6s)</span>
            </div>
            {!form.useDefault && (
              <div>
                <Label>Duração personalizada (segundos)</Label>
                <Input type="number" min={1} max={120} value={form.duration_seconds ?? 6} onChange={(e)=>setForm(prev=>({...prev, duration_seconds: Number(e.target.value)}))} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setEditOpen(false)}>Cancelar</Button>
            <Button onClick={async()=>{
              if (!current) return;
              const payload:any = { title: form.title || null, link_url: form.link_url || null, image_url: form.image_url, duration_seconds: form.useDefault ? null : (form.duration_seconds ?? 6) };
              const { error } = await supabase.from('school_banners').update(payload).eq('id', current.id);
              if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
              setBanners(prev => prev.map(b => b.id === current.id ? { ...b, ...payload } : b));
              toast({ title: 'Banner atualizado' });
              setEditOpen(false);
            }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title || ''} onChange={(e)=>setForm(prev=>({...prev, title: e.target.value}))} />
            </div>
            <div>
              <Label>Link de redirecionamento</Label>
              <Input placeholder="https://..." value={form.link_url || ''} onChange={(e)=>setForm(prev=>({...prev, link_url: e.target.value}))} />
            </div>
            <div>
              <Label>Imagem (URL)</Label>
              <Input placeholder="https://..." value={form.image_url || ''} onChange={(e)=>setForm(prev=>({...prev, image_url: e.target.value}))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={!!form.useDefault} onCheckedChange={(v)=>setForm(prev=>({...prev, useDefault: v, duration_seconds: v ? null : (prev.duration_seconds ?? 6)}))} />
              <span className="text-sm">Usar duração padrão do sistema (6s)</span>
            </div>
            {!form.useDefault && (
              <div>
                <Label>Duração personalizada (segundos)</Label>
                <Input type="number" min={1} max={120} value={form.duration_seconds ?? 6} onChange={(e)=>setForm(prev=>({...prev, duration_seconds: Number(e.target.value)}))} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={async()=>{
              if (!form.image_url) { toast({ title: 'Imagem obrigatória', variant: 'destructive' }); return; }
              const nextIndex = (banners.reduce((m, b) => Math.max(m, b.order_index ?? -1), -1) + 1);
              const payload:any = { title: form.title || null, link_url: form.link_url || null, image_url: form.image_url, is_global: form.is_global ?? true, school_id: form.school_id ?? null, order_index: nextIndex, duration_seconds: form.useDefault ? null : (form.duration_seconds ?? 6) };
              const { data, error } = await supabase.from('school_banners').insert(payload).select('*').single();
              if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
              setBanners(prev => [...prev, data as any].sort((a,b)=> (a.order_index??0)-(b.order_index??0)));
              toast({ title: 'Banner criado' });
              setCreateOpen(false);
              setForm({ useDefault: true });
            }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BannersManager;
