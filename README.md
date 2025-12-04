# 🚀 Sistema de Gestión de Usuarios con Supabase

Un sistema CRUD completo con base de datos en la nube usando **Supabase**.

## ✨ Características

- ✅ **Base de datos real en la nube** (Supabase/PostgreSQL)
- ✅ **Operaciones CRUD completas** (Crear, Leer, Actualizar, Eliminar)
- ✅ **Tiempo real** - Cambios instantáneos entre dispositivos
- ✅ **Búsqueda y filtros** avanzados
- ✅ **Interfaz moderna** y responsive
- ✅ **Validaciones** en tiempo real
- ✅ **Estadísticas** en tiempo real
- ✅ **Exportación** de datos
- ✅ **100% Gratis** para empezar

## 🛠️ Configuración Rápida

### 1. Crear cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Regístrate (es gratis)
3. Crea un nuevo proyecto

### 2. Configurar la Base de Datos

En el SQL Editor de Supabase, ejecuta:

```sql
-- Crear tabla de usuarios
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefono TEXT,
    edad INTEGER,
    ciudad TEXT,
    profesion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Opcional: Habilitar Row Level Security (recomendado para producción)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (solo para desarrollo)
CREATE POLICY "Allow all operations" ON usuarios FOR ALL USING (true);