/**
 * Perlas Ocultas - JavaScript Principal
 * Optimizado para rendimiento y SEO
 */

(function() {
    'use strict';

    // Configuración global
    const CONFIG = {
        LAZY_LOAD_OFFSET: 100,
        DEBOUNCE_DELAY: 250,
        ANIMATION_DURATION: 300,
        CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 horas
        API_ENDPOINTS: {
            contact: '/api/contact',
            newsletter: '/api/newsletter'
        }
    };

    // Utilidades
    const Utils = {
        // Debounce function
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Intersection Observer helper
        createObserver(callback, options = {}) {
            const defaultOptions = {
                root: null,
                rootMargin: `${CONFIG.LAZY_LOAD_OFFSET}px`,
                threshold: 0.1
            };
            return new IntersectionObserver(callback, { ...defaultOptions, ...options });
        },

        // Local Storage con expiración
        storage: {
            set(key, value, expiration = CONFIG.CACHE_DURATION) {
                const item = {
                    value: value,
                    expiry: Date.now() + expiration
                };
                localStorage.setItem(key, JSON.stringify(item));
            },

            get(key) {
                const itemStr = localStorage.getItem(key);
                if (!itemStr) return null;

                const item = JSON.parse(itemStr);
                if (Date.now() > item.expiry) {
                    localStorage.removeItem(key);
                    return null;
                }
                return item.value;
            },

            remove(key) {
                localStorage.removeItem(key);
            }
        },

        // Validación de email
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // Sanitizar HTML
        sanitizeHTML(str) {
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        },

        // Generar ID único
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
    };

    // Service Worker Registration
    const ServiceWorkerManager = {
        async register() {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js', {
                        scope: '/'
                    });
                    
                    console.log('SW registrado:', registration);
                    
                    // Manejar actualizaciones
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateNotification();
                            }
                        });
                    });

                    return registration;
                } catch (error) {
                    console.error('Error registrando SW:', error);
                }
            }
        },

        showUpdateNotification() {
            const notification = document.createElement('div');
            notification.className = 'update-notification';
            notification.innerHTML = `
                <div class="update-content">
                    <p>Nueva versión disponible</p>
                    <button onclick="window.location.reload()">Actualizar</button>
                    <button onclick="this.parentElement.parentElement.remove()">Más tarde</button>
                </div>
            `;
            document.body.appendChild(notification);
        }
    };

    // Lazy Loading Manager
    const LazyLoadManager = {
        init() {
            this.loadImages();
            this.loadSections();
        },

        loadImages() {
            const images = document.querySelectorAll('img[data-src], [data-bg]');
            if (!images.length) return;

            const imageObserver = Utils.createObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        imageObserver.unobserve(entry.target);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        },

        loadImage(element) {
            // Para imágenes con src
            if (element.dataset.src) {
                element.src = element.dataset.src;
                element.removeAttribute('data-src');
            }
            
            // Para backgrounds
            if (element.dataset.bg) {
                element.style.backgroundImage = `url(${element.dataset.bg})`;
                element.removeAttribute('data-bg');
            }

            element.classList.add('loaded');
        },

        loadSections() {
            const sections = document.querySelectorAll('.lazy-section');
            if (!sections.length) return;

            const sectionObserver = Utils.createObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('fade-in-up');
                        sectionObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });

            sections.forEach(section => sectionObserver.observe(section));
        }
    };

    // Performance Monitor
    const PerformanceMonitor = {
        init() {
            this.measurePageLoad();
            this.measureLCP();
            this.measureFID();
            this.measureCLS();
        },

        measurePageLoad() {
            window.addEventListener('load', () => {
                const perfData = performance.getEntriesByType('navigation')[0];
                const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                
                console.log(`Tiempo de carga: ${loadTime}ms`);
                
                // Enviar métricas (opcional)
                this.sendMetrics('page_load', loadTime);
            });
        },

        measureLCP() {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.log(`LCP: ${lastEntry.startTime}ms`);
                    this.sendMetrics('lcp', lastEntry.startTime);
                });
                observer.observe({ entryTypes: ['largest-contentful-paint'] });
            }
        },

        measureFID() {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        console.log(`FID: ${entry.processingStart - entry.startTime}ms`);
                        this.sendMetrics('fid', entry.processingStart - entry.startTime);
                    });
                });
                observer.observe({ entryTypes: ['first-input'] });
            }
        },

        measureCLS() {
            if ('PerformanceObserver' in window) {
                let clsValue = 0;
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    console.log(`CLS: ${clsValue}`);
                    this.sendMetrics('cls', clsValue);
                });
                observer.observe({ entryTypes: ['layout-shift'] });
            }
        },

        sendMetrics(metric, value) {
            // Aquí se enviarían las métricas a un servicio de analytics
            // gtag('event', metric, { value: value });
        }
    };

    // Navigation Manager
    const NavigationManager = {
        init() {
            this.setupSmoothScrolling();
            this.setupActiveNavigation();
            this.setupMobileMenu();
        },

        setupSmoothScrolling() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(anchor.getAttribute('href'));
                    
                    if (target) {
                        const offsetTop = target.offsetTop - 80; // Offset para header fijo
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                        
                        // Actualizar URL sin recargar
                        history.pushState(null, null, anchor.getAttribute('href'));
                        
                        // Focus para accesibilidad
                        target.focus({ preventScroll: true });
                    }
                });
            });
        },

        setupActiveNavigation() {
            const sections = document.querySelectorAll('section[id]');
            const navLinks = document.querySelectorAll('.public-nav a[href^="#"]');

            const observer = Utils.createObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        navLinks.forEach(link => {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === `#${id}`) {
                                link.classList.add('active');
                            }
                        });
                    }
                });
            }, { threshold: 0.3 });

            sections.forEach(section => observer.observe(section));
        },

        setupMobileMenu() {
            // Implementar menú móvil si es necesario
            const nav = document.querySelector('.public-nav');
            if (window.innerWidth <= 768) {
                nav.classList.add('mobile-nav');
            }
        }
    };

    // Form Manager
    const FormManager = {
        init() {
            this.setupContactForm();
            this.setupValidation();
        },

        setupContactForm() {
            const form = document.querySelector('#contacto form');
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleFormSubmission(form);
            });
        },

        async handleFormSubmission(form) {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Validar datos
            if (!this.validateFormData(data)) {
                return;
            }

            // Mostrar loading
            this.showLoading(form);

            try {
                // Simular envío (reemplazar con API real)
                await this.simulateFormSubmission(data);
                this.showSuccess(form);
                form.reset();
            } catch (error) {
                this.showError(form, error.message);
            } finally {
                this.hideLoading(form);
            }
        },

        validateFormData(data) {
            let isValid = true;
            
            // Limpiar errores previos
            document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

            // Validar nombre
            if (!data.name || data.name.trim().length < 2) {
                this.showFieldError('name', 'El nombre debe tener al menos 2 caracteres');
                isValid = false;
            }

            // Validar email
            if (!data.email || !Utils.isValidEmail(data.email)) {
                this.showFieldError('email', 'Por favor, introduce un email válido');
                isValid = false;
            }

            // Validar mensaje
            if (!data.message || data.message.trim().length < 10) {
                this.showFieldError('message', 'El mensaje debe tener al menos 10 caracteres');
                isValid = false;
            }

            return isValid;
        },

        showFieldError(fieldName, message) {
            const errorElement = document.getElementById(`${fieldName}-error`);
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.setAttribute('aria-live', 'polite');
            }
        },

        async simulateFormSubmission(data) {
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Simular posible error (5% de probabilidad)
            if (Math.random() < 0.05) {
                throw new Error('Error de conexión. Por favor, inténtalo de nuevo.');
            }

            // Guardar en localStorage como backup
            Utils.storage.set('last_contact_form', data);
            
            return { success: true };
        },

        showLoading(form) {
            const spinner = form.querySelector('.loading-spinner');
            const submitBtn = form.querySelector('button[type="submit"]');
            
            if (spinner) spinner.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enviando...';
            }
        },

        hideLoading(form) {
            const spinner = form.querySelector('.loading-spinner');
            const submitBtn = form.querySelector('button[type="submit"]');
            
            if (spinner) spinner.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Mensaje';
            }
        },

        showSuccess(form) {
            const message = document.createElement('div');
            message.className = 'success-message';
            message.innerHTML = `
                <div class="success-content">
                    <i class="fas fa-check-circle"></i>
                    <p>¡Mensaje enviado correctamente! Te responderemos pronto.</p>
                </div>
            `;
            form.appendChild(message);
            
            setTimeout(() => message.remove(), 5000);
        },

        showError(form, errorMessage) {
            const message = document.createElement('div');
            message.className = 'error-message-global';
            message.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${errorMessage}</p>
                </div>
            `;
            form.appendChild(message);
            
            setTimeout(() => message.remove(), 5000);
        },

        setupValidation() {
            // Validación en tiempo real
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });
                
                input.addEventListener('input', Utils.debounce(() => {
                    this.validateField(input);
                }, CONFIG.DEBOUNCE_DELAY));
            });
        },

        validateField(field) {
            const value = field.value.trim();
            const fieldName = field.name;
            let isValid = true;
            let message = '';

            switch (fieldName) {
                case 'name':
                    if (value.length < 2) {
                        isValid = false;
                        message = 'El nombre debe tener al menos 2 caracteres';
                    }
                    break;
                case 'email':
                    if (!Utils.isValidEmail(value)) {
                        isValid = false;
                        message = 'Por favor, introduce un email válido';
                    }
                    break;
                case 'message':
                    if (value.length < 10) {
                        isValid = false;
                        message = 'El mensaje debe tener al menos 10 caracteres';
                    }
                    break;
            }

            // Mostrar/ocultar error
            const errorElement = document.getElementById(`${fieldName}-error`);
            if (errorElement) {
                errorElement.textContent = isValid ? '' : message;
            }

            // Añadir clase visual
            field.classList.toggle('invalid', !isValid);
            field.classList.toggle('valid', isValid && value.length > 0);

            return isValid;
        }
    };

    // Accessibility Manager
    const AccessibilityManager = {
        init() {
            this.setupKeyboardNavigation();
            this.setupFocusManagement();
            this.setupScreenReaderSupport();
        },

        setupKeyboardNavigation() {
            document.addEventListener('keydown', (e) => {
                // Escape para cerrar modales
                if (e.key === 'Escape') {
                    this.closeModals();
                }

                // Tab trapping en modales
                if (e.key === 'Tab') {
                    this.handleTabTrapping(e);
                }
            });
        },

        setupFocusManagement() {
            // Mejorar indicadores de focus
            document.addEventListener('focusin', (e) => {
                e.target.classList.add('focused');
            });

            document.addEventListener('focusout', (e) => {
                e.target.classList.remove('focused');
            });
        },

        setupScreenReaderSupport() {
            // Anunciar cambios dinámicos
            this.createLiveRegion();
        },

        createLiveRegion() {
            const liveRegion = document.createElement('div');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            liveRegion.id = 'live-region';
            document.body.appendChild(liveRegion);
        },

        announce(message) {
            const liveRegion = document.getElementById('live-region');
            if (liveRegion) {
                liveRegion.textContent = message;
                setTimeout(() => liveRegion.textContent = '', 1000);
            }
        },

        closeModals() {
            document.querySelectorAll('.modal, .admin-panel-section').forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.style.display = 'none';
                }
            });
        },

        handleTabTrapping(e) {
            const modal = document.querySelector('.modal:not([style*="display: none"])');
            if (!modal) return;

            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };

    // Analytics Manager
    const AnalyticsManager = {
        init() {
            this.setupPageTracking();
            this.setupEventTracking();
            this.setupScrollTracking();
        },

        setupPageTracking() {
            // Tracking básico de página
            this.trackPageView();
        },

        setupEventTracking() {
            // Track clicks en biografías
            document.querySelectorAll('.biografia-card .btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.trackEvent('biografia_click', {
                        biografia: btn.closest('.biografia-card').querySelector('h3').textContent
                    });
                });
            });

            // Track envío de formulario
            document.addEventListener('formSubmitted', (e) => {
                this.trackEvent('form_submission', {
                    form_type: 'contact'
                });
            });
        },

        setupScrollTracking() {
            let maxScroll = 0;
            const trackScroll = Utils.throttle(() => {
                const scrollPercent = Math.round(
                    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
                );
                
                if (scrollPercent > maxScroll) {
                    maxScroll = scrollPercent;
                    
                    // Track milestones
                    if ([25, 50, 75, 90].includes(scrollPercent)) {
                        this.trackEvent('scroll_depth', {
                            percent: scrollPercent
                        });
                    }
                }
            }, 1000);

            window.addEventListener('scroll', trackScroll);
        },

        trackPageView() {
            // Implementar tracking de página vista
            console.log('Page view tracked');
        },

        trackEvent(eventName, parameters = {}) {
            // Implementar tracking de eventos
            console.log(`Event tracked: ${eventName}`, parameters);
            
            // Ejemplo con Google Analytics
            // gtag('event', eventName, parameters);
        }
    };

    // Main App Initialization
    const App = {
        async init() {
            console.log('Inicializando Perlas Ocultas...');

            try {
                // Registrar Service Worker
                await ServiceWorkerManager.register();

                // Inicializar módulos
                LazyLoadManager.init();
                NavigationManager.init();
                FormManager.init();
                AccessibilityManager.init();
                AnalyticsManager.init();
                PerformanceMonitor.init();

                // Setup global event listeners
                this.setupGlobalEvents();

                console.log('Perlas Ocultas inicializado correctamente');
            } catch (error) {
                console.error('Error inicializando la aplicación:', error);
            }
        },

        setupGlobalEvents() {
            // Manejar cambios de orientación
            window.addEventListener('orientationchange', Utils.debounce(() => {
                window.location.reload();
            }, 500));

            // Manejar cambios de conexión
            if ('connection' in navigator) {
                navigator.connection.addEventListener('change', () => {
                    console.log('Conexión cambiada:', navigator.connection.effectiveType);
                });
            }

            // Manejar visibilidad de página
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    console.log('Página oculta');
                } else {
                    console.log('Página visible');
                }
            });
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

    // Expose utilities globally for debugging
    window.PerlasOcultas = {
        Utils,
        LazyLoadManager,
        NavigationManager,
        FormManager,
        AccessibilityManager,
        AnalyticsManager
    };

})();



// ===== SISTEMA DE MÚSICA CELESTIAL =====
class CelestialMusic {
    constructor() {
        this.audio = document.getElementById('celestial-music');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.playIcon = document.getElementById('play-icon');
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeIcon = document.getElementById('volume-icon');
        this.isPlaying = false;
        this.isMuted = false;
        this.previousVolume = 0.3;
        
        this.init();
    }
    
    init() {
        if (!this.audio) return;
        
        // Configurar volumen inicial
        this.audio.volume = 0.3;
        
        // Intentar reproducir automáticamente (con manejo de políticas del navegador)
        this.autoPlay();
        
        // Event listeners
        this.audio.addEventListener('loadeddata', () => {
            console.log('Música celestial cargada');
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('Error cargando música celestial:', e);
            this.hideMusicControls();
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
        
        // Fade in/out en cambios de página
        this.setupPageTransitions();
    }
    
    async autoPlay() {
        try {
            // Intentar reproducir automáticamente
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
        } catch (error) {
            // Si falla el autoplay, mostrar controles para que el usuario pueda activar
            console.log('Autoplay bloqueado por el navegador. El usuario debe activar la música manualmente.');
            this.showMusicControls();
        }
    }
    
    toggle() {
        if (!this.audio) return;
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        try {
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
        } catch (error) {
            console.error('Error reproduciendo música:', error);
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }
    
    changeVolume(value) {
        if (!this.audio) return;
        
        const volume = value / 100;
        this.audio.volume = volume;
        this.previousVolume = volume;
        
        // Actualizar icono de volumen
        this.updateVolumeIcon(volume);
        
        // Si el volumen es 0, considerar como muted
        if (volume === 0) {
            this.isMuted = true;
        } else if (this.isMuted) {
            this.isMuted = false;
        }
    }
    
    toggleMute() {
        if (!this.audio) return;
        
        if (this.isMuted) {
            // Unmute
            this.audio.volume = this.previousVolume;
            this.volumeSlider.value = this.previousVolume * 100;
            this.isMuted = false;
        } else {
            // Mute
            this.previousVolume = this.audio.volume;
            this.audio.volume = 0;
            this.volumeSlider.value = 0;
            this.isMuted = true;
        }
        
        this.updateVolumeIcon(this.audio.volume);
    }
    
    updatePlayButton() {
        if (this.isPlaying) {
            this.playIcon.className = 'fas fa-pause';
            this.playPauseBtn.title = 'Pausar música celestial';
        } else {
            this.playIcon.className = 'fas fa-play';
            this.playPauseBtn.title = 'Reproducir música celestial';
        }
    }
    
    updateVolumeIcon(volume) {
        if (volume === 0) {
            this.volumeIcon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            this.volumeIcon.className = 'fas fa-volume-down';
        } else {
            this.volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    fadeOut(duration = 1000) {
        if (!this.audio || !this.isPlaying) return;
        
        const startVolume = this.audio.volume;
        const fadeStep = startVolume / (duration / 50);
        
        const fadeInterval = setInterval(() => {
            if (this.audio.volume > fadeStep) {
                this.audio.volume -= fadeStep;
            } else {
                this.audio.volume = 0;
                clearInterval(fadeInterval);
                this.pause();
                this.audio.volume = startVolume; // Restaurar volumen para próxima reproducción
            }
        }, 50);
    }
    
    fadeIn(duration = 1000) {
        if (!this.audio) return;
        
        const targetVolume = this.previousVolume || 0.3;
        this.audio.volume = 0;
        this.play();
        
        const fadeStep = targetVolume / (duration / 50);
        
        const fadeInterval = setInterval(() => {
            if (this.audio.volume < targetVolume - fadeStep) {
                this.audio.volume += fadeStep;
            } else {
                this.audio.volume = targetVolume;
                clearInterval(fadeInterval);
            }
        }, 50);
    }
    
    setupPageTransitions() {
        // Fade out cuando se va a cambiar de página
        window.addEventListener('beforeunload', () => {
            this.fadeOut(500);
        });
        
        // Fade in cuando se carga la página
        window.addEventListener('load', () => {
            if (this.isPlaying) {
                this.fadeIn(1000);
            }
        });
    }
    
    showMusicControls() {
        const controls = document.getElementById('music-controls');
        if (controls) {
            controls.style.display = 'flex';
        }
    }
    
    hideMusicControls() {
        const controls = document.getElementById('music-controls');
        if (controls) {
            controls.style.display = 'none';
        }
    }
}

// Funciones globales para los controles
function toggleMusic() {
    if (window.celestialMusic) {
        window.celestialMusic.toggle();
    }
}

function changeVolume() {
    const volumeSlider = document.getElementById('volume-slider');
    if (window.celestialMusic && volumeSlider) {
        window.celestialMusic.changeVolume(volumeSlider.value);
    }
}

function toggleMute() {
    if (window.celestialMusic) {
        window.celestialMusic.toggleMute();
    }
}

// ===== FUNCIONES DE DONACIONES =====
function processDonation(type) {
    let amount = 0;
    let plan = '';
    let pack = '';
    
    switch(type) {
        case 'puntual':
            // Obtener monto seleccionado
            const selectedAmount = document.querySelector('.amount-btn.selected');
            const customAmount = document.getElementById('custom-amount').value;
            
            if (selectedAmount) {
                amount = selectedAmount.dataset.amount;
            } else if (customAmount) {
                amount = customAmount;
            } else {
                alert('Por favor, selecciona o introduce un importe para donar.');
                return;
            }
            break;
            
        case 'mensual':
            const selectedPlan = document.querySelector('.plan.selected');
            if (!selectedPlan) {
                alert('Por favor, selecciona un plan de donación mensual.');
                return;
            }
            plan = selectedPlan.dataset.plan;
            break;
            
        case 'pack':
            const selectedPack = document.querySelector('.pack.selected');
            if (!selectedPack) {
                alert('Por favor, selecciona un pack especial.');
                return;
            }
            pack = selectedPack.dataset.pack;
            break;
    }
    
    // Simular proceso de donación
    showDonationModal(type, amount, plan, pack);
}

function showDonationModal(type, amount, plan, pack) {
    const modal = document.createElement('div');
    modal.className = 'donation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Procesar Donación</h3>
                <button onclick="this.closest('.donation-modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p>Tipo: ${type}</p>
                ${amount ? `<p>Importe: €${amount}</p>` : ''}
                ${plan ? `<p>Plan: ${plan}</p>` : ''}
                ${pack ? `<p>Pack: ${pack}</p>` : ''}
                <p><strong>Nota:</strong> Esta es una simulación. En un entorno real, aquí se integraría con una pasarela de pago como Stripe, PayPal, etc.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="completeDonation()">Confirmar Donación</button>
                <button class="btn btn-secondary" onclick="this.closest('.donation-modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function completeDonation() {
    alert('¡Gracias por tu donación! En un entorno real, serías redirigido a la pasarela de pago.');
    document.querySelector('.donation-modal').remove();
}

function showVolunteerForm() {
    const modal = document.createElement('div');
    modal.className = 'volunteer-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Formulario de Voluntariado</h3>
                <button onclick="this.closest('.volunteer-modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="volunteer-form">
                    <div class="form-group">
                        <label>Nombre completo:</label>
                        <input type="text" required>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" required>
                    </div>
                    <div class="form-group">
                        <label>Teléfono:</label>
                        <input type="tel">
                    </div>
                    <div class="form-group">
                        <label>Área de interés:</label>
                        <select required>
                            <option value="">Selecciona una opción</option>
                            <option value="investigacion">Investigación y Redacción</option>
                            <option value="traduccion">Traducción</option>
                            <option value="redes">Difusión y Redes</option>
                            <option value="eventos">Formación y Eventos</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Experiencia previa:</label>
                        <textarea rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Disponibilidad (horas/semana):</label>
                        <select>
                            <option value="1-3">1-3 horas</option>
                            <option value="4-6">4-6 horas</option>
                            <option value="7-10">7-10 horas</option>
                            <option value="10+">Más de 10 horas</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="submitVolunteerForm()">Enviar Solicitud</button>
                <button class="btn btn-secondary" onclick="this.closest('.volunteer-modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function submitVolunteerForm() {
    alert('¡Gracias por tu interés! Te contactaremos pronto para coordinar tu participación.');
    document.querySelector('.volunteer-modal').remove();
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar música celestial
    window.celestialMusic = new CelestialMusic();
    
    // Configurar selección de montos de donación
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('custom-amount').value = '';
        });
    });
    
    // Configurar campo personalizado
    const customAmountField = document.getElementById('custom-amount');
    if (customAmountField) {
        customAmountField.addEventListener('input', function() {
            if (this.value) {
                document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
            }
        });
    }
    
    // Configurar selección de planes mensuales
    document.querySelectorAll('.plan').forEach(plan => {
        plan.addEventListener('click', function() {
            document.querySelectorAll('.plan').forEach(p => p.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Configurar selección de packs
    document.querySelectorAll('.pack').forEach(pack => {
        pack.addEventListener('click', function() {
            document.querySelectorAll('.pack').forEach(p => p.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    console.log('Sistema de donaciones y música celestial inicializados');
});

