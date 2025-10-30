import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { QrCode, UserPlus } from "lucide-react";

const ScanQR = () => {
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAffiliate = async () => {
    if (!qrCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código QR",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Buscar el código QR del admin
      const { data: adminQR, error: qrError } = await supabase
        .from("admin_qr_codes")
        .select("admin_id")
        .eq("code", qrCode.trim())
        .maybeSingle();

      if (qrError) throw qrError;

      if (!adminQR) {
        toast({
          title: "Código inválido",
          description: "El código QR no existe o es incorrecto",
          variant: "destructive",
        });
        return;
      }

      // Verificar si ya está afiliado
      const { data: existing } = await supabase
        .from("affiliations")
        .select("id")
        .eq("user_id", user.id)
        .eq("admin_id", adminQR.admin_id)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Ya estás afiliado",
          description: "Ya tienes acceso a este paseador",
        });
        navigate("/dashboard");
        return;
      }

      // Crear afiliación
      const { error: affiliationError } = await supabase
        .from("affiliations")
        .insert({
          user_id: user.id,
          admin_id: adminQR.admin_id,
          is_active: true,
        });

      if (affiliationError) throw affiliationError;

      toast({
        title: "¡Afiliación exitosa!",
        description: "Ahora puedes ver la ubicación de tu paseador",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-primary rounded-full p-4 shadow-glow">
              <QrCode className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle>Escanear Código QR</CardTitle>
          <CardDescription>
            Ingresa el código del QR de tu paseador para afiliarte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Ej: admin_xxx_123456"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Escanea el código QR o cópialo manualmente
            </p>
          </div>

          <Button 
            onClick={handleAffiliate} 
            disabled={loading || !qrCode.trim()}
            className="w-full"
            size="lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Afiliarme
          </Button>

          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="w-full"
          >
            Volver
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanQR;
