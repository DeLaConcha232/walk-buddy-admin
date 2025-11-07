import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Square, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TrackingControlsProps {
  userId: string;
  onMetricsUpdate: () => void;
}

const TrackingControls = ({ userId, onMetricsUpdate }: TrackingControlsProps) => {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // updateLocation defined below

  

  const stopLocationTracking = async () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    
    // Liberar Wake Lock
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock activado');
      } catch (err) {
        console.error('Error al activar Wake Lock:', err);
      }
    }
  };

  const updateLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocalización no disponible en tu navegador",
        variant: "destructive",
      });
      return;
    }

    const getPosition = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, opts)
      );

    const primaryOpts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000, // 20s para GPS preciso
      maximumAge: 0,
    };

    const fallbackOpts: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 30000, // 30s y menos precisión
      maximumAge: 300000, // acepta última ubicación hasta 5 min
    };

    try {
      let position: GeolocationPosition;

      try {
        // Primer intento: alta precisión
        position = await getPosition(primaryOpts);
      } catch (err: unknown) {
        // Reintentar con opciones relajadas si TIMEOUT (3) o POSITION_UNAVAILABLE (2)
        const code = (err as GeolocationPositionError)?.code;
        if (code === 3 /* TIMEOUT */ || code === 2 /* POSITION_UNAVAILABLE */) {
          position = await getPosition(fallbackOpts);
        } else {
          throw err;
        }
      }

      try {
        // Desactivar ubicaciones activas previas
        await supabase
          .from("admin_locations")
          .update({ is_active: false })
          .eq("admin_id", userId)
          .eq("is_active", true);

        // Insertar nueva ubicación activa
        const { error } = await supabase
          .from("admin_locations")
          .insert({
            admin_id: userId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            is_active: true,
          });

        if (error) throw error;
      } catch (dbError: unknown) {
        console.error("Error guardando ubicación en Supabase:", dbError);
        throw dbError;
      }
    } catch (error: unknown) {
      console.error("updateLocation error:", error);
      let description = "No se pudo actualizar la ubicación.";
      const code = (error as GeolocationPositionError | { code?: number })?.code;
      switch (code) {
        case 1:
          description = "Permiso de ubicación denegado. Habilita la ubicación en tu navegador.";
          break;
        case 2:
          description = "Ubicación no disponible en este momento.";
          break;
        case 3:
          description = "Se agotó el tiempo obteniendo tu ubicación. Activa el GPS o intenta de nuevo.";
          break;
      }
      toast({
        title: "Error de ubicación",
        description,
        variant: "destructive",
      });
    }
  }, [toast, userId]);

  const startLocationTracking = useCallback(async () => {
    // Limpiar intervalo previo si existe
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }

    // Activar Wake Lock para mantener el tracking activo
    await requestWakeLock();

    // Obtener ubicación inmediatamente
    updateLocation();

    // Actualizar ubicación cada 5 minutos
    locationIntervalRef.current = setInterval(() => {
      updateLocation();
    }, 5 * 60 * 1000); // 5 minutos
  }, [updateLocation]);

  const checkActiveTracking = useCallback(async () => {
    try {
      // Verificar si hay ubicación activa en admin_locations
      const { data, error } = await supabase
        .from("admin_locations")
        .select("is_active")
        .eq("admin_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsTracking(true);
        startLocationTracking();
      }
    } catch {
      // Error checking
    }
  }, [userId, startLocationTracking]);

  useEffect(() => {
    checkActiveTracking();
    
    // Reactivar Wake Lock si la página se vuelve visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isTracking && !wakeLockRef.current) {
        await requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopLocationTracking();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkActiveTracking, isTracking]);

  const startTracking = async () => {
    setLoading(true);
    try {
      setIsTracking(true);
      startLocationTracking();
      
      toast({
        title: "Paseo Iniciado",
        description: "Tu ubicación se actualizará cada 5 minutos",
      });
      
      onMetricsUpdate();
    } catch (error: unknown) {
      setIsTracking(false);
      const message = error instanceof Error ? error.message : "Ocurrió un error";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopTracking = async () => {
    setLoading(true);
    try {
      // Borrar todas las ubicaciones del admin
      const { error } = await supabase
        .from("admin_locations")
        .delete()
        .eq("admin_id", userId);

      if (error) throw error;

      await stopLocationTracking();
      setIsTracking(false);

      toast({
        title: "Paseo Finalizado",
        description: "El seguimiento de ubicación se ha detenido",
      });
      
      onMetricsUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ocurrió un error";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Control de Paseo
        </CardTitle>
        <CardDescription>
          {isTracking 
            ? "Paseo activo - Ubicación actualizándose cada 5 minutos" 
            : "Inicia un paseo para compartir tu ubicación con tus clientes"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTracking && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tu ubicación se está compartiendo y se actualiza automáticamente cada 5 minutos
            </AlertDescription>
          </Alert>
        )}
        
        {isTracking ? (
          <Button 
            onClick={stopTracking} 
            disabled={loading}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <Square className="w-5 h-5 mr-2" />
            Finalizar Paseo
          </Button>
        ) : (
          <Button 
            onClick={startTracking} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Iniciar Paseo
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackingControls;
