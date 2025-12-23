// Database Manager para Supabase
class DatabaseManager {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
        this.isOnline = false;
        
        // 🔑 CONFIGURA AQUÍ TUS CREDENCIALES DE SUPABASE
        this.config = {
            url: 'https://uqpzulidjeciqpqpnkxx.supabase.co',  
            key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcHp1bGlkamVjaXFwcXBua3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjk1MzksImV4cCI6MjA3OTcwNTUzOX0.Uh4nMRDHBNcQ1D9LPHxXpFU8s_w4fEMPvBIgiGadMtk' 
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando la DB...');
            
            // Crear cliente de Supabase
            this.supabase = window.supabase.createClient(this.config.url, this.config.key);
            
            // Verificar conexión
            const { data, error } = await this.supabase
                .from('usuarios')
                .select('count')
                .limit(1);
            
            if (error) {
                throw new Error(`Error de conexión: ${error.message}`);
            }
            
            this.isInitialized = true;
            this.isOnline = true;
            console.log('✅ Conectado correctamente a la DB');
            
        } catch (error) {
            console.error('❌ Error conectando a la base de datos:', error);
            this.isInitialized = false;
            this.isOnline = false;
            throw error;
        }
    }

    // CREATE - Insertar nuevo usuario
    async createUser(userData) {
        try {
            if (!this.isInitialized) {
                throw new Error('Base de datos no inicializada');
            }

            // Validar datos requeridos
            if (!userData.nombre?.trim()) {
                throw new Error('El nombre es obligatorio');
            }
            if (!userData.email?.trim()) {
                throw new Error('El email es obligatorio');
            }
            if (!this.isValidEmail(userData.email)) {
                throw new Error('El formato del email no es válido');
            }

            const { data, error } = await this.supabase
                .from('usuarios')
                .insert([{
                    nombre: userData.nombre.trim(),
                    email: userData.email.trim().toLowerCase(),
                    telefono: userData.telefono?.trim() || null,
                    edad: userData.edad || null,
                    ciudad: userData.ciudad?.trim() || null,
                    profesion: userData.profesion || null,
                    fecha_creacion: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Violación de unique constraint
                    throw new Error('Ya existe un usuario con este email');
                }
                throw new Error(`Error de base de datos: ${error.message}`);
            }

            console.log('✅ Usuario creado:', data.id);
            return { 
                success: true, 
                data: data,
                message: 'Usuario creado correctamente'
            };

        } catch (error) {
            console.error('❌ Error creando usuario:', error.message);
            return { 
                success: false, 
                error: error.message
            };
        }
    }

    // READ - Obtener usuarios con filtros
    async readUsers(filters = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Base de datos no inicializada');
            }

            let query = this.supabase
                .from('usuarios')
                .select('*')
                .order('fecha_creacion', { ascending: false });

            // Aplicar filtros
            if (filters.search && filters.search.trim()) {
                const searchTerm = `%${filters.search.trim()}%`;
                query = query.or(`nombre.ilike.${searchTerm},email.ilike.${searchTerm},ciudad.ilike.${searchTerm}`);
            }

            if (filters.profesion && filters.profesion.trim()) {
                query = query.eq('profesion', filters.profesion.trim());
            }

            if (filters.ciudad && filters.ciudad.trim()) {
                query = query.eq('ciudad', filters.ciudad.trim());
            }

            const { data, error, count } = await query;

            if (error) {
                throw new Error(`Error de base de datos: ${error.message}`);
            }

            console.log(`✅ ${data?.length || 0} usuarios encontrados`);
            return { 
                success: true, 
                data: data || [],
                count: data?.length || 0
            };

        } catch (error) {
            console.error('❌ Error leyendo usuarios:', error.message);
            return { 
                success: false, 
                data: [],
                error: error.message
            };
        }
    }

    // READ - Obtener usuario por ID
    async getUserById(id) {
        try {
            if (!this.isInitialized) {
                throw new Error('Base de datos no inicializada');
            }

            const { data, error } = await this.supabase
                .from('usuarios')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                throw new Error(`Error obteniendo usuario: ${error.message}`);
            }

            return { success: true, data: data };

        } catch (error) {
            console.error(`❌ Error obteniendo usuario ${id}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // UPDATE - Actualizar usuario
    async updateUser(id, userData) {
        try {
            if (!this.isInitialized) {
                throw new Error('Base de datos no inicializada');
            }

            // Validar datos requeridos
            if (!userData.nombre?.trim()) {
                throw new Error('El nombre es obligatorio');
            }
            if (!userData.email?.trim()) {
                throw new Error('El email es obligatorio');
            }
            if (!this.isValidEmail(userData.email)) {
                throw new Error('El formato del email no es válido');
            }

            const { data, error } = await this.supabase
                .from('usuarios')
                .update({
                    nombre: userData.nombre.trim(),
                    email: userData.email.trim().toLowerCase(),
                    telefono: userData.telefono?.trim() || null,
                    edad: userData.edad || null,
                    ciudad: userData.ciudad?.trim() || null,
                    profesion: userData.profesion || null
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Ya existe un usuario con este email');
                }
                throw new Error(`Error de base de datos: ${error.message}`);
            }

            console.log(`✅ Usuario ${id} actualizado`);
            return { 
                success: true, 
                data: data,
                message: 'Usuario actualizado correctamente'
            };

        } catch (error) {
            console.error(`❌ Error actualizando usuario ${id}:`, error.message);
            return { 
                success: false, 
                error: error.message
            };
        }
    }

    // DELETE - Eliminar usuario
    async deleteUser(id) {
        try {
            if (!this.isInitialized) {
                throw new Error('Base de datos no inicializada');
            }

            const { error } = await this.supabase
                .from('usuarios')
                .delete()
                .eq('id', id);

            if (error) {
                throw new Error(`Error de base de datos: ${error.message}`);
            }

            console.log(`✅ Usuario ${id} eliminado`);
            return { 
                success: true, 
                message: 'Usuario eliminado correctamente'
            };

        } catch (error) {
            console.error(`❌ Error eliminando usuario ${id}:`, error.message);
            return { 
                success: false, 
                error: error.message
            };
        }
    }

    // Obtener estadísticas
    async getStats() {
        try {
            if (!this.isInitialized) {
                throw new Error('Base de datos no inicializada');
            }

            // Total de usuarios
            const { count: totalUsers, error: countError } = await this.supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true });

            if (countError) throw countError;

            // Profesiones únicas
            const { data: professions, error: profError } = await this.supabase
                .from('usuarios')
                .select('profesion')
                .not('profesion', 'is', null);

            if (profError) throw profError;

            // Ciudades únicas
            const { data: cities, error: cityError } = await this.supabase
                .from('usuarios')
                .select('ciudad')
                .not('ciudad', 'is', null);

            if (cityError) throw cityError;

            const uniqueProfessions = [...new Set(professions.map(p => p.profesion))].length;
            const uniqueCities = [...new Set(cities.map(c => c.ciudad))].length;

            return {
                totalUsers: totalUsers || 0,
                totalProfessions: uniqueProfessions,
                totalCities: uniqueCities
            };

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return {
                totalUsers: 0,
                totalProfessions: 0,
                totalCities: 0
            };
        }
    }

    // Suscribirse a cambios en tiempo real
    subscribeToChanges(callback) {
        if (!this.isInitialized) return;

        return this.supabase
            .channel('usuarios-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'usuarios' }, 
                callback
            )
            .subscribe();
    }

    // Métodos utilitarios
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Exportar datos
    async exportData() {
        try {
            const { data, error } = await this.supabase
                .from('usuarios')
                .select('*')
                .order('fecha_creacion', { ascending: false });

            if (error) throw error;

            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    recordCount: data.length,
                    source: 'Supabase'
                },
                users: data
            };

            return exportData;

        } catch (error) {
            console.error('Error exportando datos:', error);
            return null;
        }
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.DatabaseManager = DatabaseManager;
}