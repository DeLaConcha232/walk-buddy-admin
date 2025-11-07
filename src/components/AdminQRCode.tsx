import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface AdminQRCodeProps {
  adminId: string;
}

const AdminQRCode = ({ adminId }: AdminQRCodeProps) => {
  const [qrCode, setQrCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrCreateQRCode = useCallback(async () => {
    try {
      setLoading(true);
      
      // Verificar si ya existe un QR code para este admin
      const { data: existing, error: fetchError } = await supabase
        .from("admin_qr_codes")
        .select("code")
        .eq("admin_id", adminId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setQrCode(existing.code);
      } else {
        // Crear nuevo código único
        const newCode = `admin_${adminId}_${Date.now()}`;
        
        const { data, error: insertError } = await supabase
          .from("admin_qr_codes")
          .insert({ admin_id: adminId, code: newCode })
          .select("code")
          .single();

        if (insertError) throw insertError;
        
        setQrCode(data.code);
        toast({
          title: "QR Generado",
          description: "Tu código QR permanente ha sido creado",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ocurrió un error inesperado";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [adminId, toast]);

  useEffect(() => {
    fetchOrCreateQRCode();
  }, [fetchOrCreateQRCode]);

  const downloadQR = () => {
    const canvas = document.getElementById("admin-qr-code") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `admin-qr-${adminId}.png`;
      link.href = url;
      link.click();
      
      toast({
        title: "Descargado",
        description: "QR descargado exitosamente",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Tu QR Permanente
        </CardTitle>
        <CardDescription>
          Los clientes escanean este código una sola vez para vincularse contigo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-white rounded-lg">
          <QRCodeSVG
            id="admin-qr-code"
            value={qrCode}
            size={256}
            level="H"
            includeMargin
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={downloadQR} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Descargar QR
          </Button>
          <Button onClick={fetchOrCreateQRCode} variant="outline">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Código: {qrCode}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminQRCode;
