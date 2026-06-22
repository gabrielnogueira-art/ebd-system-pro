import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download, Pencil, Trash2, X, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Registration {
  id: string;
  registration_date: string;
  class_id: number;
  present_students: string[];
  total_present: number;
  visitors: number;
  bibles: number;
  magazines: number;
  offering_cash: number;
  offering_pix: number;
  hymn: string;
  pix_receipt_urls: string[];
  classes?: {
    name: string;
  };
}

export const RegistrationsList = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [receiptsDialogOpen, setReceiptsDialogOpen] = useState(false);
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    total_present: 0,
    visitors: 0,
    bibles: 0,
    magazines: 0,
    offering_cash: 0,
    offering_pix: 0,
    hymn: ""
  });
  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [editFilesToDelete, setEditFilesToDelete] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchRegistrations();
    fetchClasses();
    
    // Setup Realtime subscription
    const channel = supabase
      .channel('registrations-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations'
        },
        () => {
          fetchRegistrations();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [registrations, filterDate, filterClass]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          *,
          classes:class_id (
            name
          )
        `)
        .order("registration_date", { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...registrations];

    if (filterDate) {
      filtered = filtered.filter(reg => {
        const regDate = new Date(reg.registration_date).toISOString().split('T')[0];
        return regDate === filterDate;
      });
    }

    if (filterClass) {
      filtered = filtered.filter(reg => reg.class_id === parseInt(filterClass));
    }

    setFilteredRegistrations(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleViewReceipts = async (registration: Registration) => {
    setSelectedRegistration(registration);
    
    if (registration.pix_receipt_urls.length === 0) {
      toast({
        title: "Sem comprovantes",
        description: "Este registro não possui comprovantes anexados.",
        variant: "default",
      });
      return;
    }

    try {
      // Generate signed URLs for viewing the receipts
      const urls = await Promise.all(
        registration.pix_receipt_urls.map(async (path) => {
          const { data, error } = await supabase.storage
            .from("pix-receipts")
            .createSignedUrl(path, 3600); // URL válida por 1 hora
          
          if (error) {
            console.error("Error creating signed URL:", error);
            return null;
          }
          
          return data.signedUrl;
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      setReceiptUrls(validUrls);
      setReceiptsDialogOpen(true);
    } catch (error) {
      console.error("Error viewing receipts:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar os comprovantes.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (registration: Registration) => {
    setSelectedRegistration(registration);
    setEditFormData({
      total_present: registration.total_present || 0,
      visitors: registration.visitors || 0,
      bibles: registration.bibles || 0,
      magazines: registration.magazines || 0,
      offering_cash: registration.offering_cash || 0,
      offering_pix: registration.offering_pix || 0,
      hymn: registration.hymn || ""
    });
    setEditExistingUrls(registration.pix_receipt_urls || []);
    setEditNewFiles([]);
    setEditFilesToDelete([]);
    setEditDialogOpen(true);
  };
  
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEditNewFiles(prev => [...prev, ...files]);
  };
  
  const removeEditNewFile = (index: number) => {
    setEditNewFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeEditExistingFile = (url: string) => {
    setEditExistingUrls(prev => prev.filter(u => u !== url));
    setEditFilesToDelete(prev => [...prev, url]);
  };
  
  const viewEditReceipt = async (url: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("pix-receipts")
        .createSignedUrl(url, 3600);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Error viewing receipt:", error);
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o comprovante.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedRegistration) return;

    try {
      // Delete files from storage if requested
      if (editFilesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from("pix-receipts")
          .remove(editFilesToDelete);
        
        if (deleteError) {
          console.error("Error deleting files:", deleteError);
        }
      }
      
      // Upload new files
      let newUploadedUrls: string[] = [];
      let congregationId: string | null = null;
      if (editNewFiles.length > 0) {
        const { data: cls, error: clsErr } = await supabase
          .from("classes")
          .select("congregation_id")
          .eq("id", selectedRegistration.class_id)
          .maybeSingle();
        if (clsErr) throw clsErr;
        congregationId = (cls as any)?.congregation_id ?? null;
        if (!congregationId) {
          throw new Error("Classe sem congregação associada. Não é possível enviar comprovantes.");
        }
      }
      for (const file of editNewFiles) {
        try {
          const timestamp = Date.now();
          const sanitizedName = file.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
          const fileName = `${congregationId}/${timestamp}-${sanitizedName}`;
          const { data, error } = await supabase.storage
            .from("pix-receipts")
            .upload(fileName, file);
          if (error) throw error;
          newUploadedUrls.push(data.path);
        } catch (error) {
          console.error("Error uploading file:", error);
          throw error;
        }
      }
      
      // Combine existing URLs with new uploads
      const finalUrls = [...editExistingUrls, ...newUploadedUrls];
      
      const { error } = await supabase
        .from("registrations")
        .update({
          ...editFormData,
          pix_receipt_urls: finalUrls
        })
        .eq("id", selectedRegistration.id);

      if (error) throw error;

      toast({
        title: "Registro atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      setEditDialogOpen(false);
      fetchRegistrations();
    } catch (error) {
      console.error("Error updating registration:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o registro.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (registration: Registration) => {
    if (!confirm("Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      // Primeiro, excluir os arquivos do storage se houver
      if (registration.pix_receipt_urls.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("pix-receipts")
          .remove(registration.pix_receipt_urls);

        if (storageError) {
          console.error("Error deleting storage files:", storageError);
        }
      }

      // Depois, excluir o registro
      const { error } = await supabase
        .from("registrations")
        .delete()
        .eq("id", registration.id);

      if (error) throw error;

      toast({
        title: "Registro excluído",
        description: "O registro foi excluído com sucesso.",
      });

      fetchRegistrations();
    } catch (error) {
      console.error("Error deleting registration:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReceipt = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `comprovante-${selectedRegistration?.id}-${index + 1}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download iniciado",
        description: "O comprovante está sendo baixado.",
      });
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o comprovante.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReceipt = async (index: number) => {
    if (!selectedRegistration) return;
    
    if (!confirm("Tem certeza que deseja excluir este comprovante?")) {
      return;
    }

    const pathToDelete = selectedRegistration.pix_receipt_urls[index];
    
    try {
      // Remove file from storage
      const { error: storageError } = await supabase.storage
        .from("pix-receipts")
        .remove([pathToDelete]);

      if (storageError) {
        console.error("Error deleting from storage:", storageError);
      }

      // Update the database
      const newUrls = selectedRegistration.pix_receipt_urls.filter((_, i) => i !== index);
      
      const { error: dbError } = await supabase
        .from("registrations")
        .update({ pix_receipt_urls: newUrls })
        .eq("id", selectedRegistration.id);

      if (dbError) throw dbError;

      // Update local state
      setSelectedRegistration(prev => prev ? { ...prev, pix_receipt_urls: newUrls } : null);
      setReceiptUrls(prev => prev.filter((_, i) => i !== index));
      
      // Update registrations list
      setRegistrations(prev => 
        prev.map(reg => 
          reg.id === selectedRegistration.id 
            ? { ...reg, pix_receipt_urls: newUrls } 
            : reg
        )
      );

      toast({
        title: "Comprovante excluído",
        description: "O comprovante foi removido com sucesso.",
      });

      // Close dialog if no more receipts
      if (newUrls.length === 0) {
        setReceiptsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting receipt:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comprovante.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registros de Aulas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros de Aulas</CardTitle>
        <CardDescription>
          Visualize todos os registros de aulas da EBD
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filter-date" className="mb-2 block">Filtrar por Data</Label>
            <Input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder="Selecione uma data"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filter-class" className="mb-2 block">Filtrar por Classe</Label>
            <select
              id="filter-class"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full h-10 px-3 border border-input bg-background rounded-md"
            >
              <option value="">Todas as classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          {(filterDate || filterClass) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterDate("");
                  setFilterClass("");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Presentes</TableHead>
                <TableHead>Visitantes</TableHead>
                <TableHead>Materiais</TableHead>
                <TableHead>Ofertas</TableHead>
                <TableHead>Hino</TableHead>
                <TableHead>Comprovantes</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell className="font-medium">
                    {formatDate(registration.registration_date)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {registration.classes?.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {registration.total_present}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {registration.visitors}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        B: {registration.bibles}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        R: {registration.magazines}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>💰 {formatCurrency(registration.offering_cash)}</div>
                      <div>📱 {formatCurrency(registration.offering_pix)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {registration.hymn || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={registration.pix_receipt_urls.length > 0 ? "default" : "secondary"}>
                        {registration.pix_receipt_urls.length} arquivo(s)
                      </Badge>
                      {registration.pix_receipt_urls.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceipts(registration)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(registration)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(registration)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredRegistrations.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum registro encontrado.
          </div>
        )}
      </CardContent>

      {/* Dialog para visualizar comprovantes */}
      <Dialog open={receiptsDialogOpen} onOpenChange={setReceiptsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprovantes PIX</DialogTitle>
            <DialogDescription>
              Classe: {selectedRegistration?.classes?.name} | 
              Data: {selectedRegistration && formatDate(selectedRegistration.registration_date)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {receiptUrls.map((url, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Comprovante {index + 1}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReceipt(url, index)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReceipt(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-muted">
                    {url.includes('.pdf') ? (
                      <object
                        data={url}
                        type="application/pdf"
                        className="w-full h-[600px]"
                      >
                        <iframe
                          src={url}
                          className="w-full h-[600px]"
                          title={`Comprovante ${index + 1}`}
                        >
                          <p>
                            Seu navegador não suporta visualização de PDF.{' '}
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              Clique aqui para baixar
                            </a>
                          </p>
                        </iframe>
                      </object>
                    ) : (
                      <img
                        src={url}
                        alt={`Comprovante ${index + 1}`}
                        className="w-full h-auto"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = url;
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar registro */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>
              Edite os dados do registro selecionado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Presentes</Label>
              <Input
                type="number"
                value={editFormData.total_present || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, total_present: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Visitantes</Label>
              <Input
                type="number"
                value={editFormData.visitors || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, visitors: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bíblias</Label>
                <Input
                  type="number"
                  value={editFormData.bibles || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, bibles: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Revistas</Label>
                <Input
                  type="number"
                  value={editFormData.magazines || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, magazines: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Oferta (Dinheiro)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.offering_cash || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, offering_cash: parseFloat(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Oferta (PIX/Cartão)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.offering_pix || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, offering_pix: parseFloat(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Hino</Label>
              <Input
                type="text"
                value={editFormData.hymn}
                onChange={(e) => setEditFormData(prev => ({ ...prev, hymn: e.target.value }))}
                placeholder="Ex: 15 - Harpa Cristã"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Comprovantes PIX</Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
                  multiple
                  onChange={handleEditFileChange}
                  className="cursor-pointer"
                />
                
                {editExistingUrls.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Comprovantes existentes ({editExistingUrls.length}):</p>
                    <ul className="space-y-2">
                      {editExistingUrls.map((url, index) => (
                        <li key={index} className="flex items-center justify-between gap-2 text-sm bg-background p-2 rounded border">
                          <span className="truncate flex-1">Comprovante {index + 1}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => viewEditReceipt(url)}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEditExistingFile(url)}
                              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {editNewFiles.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Novos arquivos ({editNewFiles.length}):</p>
                    <ul className="space-y-2">
                      {editNewFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between gap-2 text-sm bg-background p-2 rounded border">
                          <span className="truncate flex-1">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEditNewFile(index)}
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};