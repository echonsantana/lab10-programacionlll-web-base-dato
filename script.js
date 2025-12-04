// Aplicación principal
class UserManagerApp {
    constructor() {
        this.dbManager = null;
        this.currentEditId = null;
        this.subscription = null;
        this.init();
    }

    async init() {
        try {
            // Mostrar estado de conexión
            this.updateConnectionStatus('🟡 Conectando a Supabase...');
            
            // Inicializar base de datos
            this.dbManager = new DatabaseManager();
            await this.dbManager.init();
            
            // Actualizar estado
            this.updateConnectionStatus('🟢 Conectado a la DB');
            this.showNotification('✅ Conectado a la base de datos', 'success');
            
            // Inicializar componentes
            this.initEventListeners();
            this.loadUsers();
            this.loadStats();
            this.setupRealtimeUpdates();
            
        } catch (error) {
            console.error('Error inicializando la aplicación:', error);
            this.updateConnectionStatus('🔴 Error de conexión');
            this.showNotification('❌ Error conectando a la base de datos', 'error');
        }
    }

    initEventListeners() {
        // Form submission
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Cancel edit
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Clear form
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearForm();
        });

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.loadUsers();
        });

        document.getElementById('resetSearch').addEventListener('click', () => {
            this.resetSearch();
        });

        // Enter key in search
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadUsers();
            }
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Modal actions
        document.getElementById('confirmYes').addEventListener('click', () => {
            this.executeDelete();
        });

        document.getElementById('confirmNo').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                this.hideModal();
            }
        });

        // Validación en tiempo real
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        const emailInput = document.getElementById('email');
        emailInput.addEventListener('blur', () => {
            this.validateEmail();
        });

        const nombreInput = document.getElementById('nombre');
        nombreInput.addEventListener('blur', () => {
            this.validateNombre();
        });
    }

    validateEmail() {
        const email = document.getElementById('email').value.trim();
        const errorElement = document.getElementById('emailError');
        
        if (!email) {
            this.showError('emailError', 'El email es obligatorio');
            return false;
        }
        
        if (!this.dbManager.isValidEmail(email)) {
            this.showError('emailError', 'El formato del email no es válido');
            return false;
        }
        
        this.hideError('emailError');
        return true;
    }

    validateNombre() {
        const nombre = document.getElementById('nombre').value.trim();
        const errorElement = document.getElementById('nombreError');
        
        if (!nombre) {
            this.showError('nombreError', 'El nombre es obligatorio');
            return false;
        }
        
        this.hideError('nombreError');
        return true;
    }

    showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId);
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        const input = document.getElementById(fieldId.replace('Error', ''));
        input.style.borderColor = 'var(--danger-color)';
    }

    hideError(fieldId) {
        const errorElement = document.getElementById(fieldId);
        errorElement.classList.remove('show');
        
        const input = document.getElementById(fieldId.replace('Error', ''));
        input.style.borderColor = 'var(--border-color)';
    }

    async handleFormSubmit() {
        const formData = this.getFormData();
        
        // Validar formulario
        if (!this.validateForm(formData)) {
            return;
        }

        // Mostrar loading
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ Procesando...';
        submitBtn.disabled = true;

        try {
            let result;
            if (this.currentEditId) {
                result = await this.dbManager.updateUser(this.currentEditId, formData);
            } else {
                result = await this.dbManager.createUser(formData);
            }

            if (result.success) {
                this.showNotification(
                    this.currentEditId ? '✅ Usuario actualizado' : '✅ Usuario creado', 
                    'success'
                );
                this.clearForm();
                this.loadUsers();
                this.loadStats();
            } else {
                this.showNotification(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification('❌ Error procesando la solicitud', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    getFormData() {
        return {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            telefono: document.getElementById('telefono').value,
            edad: document.getElementById('edad').value ? parseInt(document.getElementById('edad').value) : null,
            ciudad: document.getElementById('ciudad').value,
            profesion: document.getElementById('profesion').value
        };
    }

    validateForm(data) {
        let isValid = true;

        // Validar nombre
        if (!data.nombre.trim()) {
            this.showError('nombreError', 'El nombre es obligatorio');
            isValid = false;
        } else {
            this.hideError('nombreError');
        }

        // Validar email
        if (!data.email.trim()) {
            this.showError('emailError', 'El email es obligatorio');
            isValid = false;
        } else if (!this.dbManager.isValidEmail(data.email)) {
            this.showError('emailError', 'El formato del email no es válido');
            isValid = false;
        } else {
            this.hideError('emailError');
        }

        return isValid;
    }

    async loadUsers() {
        const filters = {
            search: document.getElementById('searchInput').value,
            profesion: document.getElementById('filterProfesion').value,
            ciudad: document.getElementById('filterCiudad').value
        };

        this.showTableLoading();

        try {
            const result = await this.dbManager.readUsers(filters);
            
            if (result.success) {
                this.renderUsersTable(result.data);
                this.updateCitiesFilter(result.data);
            } else {
                this.showTableError();
            }
        } catch (error) {
            this.showTableError();
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        const countElement = document.getElementById('tableCount');
        const emptyElement = document.getElementById('tableEmpty');

        if (users.length === 0) {
            tbody.innerHTML = '';
            emptyElement.style.display = 'block';
            countElement.textContent = '0 usuarios encontrados';
            return;
        }

        emptyElement.style.display = 'none';

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><strong>#${user.id}</strong></td>
                <td>
                    <div class="user-info">
                        <div class="user-name">${user.nombre}</div>
                        <div class="user-email">${user.email}</div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.telefono || '<span class="text-muted">No especificado</span>'}</td>
                <td>${user.edad || '<span class="text-muted">-</span>'}</td>
                <td>${user.ciudad || '<span class="text-muted">-</span>'}</td>
                <td>
                    <span class="badge profession-${user.profesion ? user.profesion.toLowerCase() : 'none'}">
                        ${user.profesion || 'No especificada'}
                    </span>
                </td>
                <td>${this.formatDate(user.fecha_creacion)}</td>
                <td class="actions-cell">
                    <button onclick="app.editUser(${user.id})" class="btn btn-primary btn-sm" title="Editar usuario">
                        ✏️ Editar
                    </button>
                    <button onclick="app.confirmDelete(${user.id})" class="btn btn-danger btn-sm" title="Eliminar usuario">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `).join('');

        countElement.textContent = `${users.length} usuario${users.length !== 1 ? 's' : ''} encontrado${users.length !== 1 ? 's' : ''}`;
    }

    showTableLoading() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading-cell">
                    <div class="loading-spinner"></div>
                    Cargando usuarios...
                </td>
            </tr>
        `;
    }

    showTableError() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading-cell">
                    <div style="color: var(--danger-color); font-size: 2rem; margin-bottom: 1rem;">❌</div>
                    Error cargando los usuarios
                </td>
            </tr>
        `;
    }

    updateCitiesFilter(users) {
        const cityFilter = document.getElementById('filterCiudad');
        const cities = [...new Set(users.map(user => user.ciudad).filter(city => city))];
        
        // Guardar selección actual
        const currentSelection = cityFilter.value;
        
        // Actualizar opciones
        cityFilter.innerHTML = '<option value="">Todas las ciudades</option>' +
            cities.map(city => `<option value="${city}">${city}</option>`).join('');
        
        // Restaurar selección si existe
        if (cities.includes(currentSelection)) {
            cityFilter.value = currentSelection;
        }
    }

    async editUser(id) {
        try {
            const result = await this.dbManager.getUserById(id);
            
            if (result.success) {
                const user = result.data;
                this.currentEditId = id;
                
                // Llenar formulario
                document.getElementById('userId').value = user.id;
                document.getElementById('nombre').value = user.nombre;
                document.getElementById('email').value = user.email;
                document.getElementById('telefono').value = user.telefono || '';
                document.getElementById('edad').value = user.edad || '';
                document.getElementById('ciudad').value = user.ciudad || '';
                document.getElementById('profesion').value = user.profesion || '';

                // Actualizar UI
                document.getElementById('formTitle').textContent = 'Editar Usuario';
                document.getElementById('submitBtn').innerHTML = '💾 Actualizar Usuario';
                document.getElementById('cancelBtn').style.display = 'inline-flex';

                this.showNotification(`✏️ Editando usuario: ${user.nombre}`, 'info');
                
                // Scroll to form
                document.querySelector('.form-section').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            } else {
                this.showNotification('❌ Usuario no encontrado', 'error');
            }
        } catch (error) {
            this.showNotification('❌ Error cargando usuario', 'error');
        }
    }

    cancelEdit() {
        this.currentEditId = null;
        this.clearForm();
        this.showNotification('⚠️ Edición cancelada', 'warning');
    }

    clearForm() {
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('formTitle').textContent = 'Agregar Nuevo Usuario';
        document.getElementById('submitBtn').innerHTML = '➕ Agregar Usuario';
        document.getElementById('cancelBtn').style.display = 'none';
        
        // Limpiar errores
        this.hideError('nombreError');
        this.hideError('emailError');
        
        this.currentEditId = null;
    }

    resetSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterProfesion').value = '';
        document.getElementById('filterCiudad').value = '';
        this.loadUsers();
    }

    confirmDelete(id) {
        this.userToDelete = id;
        const modal = document.getElementById('confirmModal');
        modal.style.display = 'block';
        
        // Obtener nombre del usuario para el mensaje
        this.getUserById(id).then(user => {
            if (user) {
                document.getElementById('confirmMessage').textContent = 
                    `¿Estás seguro de que quieres eliminar al usuario "${user.nombre}"? Esta acción no se puede deshacer.`;
            }
        });
    }

    async executeDelete() {
        if (!this.userToDelete) return;

        const deleteBtn = document.getElementById('confirmYes');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '⏳ Eliminando...';
        deleteBtn.disabled = true;

        try {
            const result = await this.dbManager.deleteUser(this.userToDelete);
            
            if (result.success) {
                this.showNotification('✅ Usuario eliminado correctamente', 'success');
                this.loadUsers();
                this.loadStats();
            } else {
                this.showNotification(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            this.showNotification('❌ Error eliminando usuario', 'error');
        } finally {
            this.hideModal();
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
            this.userToDelete = null;
        }
    }

    async getUserById(id) {
        try {
            const result = await this.dbManager.getUserById(id);
            return result.success ? result.data : null;
        } catch (error) {
            return null;
        }
    }

    hideModal() {
        document.getElementById('confirmModal').style.display = 'none';
    }

    async loadStats() {
        try {
            const stats = await this.dbManager.getStats();
            
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalProfessions').textContent = stats.totalProfessions;
            document.getElementById('totalCities').textContent = stats.totalCities;
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    setupRealtimeUpdates() {
        if (!this.dbManager.isInitialized) return;

        this.subscription = this.dbManager.subscribeToChanges((payload) => {
            console.log('🔄 Cambio en tiempo real:', payload);
            this.loadUsers();
            this.loadStats();
        });
    }

    async exportData() {
        try {
            const exportData = await this.dbManager.exportData();
            
            if (exportData) {
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `usuarios-export-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                URL.revokeObjectURL(url);
                this.showNotification('✅ Datos exportados correctamente', 'success');
            }
        } catch (error) {
            this.showNotification('❌ Error exportando datos', 'error');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateConnectionStatus(message) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Agregar icono según el tipo
        let icon = '💡';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';
        
        notification.innerHTML = `${icon} ${message}`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
}

// Inicializar la aplicación cuando se carga la página
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new UserManagerApp();
});

// Hacer disponible globalmente para los onclick
window.app = app;