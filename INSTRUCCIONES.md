# Instrucciones de Uso - Walk Buddy Admin

## Configuración Inicial

### 1. Asignar Rol de Admin

Para que un usuario sea administrador y pueda usar todas las funciones, necesita tener el rol `admin` en la tabla `user_roles`.

**Ejecuta este SQL en tu Supabase SQL Editor:**

```sql
-- Reemplaza 'TU_USER_ID_AQUI' con el ID real del usuario admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('TU_USER_ID_AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Para obtener tu User ID:
1. Ve a Supabase Dashboard > Authentication > Users
2. Encuentra tu usuario y copia el UUID

### 2. Configurar Autenticación en Supabase

**IMPORTANTE:** Para que el registro funcione correctamente, desactiva la confirmación de email:

1. Ve a Supabase Dashboard > Authentication > Providers
2. Encuentra "Email" y haz clic en editar
3. Desactiva "Confirm email"
4. Guarda los cambios

## Funcionalidades

### Para Administradores (Paseadores)

#### Panel de Control (/dashboard)

1. **QR Permanente**
   - Se genera automáticamente al cargar el dashboard
   - Es único y permanente para cada admin
   - Los clientes lo escanean UNA sola vez para afiliarse
   - Puedes descargarlo e imprimirlo

2. **Control de Paseo**
   - **Iniciar Paseo**: Activa el tracking GPS
     - La ubicación se actualiza cada 5 minutos
     - Los clientes afiliados pueden ver tu ubicación en tiempo real
   - **Finalizar Paseo**: Detiene el tracking GPS
     - Los clientes dejan de ver la ubicación

3. **Métricas del Dashboard**
   - Clientes Activos: Total de usuarios afiliados
   - Paseos Activos: Paseos en curso actualmente
   - Paseos Hoy: Paseos realizados hoy
   - Total Paseos: Todos los paseos históricos

4. **Gestión de Clientes (/clients)**
   - Ver lista de todos los clientes afiliados
   - Información: nombre, email, teléfono, fecha de afiliación

5. **Historial de Paseos (/walks)**
   - Ver todos los paseos completados
   - Detalles: cliente, perro, fecha, duración

### Para Clientes

#### Afiliación

1. **Escanear QR del Admin**
   - Ve a `/scan-qr`
   - Escanea el código QR del paseador
   - O ingresa manualmente el código
   - Haz clic en "Afiliarme"

2. **Ver Ubicación del Paseador**
   - Cuando el admin inicia un paseo, puedes ver su ubicación
   - La ubicación se actualiza cada 5 minutos
   - Cuando el admin finaliza el paseo, dejas de ver la ubicación

## Flujo Completo de Uso

### Configuración Inicial (Una sola vez)

1. Registrarse en la app
2. Asignar rol `admin` en Supabase (ver SQL arriba)
3. Cerrar sesión y volver a iniciar sesión

### Uso Diario del Admin

1. **Antes del Paseo**
   - Login en la app
   - Mostrar QR al cliente para que se afilie (solo primera vez)

2. **Durante el Paseo**
   - Ir al Dashboard
   - Click en "Iniciar Paseo"
   - Permitir acceso a ubicación si lo pide el navegador
   - La ubicación se comparte automáticamente cada 5 minutos

3. **Después del Paseo**
   - Click en "Finalizar Paseo"
   - El tracking se detiene automáticamente

### Uso del Cliente

1. **Primera Vez**
   - Registrarse en la app
   - Ir a `/scan-qr`
   - Escanear QR del paseador
   - Afiliar

2. **Cuando hay Paseo Activo**
   - Login en la app
   - Ver ubicación actualizada del paseador
   - La ubicación se actualiza cada 5 minutos

## Optimizaciones del Sistema

- **NO usa Realtime**: Para ahorrar recursos
- **Actualización cada 5 minutos**: Balance entre precisión y consumo de batería
- **QR Permanente**: Los clientes solo necesitan escanear una vez
- **Tracking Inteligente**: Solo se activa durante paseos activos

## Seguridad

- Row Level Security (RLS) activado en todas las tablas
- Los clientes solo ven ubicación cuando el paseo está activo
- Los admins solo ven sus propios clientes
- Códigos QR únicos y seguros

## Solución de Problemas

### "No puedo ver clientes"
- Verifica que tienes rol `admin` en `user_roles`
- Verifica que los clientes se hayan afiliado correctamente

### "La ubicación no se actualiza"
- Verifica que el paseo esté activo (botón "Finalizar Paseo" visible)
- Verifica que el navegador tenga permisos de ubicación
- Espera hasta 5 minutos para la siguiente actualización

### "Error al escanear QR"
- Verifica que el código QR sea correcto
- Intenta ingresar el código manualmente
- Verifica que el admin haya generado su QR

## Rutas de la App

- `/auth` - Login y Registro
- `/dashboard` - Panel de Control Admin
- `/clients` - Lista de Clientes
- `/walks` - Historial de Paseos
- `/scan-qr` - Escanear QR para Afiliarse
- `/track/:walkId` - Ver Ubicación en Vivo (obsoleto en nueva versión)

## Notas Técnicas

- Build optimizado para producción
- Console logs removidos en producción
- Code splitting para mejor rendimiento
- Minificación con Terser
- Chunks separados por vendor para mejor caching
