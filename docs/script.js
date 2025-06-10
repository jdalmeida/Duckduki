// JavaScript para o site do Duckduki

// Configuração das partículas
document.addEventListener('DOMContentLoaded', function() {
    // Configurar partículas.js
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: {
                    value: 80,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: ['#00f5ff', '#7c3aed', '#f59e0b']
                },
                shape: {
                    type: 'circle'
                },
                opacity: {
                    value: 0.5,
                    random: false,
                    anim: {
                        enable: false,
                        speed: 1,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: 3,
                    random: true
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#00f5ff',
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'repulse'
                    },
                    onclick: {
                        enable: true,
                        mode: 'push'
                    },
                    resize: true
                }
            },
            retina_detect: true
        });
    }

    // Navegação móvel
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Fechar menu ao clicar em um link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Scroll suave para links âncora
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Controle de transição entre Spotlight e Fullscreen
    const appPreview = document.getElementById('app-preview');
    const spotlightMode = document.getElementById('spotlight-mode');
    const fullscreenMode = document.getElementById('fullscreen-mode');
    
    function updateAppMode() {
        const scrollY = window.scrollY;
        const heroHeight = document.querySelector('.hero').offsetHeight;
        const scrollThreshold = heroHeight * 0.3; // 30% da altura do hero
        
        if (scrollY > scrollThreshold) {
            // Mostrar Fullscreen Mode
            appPreview.classList.add('scrolled');
            spotlightMode.classList.add('hidden');
            fullscreenMode.classList.add('visible');
        } else {
            // Mostrar Spotlight Mode
            appPreview.classList.remove('scrolled');
            spotlightMode.classList.remove('hidden');
            fullscreenMode.classList.remove('visible');
        }
    }
    
    // Event listener para scroll
    window.addEventListener('scroll', updateAppMode);
    
    // Inicializar estado
    updateAppMode();

    // Efeito de digitação no hero - removido o typing indicator após 5 segundos
    setTimeout(() => {
        const typingMessages = document.querySelectorAll('.typing-message');
        typingMessages.forEach(msg => {
            if (msg) {
                msg.style.opacity = '0';
                setTimeout(() => {
                    msg.remove();
                }, 500);
            }
        });
    }, 5000);
    
    // Interações do spotlight mode
    const searchInput = document.querySelector('.search-input');
    const resultItems = document.querySelectorAll('.result-item');
    
    if (searchInput) {
        // Efeito de foco na barra de pesquisa
        searchInput.addEventListener('focus', () => {
            searchInput.placeholder = 'Ex: resumir emails, criar tarefa, notícias tech...';
        });
        
        searchInput.addEventListener('blur', () => {
            searchInput.placeholder = 'Digite um comando ou pergunta...';
        });
    }
    
    // Efeitos nos itens de resultado
    resultItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // Efeito de seleção
            resultItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            
            // Simular ação baseada no índice
            setTimeout(() => {
                item.classList.remove('selected');
            }, 1000);
        });
        
        // Adicionar pequeno delay na animação de entrada
        item.style.animationDelay = `${index * 0.1}s`;
    });

    // Função de cópia para o botão de código
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const code = document.querySelector('.code-block code');
            if (code) {
                const text = code.textContent.replace(/\n/g, '\n');
                navigator.clipboard.writeText(text).then(() => {
                    this.textContent = '✓';
                    this.style.color = '#00f5ff';
                    setTimeout(() => {
                        this.textContent = '📋';
                        this.style.color = '';
                    }, 2000);
                });
            }
        });
    }

    // Header transparente/opaco baseado no scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(10, 10, 11, 0.95)';
            header.style.backdropFilter = 'blur(20px)';
        } else {
            header.style.background = 'rgba(10, 10, 11, 0.9)';
            header.style.backdropFilter = 'blur(20px)';
        }
    });

    // Adicionar efeitos hover nos botões
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Efeito de hover nos cards de feature
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-5px) scale(1)';
        });
    });
});

// Adicionar CSS para animações extras
const style = document.createElement('style');
style.textContent = `
    .nav-menu.active {
        display: flex !important;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: rgba(10, 10, 11, 0.98);
        backdrop-filter: blur(20px);
        padding: 2rem;
        gap: 1rem;
    }
    
    .hamburger.active span:nth-child(1) {
        transform: rotate(-45deg) translate(-5px, 6px);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: rotate(45deg) translate(-5px, -6px);
    }
    
    .ai-response {
        color: #a1a1aa;
    }
    
    .response-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        font-weight: 600;
    }
    
    .ai-icon {
        font-size: 1.2rem;
    }
    
    .ai-name {
        color: #00f5ff;
        font-family: var(--font-primary);
    }
    
    .response-content p {
        margin-bottom: 0.5rem;
    }
    
    .response-content ul,
    .response-content ol {
        margin: 0.5rem 0 1rem 1rem;
        color: #71717a;
    }
    
    .response-content li {
        margin-bottom: 0.25rem;
    }
`;
document.head.appendChild(style); 