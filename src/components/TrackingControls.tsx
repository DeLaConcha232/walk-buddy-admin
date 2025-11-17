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
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // updateLocation defined below

  

  const stopLocationTracking = async () => {
    // Detener watchPosition
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
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

  const saveLocation = useCallback(async (latitude: number, longitude: number) => {
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
          latitude,
          longitude,
          is_active: true,
        });

      if (error) throw error;
      console.log("Ubicación actualizada:", { latitude, longitude });
    } catch (dbError: unknown) {
      console.error("Error guardando ubicación en Supabase:", dbError);
    }
  }, [userId]);

  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // Actualizar cada 10 minutos (600000 ms) para optimizar consumo de datos y batería
    if (timeSinceLastUpdate >= 600000 || lastUpdateRef.current === 0) {
      lastUpdateRef.current = now;
      saveLocation(position.coords.latitude, position.coords.longitude);
    }
  }, [saveLocation]);

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    console.error("Error de geolocalización:", error);
    let description = "No se pudo obtener la ubicación.";
    switch (error.code) {
      case 1:
        description = "Permiso de ubicación denegado. Habilita la ubicación en tu navegador.";
        break;
      case 2:
        description = "Ubicación no disponible en este momento.";
        break;
      case 3:
        description = "Se agotó el tiempo obteniendo tu ubicación.";
        break;
    }
    toast({
      title: "Error de ubicación",
      description,
      variant: "destructive",
    });
  }, [toast]);

  const startLocationTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocalización no disponible en tu navegador",
        variant: "destructive",
      });
      return;
    }

    // Detener tracking previo si existe
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Activar Wake Lock para mantener el dispositivo activo
    await requestWakeLock();

    // Opciones optimizadas para watchPosition - balance entre precisión y consumo de recursos
    const watchOptions: PositionOptions = {
      enableHighAccuracy: true, // Mantener precisión GPS para seguimiento de paseos
      maximumAge: 120000, // Permitir usar posiciones de hasta 2 minutos para reducir uso de GPS
      timeout: 30000, // 30 segundos de timeout
    };

    // Iniciar rastreo continuo con watchPosition
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      watchOptions
    );

    console.log("Rastreo de ubicación iniciado con watchPosition");
  }, [handlePositionUpdate, handlePositionError, toast]);

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
    // Solo verificar tracking activo al montar el componente
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  const startTracking = async () => {
    setLoading(true);
    try {
      setIsTracking(true);
      startLocationTracking();
      
      toast({
        title: "Paseo Iniciado",
        description: "Tu ubicación se actualizará cada 10 minutos",
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
      // Primero detener el tracking localmente
      setIsTracking(false);
      await stopLocationTracking();

      // Luego desactivar y borrar ubicaciones en la base de datos
      await supabase
        .from("admin_locations")
        .update({ is_active: false })
        .eq("admin_id", userId)
        .eq("is_active", true);

      // Borrar todas las ubicaciones del admin
      const { error } = await supabase
        .from("admin_locations")
        .delete()
        .eq("admin_id", userId);

      if (error) throw error;

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
            ? "Paseo activo - Ubicación actualizándose cada 10 minutos" 
            : "Inicia un paseo para compartir tu ubicación con tus clientes"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTracking && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tu ubicación se está compartiendo y se actualiza automáticamente cada 10 minutos
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
