/**
 * Sistema de Administración Completo - Perlas Ocultas
 * CMS para gestión dinámica de contenido
 */

(function() {
    'use strict';

    // Configuración del sistema
    const ADMIN_CONFIG = {
        DEFAULT_CREDENTIALS: {
            username: 'admin',
            password: 'perlas2025'
        },
        STORAGE_KEYS: {
            AUTH: 'perlas_auth',
            BIOGRAFIAS: 'perlas_biografias',
            CATEQUESIS: 'perlas_catequesis',
            VIDEOS: 'perlas_videos',
            EVENTOS: 'perlas_eventos',
            CONTENT_BLOCKS: 'perlas_content_blocks',
            SETTINGS: 'perlas_settings'
        },
        SESSION_DURATION: 24 * 60 * 60 * 1000 // 24 horas
    };

    // Utilidades para el sistema
    const AdminUtils = {
        // Generar ID único
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        // Formatear fecha
        formatDate(date) {
            return new Date(date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // Sanitizar HTML
        sanitizeHTML(str) {
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        },

        // Validar URL de video
        validateVideoUrl(url) {
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
            return youtubeRegex.test(url) || vimeoRegex.test(url);
        },

        // Extraer ID de video
        extractVideoId(url) {
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
            
            const youtubeMatch = url.match(youtubeRegex);
            if (youtubeMatch) {
                return { platform: 'youtube', id: youtubeMatch[1] };
            }
            
            const vimeoMatch = url.match(vimeoRegex);
            if (vimeoMatch) {
                return { platform: 'vimeo', id: vimeoMatch[1] };
            }
            
            return null;
        },

        // Validar URL de videoconferencia
        validateConferenceUrl(url) {
            const zoomRegex = /zoom\.us\/j\/\d+/;
            const meetRegex = /meet\.google\.com\/[a-z-]+/;
            const teamsRegex = /teams\.microsoft\.com\/l\/meetup-join/;
            const genericRegex = /^https?:\/\/.+/;
            
            return zoomRegex.test(url) || meetRegex.test(url) || teamsRegex.test(url) || genericRegex.test(url);
        },

        // Formatear fecha para eventos
        formatEventDate(date) {
            return new Date(date).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // Obtener estado del evento
        getEventStatus(startDate, endDate) {
            const now = new Date();
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (now < start) return 'upcoming';
            if (now >= start && now <= end) return 'live';
            return 'finished';
        },

        // Crear embed de video
        createVideoEmbed(url, width = '100%', height = '315') {
            const videoInfo = this.extractVideoId(url);
            if (!videoInfo) return null;
            
            if (videoInfo.platform === 'youtube') {
                return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoInfo.id}" frameborder="0" allowfullscreen></iframe>`;
            } else if (videoInfo.platform === 'vimeo') {
                return `<iframe width="${width}" height="${height}" src="https://player.vimeo.com/video/${videoInfo.id}" frameborder="0" allowfullscreen></iframe>`;
            }
            
            return null;
        },

        // Procesar imagen para optimización
        processImage(file, maxWidth = 1200, quality = 0.8) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = function() {
                    const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(resolve, 'image/jpeg', quality);
                };
                
                img.src = URL.createObjectURL(file);
            });
        }
    };

    // Sistema de almacenamiento
    const Storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Error guardando en localStorage:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Error leyendo de localStorage:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Error eliminando de localStorage:', error);
                return false;
            }
        }
    };

    // Sistema de autenticación
    const AuthManager = {
        isAuthenticated() {
            const auth = Storage.get(ADMIN_CONFIG.STORAGE_KEYS.AUTH);
            if (!auth) return false;
            
            const now = Date.now();
            if (now > auth.expires) {
                this.logout();
                return false;
            }
            
            return true;
        },

        login(username, password) {
            if (username === ADMIN_CONFIG.DEFAULT_CREDENTIALS.username && 
                password === ADMIN_CONFIG.DEFAULT_CREDENTIALS.password) {
                
                const authData = {
                    username: username,
                    loginTime: Date.now(),
                    expires: Date.now() + ADMIN_CONFIG.SESSION_DURATION
                };
                
                Storage.set(ADMIN_CONFIG.STORAGE_KEYS.AUTH, authData);
                return true;
            }
            return false;
        },

        logout() {
            Storage.remove(ADMIN_CONFIG.STORAGE_KEYS.AUTH);
            this.showLoginScreen();
        },

        showLoginScreen() {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('adminDashboard').style.display = 'none';
        },

        showDashboard() {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'block';
        }
    };

    // Gestor de biografías
    const BiografiasManager = {
        getAll() {
            return Storage.get(ADMIN_CONFIG.STORAGE_KEYS.BIOGRAFIAS, []);
        },

        save(biografias) {
            Storage.set(ADMIN_CONFIG.STORAGE_KEYS.BIOGRAFIAS, biografias);
            this.updatePublicView();
        },

        add(biografia) {
            const biografias = this.getAll();
            biografia.id = AdminUtils.generateId();
            biografia.createdAt = Date.now();
            biografia.updatedAt = Date.now();
            biografias.push(biografia);
            this.save(biografias);
            return biografia;
        },

        update(id, updatedBiografia) {
            const biografias = this.getAll();
            const index = biografias.findIndex(b => b.id === id);
            if (index !== -1) {
                biografias[index] = { ...biografias[index], ...updatedBiografia, updatedAt: Date.now() };
                this.save(biografias);
                return biografias[index];
            }
            return null;
        },

        delete(id) {
            const biografias = this.getAll();
            const filtered = biografias.filter(b => b.id !== id);
            this.save(filtered);
        },

        getPublished() {
            return this.getAll().filter(b => b.status === 'published');
        },

        updatePublicView() {
            const biografias = this.getPublished();
            const container = document.querySelector('.biografias-grid');
            if (!container) return;

            container.innerHTML = '';
            
            biografias.forEach(biografia => {
                const card = document.createElement('article');
                card.className = 'biografia-card';
                card.setAttribute('role', 'listitem');
                
                card.innerHTML = `
                    <div class="biografia-img" 
                         data-bg="${biografia.image || 'https://images.unsplash.com/photo-1593642532400-2682810df593?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80'}"
                         role="img"
                         aria-label="Imagen de ${biografia.title}"></div>
                    <div class="biografia-content">
                        <h3>${AdminUtils.sanitizeHTML(biografia.title)}</h3>
                        <p>${AdminUtils.sanitizeHTML(biografia.description)}</p>
                        <a href="${biografia.link || '#'}" class="btn" aria-label="Leer biografía completa de ${biografia.title}">Leer más</a>
                    </div>
                `;
                
                container.appendChild(card);
            });

            // Reactivar lazy loading para nuevas imágenes
            if (window.PerlasOcultas && window.PerlasOcultas.LazyLoadManager) {
                window.PerlasOcultas.LazyLoadManager.loadImages();
            }
        },

        renderTable() {
            const biografias = this.getAll();
            const tbody = document.querySelector('#manage-biographies tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            biografias.forEach(biografia => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${biografia.id.substr(0, 8)}...</td>
                    <td>${AdminUtils.sanitizeHTML(biografia.title)}</td>
                    <td><span class="status-badge status-${biografia.status}">${biografia.status}</span></td>
                    <td>${AdminUtils.formatDate(biografia.createdAt)}</td>
                    <td class="table-actions">
                        <button class="btn btn-edit" onclick="BiografiasManager.edit('${biografia.id}')">Editar</button>
                        <button class="btn btn-delete" onclick="BiografiasManager.confirmDelete('${biografia.id}')">Eliminar</button>
                        <button class="btn btn-toggle" onclick="BiografiasManager.toggleStatus('${biografia.id}')">${biografia.status === 'published' ? 'Despublicar' : 'Publicar'}</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        },

        toggleStatus(id) {
            const biografias = this.getAll();
            const biografia = biografias.find(b => b.id === id);
            if (biografia) {
                biografia.status = biografia.status === 'published' ? 'draft' : 'published';
                this.save(biografias);
                this.renderTable();
                NotificationManager.show('Estado actualizado correctamente', 'success');
            }
        },

        edit(id) {
            const biografia = this.getAll().find(b => b.id === id);
            if (biografia) {
                this.showForm(biografia);
            }
        },

        confirmDelete(id) {
            if (confirm('¿Estás seguro de que quieres eliminar esta biografía?')) {
                this.delete(id);
                this.renderTable();
                NotificationManager.show('Biografía eliminada correctamente', 'success');
            }
        },

        showForm(biografia = null) {
            const isEdit = !!biografia;
            const modal = this.createFormModal(biografia);
            document.body.appendChild(modal);
            
            // Focus en el primer campo
            setTimeout(() => {
                modal.querySelector('input').focus();
            }, 100);
        },

        createFormModal(biografia) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${biografia ? 'Editar' : 'Nueva'} Biografía</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <form class="biografia-form">
                        <div class="form-group">
                            <label for="bio-title">Título *</label>
                            <input type="text" id="bio-title" name="title" value="${biografia?.title || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="bio-description">Descripción *</label>
                            <textarea id="bio-description" name="description" rows="3" required>${biografia?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="bio-content">Contenido completo</label>
                            <textarea id="bio-content" name="content" rows="8">${biografia?.content || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="bio-image">URL de imagen</label>
                            <input type="url" id="bio-image" name="image" value="${biografia?.image || ''}" placeholder="https://ejemplo.com/imagen.jpg">
                        </div>
                        <div class="form-group">
                            <label for="bio-link">Enlace externo</label>
                            <input type="url" id="bio-link" name="link" value="${biografia?.link || ''}" placeholder="https://ejemplo.com/biografia-completa">
                        </div>
                        <div class="form-group">
                            <label for="bio-status">Estado</label>
                            <select id="bio-status" name="status">
                                <option value="draft" ${biografia?.status === 'draft' ? 'selected' : ''}>Borrador</option>
                                <option value="published" ${biografia?.status === 'published' ? 'selected' : ''}>Publicado</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${biografia ? 'Actualizar' : 'Crear'}</button>
                        </div>
                    </form>
                </div>
            `;

            // Manejar envío del formulario
            const form = modal.querySelector('.biografia-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                if (biografia) {
                    this.update(biografia.id, data);
                    NotificationManager.show('Biografía actualizada correctamente', 'success');
                } else {
                    this.add(data);
                    NotificationManager.show('Biografía creada correctamente', 'success');
                }
                
                this.renderTable();
                modal.remove();
            });

            return modal;
        }
    };

    // Gestor de catequesis
    const CatequesisManager = {
        getAll() {
            return Storage.get(ADMIN_CONFIG.STORAGE_KEYS.CATEQUESIS, []);
        },

        save(catequesis) {
            Storage.set(ADMIN_CONFIG.STORAGE_KEYS.CATEQUESIS, catequesis);
            this.updatePublicView();
        },

        add(recurso) {
            const catequesis = this.getAll();
            recurso.id = AdminUtils.generateId();
            recurso.createdAt = Date.now();
            recurso.updatedAt = Date.now();
            catequesis.push(recurso);
            this.save(catequesis);
            return recurso;
        },

        update(id, updatedRecurso) {
            const catequesis = this.getAll();
            const index = catequesis.findIndex(c => c.id === id);
            if (index !== -1) {
                catequesis[index] = { ...catequesis[index], ...updatedRecurso, updatedAt: Date.now() };
                this.save(catequesis);
                return catequesis[index];
            }
            return null;
        },

        delete(id) {
            const catequesis = this.getAll();
            const filtered = catequesis.filter(c => c.id !== id);
            this.save(filtered);
        },

        getPublished() {
            return this.getAll().filter(c => c.status === 'published');
        },

        updatePublicView() {
            const catequesis = this.getPublished();
            const section = document.querySelector('#catequesis');
            if (!section || catequesis.length === 0) return;

            // Actualizar contenido principal de catequesis
            const mainResource = catequesis[0]; // Tomar el primer recurso publicado
            const textContainer = section.querySelector('.catequesis-text');
            if (textContainer && mainResource) {
                textContainer.innerHTML = `
                    <h3>${AdminUtils.sanitizeHTML(mainResource.title)}</h3>
                    <p>${AdminUtils.sanitizeHTML(mainResource.description)}</p>
                    <a href="${mainResource.link || '/catequesis'}" class="btn" aria-label="Acceder a recursos de catequesis">Acceder a Recursos</a>
                `;
            }
        },

        renderTable() {
            const catequesis = this.getAll();
            const tbody = document.querySelector('#manage-catechesis tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            catequesis.forEach(recurso => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${recurso.id.substr(0, 8)}...</td>
                    <td>${AdminUtils.sanitizeHTML(recurso.title)}</td>
                    <td><span class="type-badge type-${recurso.type}">${recurso.type}</span></td>
                    <td><span class="status-badge status-${recurso.status}">${recurso.status}</span></td>
                    <td>${AdminUtils.formatDate(recurso.createdAt)}</td>
                    <td class="table-actions">
                        <button class="btn btn-edit" onclick="CatequesisManager.edit('${recurso.id}')">Editar</button>
                        <button class="btn btn-delete" onclick="CatequesisManager.confirmDelete('${recurso.id}')">Eliminar</button>
                        <button class="btn btn-toggle" onclick="CatequesisManager.toggleStatus('${recurso.id}')">${recurso.status === 'published' ? 'Despublicar' : 'Publicar'}</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        },

        toggleStatus(id) {
            const catequesis = this.getAll();
            const recurso = catequesis.find(c => c.id === id);
            if (recurso) {
                recurso.status = recurso.status === 'published' ? 'draft' : 'published';
                this.save(catequesis);
                this.renderTable();
                NotificationManager.show('Estado actualizado correctamente', 'success');
            }
        },

        edit(id) {
            const recurso = this.getAll().find(c => c.id === id);
            if (recurso) {
                this.showForm(recurso);
            }
        },

        confirmDelete(id) {
            if (confirm('¿Estás seguro de que quieres eliminar este recurso?')) {
                this.delete(id);
                this.renderTable();
                NotificationManager.show('Recurso eliminado correctamente', 'success');
            }
        },

        showForm(recurso = null) {
            const modal = this.createFormModal(recurso);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.querySelector('input').focus();
            }, 100);
        },

        createFormModal(recurso) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${recurso ? 'Editar' : 'Nuevo'} Recurso de Catequesis</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <form class="catequesis-form">
                        <div class="form-group">
                            <label for="cat-title">Título *</label>
                            <input type="text" id="cat-title" name="title" value="${recurso?.title || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="cat-description">Descripción *</label>
                            <textarea id="cat-description" name="description" rows="3" required>${recurso?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="cat-content">Contenido completo</label>
                            <textarea id="cat-content" name="content" rows="8">${recurso?.content || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="cat-type">Tipo de recurso</label>
                            <select id="cat-type" name="type">
                                <option value="article" ${recurso?.type === 'article' ? 'selected' : ''}>Artículo</option>
                                <option value="pdf" ${recurso?.type === 'pdf' ? 'selected' : ''}>PDF</option>
                                <option value="guide" ${recurso?.type === 'guide' ? 'selected' : ''}>Guía</option>
                                <option value="course" ${recurso?.type === 'course' ? 'selected' : ''}>Curso</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="cat-link">Enlace del recurso</label>
                            <input type="url" id="cat-link" name="link" value="${recurso?.link || ''}" placeholder="https://ejemplo.com/recurso">
                        </div>
                        <div class="form-group">
                            <label for="cat-status">Estado</label>
                            <select id="cat-status" name="status">
                                <option value="draft" ${recurso?.status === 'draft' ? 'selected' : ''}>Borrador</option>
                                <option value="published" ${recurso?.status === 'published' ? 'selected' : ''}>Publicado</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${recurso ? 'Actualizar' : 'Crear'}</button>
                        </div>
                    </form>
                </div>
            `;

            const form = modal.querySelector('.catequesis-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                if (recurso) {
                    this.update(recurso.id, data);
                    NotificationManager.show('Recurso actualizado correctamente', 'success');
                } else {
                    this.add(data);
                    NotificationManager.show('Recurso creado correctamente', 'success');
                }
                
                this.renderTable();
                modal.remove();
            });

            return modal;
        }
    };

    // Gestor de videos
    const VideosManager = {
        getAll() {
            return Storage.get(ADMIN_CONFIG.STORAGE_KEYS.VIDEOS, []);
        },

        save(videos) {
            Storage.set(ADMIN_CONFIG.STORAGE_KEYS.VIDEOS, videos);
            this.updatePublicView();
        },

        add(video) {
            const videos = this.getAll();
            video.id = AdminUtils.generateId();
            video.createdAt = Date.now();
            video.updatedAt = Date.now();
            
            // Extraer información del video
            const videoInfo = AdminUtils.extractVideoId(video.url);
            if (videoInfo) {
                video.platform = videoInfo.platform;
                video.videoId = videoInfo.id;
            }
            
            videos.push(video);
            this.save(videos);
            return video;
        },

        update(id, updatedVideo) {
            const videos = this.getAll();
            const index = videos.findIndex(v => v.id === id);
            if (index !== -1) {
                // Actualizar información del video si cambió la URL
                if (updatedVideo.url) {
                    const videoInfo = AdminUtils.extractVideoId(updatedVideo.url);
                    if (videoInfo) {
                        updatedVideo.platform = videoInfo.platform;
                        updatedVideo.videoId = videoInfo.id;
                    }
                }
                
                videos[index] = { ...videos[index], ...updatedVideo, updatedAt: Date.now() };
                this.save(videos);
                return videos[index];
            }
            return null;
        },

        delete(id) {
            const videos = this.getAll();
            const filtered = videos.filter(v => v.id !== id);
            this.save(filtered);
        },

        getPublished() {
            return this.getAll().filter(v => v.status === 'published');
        },

        updatePublicView() {
            const videos = this.getPublished();
            const container = document.querySelector('.videos-grid');
            if (!container) return;

            container.innerHTML = '';
            
            videos.forEach(video => {
                const card = document.createElement('article');
                card.className = 'video-card';
                card.setAttribute('role', 'listitem');
                
                let thumbnailUrl = '';
                if (video.platform === 'youtube') {
                    thumbnailUrl = `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
                } else if (video.platform === 'vimeo') {
                    thumbnailUrl = video.thumbnail || '';
                }
                
                card.innerHTML = `
                    <div class="video-placeholder" 
                         style="${thumbnailUrl ? `background-image: url(${thumbnailUrl}); background-size: cover; background-position: center;` : ''}"
                         role="img"
                         aria-label="Miniatura de ${video.title}"
                         onclick="VideosManager.playVideo('${video.url}')">
                        <i class="fas fa-play-circle" aria-hidden="true"></i>
                    </div>
                    <div class="video-content">
                        <h3>${AdminUtils.sanitizeHTML(video.title)}</h3>
                        <p>${AdminUtils.sanitizeHTML(video.description)}</p>
                    </div>
                `;
                
                container.appendChild(card);
            });
        },

        playVideo(url) {
            // Abrir video en nueva ventana/pestaña
            window.open(url, '_blank');
        },

        renderTable() {
            const videos = this.getAll();
            const tbody = document.querySelector('#manage-videos tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            videos.forEach(video => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${video.id.substr(0, 8)}...</td>
                    <td>${AdminUtils.sanitizeHTML(video.title)}</td>
                    <td><span class="platform-badge platform-${video.platform}">${video.platform || 'Otro'}</span></td>
                    <td><span class="status-badge status-${video.status}">${video.status}</span></td>
                    <td>${AdminUtils.formatDate(video.createdAt)}</td>
                    <td class="table-actions">
                        <button class="btn btn-edit" onclick="VideosManager.edit('${video.id}')">Editar</button>
                        <button class="btn btn-delete" onclick="VideosManager.confirmDelete('${video.id}')">Eliminar</button>
                        <button class="btn btn-toggle" onclick="VideosManager.toggleStatus('${video.id}')">${video.status === 'published' ? 'Despublicar' : 'Publicar'}</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        },

        toggleStatus(id) {
            const videos = this.getAll();
            const video = videos.find(v => v.id === id);
            if (video) {
                video.status = video.status === 'published' ? 'draft' : 'published';
                this.save(videos);
                this.renderTable();
                NotificationManager.show('Estado actualizado correctamente', 'success');
            }
        },

        edit(id) {
            const video = this.getAll().find(v => v.id === id);
            if (video) {
                this.showForm(video);
            }
        },

        confirmDelete(id) {
            if (confirm('¿Estás seguro de que quieres eliminar este video?')) {
                this.delete(id);
                this.renderTable();
                NotificationManager.show('Video eliminado correctamente', 'success');
            }
        },

        showForm(video = null) {
            const modal = this.createFormModal(video);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.querySelector('input').focus();
            }, 100);
        },

        createFormModal(video) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${video ? 'Editar' : 'Nuevo'} Video</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <form class="video-form">
                        <div class="form-group">
                            <label for="vid-title">Título *</label>
                            <input type="text" id="vid-title" name="title" value="${video?.title || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="vid-description">Descripción *</label>
                            <textarea id="vid-description" name="description" rows="3" required>${video?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="vid-url">URL del video (YouTube/Vimeo) *</label>
                            <input type="url" id="vid-url" name="url" value="${video?.url || ''}" required placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/...">
                            <small>Soporta enlaces de YouTube y Vimeo</small>
                        </div>
                        <div class="form-group">
                            <label for="vid-thumbnail">URL de miniatura personalizada</label>
                            <input type="url" id="vid-thumbnail" name="thumbnail" value="${video?.thumbnail || ''}" placeholder="https://ejemplo.com/miniatura.jpg">
                            <small>Opcional: se usará la miniatura automática si no se especifica</small>
                        </div>
                        <div class="form-group">
                            <label for="vid-status">Estado</label>
                            <select id="vid-status" name="status">
                                <option value="draft" ${video?.status === 'draft' ? 'selected' : ''}>Borrador</option>
                                <option value="published" ${video?.status === 'published' ? 'selected' : ''}>Publicado</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${video ? 'Actualizar' : 'Crear'}</button>
                        </div>
                    </form>
                </div>
            `;

            const form = modal.querySelector('.video-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                // Validar URL del video
                if (!AdminUtils.validateVideoUrl(data.url)) {
                    NotificationManager.show('URL de video no válida. Usa enlaces de YouTube o Vimeo.', 'error');
                    return;
                }
                
                if (video) {
                    this.update(video.id, data);
                    NotificationManager.show('Video actualizado correctamente', 'success');
                } else {
                    this.add(data);
                    NotificationManager.show('Video creado correctamente', 'success');
                }
                
                this.renderTable();
                modal.remove();
            });

            return modal;
        }
    };

    // Gestor de eventos online
    const EventosManager = {
        getAll() {
            return Storage.get(ADMIN_CONFIG.STORAGE_KEYS.EVENTOS, []);
        },

        save(eventos) {
            Storage.set(ADMIN_CONFIG.STORAGE_KEYS.EVENTOS, eventos);
            this.updatePublicView();
        },

        add(evento) {
            const eventos = this.getAll();
            evento.id = AdminUtils.generateId();
            evento.createdAt = Date.now();
            evento.updatedAt = Date.now();
            eventos.push(evento);
            this.save(eventos);
            return evento;
        },

        update(id, updatedEvento) {
            const eventos = this.getAll();
            const index = eventos.findIndex(e => e.id === id);
            if (index !== -1) {
                eventos[index] = { ...eventos[index], ...updatedEvento, updatedAt: Date.now() };
                this.save(eventos);
                return eventos[index];
            }
            return null;
        },

        delete(id) {
            const eventos = this.getAll();
            const filtered = eventos.filter(e => e.id !== id);
            this.save(filtered);
        },

        getPublished() {
            return this.getAll().filter(e => e.status === 'published');
        },

        getUpcoming() {
            const now = new Date();
            return this.getPublished().filter(e => new Date(e.startDate) > now);
        },

        getLive() {
            const now = new Date();
            return this.getPublished().filter(e => {
                const start = new Date(e.startDate);
                const end = new Date(e.endDate);
                return now >= start && now <= end;
            });
        },

        updatePublicView() {
            const eventos = this.getPublished();
            this.updateEventosSection(eventos);
            this.updateEventosNavigation(eventos);
        },

        updateEventosSection(eventos) {
            // Crear o actualizar la sección de eventos en la página principal
            let eventosSection = document.getElementById('eventos');
            
            if (eventos.length === 0) {
                if (eventosSection) {
                    eventosSection.style.display = 'none';
                }
                return;
            }

            if (!eventosSection) {
                // Crear la sección de eventos si no existe
                eventosSection = document.createElement('section');
                eventosSection.id = 'eventos';
                eventosSection.className = 'eventos-section';
                
                // Insertar después de la sección de videos
                const videosSection = document.getElementById('videos');
                if (videosSection) {
                    videosSection.parentNode.insertBefore(eventosSection, videosSection.nextSibling);
                } else {
                    // Si no hay sección de videos, insertar antes del contacto
                    const contactSection = document.getElementById('contacto');
                    if (contactSection) {
                        contactSection.parentNode.insertBefore(eventosSection, contactSection);
                    }
                }
            }

            eventosSection.style.display = 'block';
            
            // Separar eventos por estado
            const liveEvents = this.getLive();
            const upcomingEvents = this.getUpcoming();
            
            let eventosHTML = `
                <div class="container">
                    <h2>Eventos Online</h2>
                    <p class="section-description">Únete a nuestros eventos virtuales y conferencias en línea</p>
            `;

            // Eventos en vivo (prioritarios)
            if (liveEvents.length > 0) {
                eventosHTML += `
                    <div class="live-events">
                        <h3 class="live-title">🔴 En Vivo Ahora</h3>
                        <div class="eventos-grid live-grid">
                `;
                
                liveEvents.forEach(evento => {
                    eventosHTML += this.createEventCard(evento, 'live');
                });
                
                eventosHTML += `
                        </div>
                    </div>
                `;
            }

            // Próximos eventos
            if (upcomingEvents.length > 0) {
                eventosHTML += `
                    <div class="upcoming-events">
                        <h3>Próximos Eventos</h3>
                        <div class="eventos-grid">
                `;
                
                upcomingEvents.slice(0, 6).forEach(evento => {
                    eventosHTML += this.createEventCard(evento, 'upcoming');
                });
                
                eventosHTML += `
                        </div>
                    </div>
                `;
            }

            eventosHTML += `
                </div>
            `;

            eventosSection.innerHTML = eventosHTML;
        },

        createEventCard(evento, status) {
            const statusClass = status === 'live' ? 'event-live' : 'event-upcoming';
            const buttonText = status === 'live' ? 'Unirse Ahora' : 'Más Información';
            const buttonClass = status === 'live' ? 'btn-live' : 'btn-info';
            
            return `
                <article class="evento-card ${statusClass}" role="listitem">
                    ${evento.image ? `
                        <div class="evento-img" 
                             style="background-image: url(${evento.image}); background-size: cover; background-position: center;"
                             role="img"
                             aria-label="Imagen de ${evento.title}"></div>
                    ` : `
                        <div class="evento-img evento-placeholder" role="img" aria-label="Evento ${evento.title}">
                            <i class="fas fa-video"></i>
                        </div>
                    `}
                    <div class="evento-content">
                        <div class="evento-meta">
                            <span class="evento-date">
                                <i class="fas fa-calendar"></i>
                                ${AdminUtils.formatEventDate(evento.startDate)}
                            </span>
                            ${status === 'live' ? '<span class="live-indicator">🔴 EN VIVO</span>' : ''}
                        </div>
                        <h3>${AdminUtils.sanitizeHTML(evento.title)}</h3>
                        <p>${AdminUtils.sanitizeHTML(evento.description)}</p>
                        <div class="evento-actions">
                            <button class="btn ${buttonClass}" onclick="EventosManager.joinEvent('${evento.id}')">${buttonText}</button>
                        </div>
                    </div>
                </article>
            `;
        },

        updateEventosNavigation(eventos) {
            // Actualizar el menú de navegación para mostrar/ocultar la sección de eventos
            const nav = document.querySelector('nav ul');
            let eventosLink = document.querySelector('nav a[href="#eventos"]');
            
            if (eventos.length === 0) {
                if (eventosLink) {
                    eventosLink.parentElement.style.display = 'none';
                }
                return;
            }

            if (!eventosLink) {
                // Crear el enlace de eventos si no existe
                const li = document.createElement('li');
                li.innerHTML = '<a href="#eventos">Eventos</a>';
                
                // Insertar antes del enlace de contacto
                const contactLink = document.querySelector('nav a[href="#contacto"]');
                if (contactLink) {
                    nav.insertBefore(li, contactLink.parentElement);
                } else {
                    nav.appendChild(li);
                }
            } else {
                eventosLink.parentElement.style.display = 'block';
            }
        },

        joinEvent(id) {
            const evento = this.getAll().find(e => e.id === id);
            if (evento && evento.conferenceUrl) {
                // Verificar si el evento está en vivo
                const status = AdminUtils.getEventStatus(evento.startDate, evento.endDate);
                
                if (status === 'live') {
                    window.open(evento.conferenceUrl, '_blank');
                } else if (status === 'upcoming') {
                    this.showEventDetails(evento);
                } else {
                    NotificationManager.show('Este evento ya ha finalizado', 'info');
                }
            }
        },

        showEventDetails(evento) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${AdminUtils.sanitizeHTML(evento.title)}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div style="padding: 2rem;">
                        ${evento.image ? `<img src="${evento.image}" alt="${evento.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` : ''}
                        <div class="event-details">
                            <p><strong>📅 Fecha:</strong> ${AdminUtils.formatEventDate(evento.startDate)}</p>
                            <p><strong>⏱️ Duración:</strong> ${this.calculateDuration(evento.startDate, evento.endDate)}</p>
                            ${evento.speaker ? `<p><strong>👤 Ponente:</strong> ${AdminUtils.sanitizeHTML(evento.speaker)}</p>` : ''}
                            <div style="margin: 1.5rem 0;">
                                <h4>Descripción:</h4>
                                <p>${AdminUtils.sanitizeHTML(evento.description)}</p>
                            </div>
                            ${evento.content ? `
                                <div style="margin: 1.5rem 0;">
                                    <h4>Detalles:</h4>
                                    <div>${evento.content}</div>
                                </div>
                            ` : ''}
                        </div>
                        <div style="text-align: center; margin-top: 2rem;">
                            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        },

        calculateDuration(startDate, endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffMs = end - start;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (diffHours > 0) {
                return `${diffHours}h ${diffMinutes}min`;
            } else {
                return `${diffMinutes} minutos`;
            }
        },

        renderTable() {
            const eventos = this.getAll();
            const tbody = document.querySelector('#manage-events tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            eventos.forEach(evento => {
                const status = AdminUtils.getEventStatus(evento.startDate, evento.endDate);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${evento.id.substr(0, 8)}...</td>
                    <td>${AdminUtils.sanitizeHTML(evento.title)}</td>
                    <td>${AdminUtils.formatEventDate(evento.startDate)}</td>
                    <td><span class="status-badge status-${status}">${status}</span></td>
                    <td><span class="status-badge status-${evento.status}">${evento.status}</span></td>
                    <td class="table-actions">
                        <button class="btn btn-edit" onclick="EventosManager.edit('${evento.id}')">Editar</button>
                        <button class="btn btn-delete" onclick="EventosManager.confirmDelete('${evento.id}')">Eliminar</button>
                        <button class="btn btn-toggle" onclick="EventosManager.toggleStatus('${evento.id}')">${evento.status === 'published' ? 'Despublicar' : 'Publicar'}</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        },

        toggleStatus(id) {
            const eventos = this.getAll();
            const evento = eventos.find(e => e.id === id);
            if (evento) {
                evento.status = evento.status === 'published' ? 'draft' : 'published';
                this.save(eventos);
                this.renderTable();
                NotificationManager.show('Estado actualizado correctamente', 'success');
            }
        },

        edit(id) {
            const evento = this.getAll().find(e => e.id === id);
            if (evento) {
                this.showForm(evento);
            }
        },

        confirmDelete(id) {
            if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
                this.delete(id);
                this.renderTable();
                NotificationManager.show('Evento eliminado correctamente', 'success');
            }
        },

        showForm(evento = null) {
            const modal = this.createFormModal(evento);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.querySelector('input').focus();
            }, 100);
        },

        createFormModal(evento) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            // Formatear fechas para inputs datetime-local
            const startDate = evento?.startDate ? new Date(evento.startDate).toISOString().slice(0, 16) : '';
            const endDate = evento?.endDate ? new Date(evento.endDate).toISOString().slice(0, 16) : '';
            
            modal.innerHTML = `
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3>${evento ? 'Editar' : 'Nuevo'} Evento Online</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <form class="evento-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="evt-title">Título del evento *</label>
                                <input type="text" id="evt-title" name="title" value="${evento?.title || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="evt-speaker">Ponente/Organizador</label>
                                <input type="text" id="evt-speaker" name="speaker" value="${evento?.speaker || ''}" placeholder="Nombre del ponente">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="evt-description">Descripción breve *</label>
                            <textarea id="evt-description" name="description" rows="3" required>${evento?.description || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="evt-content">Contenido detallado</label>
                            <textarea id="evt-content" name="content" rows="6" placeholder="Descripción completa del evento, agenda, requisitos, etc.">${evento?.content || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="evt-start">Fecha y hora de inicio *</label>
                                <input type="datetime-local" id="evt-start" name="startDate" value="${startDate}" required>
                            </div>
                            <div class="form-group">
                                <label for="evt-end">Fecha y hora de fin *</label>
                                <input type="datetime-local" id="evt-end" name="endDate" value="${endDate}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="evt-conference">URL de videoconferencia *</label>
                            <input type="url" id="evt-conference" name="conferenceUrl" value="${evento?.conferenceUrl || ''}" required placeholder="https://zoom.us/j/123456789 o https://meet.google.com/abc-defg-hij">
                            <small>Enlace de Zoom, Google Meet, Microsoft Teams, etc.</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="evt-image">URL de imagen del evento</label>
                            <input type="url" id="evt-image" name="image" value="${evento?.image || ''}" placeholder="https://ejemplo.com/imagen-evento.jpg">
                            <small>Imagen promocional del evento (opcional)</small>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="evt-category">Categoría</label>
                                <select id="evt-category" name="category">
                                    <option value="conferencia" ${evento?.category === 'conferencia' ? 'selected' : ''}>Conferencia</option>
                                    <option value="catequesis" ${evento?.category === 'catequesis' ? 'selected' : ''}>Catequesis</option>
                                    <option value="oracion" ${evento?.category === 'oracion' ? 'selected' : ''}>Oración</option>
                                    <option value="formacion" ${evento?.category === 'formacion' ? 'selected' : ''}>Formación</option>
                                    <option value="retiro" ${evento?.category === 'retiro' ? 'selected' : ''}>Retiro</option>
                                    <option value="otro" ${evento?.category === 'otro' ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="evt-status">Estado</label>
                                <select id="evt-status" name="status">
                                    <option value="draft" ${evento?.status === 'draft' ? 'selected' : ''}>Borrador</option>
                                    <option value="published" ${evento?.status === 'published' ? 'selected' : ''}>Publicado</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${evento ? 'Actualizar' : 'Crear'} Evento</button>
                        </div>
                    </form>
                </div>
            `;

            const form = modal.querySelector('.evento-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                // Validar fechas
                if (new Date(data.startDate) >= new Date(data.endDate)) {
                    NotificationManager.show('La fecha de fin debe ser posterior a la fecha de inicio', 'error');
                    return;
                }
                
                // Validar URL de conferencia
                if (!AdminUtils.validateConferenceUrl(data.conferenceUrl)) {
                    NotificationManager.show('URL de videoconferencia no válida', 'error');
                    return;
                }
                
                if (evento) {
                    this.update(evento.id, data);
                    NotificationManager.show('Evento actualizado correctamente', 'success');
                } else {
                    this.add(data);
                    NotificationManager.show('Evento creado correctamente', 'success');
                }
                
                this.renderTable();
                modal.remove();
            });

            return modal;
        }
    };

    // Gestor de bloques de contenido multimedia
    const ContentBlocksManager = {
        getAll() {
            return Storage.get(ADMIN_CONFIG.STORAGE_KEYS.CONTENT_BLOCKS, {});
        },

        save(blocks) {
            Storage.set(ADMIN_CONFIG.STORAGE_KEYS.CONTENT_BLOCKS, blocks);
            this.updatePublicView();
        },

        getBlocksForSection(sectionId) {
            const allBlocks = this.getAll();
            return allBlocks[sectionId] || [];
        },

        saveBlocksForSection(sectionId, blocks) {
            const allBlocks = this.getAll();
            allBlocks[sectionId] = blocks;
            this.save(allBlocks);
        },

        addBlock(sectionId, block) {
            const blocks = this.getBlocksForSection(sectionId);
            block.id = AdminUtils.generateId();
            block.createdAt = Date.now();
            block.visible = block.visible !== false; // Por defecto visible
            blocks.push(block);
            this.saveBlocksForSection(sectionId, blocks);
            return block;
        },

        updateBlock(sectionId, blockId, updatedBlock) {
            const blocks = this.getBlocksForSection(sectionId);
            const index = blocks.findIndex(b => b.id === blockId);
            if (index !== -1) {
                blocks[index] = { ...blocks[index], ...updatedBlock, updatedAt: Date.now() };
                this.saveBlocksForSection(sectionId, blocks);
                return blocks[index];
            }
            return null;
        },

        deleteBlock(sectionId, blockId) {
            const blocks = this.getBlocksForSection(sectionId);
            const filtered = blocks.filter(b => b.id !== blockId);
            this.saveBlocksForSection(sectionId, filtered);
        },

        toggleBlockVisibility(sectionId, blockId) {
            const blocks = this.getBlocksForSection(sectionId);
            const block = blocks.find(b => b.id === blockId);
            if (block) {
                block.visible = !block.visible;
                this.saveBlocksForSection(sectionId, blocks);
                return block.visible;
            }
            return false;
        },

        updatePublicView() {
            // Actualizar todas las secciones que tengan bloques de contenido
            const allBlocks = this.getAll();
            Object.keys(allBlocks).forEach(sectionId => {
                this.renderSectionBlocks(sectionId);
            });
        },

        renderSectionBlocks(sectionId) {
            const blocks = this.getBlocksForSection(sectionId).filter(b => b.visible);
            const section = document.getElementById(sectionId);
            if (!section) return;

            // Buscar o crear el contenedor de bloques
            let blocksContainer = section.querySelector('.content-blocks');
            if (!blocksContainer) {
                blocksContainer = document.createElement('div');
                blocksContainer.className = 'content-blocks';
                section.appendChild(blocksContainer);
            }

            blocksContainer.innerHTML = '';
            
            blocks.forEach(block => {
                const blockElement = this.createBlockElement(block);
                blocksContainer.appendChild(blockElement);
            });
        },

        createBlockElement(block) {
            const element = document.createElement('div');
            element.className = `content-block content-block-${block.type}`;
            
            switch (block.type) {
                case 'text':
                    element.innerHTML = `<div class="block-text">${block.content}</div>`;
                    break;
                case 'image':
                    element.innerHTML = `
                        <div class="block-image">
                            <img src="${block.src}" alt="${block.alt || ''}" loading="lazy">
                            ${block.caption ? `<p class="image-caption">${block.caption}</p>` : ''}
                        </div>
                    `;
                    break;
                case 'video':
                    const embed = AdminUtils.createVideoEmbed(block.url);
                    element.innerHTML = `
                        <div class="block-video">
                            ${embed || `<p>Video no disponible</p>`}
                            ${block.caption ? `<p class="video-caption">${block.caption}</p>` : ''}
                        </div>
                    `;
                    break;
                case 'gallery':
                    const images = block.images || [];
                    element.innerHTML = `
                        <div class="block-gallery">
                            <div class="gallery-grid">
                                ${images.map(img => `
                                    <div class="gallery-item">
                                        <img src="${img.src}" alt="${img.alt || ''}" loading="lazy" onclick="openImageModal('${img.src}')">
                                    </div>
                                `).join('')}
                            </div>
                            ${block.caption ? `<p class="gallery-caption">${block.caption}</p>` : ''}
                        </div>
                    `;
                    break;
            }
            
            return element;
        },

        showContentEditor(sectionId) {
            const modal = this.createContentEditorModal(sectionId);
            document.body.appendChild(modal);
        },

        createContentEditorModal(sectionId) {
            const blocks = this.getBlocksForSection(sectionId);
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3>Editor de Contenido - ${sectionId}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="content-editor">
                        <div class="editor-toolbar">
                            <button class="btn btn-primary" onclick="ContentBlocksManager.addTextBlock('${sectionId}')">
                                <i class="fas fa-font"></i> Añadir Texto
                            </button>
                            <button class="btn btn-primary" onclick="ContentBlocksManager.addImageBlock('${sectionId}')">
                                <i class="fas fa-image"></i> Añadir Imagen
                            </button>
                            <button class="btn btn-primary" onclick="ContentBlocksManager.addVideoBlock('${sectionId}')">
                                <i class="fas fa-video"></i> Añadir Video
                            </button>
                            <button class="btn btn-primary" onclick="ContentBlocksManager.addGalleryBlock('${sectionId}')">
                                <i class="fas fa-images"></i> Añadir Galería
                            </button>
                        </div>
                        <div class="blocks-list" id="blocks-list-${sectionId}">
                            ${this.renderBlocksList(sectionId, blocks)}
                        </div>
                    </div>
                </div>
            `;
            
            return modal;
        },

        renderBlocksList(sectionId, blocks) {
            if (blocks.length === 0) {
                return '<p class="no-blocks">No hay bloques de contenido. Usa los botones de arriba para añadir contenido.</p>';
            }
            
            return blocks.map(block => `
                <div class="block-item ${!block.visible ? 'block-hidden' : ''}" data-block-id="${block.id}">
                    <div class="block-header">
                        <span class="block-type">${block.type.toUpperCase()}</span>
                        <div class="block-actions">
                            <button class="btn-toggle-visibility" onclick="ContentBlocksManager.toggleBlockVisibility('${sectionId}', '${block.id}')" title="${block.visible ? 'Ocultar' : 'Mostrar'}">
                                <i class="fas fa-eye${block.visible ? '' : '-slash'}"></i>
                            </button>
                            <button class="btn-edit" onclick="ContentBlocksManager.editBlock('${sectionId}', '${block.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" onclick="ContentBlocksManager.deleteBlock('${sectionId}', '${block.id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="block-preview">
                        ${this.createBlockPreview(block)}
                    </div>
                </div>
            `).join('');
        },

        createBlockPreview(block) {
            switch (block.type) {
                case 'text':
                    return `<div class="text-preview">${block.content.substring(0, 100)}${block.content.length > 100 ? '...' : ''}</div>`;
                case 'image':
                    return `<img src="${block.src}" alt="${block.alt || ''}" style="max-width: 100px; max-height: 60px; object-fit: cover;">`;
                case 'video':
                    return `<div class="video-preview"><i class="fas fa-play-circle"></i> ${block.url}</div>`;
                case 'gallery':
                    const imageCount = block.images ? block.images.length : 0;
                    return `<div class="gallery-preview"><i class="fas fa-images"></i> ${imageCount} imágenes</div>`;
                default:
                    return '<div>Contenido</div>';
            }
        }
    };

    // Sistema de notificaciones
    const NotificationManager = {
        show(message, type = 'info', duration = 3000) {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-${this.getIcon(type)}"></i>
                    <span>${message}</span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Auto-remove después del tiempo especificado
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        },

        getIcon(type) {
            const icons = {
                success: 'check-circle',
                error: 'exclamation-circle',
                warning: 'exclamation-triangle',
                info: 'info-circle'
            };
            return icons[type] || icons.info;
        }
    };

    // Navegación del panel de administración
    const AdminNavigation = {
        init() {
            this.setupMenuNavigation();
            this.loadInitialData();
        },

        setupMenuNavigation() {
            document.querySelectorAll('.admin-menu .menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const sectionId = item.dataset.section;
                    this.showSection(sectionId);
                    this.setActiveMenuItem(item);
                });
            });
        },

        showSection(sectionId) {
            // Ocultar todas las secciones
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Mostrar la sección seleccionada
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Cargar datos específicos de la sección
                this.loadSectionData(sectionId);
            }
        },

        setActiveMenuItem(activeItem) {
            document.querySelectorAll('.admin-menu .menu-item').forEach(item => {
                item.classList.remove('active');
            });
            activeItem.classList.add('active');
        },

        loadSectionData(sectionId) {
            switch (sectionId) {
                case 'manage-biographies':
                    BiografiasManager.renderTable();
                    break;
                case 'manage-catechesis':
                    CatequesisManager.renderTable();
                    break;
                case 'manage-videos':
                    VideosManager.renderTable();
                    break;
                case 'dashboard-overview':
                    this.updateDashboardStats();
                    break;
            }
        },

        updateDashboardStats() {
            const biografias = BiografiasManager.getAll();
            const catequesis = CatequesisManager.getAll();
            const videos = VideosManager.getAll();
            
            // Actualizar estadísticas en el dashboard
            const statsElements = {
                biografias: document.querySelector('.stat-biografias .stat-number'),
                catequesis: document.querySelector('.stat-catequesis .stat-number'),
                videos: document.querySelector('.stat-videos .stat-number')
            };
            
            if (statsElements.biografias) statsElements.biografias.textContent = biografias.length;
            if (statsElements.catequesis) statsElements.catequesis.textContent = catequesis.length;
            if (statsElements.videos) statsElements.videos.textContent = videos.length;
        },

        loadInitialData() {
            // Cargar datos iniciales si no existen
            this.initializeDefaultData();
            
            // Actualizar vistas públicas
            BiografiasManager.updatePublicView();
            CatequesisManager.updatePublicView();
            VideosManager.updatePublicView();
        },

        initializeDefaultData() {
            // Inicializar biografías por defecto si no existen
            if (BiografiasManager.getAll().length === 0) {
                const defaultBiografias = [
                    {
                        title: 'Santa Teresa de Ávila',
                        description: 'Mística, escritora y reformadora, su legado transformó la orden carmelita y la espiritualidad católica.',
                        content: 'Contenido completo de la biografía de Santa Teresa de Ávila...',
                        image: 'https://images.unsplash.com/photo-1593642532400-2682810df593?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
                        link: '/biografias/santa-teresa-de-avila',
                        status: 'published'
                    },
                    {
                        title: 'Santa Catalina de Siena',
                        description: 'Doctora de la Iglesia, consejera de Papas y pacificadora en tiempos de conflicto.',
                        content: 'Contenido completo de la biografía de Santa Catalina de Siena...',
                        image: 'https://images.unsplash.com/photo-1593642532400-2682810df593?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
                        link: '/biografias/santa-catalina-de-siena',
                        status: 'published'
                    },
                    {
                        title: 'Hildegarda de Bingen',
                        description: 'Abadesa, visionaria, compositora y polímata, una figura adelantada a su tiempo.',
                        content: 'Contenido completo de la biografía de Hildegarda de Bingen...',
                        image: 'https://images.unsplash.com/photo-1593642532400-2682810df593?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
                        link: '/biografias/hildegarda-de-bingen',
                        status: 'published'
                    }
                ];
                
                defaultBiografias.forEach(biografia => BiografiasManager.add(biografia));
            }
            
            // Inicializar catequesis por defecto si no existe
            if (CatequesisManager.getAll().length === 0) {
                const defaultCatequesis = {
                    title: 'Profundiza en la Fe y la Historia',
                    description: 'Ofrecemos recursos de catequesis y formación para entender mejor el papel de la mujer en la tradición cristiana y su impacto en la fe.',
                    content: 'Contenido completo del recurso de catequesis...',
                    type: 'guide',
                    link: '/catequesis',
                    status: 'published'
                };
                
                CatequesisManager.add(defaultCatequesis);
            }
            
            // Inicializar videos por defecto si no existen
            if (VideosManager.getAll().length === 0) {
                const defaultVideos = [
                    {
                        title: 'Documental: Las Madres del Desierto',
                        description: 'Explora la vida de las primeras ascetas cristianas en el desierto.',
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        status: 'published'
                    },
                    {
                        title: 'Entrevista: El Rol de la Mujer en la Iglesia Hoy',
                        description: 'Un diálogo con teólogas y líderes sobre el presente y futuro.',
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        status: 'published'
                    },
                    {
                        title: 'Biografía Animada: Santa Clara de Asís',
                        description: 'Conoce la historia de la fundadora de las Clarisas.',
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        status: 'published'
                    }
                ];
                
                defaultVideos.forEach(video => VideosManager.add(video));
            }
        }
    };

    // Funciones globales para el panel de administración
    window.toggleAdminPanel = function() {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel.style.display === 'block') {
            adminPanel.style.display = 'none';
        } else {
            adminPanel.style.display = 'block';
            if (AuthManager.isAuthenticated()) {
                AuthManager.showDashboard();
            } else {
                AuthManager.showLoginScreen();
            }
        }
    };

    window.togglePasswordVisibility = function() {
        const passwordField = document.getElementById('password');
        const toggleBtn = document.querySelector('.toggle-password i');
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            toggleBtn.classList.remove('fa-eye');
            toggleBtn.classList.add('fa-eye-slash');
        } else {
            passwordField.type = 'password';
            toggleBtn.classList.remove('fa-eye-slash');
            toggleBtn.classList.add('fa-eye');
        }
    };

    window.logout = function() {
        AuthManager.logout();
        document.getElementById('adminPanel').style.display = 'none';
    };

    // Exponer managers globalmente para uso en HTML
    window.BiografiasManager = BiografiasManager;
    window.CatequesisManager = CatequesisManager;
    window.VideosManager = VideosManager;
    window.NotificationManager = NotificationManager;

    // Inicialización cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        // Configurar formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const loginMessage = document.getElementById('loginMessage');

                if (AuthManager.login(username, password)) {
                    AuthManager.showDashboard();
                    AdminNavigation.init();
                    loginMessage.textContent = '';
                    NotificationManager.show('Bienvenido al panel de administración', 'success');
                } else {
                    loginMessage.textContent = 'Usuario o contraseña incorrectos.';
                }
            });
        }

        // Verificar si ya está autenticado
        if (AuthManager.isAuthenticated()) {
            AdminNavigation.init();
        }
    });

})();

